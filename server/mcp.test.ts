import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from 'node:net'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { WebSocket } from 'ws'
import type { BrowserInbound, CommandMessage, RequestEnvelope } from '../src/protocol/messages'
import { SNAPSHOT } from './testing/fixtures'

type Responder = (request: RequestEnvelope) => unknown

interface FakeBrowser {
  readonly id: string
  readonly socket: WebSocket
  readonly received: CommandMessage[]
  respondWith: (responder: Responder) => void
}

const snapshotResponder: Responder = (request) => ({ kind: 'snapshot', id: request.id, snapshot: SNAPSHOT })

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const port = typeof address === 'object' && address ? address.port : 0
      probe.close(() => resolve(port))
    })
  })

const openBrowser = (port: number): Promise<FakeBrowser> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin: 'http://localhost:5180' })
    const received: CommandMessage[] = []
    let responder = snapshotResponder
    socket.once('error', reject)
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString()) as BrowserInbound
      if (message.kind === 'welcome') {
        resolve({ id: message.clientId, socket, received, respondWith: (next) => (responder = next) })
        return
      }
      received.push(message.command)
      socket.send(JSON.stringify(responder(message)))
    })
  })

const connectBrowser = async (port: number): Promise<FakeBrowser> => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      return await openBrowser(port)
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  throw new Error('the bridge never accepted the fake browser')
}

const textOf = (result: Awaited<ReturnType<Client['callTool']>>): string =>
  (result.content as { text: string }[]).map((part) => part.text).join('\n')

const EXPECTED_TOOLS = [
  'apply_gate',
  'clear_explanation',
  'clear_trail',
  'create_sequence',
  'delete_sequence',
  'explain',
  'get_state',
  'highlight_axis',
  'list_clients',
  'list_sequences',
  'measure',
  'reset',
  'run_shots',
  'set_decoherence',
  'set_precession',
  'set_preset',
  'set_state',
  'undo',
]

describe('MCP server over stdio', () => {
  let client: Client
  let browser: FakeBrowser

  beforeAll(async () => {
    const port = await freePort()
    const transport = new StdioClientTransport({
      command: 'pnpm',
      args: ['exec', 'tsx', 'server/index.ts'],
      env: { ...(process.env as Record<string, string>), BLOCH_WS_PORT: String(port), BLOCH_LOG_LEVEL: 'silent' },
      stderr: 'ignore',
    })
    client = new Client({ name: 'contract-test', version: '1.0.0' })
    await client.connect(transport)
    browser = await connectBrowser(port)
  }, 30000)

  beforeEach(() => {
    browser.received.length = 0
    browser.respondWith(snapshotResponder)
  })

  afterAll(async () => {
    browser?.socket.close()
    await client?.close()
  })

  it('exposes the documented tools and requires a clientId on every targeted one', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name).sort()).toEqual(EXPECTED_TOOLS)
    tools
      .filter((tool) => tool.name !== 'list_clients')
      .forEach((tool) => expect(tool.inputSchema.required ?? []).toContain('clientId'))
  })

  it('lists the connected browser with its live state', async () => {
    const text = textOf(await client.callTool({ name: 'list_clients', arguments: {} }))
    expect(text).toContain(`## ${browser.id}`)
    expect(text).toContain('Bloch vector = (1.0000, 0.0000, 0.0000)')
  })

  it.each([
    ['apply_gate', { gate: 'Rx', angle: 1.5 }, { kind: 'applyGate', gate: 'Rx', angle: 1.5 }],
    ['set_state', { theta: 1, phi: 2 }, { kind: 'setState', theta: 1, phi: 2 }],
    ['set_preset', { preset: '|-i>' }, { kind: 'setPreset', preset: '|-i>' }],
    ['highlight_axis', { axis: null }, { kind: 'highlightAxis', axis: null }],
    ['set_decoherence', { running: true, t1: 3 }, { kind: 'setDecoherence', running: true, t1: 3 }],
    ['explain', { text: 'hola', formula: 'x' }, { kind: 'explain', text: 'hola', formula: 'x' }],
    ['clear_trail', {}, { kind: 'clearTrail' }],
  ])('sends %s to the browser as the exact protocol command', async (name, args, expected) => {
    const result = await client.callTool({ name, arguments: { clientId: browser.id, ...args } })
    expect(result.isError).toBeFalsy()
    expect(textOf(result)).toMatch(new RegExp(`^\\[${browser.id}\\] `))
    expect(browser.received).toEqual([expected])
  })

  it('translates a sequence into protocol commands before sending it', async () => {
    const result = await client.callTool({
      name: 'create_sequence',
      arguments: {
        clientId: browser.id,
        name: 'demo',
        steps: [{ action: 'set_preset', preset: '|0>' }, { action: 'apply_gate', gate: 'H', note: 'hola' }],
      },
    })
    expect(result.isError).toBeFalsy()
    expect(browser.received).toEqual([
      {
        kind: 'loadSequence',
        name: 'demo',
        steps: [
          { command: { kind: 'setPreset', preset: '|0>' } },
          { command: { kind: 'applyGate', gate: 'H' }, note: 'hola' },
        ],
      },
    ])
  })

  it('reports measurement outcomes and shot counts', async () => {
    browser.respondWith((request) => ({ kind: 'outcome', id: request.id, basis: 'Z', outcome: 1, snapshot: SNAPSHOT }))
    const measured = textOf(await client.callTool({ name: 'measure', arguments: { clientId: browser.id, basis: 'Z' } }))
    expect(measured).toContain('Outcome in basis Z: 1')

    browser.respondWith((request) => ({ kind: 'shots', id: request.id, basis: 'X', zero: 9, one: 1, snapshot: SNAPSHOT }))
    const shots = textOf(
      await client.callTool({ name: 'run_shots', arguments: { clientId: browser.id, basis: 'X', shots: 10 } }),
    )
    expect(shots).toContain('10 shots in basis X: 9 zeros, 1 ones (90.0% / 10.0%)')
  })

  it('surfaces a browser side failure as a tool error', async () => {
    browser.respondWith((request) => ({ kind: 'error', id: request.id, message: 'No sequence named "x"' }))
    const result = await client.callTool({ name: 'delete_sequence', arguments: { clientId: browser.id, name: 'x' } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toBe(`Error: [${browser.id}] No sequence named "x"`)
  })

  it('answers with a clear error for an unknown client', async () => {
    const result = await client.callTool({ name: 'get_state', arguments: { clientId: 'tab-404' } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain(`Connected clients: ${browser.id}`)
  })

  it('rejects invalid arguments before reaching the browser', async () => {
    const missingAngle = await client.callTool({ name: 'apply_gate', arguments: { clientId: browser.id, gate: 'Rz' } })
    const badTheta = await client.callTool({ name: 'set_state', arguments: { clientId: browser.id, theta: 9, phi: 0 } })
    expect(missingAngle.isError).toBe(true)
    expect(badTheta.isError).toBe(true)
    expect(browser.received).toHaveLength(0)
  })
})
