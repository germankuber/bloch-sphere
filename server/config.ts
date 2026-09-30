import { timingSafeEqual } from 'node:crypto'
import { DEFAULT_APP_ORIGINS, WS_PORT } from '../src/protocol/ports'

export interface ServerConfig {
  readonly wsHost: string
  readonly wsPort: number
  readonly allowedOrigins: readonly string[]
  readonly token: string | null
  readonly maxClients: number
}

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_MAX_CLIENTS = 16
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['127.0.0.1', 'localhost', '::1'])
const MIN_TOKEN_LENGTH = 16

export class ConfigError extends Error {}

const parseInteger = (name: string, raw: string | undefined, fallback: number, min: number, max: number): number => {
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`${name} must be an integer between ${min} and ${max}, got "${raw}".`)
  }
  return value
}

const parseOrigins = (raw: string | undefined): readonly string[] => {
  if (raw === undefined || raw.trim() === '') return DEFAULT_APP_ORIGINS
  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
  if (origins.length === 0) throw new ConfigError('BLOCH_ALLOWED_ORIGINS is set but has no origins.')
  return origins
}

const parseToken = (raw: string | undefined): string | null => {
  const token = raw?.trim() ?? ''
  if (token === '') return null
  if (token.length < MIN_TOKEN_LENGTH) {
    throw new ConfigError(`BLOCH_BRIDGE_TOKEN must have at least ${MIN_TOKEN_LENGTH} characters.`)
  }
  return token
}

export const isLoopbackHost = (host: string): boolean => LOOPBACK_HOSTS.has(host)

export const readConfig = (env: NodeJS.ProcessEnv = process.env): ServerConfig => {
  const wsHost = env.BLOCH_WS_HOST?.trim() || DEFAULT_HOST
  const token = parseToken(env.BLOCH_BRIDGE_TOKEN)
  if (!isLoopbackHost(wsHost) && token === null) {
    throw new ConfigError(
      `BLOCH_WS_HOST=${wsHost} exposes the bridge beyond this machine. Set BLOCH_BRIDGE_TOKEN (and VITE_BLOCH_BRIDGE_TOKEN in the page) to allow it.`,
    )
  }
  return {
    wsHost,
    wsPort: parseInteger('BLOCH_WS_PORT', env.BLOCH_WS_PORT, WS_PORT, 0, 65535),
    allowedOrigins: parseOrigins(env.BLOCH_ALLOWED_ORIGINS),
    token,
    maxClients: parseInteger('BLOCH_MAX_CLIENTS', env.BLOCH_MAX_CLIENTS, DEFAULT_MAX_CLIENTS, 1, 256),
  }
}

export const isOriginAllowed = (origin: string | undefined, allowed: readonly string[]): boolean =>
  origin === undefined || origin === '' || allowed.includes(origin)

export const isTokenValid = (presented: string | null, expected: string | null): boolean => {
  if (expected === null) return true
  if (presented === null) return false
  const left = Buffer.from(presented)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

export const tokenFromRequestUrl = (url: string | undefined): string | null => {
  if (!url) return null
  try {
    return new URL(url, 'http://bridge.local').searchParams.get('token')
  } catch {
    return null
  }
}
