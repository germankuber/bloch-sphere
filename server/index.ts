import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { BrowserBridge } from './bridge'
import { ConfigError, readConfig } from './config'
import { logger } from './logger'
import { createRunner } from './run'
import { registerSessionTools } from './tools/session'
import { registerActionTools } from './tools/actions'
import { registerSequenceTools } from './tools/sequences'

const loadConfig = () => {
  try {
    return readConfig()
  } catch (error: unknown) {
    logger.error(error instanceof ConfigError ? error.message : `Invalid configuration: ${String(error)}`)
    process.exit(1)
  }
}

const config = loadConfig()
const bridge = new BrowserBridge(config)
await bridge.start()

const server = new McpServer({ name: 'bloch-sphere', version: '2.0.0' })
const run = createRunner(bridge)

registerSessionTools(server, bridge, run)
registerActionTools(server, run)
registerSequenceTools(server, run)

const SHUTDOWN_DEADLINE_MS = 3000
let shuttingDown = false

const shutdown = async (exitCode: number): Promise<void> => {
  if (shuttingDown) return
  shuttingDown = true
  setTimeout(() => process.exit(exitCode), SHUTDOWN_DEADLINE_MS).unref()
  await bridge.close()
  process.exit(exitCode)
}

process.stdin.on('end', () => void shutdown(0))
process.stdin.on('close', () => void shutdown(0))
process.on('SIGINT', () => void shutdown(0))
process.on('SIGTERM', () => void shutdown(0))
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.stack ?? error.message}`)
  void shutdown(1)
})
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}`)
  void shutdown(1)
})

await server.connect(new StdioServerTransport())
logger.info('MCP server ready on stdio')
