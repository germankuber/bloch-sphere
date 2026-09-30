import { WebSocket, WebSocketServer } from 'ws'
import { randomUUID } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import type { IncomingMessage } from 'node:http'
import type {
  BlochSnapshot,
  BrowserMessage,
  CommandMessage,
  RequestEnvelope,
  WelcomeMessage,
} from '../src/protocol/messages'
import { isOriginAllowed, isTokenValid, tokenFromRequestUrl, type ServerConfig } from './config'
import { parseBrowserMessage } from './inbound'
import { logger } from './logger'

const DEFAULT_RESPONSE_TIMEOUT_MS = 10000
const HEARTBEAT_INTERVAL_MS = 15000
const MAX_PAYLOAD_BYTES = 1024 * 1024
const BIND_RETRY_MS = 5000

interface Pending {
  readonly clientId: string
  readonly resolve: (message: BrowserMessage) => void
  readonly reject: (error: Error) => void
  readonly timer: NodeJS.Timeout
}

interface ConnectedClient {
  readonly id: string
  readonly socket: WebSocket
  readonly connectedAt: Date
  readonly snapshot: BlochSnapshot | null
  readonly alive: boolean
}

export interface ClientInfo {
  readonly id: string
  readonly connectedAt: Date
  readonly snapshot: BlochSnapshot | null
}

export type BridgeStatus =
  | { readonly state: 'idle' }
  | { readonly state: 'listening'; readonly host: string; readonly port: number }
  | { readonly state: 'unavailable'; readonly reason: string }

export type BridgeConfig = Pick<ServerConfig, 'wsHost' | 'wsPort' | 'allowedOrigins' | 'token' | 'maxClients'>

export class BridgeUnavailableError extends Error {}
export class UnknownClientError extends Error {}
export class ClientTimeoutError extends Error {}

export class BrowserBridge {
  private server: WebSocketServer | null = null
  private binding: WebSocketServer | null = null
  private failedBinds = 0
  private heartbeat: NodeJS.Timeout | null = null
  private bindRetry: NodeJS.Timeout | null = null
  private clients = new Map<string, ConnectedClient>()
  private pending = new Map<string, Pending>()
  private nextClientNumber = 1
  private currentStatus: BridgeStatus = { state: 'idle' }
  private closed = false

  constructor(
    private readonly config: BridgeConfig,
    private readonly bindRetryMs: number = BIND_RETRY_MS,
  ) {}

  get status(): BridgeStatus {
    return this.currentStatus
  }

  start(): Promise<BridgeStatus> {
    return new Promise((resolve) => this.bind(resolve))
  }

