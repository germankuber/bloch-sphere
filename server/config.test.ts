import { describe, expect, it } from 'vitest'
import { ConfigError, isOriginAllowed, isTokenValid, readConfig, tokenFromRequestUrl } from './config'

const TOKEN = 'a-sufficiently-long-token'

describe('readConfig', () => {
  it('defaults to a loopback bridge that only accepts the app origins', () => {
    expect(readConfig({})).toEqual({
      wsHost: '127.0.0.1',
      wsPort: 7331,
      allowedOrigins: [
        'http://localhost:5180',
        'http://127.0.0.1:5180',
        'http://localhost:4180',
        'http://127.0.0.1:4180',
      ],
      token: null,
      maxClients: 16,
    })
  })

  it('reads every setting from the environment', () => {
    expect(
      readConfig({
        BLOCH_WS_HOST: '0.0.0.0',
        BLOCH_WS_PORT: '9000',
        BLOCH_ALLOWED_ORIGINS: 'https://a.example, https://b.example',
        BLOCH_BRIDGE_TOKEN: TOKEN,
        BLOCH_MAX_CLIENTS: '4',
      }),
    ).toEqual({
      wsHost: '0.0.0.0',
      wsPort: 9000,
      allowedOrigins: ['https://a.example', 'https://b.example'],
      token: TOKEN,
      maxClients: 4,
    })
  })

  it('refuses to expose the bridge beyond loopback without a token', () => {
    expect(() => readConfig({ BLOCH_WS_HOST: '0.0.0.0' })).toThrow(/BLOCH_BRIDGE_TOKEN/)
  })

  it.each(['abc', '-1', '70000', '1.5'])('rejects the invalid port %s', (port) => {
    expect(() => readConfig({ BLOCH_WS_PORT: port })).toThrow(ConfigError)
  })

  it('rejects short tokens, empty origin lists and invalid client caps', () => {
    expect(() => readConfig({ BLOCH_BRIDGE_TOKEN: 'short' })).toThrow(/at least 16/)
    expect(() => readConfig({ BLOCH_ALLOWED_ORIGINS: ' , ' })).toThrow(ConfigError)
    expect(() => readConfig({ BLOCH_MAX_CLIENTS: '0' })).toThrow(ConfigError)
  })
})

describe('isOriginAllowed', () => {
  const allowed = ['http://localhost:5180']

  it('accepts listed origins and local tools that send none', () => {
    expect(isOriginAllowed('http://localhost:5180', allowed)).toBe(true)
    expect(isOriginAllowed(undefined, allowed)).toBe(true)
  })

  it.each(['http://localhost:5173', 'https://evil.example', 'http://localhost:5180.evil.example', 'null'])(
    'rejects %s',
    (origin) => {
      expect(isOriginAllowed(origin, allowed)).toBe(false)
    },
  )
})

describe('bridge token', () => {
  it('is not required when none is configured', () => {
    expect(isTokenValid(null, null)).toBe(true)
  })

  it('must match exactly when configured', () => {
    expect(isTokenValid(TOKEN, TOKEN)).toBe(true)
    expect(isTokenValid(null, TOKEN)).toBe(false)
    expect(isTokenValid(`${TOKEN}x`, TOKEN)).toBe(false)
  })

  it('is read from the query string of the upgrade request', () => {
    expect(tokenFromRequestUrl(`/?token=${TOKEN}`)).toBe(TOKEN)
    expect(tokenFromRequestUrl('/')).toBeNull()
    expect(tokenFromRequestUrl(undefined)).toBeNull()
    expect(tokenFromRequestUrl('//[')).toBeNull()
  })
})
