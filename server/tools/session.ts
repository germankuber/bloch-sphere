import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { BrowserBridge } from '../bridge'
import type { Runner } from '../run'
import { clientIdSchema } from '../actions'
import { describeSnapshot, errorResult, textResult } from '../format'
import type { BlochSnapshot } from '../../src/protocol/messages'
import { APP_DEV_PORT } from '../../src/protocol/ports'

const LIST_TIMEOUT_MS = 2500

const describeSafely = (snapshot: BlochSnapshot): string => {
  try {
    return describeSnapshot(snapshot)
  } catch {
    return 'state unreadable'
  }
}

const freshSnapshot = async (bridge: BrowserBridge, clientId: string): Promise<BlochSnapshot | null> => {
  try {
    const reply = await bridge.send(clientId, { kind: 'getState' }, LIST_TIMEOUT_MS)
    return 'snapshot' in reply ? reply.snapshot : null
  } catch {
    return null
  }
}

export const registerSessionTools = (server: McpServer, bridge: BrowserBridge, run: Runner): void => {
  server.registerTool(
    'list_clients',
    {
      title: 'List connected sphere pages',
      description:
        'List every browser tab currently connected to this server, with its id and live state. Every other tool needs one of these ids as clientId. Call this first, and again if a tool reports that a client is not connected.',
      inputSchema: {},
    },
    async () => {
      const status = bridge.status
      if (status.state === 'unavailable') return errorResult(status.reason)

      const clients = bridge.list()
      if (clients.length === 0) {
        return textResult(
          `No client is connected. Ask the learner to open the Bloch sphere page (http://localhost:${APP_DEV_PORT}) in a browser tab.`,
        )
      }

      const entries = await Promise.all(
        clients.map(async (client) => {
          const snapshot = (await freshSnapshot(bridge, client.id)) ?? client.snapshot
          const state = snapshot ? describeSafely(snapshot) : 'state unavailable'
          return `## ${client.id}\nconnected at ${client.connectedAt.toISOString()}\n${state}`
        }),
      )

      return textResult(`${clients.length} connected client(s).\n\n${entries.join('\n\n')}`)
    },
  )

  server.registerTool(
    'get_state',
    {
      title: 'Read the qubit state of a client',
      description:
        'Return the live state shown on one client: angles, Bloch vector, amplitudes, purity, probabilities in the X, Y and Z bases, gate history and loaded sequences with their progress. Call this before explaining anything so the description matches what the learner sees.',
      inputSchema: { clientId: clientIdSchema },
    },
    ({ clientId }) => run(clientId, { kind: 'getState' }, 'Current state:'),
  )

}
