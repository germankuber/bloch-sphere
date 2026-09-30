import { useEffect } from 'react'
import type { BrowserMessage, RequestEnvelope } from '../protocol/messages'
import { parseInbound } from '../protocol/parseInbound'
import { executeCommand } from './commands'
import { liveSnapshot } from './snapshot'
import { bridgeUrl } from './bridgeUrl'
import { useBlochStore } from '../store/useBlochStore'

const INITIAL_RETRY_MS = 1000
const MAX_RETRY_MS = 15000
const JITTER_RATIO = 0.3

export const nextRetryDelay = (attempt: number, random: () => number = Math.random): number => {
  const exponential = Math.min(MAX_RETRY_MS, INITIAL_RETRY_MS * 2 ** attempt)
  const jitter = exponential * JITTER_RATIO * (random() * 2 - 1)
  return Math.round(exponential + jitter)
}

const send = (socket: WebSocket, message: BrowserMessage): void => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

const answer = async (socket: WebSocket, request: RequestEnvelope): Promise<void> => {
  try {
    send(socket, await executeCommand(request.id, request.command))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Command failed'
    send(socket, { kind: 'error', id: request.id, message })
  }
}

export const useBridge = (): void => {
  const setBridgeConnected = useBlochStore((store) => store.setBridgeConnected)
  const setClientId = useBlochStore((store) => store.setClientId)

  useEffect(() => {
    let active: WebSocket | null = null
    let reconnect: ReturnType<typeof setTimeout> | null = null
    let attempt = 0
    let disposed = false
    let pendingWork: Promise<void> = Promise.resolve()

    const scheduleReconnect = () => {
      if (disposed) return
      reconnect = setTimeout(connect, nextRetryDelay(attempt))
      attempt += 1
    }

    const connect = () => {
      if (disposed) return
      const socket = new WebSocket(bridgeUrl())
      active = socket
      const isCurrent = () => active === socket && !disposed

      socket.onopen = () => {
        if (isCurrent()) setBridgeConnected(true)
      }

      socket.onmessage = (event) => {
        if (!isCurrent()) return
        const message = parseInbound(String(event.data))
        if (!message) return

        if (message.kind === 'welcome') {
          attempt = 0
          setClientId(message.clientId)
          send(socket, { kind: 'snapshot', snapshot: liveSnapshot() })
          return
        }

        pendingWork = pendingWork.then(() => (isCurrent() ? answer(socket, message) : undefined))
      }

      socket.onclose = () => {
        if (!isCurrent()) return
        active = null
        setBridgeConnected(false)
        setClientId(null)
        scheduleReconnect()
      }

      socket.onerror = () => socket.close()
    }

    const deferredFirstConnect = setTimeout(connect, 0)

    return () => {
      disposed = true
      clearTimeout(deferredFirstConnect)
      if (reconnect) clearTimeout(reconnect)
      active?.close()
      active = null
    }
  }, [setBridgeConnected, setClientId])
}
