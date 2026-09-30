import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Runner } from '../run'
import { errorResult } from '../format'
import { ACTION_NAMES, actionDefinition, clientIdSchema } from '../actions'

export const registerActionTools = (server: McpServer, run: Runner): void => {
  ACTION_NAMES.forEach((name) => {
    const action = actionDefinition(name)
    server.registerTool(
      name,
      {
        title: action.title,
        description: `${action.description} Targets the client given by clientId.`,
        inputSchema: { clientId: clientIdSchema, ...action.args },
      },
      async (input: Record<string, unknown>) => {
        const { clientId, ...args } = input
        try {
          return await run(String(clientId), action.toCommand(args), action.summary(args))
        } catch (error: unknown) {
          return errorResult(error instanceof Error ? error.message : 'Invalid arguments')
        }
      },
    )
  })
}
