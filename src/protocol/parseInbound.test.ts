import { describe, expect, it } from 'vitest'
import { parseInbound } from './parseInbound'

describe('parseInbound', () => {
  it('accepts a welcome with a client id', () => {
    expect(parseInbound('{"kind":"welcome","clientId":"tab-1"}')).toEqual({ kind: 'welcome', clientId: 'tab-1' })
  })

  it('accepts a request for a known command', () => {
    const raw = JSON.stringify({ kind: 'request', id: 'r1', command: { kind: 'applyGate', gate: 'H' } })
    expect(parseInbound(raw)).toEqual({ kind: 'request', id: 'r1', command: { kind: 'applyGate', gate: 'H' } })
  })

  it.each([
    ['not json', 'nope'],
    ['a bare value', '42'],
    ['an unknown kind', '{"kind":"hello"}'],
    ['a welcome without id', '{"kind":"welcome"}'],
    ['a request without id', '{"kind":"request","command":{"kind":"getState"}}'],
    ['a request with an unknown command', '{"kind":"request","id":"r","command":{"kind":"setAngles"}}'],
    ['a request without command', '{"kind":"request","id":"r"}'],
  ])('rejects %s', (_, raw) => {
    expect(parseInbound(raw)).toBeNull()
  })
})
