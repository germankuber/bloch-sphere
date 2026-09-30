import { describe, expect, it } from 'vitest'
import { parseBrowserMessage } from './inbound'
import { SNAPSHOT } from './testing/fixtures'

const raw = (value: unknown): string => JSON.stringify(value)

describe('parseBrowserMessage', () => {
  it('accepts every well formed message kind', () => {
    expect(parseBrowserMessage(raw({ kind: 'snapshot', snapshot: SNAPSHOT })).ok).toBe(true)
    expect(parseBrowserMessage(raw({ kind: 'snapshot', id: 'r', snapshot: SNAPSHOT })).ok).toBe(true)
    expect(parseBrowserMessage(raw({ kind: 'outcome', id: 'r', basis: 'Z', outcome: 1, snapshot: SNAPSHOT })).ok).toBe(true)
    expect(parseBrowserMessage(raw({ kind: 'shots', id: 'r', basis: 'X', zero: 3, one: 1, snapshot: SNAPSHOT })).ok).toBe(
      true,
    )
    expect(parseBrowserMessage(raw({ kind: 'error', id: 'r', message: 'boom' })).ok).toBe(true)
  })

  it.each([
    ['invalid JSON', 'nope'],
    ['an unknown kind', raw({ kind: 'hello' })],
    ['a snapshot with the wrong shape', raw({ kind: 'snapshot', snapshot: 'x' })],
    ['a snapshot with a non numeric angle', raw({ kind: 'snapshot', snapshot: { ...SNAPSHOT, theta: 'a' } })],
    ['a probability above one', raw({ kind: 'snapshot', snapshot: { ...SNAPSHOT, probabilities: { ...SNAPSHOT.probabilities, Z: [2, 0] } } })],
    ['an empty shot count', raw({ kind: 'shots', id: 'r', basis: 'X', zero: 0, one: 0, snapshot: SNAPSHOT })],
    ['an invalid outcome', raw({ kind: 'outcome', id: 'r', basis: 'Z', outcome: 2, snapshot: SNAPSHOT })],
    ['an oversized sequence name', raw({ kind: 'snapshot', snapshot: { ...SNAPSHOT, sequences: [{ name: 'x'.repeat(61), length: 1, position: 0 }] } })],
    ['an oversized error message', raw({ kind: 'error', id: 'r', message: 'x'.repeat(501) })],
    ['a reply without id', raw({ kind: 'error', message: 'x' })],
  ])('rejects %s', (_, message) => {
    expect(parseBrowserMessage(message).ok).toBe(false)
  })
})
