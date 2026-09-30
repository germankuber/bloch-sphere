import type { BrowserBridge } from './bridge'
import type { CommandMessage } from '../src/protocol/messages'
import { describeReply, errorResult, type ToolResult } from './format'

export type Runner = (clientId: string, command: CommandMessage, prefix: string) => Promise<ToolResult>

export const createRunner =
  (bridge: BrowserBridge): Runner =>
  async (clientId, command, prefix) => {
    try {
      const reply = await bridge.send(clientId, command)
      return describeReply(clientId, prefix, reply)
    } catch (error: unknown) {
      return errorResult(error instanceof Error ? error.message : 'Unknown failure')
    }
  }
