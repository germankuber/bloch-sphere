type Level = 'info' | 'warn' | 'error'

const isSilent = (): boolean => process.env.BLOCH_LOG_LEVEL === 'silent'

const write = (level: Level, message: string): void => {
  if (isSilent()) return
  process.stderr.write(`[bloch-sphere] ${new Date().toISOString()} ${level.toUpperCase()} ${message}\n`)
}

export const logger = {
  info: (message: string): void => write('info', message),
  warn: (message: string): void => write('warn', message),
  error: (message: string): void => write('error', message),
}
