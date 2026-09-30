import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeCommand } from './commands'
import { SETTLE_LIMIT_MS } from './settle'
import type { BrowserMessage, CommandMessage } from '../protocol/messages'
import { useBlochStore } from '../store/useBlochStore'
import { useSequenceStore } from '../sequences/useSequenceStore'
import { Z_AXIS } from '../quantum/vector'
import { GATE_X } from '../quantum/gates'

const fromWire = (value: unknown): CommandMessage => value as CommandMessage
const store = () => useBlochStore.getState()

const snapshotOf = (reply: BrowserMessage) => {
  if (reply.kind === 'error') throw new Error(`unexpected error reply: ${reply.message}`)
  return reply.snapshot
}

describe('executeCommand', () => {
  beforeEach(() => {
    store().reset()
    store().setAnimationSpeed(1)
    store().setPrecession({ running: false, axis: Z_AXIS, omega: 1.2 })
    store().setRelaxationRunning(false)
    useSequenceStore.setState({ sequences: [], activeName: null, running: false })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns a snapshot for getState', async () => {
    const reply = await executeCommand('r1', { kind: 'getState' })
    expect(reply).toMatchObject({ kind: 'snapshot', id: 'r1' })
    expect(snapshotOf(reply).z).toBeCloseTo(1)
  })

  describe('applyGate', () => {
    it('answers when the animation completes, well before the fallback limit', async () => {
      vi.useFakeTimers()
      const startedAt = Date.now()
      const pending = executeCommand('r2', { kind: 'applyGate', gate: 'X' })
      for (let frame = 0; frame < 12; frame += 1) {
        store().advance(0.1)
        await vi.advanceTimersByTimeAsync(50)
      }
      const reply = await pending
      expect(Date.now() - startedAt).toBeLessThan(SETTLE_LIMIT_MS)
      expect(snapshotOf(reply).z).toBeCloseTo(-1)
      expect(snapshotOf(reply).history).toEqual(['X'])
    })

    it('completes the animation instantly when nothing drives the clock', async () => {
      vi.useFakeTimers()
      const pending = executeCommand('r3', { kind: 'applyGate', gate: 'H' })
      await vi.advanceTimersByTimeAsync(SETTLE_LIMIT_MS + 100)
      const snapshot = snapshotOf(await pending)
      expect(snapshot.x).toBeCloseTo(1)
      expect(snapshot.animating).toBe(false)
    })

    it('rejects unknown gates, missing angles and non finite angles', async () => {
      await expect(executeCommand('r4', fromWire({ kind: 'applyGate', gate: 'NOPE' }))).rejects.toThrow(/Unknown gate/)
      await expect(executeCommand('r5', { kind: 'applyGate', gate: 'Rx' })).rejects.toThrow(/requires an angle/)
      await expect(
        executeCommand('r6', fromWire({ kind: 'applyGate', gate: 'Rx', angle: 'x' })),
      ).rejects.toThrow(/finite/)
    })
  })

  it('sets the state from angles and rejects non numeric ones', async () => {
    const reply = await executeCommand('r7', { kind: 'setState', theta: Math.PI / 2, phi: Math.PI / 2 })
    expect(snapshotOf(reply).y).toBeCloseTo(1)
    await expect(executeCommand('r8', fromWire({ kind: 'setState', theta: null, phi: 0 }))).rejects.toThrow(/theta/)
  })

  it('jumps to a preset and rejects unknown ones', async () => {
    expect(snapshotOf(await executeCommand('r9', { kind: 'setPreset', preset: '|-i>' })).y).toBeCloseTo(-1)
    await expect(executeCommand('r10', fromWire({ kind: 'setPreset', preset: '|2>' }))).rejects.toThrow(/preset/)
  })

  describe('measurement', () => {
    it('collapses to the sampled pole and reports the outcome', async () => {
      await executeCommand('m1', { kind: 'setPreset', preset: '|+>' })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const reply = await executeCommand('m2', { kind: 'measure', basis: 'Z' })
      expect(reply).toMatchObject({ kind: 'outcome', basis: 'Z', outcome: 1 })
      expect(snapshotOf(reply).z).toBeCloseTo(-1)
    })

    it('finishes a pending animation before measuring', async () => {
      store().applyGate(GATE_X)
      expect(store().animation).not.toBeNull()
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      const reply = await executeCommand('m3', { kind: 'measure', basis: 'Z' })
      expect(reply).toMatchObject({ kind: 'outcome', outcome: 1 })
      expect(snapshotOf(reply).history).toEqual(['X', 'MZ'])
    })

    it('can be undone back to the state before the measurement', async () => {
      await executeCommand('m4', { kind: 'setPreset', preset: '|+>' })
      await executeCommand('m5', { kind: 'measure', basis: 'Z' })
      expect(snapshotOf(await executeCommand('m6', { kind: 'undo' })).x).toBeCloseTo(1)
    })

    it('samples shots without collapsing the state', async () => {
      await executeCommand('m7', { kind: 'setPreset', preset: '|+>' })
      const reply = await executeCommand('m8', { kind: 'runShots', basis: 'X', shots: 250 })
      expect(reply).toMatchObject({ kind: 'shots', basis: 'X', zero: 250, one: 0 })
      expect(snapshotOf(reply).x).toBeCloseTo(1)
      expect(store().shots).toEqual({ basis: 'X', zero: 250, one: 0 })
    })

    it('rejects invalid bases and shot counts', async () => {
      await expect(executeCommand('m9', fromWire({ kind: 'measure', basis: 'W' }))).rejects.toThrow(/basis/)
      await expect(executeCommand('m10', fromWire({ kind: 'runShots', basis: 'Z', shots: 0 }))).rejects.toThrow(
        /positive integer/,
      )
    })
  })

  describe('dynamics', () => {
    it('stopping precession leaves decoherence running', async () => {
      await executeCommand('d1', { kind: 'setDecoherence', running: true })
      await executeCommand('d2', { kind: 'setPrecession', running: false })
      expect(store().relaxationRunning).toBe(true)
    })

    it('stopping decoherence leaves precession running', async () => {
      await executeCommand('d3', { kind: 'setPrecession', running: true, axis: 'X', omega: 2 })
      await executeCommand('d4', { kind: 'setDecoherence', running: false })
      expect(store().precession).toMatchObject({ running: true, omega: 2 })
      expect(store().precession.axis).toEqual({ x: 1, y: 0, z: 0 })
    })

    it('starting one process stops the other', async () => {
      await executeCommand('d5', { kind: 'setPrecession', running: true })
      await executeCommand('d6', { kind: 'setDecoherence', running: true, t1: 2 })
      expect(store().precession.running).toBe(false)
      expect(store().relaxation.t1).toBe(2)
    })
  })

  describe('teaching overlays', () => {
    it('shows and clears a caption', async () => {
      await executeCommand('t1', { kind: 'explain', title: 'Hola', text: 'texto', formula: 'x^2' })
      expect(store().explanation).toEqual({ title: 'Hola', text: 'texto', formula: 'x^2' })
      await executeCommand('t2', { kind: 'clearExplanation' })
      expect(store().explanation).toBeNull()
    })

    it('rejects empty and oversized captions', async () => {
      await expect(executeCommand('t3', { kind: 'explain', text: '' })).rejects.toThrow(/non-empty/)
      await expect(executeCommand('t4', { kind: 'explain', text: 'x'.repeat(601) })).rejects.toThrow(/longer than/)
    })

    it('highlights and clears an axis', async () => {
      await executeCommand('t5', { kind: 'highlightAxis', axis: 'Y' })
      expect(store().highlightedAxis).toBe('Y')
      await executeCommand('t6', { kind: 'highlightAxis', axis: null })
      expect(store().highlightedAxis).toBeNull()
    })
  })

  describe('sequences', () => {
    it('loads a sequence without running it', async () => {
      const reply = await executeCommand('s1', {
        kind: 'loadSequence',
        name: 'demo',
        steps: [{ command: { kind: 'setPreset', preset: '|1>' } }, { command: { kind: 'applyGate', gate: 'H' } }],
      })
      expect(snapshotOf(reply).z).toBeCloseTo(1)
      expect(snapshotOf(reply).sequences).toEqual([{ name: 'demo', description: undefined, length: 2, position: 0 }])
      expect(snapshotOf(reply).activeSequence).toBe('demo')
    })

    it('validates every step before loading', async () => {
      await expect(
        executeCommand(
          's2',
          fromWire({
            kind: 'loadSequence',
            name: 'broken',
            steps: [{ command: { kind: 'reset' } }, { command: { kind: 'applyGate', gate: 'Q' } }],
          }),
        ),
      ).rejects.toThrow(/Unknown gate Q/)
      expect(useSequenceStore.getState().sequences).toHaveLength(0)
    })

    it('refuses to load or delete while the learner runs a step', async () => {
      useSequenceStore.getState().upsert({ name: 'busy', steps: [{ command: { kind: 'reset' } }] })
      useSequenceStore.getState().setRunning(true)
      await expect(
        executeCommand('s3', { kind: 'loadSequence', name: 'busy', steps: [{ command: { kind: 'undo' } }] }),
      ).rejects.toThrow(/running a sequence step/)
      await expect(executeCommand('s4', { kind: 'deleteSequence', name: 'busy' })).rejects.toThrow(
        /running a sequence step/,
      )
    })

    it('caps how many sequences a client holds', async () => {
      Array.from({ length: 50 }).forEach((_, index) =>
        useSequenceStore.getState().upsert({ name: `s${index}`, steps: [{ command: { kind: 'reset' } }] }),
      )
      await expect(
        executeCommand('s6', { kind: 'loadSequence', name: 'one-too-many', steps: [{ command: { kind: 'reset' } }] }),
      ).rejects.toThrow(/already holds 50 sequences/)
      await expect(
        executeCommand('s7', { kind: 'loadSequence', name: 's0', steps: [{ command: { kind: 'undo' } }] }),
      ).resolves.toMatchObject({ kind: 'snapshot' })
    })

    it('refuses to delete a sequence that does not exist', async () => {
      await expect(executeCommand('s5', { kind: 'deleteSequence', name: 'ghost' })).rejects.toThrow(/No sequence/)
    })
  })
})
