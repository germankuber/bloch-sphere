import { describe, expect, it } from 'vitest'
import { buildBridgeUrl } from './bridgeUrl'
import { nextRetryDelay } from './useBridge'

describe('buildBridgeUrl', () => {
  it('defaults to the local bridge port', () => {
    expect(buildBridgeUrl(undefined, undefined)).toBe('ws://localhost:7331/')
  })

  it('uses the configured url and appends the token', () => {
    expect(buildBridgeUrl('ws://10.0.0.5:9000', 'a-long-enough-secret')).toBe(
      'ws://10.0.0.5:9000/?token=a-long-enough-secret',
    )
  })

  it('ignores blank values', () => {
    expect(buildBridgeUrl('  ', '  ')).toBe('ws://localhost:7331/')
  })
})

describe('nextRetryDelay', () => {
  it('grows exponentially without jitter', () => {
    const noJitter = () => 0.5
    expect([0, 1, 2, 3].map((attempt) => nextRetryDelay(attempt, noJitter))).toEqual([1000, 2000, 4000, 8000])
  })

  it('caps the delay', () => {
    expect(nextRetryDelay(20, () => 0.5)).toBe(15000)
  })

  it('spreads reconnections by up to thirty percent', () => {
    expect(nextRetryDelay(1, () => 0)).toBe(1400)
    expect(nextRetryDelay(1, () => 1)).toBe(2600)
  })
})