  private bind(settle: (status: BridgeStatus) => void): void {
    if (this.closed) return
    const server = new WebSocketServer({
      host: this.config.wsHost,
      port: this.config.wsPort,
      maxPayload: MAX_PAYLOAD_BYTES,
      verifyClient: (info: { origin: string; req: IncomingMessage }) => this.admit(info.origin, info.req.url),
    })
    let listening = false
    this.binding = server

    server.once('listening', () => {
      listening = true
      this.binding = null
      if (this.closed) {
        server.close()
        return
      }
      if (this.failedBinds > 0) logger.info(`Port ${this.config.wsPort} became free after ${this.failedBinds} attempts`)
      this.failedBinds = 0
      this.server = server
      const address = server.address() as AddressInfo
      this.currentStatus = { state: 'listening', host: this.config.wsHost, port: address.port }
      logger.info(`WebSocket bridge listening on ws://${this.config.wsHost}:${address.port}`)
      this.heartbeat = setInterval(() => this.checkHeartbeat(), HEARTBEAT_INTERVAL_MS)
      settle(this.currentStatus)
    })

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (listening) {
        logger.error(`WebSocket bridge error: ${error.message}`)
        return
      }
      const reason =
        error.code === 'EADDRINUSE'
          ? `Port ${this.config.wsPort} is already in use, probably by another bloch-sphere MCP server. Retrying every ${this.bindRetryMs / 1000}s; stop the other server or set BLOCH_WS_PORT.`
          : `WebSocket bridge failed to start: ${error.message}`
      this.binding = null
      this.currentStatus = { state: 'unavailable', reason }
      if (this.failedBinds === 0) logger.error(reason)
      this.failedBinds += 1
      server.close()
      settle(this.currentStatus)
      if (error.code === 'EADDRINUSE') this.scheduleBindRetry()
    })

    server.on('connection', (socket) => this.register(socket))
  }

  private scheduleBindRetry(): void {
    if (this.closed || this.bindRetry) return
    this.bindRetry = setTimeout(() => {
      this.bindRetry = null
      this.bind(() => undefined)
    }, this.bindRetryMs)
  }

  private admit(origin: string | undefined, url: string | undefined): boolean {
    if (!isOriginAllowed(origin, this.config.allowedOrigins)) {
      logger.warn(`Rejected connection from origin ${origin ?? '(none)'}`)
      return false
    }
    if (!isTokenValid(tokenFromRequestUrl(url), this.config.token)) {
      logger.warn('Rejected connection with a missing or wrong bridge token')
      return false
    }
    if (this.clients.size >= this.config.maxClients) {
      logger.warn(`Rejected connection: already ${this.clients.size} clients`)
      return false
    }
    return true
  }

  private register(socket: WebSocket): void {
    const id = `tab-${this.nextClientNumber}`
    this.nextClientNumber += 1
    this.clients.set(id, { id, socket, connectedAt: new Date(), snapshot: null, alive: true })
    logger.info(`Client ${id} connected`)

    socket.on('message', (raw) => this.receive(id, raw.toString()))
    socket.on('pong', () => this.updateClient(id, (client) => ({ ...client, alive: true })))
    socket.on('close', () => this.unregister(id))
    socket.on('error', (error) => logger.warn(`Client ${id} socket error: ${error.message}`))

    const welcome: WelcomeMessage = { kind: 'welcome', clientId: id }
    this.safeSend(socket, JSON.stringify(welcome))
  }

  private safeSend(socket: WebSocket, payload: string): boolean {
    try {
      socket.send(payload)
      return true
    } catch (error: unknown) {
      logger.warn(`Failed to send to a client: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }

  private updateClient(id: string, change: (client: ConnectedClient) => ConnectedClient): void {
    const client = this.clients.get(id)
    if (client) this.clients.set(id, change(client))
  }

  private checkHeartbeat(): void {
    this.clients.forEach((client) => {
      if (!client.alive) {
        logger.warn(`Client ${client.id} stopped answering pings, closing it`)
        client.socket.terminate()
        return
      }
      this.updateClient(client.id, (current) => ({ ...current, alive: false }))
      client.socket.ping()
    })
  }

  private receive(clientId: string, raw: string): void {
    const parsed = parseBrowserMessage(raw)
    if (!parsed.ok) {
      logger.warn(`Ignored invalid message from ${clientId}: ${parsed.reason}`)
      return
    }
    const message = parsed.message

    if ('snapshot' in message) this.updateClient(clientId, (client) => ({ ...client, snapshot: message.snapshot }))

    if (!message.id) return
    const waiting = this.pending.get(message.id)
    if (!waiting || waiting.clientId !== clientId) return
    clearTimeout(waiting.timer)
    this.pending.delete(message.id)
    waiting.resolve(message)
  }

  private unregister(clientId: string): void {
    this.clients.delete(clientId)
    logger.info(`Client ${clientId} disconnected`)
    const orphaned = [...this.pending.entries()].filter(([, entry]) => entry.clientId === clientId)
    orphaned.forEach(([requestId, entry]) => {
      clearTimeout(entry.timer)
      this.pending.delete(requestId)
      entry.reject(new Error(`Client ${clientId} disconnected before answering; its state is unknown.`))
    })
  }

  list(): readonly ClientInfo[] {
    return [...this.clients.values()]
      .filter((client) => client.socket.readyState === WebSocket.OPEN)
      .map(({ id, connectedAt, snapshot }) => ({ id, connectedAt, snapshot }))
  }

  send(clientId: string, command: CommandMessage, timeout = DEFAULT_RESPONSE_TIMEOUT_MS): Promise<BrowserMessage> {
    if (this.currentStatus.state === 'unavailable') {
      return Promise.reject(new BridgeUnavailableError(this.currentStatus.reason))
    }

    const client = this.clients.get(clientId)
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      const available = this.list().map((entry) => entry.id)
      const hint = available.length > 0 ? `Connected clients: ${available.join(', ')}.` : 'No client is connected.'
      return Promise.reject(new UnknownClientError(`Client "${clientId}" is not connected. ${hint}`))
    }

    const id = randomUUID()
    const envelope: RequestEnvelope = { kind: 'request', id, command }

    return new Promise<BrowserMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(
          new ClientTimeoutError(
            `Client ${clientId} did not answer "${command.kind}" within ${timeout / 1000}s. It may still apply it, so its state is unknown: call get_state before retrying.`,
          ),
        )
      }, timeout)

      this.pending.set(id, { clientId, resolve, reject, timer })
      if (!this.safeSend(client.socket, JSON.stringify(envelope))) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(new Error(`Could not deliver "${command.kind}" to ${clientId}.`))
      }
    })
  }

  close(): Promise<void> {
    this.closed = true
    if (this.heartbeat) clearInterval(this.heartbeat)
    if (this.bindRetry) clearTimeout(this.bindRetry)
    this.pending.forEach((entry) => {
      clearTimeout(entry.timer)
      entry.reject(new Error('The bridge is shutting down.'))
    })
    this.pending.clear()
    this.clients.forEach((client) => client.socket.terminate())
    this.clients.clear()
    this.binding?.close()
    this.binding = null
    const server = this.server
    this.server = null
    if (!server) return Promise.resolve()
    return new Promise((resolve) => server.close(() => resolve()))
  }
}
