import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const TSX = fileURLToPath(new URL('../node_modules/.bin/tsx', import.meta.url))
const EXIT_DEADLINE_MS = 10000

const launchServer = (env: Record<string, string>) =>
  spawn(TSX, ['server/index.ts'], {
    cwd: REPO_ROOT,
    env: { ...process.env, BLOCH_WS_PORT: '0', BLOCH_LOG_LEVEL: 'silent', ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

const exitOf = (child: ReturnType<typeof launchServer>): Promise<{ code: number | null; stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk.toString()))
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()))
    const deadline = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('the server did not exit in time'))
    }, EXIT_DEADLINE_MS)
    child.on('exit', (code) => {
      clearTimeout(deadline)
      resolve({ code, stdout, stderr })
    })
  })

describe('MCP server process', () => {
  it('exits cleanly when the agent closes stdin, without writing anything to stdout', async () => {
    const child = launchServer({})
    const exited = exitOf(child)
    child.stdin.end()
    const { code, stdout } = await exited
    expect(code).toBe(0)
    expect(stdout).toBe('')
  }, 20000)

  it('refuses to start with an invalid configuration and explains why on stderr', async () => {
    const child = launchServer({ BLOCH_WS_PORT: 'not-a-port', BLOCH_LOG_LEVEL: 'info' })
    const { code, stdout, stderr } = await exitOf(child)
    expect(code).toBe(1)
    expect(stdout).toBe('')
    expect(stderr).toContain('BLOCH_WS_PORT must be an integer')
  }, 20000)
})
