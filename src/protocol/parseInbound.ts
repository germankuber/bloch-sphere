import type { BrowserInbound } from './messages'
import { isCommandKind } from './vocabulary'

const MAX_ID_LENGTH = 128

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isShortString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH

export const parseInbound = (raw: string): BrowserInbound | null => {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  if (parsed.kind === 'welcome') return isShortString(parsed.clientId) ? (parsed as unknown as BrowserInbound) : null
  if (parsed.kind !== 'request' || !isShortString(parsed.id)) return null
  if (!isRecord(parsed.command) || !isCommandKind(parsed.command.kind)) return null
  return parsed as unknown as BrowserInbound
}
