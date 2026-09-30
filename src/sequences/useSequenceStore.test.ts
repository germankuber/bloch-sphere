import { beforeEach, describe, expect, it } from 'vitest'
import { restoreSequences, useSequenceStore } from './useSequenceStore'

const store = () => useSequenceStore.getState()

describe('useSequenceStore', () => {
  beforeEach(() => useSequenceStore.setState({ sequences: [], activeName: null, running: false }))

  it('loads a sequence at its first step and makes it active', () => {
    store().upsert({ name: 'a', steps: [{ command: { kind: 'reset' } }] })
    expect(store().sequences).toEqual([{ name: 'a', steps: [{ command: { kind: 'reset' } }], position: 0 }])
    expect(store().activeName).toBe('a')
  })

  it('replaces a sequence with the same name and restarts it', () => {
    store().upsert({ name: 'a', steps: [{ command: { kind: 'reset' } }, { command: { kind: 'undo' } }] })
    store().markExecuted('a')
    store().upsert({ name: 'a', steps: [{ command: { kind: 'clearTrail' } }] })
    expect(store().sequences).toHaveLength(1)
    expect(store().sequences[0]?.position).toBe(0)
  })

  it('never advances past the last step', () => {
    store().upsert({ name: 'a', steps: [{ command: { kind: 'reset' } }] })
    store().markExecuted('a')
    store().markExecuted('a')
    expect(store().sequences[0]?.position).toBe(1)
  })

  it('rewinds and removes by name', () => {
    store().upsert({ name: 'a', steps: [{ command: { kind: 'reset' } }] })
    store().markExecuted('a')
    store().rewind('a')
    expect(store().sequences[0]?.position).toBe(0)
    expect(store().remove('a')).toBe(true)
    expect(store().remove('a')).toBe(false)
    expect(store().activeName).toBeNull()
  })
})

describe('restoreSequences', () => {
  const valid = { name: 'ok', steps: [{ command: { kind: 'reset' } }], position: 1 }

  it('restores valid sequences and the active one', () => {
    expect(restoreSequences(JSON.stringify({ sequences: [valid], activeName: 'ok' }))).toEqual({
      sequences: [valid],
      activeName: 'ok',
    })
  })

  it('drops sequences from an older or corrupted format', () => {
    const restored = restoreSequences(
      JSON.stringify({
        sequences: [
          valid,
          { name: 'no-steps', position: 0 },
          { name: 'bad-kind', steps: [{ command: { kind: 'setAngles' } }], position: 0 },
          { name: 'bad-position', steps: [{ command: { kind: 'reset' } }], position: 5 },
          { name: 'bad-description', description: 7, steps: [{ command: { kind: 'reset' } }], position: 0 },
          { name: 'bad-args', steps: [{ command: { kind: 'setState', theta: 'x', phi: 0 } }], position: 0 },
        ],
        activeName: 'no-steps',
      }),
    )
    expect(restored.sequences.map((sequence) => sequence.name)).toEqual(['ok'])
    expect(restored.activeName).toBeNull()
  })

  it.each([null, '', 'not json', '42', '{"sequences":"x"}'])('falls back to empty for %j', (raw) => {
    expect(restoreSequences(raw)).toEqual({ sequences: [], activeName: null })
  })
})
