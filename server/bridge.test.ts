import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { connect } from 'node:net'
import {
  BridgeUnavailableError,
  BrowserBridge,
  ClientTimeoutError,
  UnknownClientError,
  type BridgeConfig,
} from './bridge'
import type { BrowserInbound, RequestEnvelope } from '../src/protocol/messages'
import { SNAPSHOT } from './testing/fixtures'

const APP_ORIGIN = 'http://localhost:5180'
const TOKEN = 'a-sufficiently-long-token'

interface FakeBrowser {
  readonly id: string
  readonly socket: WebSocket
  readonly requests: RequestEnvelope[]
}

const baseConfig: BridgeConfig = {
  wsHost: '127.0.0.1',
  wsPort: 0,
  allowedOrigins: [APP_ORIGIN],
  token: null,
  maxClients: 16,
}

const portOf = (bridge: BrowserBridge): number => {
  const status = bridge.status
  if (status.state !== 'listening') throw new Error(`bridge not listening: ${JSON.stringify(status)}`)
  return status.port
}

const connectBrowser = (
  port: number,
  { origin = APP_ORIGIN, token }: { origin?: string; token?: string } = {},
): Promise<FakeBrowser> =>
  new Promise((resolve, reject) => {
    const query = token ? `?token=${token}` : ''
    const socket = new WebSocket(`ws://127.0.0.1:${port}/${query}`, { origin })
    const requests: RequestEnvelope[] = []
    socket.on('error', reject)
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString()) as BrowserInbound
      if (message.kind === 'welcome') {
        resolve({ id: message.clientId, socket, requests })
        return
      }
      requests.push(message)
    })
  })

const answerWith = (browser: FakeBrowser, reply: (request: RequestEnvelope) => unknown): void => {
  browser.socket.on('message', (raw) => {
    const message = JSON.parse(raw.toString()) as BrowserInbound
    if (message.kind === 'request') browser.socket.send(JSON.stringify(reply(message)))
  })
}

const answerWithSnapshot = (browser: FakeBrowser): void =>
  answerWith(browser, (request) => ({ kind: 'snapshot', id: request.id, snapshot: SNAPSHOT }))

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const bridges: BrowserBridge[] = []

const startBridge = async (overrides: Partial<BridgeConfig> = {}, bindRetryMs?: number): Promise<BrowserBridge> => {
  const bridge = new BrowserBridge({ ...baseConfig, ...overrides }, bindRetryMs)
  bridges.push(bridge)
  await bridge.start()
  return bridge
}

describe('BrowserBridge', () => {
  afterEach(async () => {
    await Promise.all(bridges.splice(0).map((bridge) => bridge.close()))
  })

  it('gives every connection its own sequential id', async () => {
    const bridge = await startBridge()
    const first = await connectBrowser(portOf(bridge))
    const second = await connectBrowser(portOf(bridge))
    expect([first.id, second.id]).toEqual(['tab-1', 'tab-2'])
    expect(bridge.list().map((client) => client.id)).toEqual(['tab-1', 'tab-2'])
  })

  it('delivers a command only to the addressed client', async () => {
    const bridge = await startBridge()
    const first = await connectBrowser(portOf(bridge))
    const second = await connectBrowser(portOf(bridge))
    answerWithSnapshot(second)

    const reply = await bridge.send(second.id, { kind: 'getState' })

    expect(reply.kind).toBe('snapshot')
    expect(second.requests.map((request) => request.command)).toEqual([{ kind: 'getState' }])
    expect(first.requests).toHaveLength(0)
  })

  it('remembers the last snapshot each client reported', async () => {
    const bridge = await startBridge()
    const browser = await connectBrowser(portOf(bridge))
    answerWithSnapshot(browser)
    await bridge.send(browser.id, { kind: 'getState' })
    expect(bridge.list()[0]?.snapshot?.x).toBe(1)
  })

  it('rejects an unknown client and lists the connected ones', async () => {
    const bridge = await startBridge()
    await connectBrowser(portOf(bridge))
    await expect(bridge.send('tab-9', { kind: 'getState' })).rejects.toBeInstanceOf(UnknownClientError)
    await expect(bridge.send('tab-9', { kind: 'getState' })).rejects.toThrow(/Connected clients: tab-1/)
  })

  it('ignores a reply that comes from a different client', async () => {
    const bridge = await startBridge()
    const target = await connectBrowser(portOf(bridge))
    const impostor = await connectBrowser(portOf(bridge))
    const pending = bridge.send(target.id, { kind: 'getState' }, 300)
    await wait(50)
    impostor.socket.send(JSON.stringify({ kind: 'snapshot', id: target.requests[0]?.id, snapshot: SNAPSHOT }))
    await expect(pending).rejects.toBeInstanceOf(ClientTimeoutError)
  })

  it('ignores malformed messages and keeps serving the client', async () => {
    const bridge = await startBridge()
    const browser = await connectBrowser(portOf(bridge))
    browser.socket.send(JSON.stringify({ kind: 'snapshot', snapshot: 'garbage' }))
    browser.socket.send('not json')
    answerWithSnapshot(browser)
    await expect(bridge.send(browser.id, { kind: 'getState' })).resolves.toMatchObject({ kind: 'snapshot' })
    expect(bridge.list()[0]?.snapshot?.x).toBe(1)
  })

  it('fails pending requests when their client disconnects', async () => {
    const bridge = await startBridge()
    const browser = await connectBrowser(portOf(bridge))
    const pending = bridge.send(browser.id, { kind: 'getState' })
    browser.socket.close()
    await expect(pending).rejects.toThrow(/disconnected before answering/)
    await wait(20)
    expect(bridge.list()).toHaveLength(0)
  })

  it('times out with advice to read the state before retrying', async () => {
    const bridge = await startBridge()
    const browser = await connectBrowser(portOf(bridge))
    await expect(bridge.send(browser.id, { kind: 'applyGate', gate: 'X' }, 100)).rejects.toThrow(
      /state is unknown: call get_state before retrying/,
    )
  })

  it('refuses pages from other origins', async () => {
    const bridge = await startBridge()
    await expect(connectBrowser(portOf(bridge), { origin: 'http://localhost:5173' })).rejects.toThrow(/401/)
    await expect(connectBrowser(portOf(bridge), { origin: 'https://evil.example' })).rejects.toThrow(/401/)
    expect(bridge.list()).toHaveLength(0)
  })

  it('survives an upgrade request with a malformed url', async () => {
    const bridge = await startBridge()
    const port = portOf(bridge)
    await new Promise<void>((resolve) => {
      const probe = connect(port, '127.0.0.1', () => {
        probe.write(
          'GET //[ HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
            'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n',
        )
      })
      probe.on('data', () => probe.destroy())
      probe.on('close', () => resolve())
      probe.on('error', () => resolve())
    })
    expect(bridge.status.state).toBe('listening')
    await expect(connectBrowser(port)).resolves.toMatchObject({ id: expect.stringMatching(/^tab-\d+$/) })
  })

  it('requires the token when one is configured', async () => {
    const bridge = await startBridge({ token: TOKEN })
    await expect(connectBrowser(portOf(bridge))).rejects.toThrow(/401/)
    await expect(connectBrowser(portOf(bridge), { token: 'wrong-token-of-enough-length' })).rejects.toThrow(/401/)
    await expect(connectBrowser(portOf(bridge), { token: TOKEN })).resolves.toMatchObject({ id: 'tab-1' })
  })

  it('refuses connections beyond the client cap', async () => {
    const bridge = await startBridge({ maxClients: 1 })
    await connectBrowser(portOf(bridge))
    await expect(connectBrowser(portOf(bridge))).rejects.toThrow(/401/)
  })

  it('does not bind after being closed while waiting for a busy port', async () => {
    const holder = await startBridge()
    const port = portOf(holder)
    const waiting = new BrowserBridge({ ...baseConfig, wsPort: port }, 30)
    await waiting.start()
    await waiting.close()
    await holder.close()
    await wait(150)
    expect(waiting.status.state).not.toBe('listening')
    const reuse = await startBridge({ wsPort: port })
    expect(reuse.status).toMatchObject({ state: 'listening', port })
  })

  it('reports a busy port and binds once it becomes free', async () => {
    const holder = await startBridge()
    const port = portOf(holder)
    const waiting = await startBridge({ wsPort: port }, 50)
    expect(waiting.status.state).toBe('unavailable')
    await expect(waiting.send('tab-1', { kind: 'getState' })).rejects.toBeInstanceOf(BridgeUnavailableError)

    await holder.close()
    for (let attempt = 0; attempt < 40 && waiting.status.state !== 'listening'; attempt += 1) await wait(25)
    expect(waiting.status).toMatchObject({ state: 'listening', port })
    await expect(connectBrowser(port)).resolves.toMatchObject({ id: 'tab-1' })
  })
})
