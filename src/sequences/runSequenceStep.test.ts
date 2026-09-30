import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runNextSequenceStep } from './runSequenceStep'
import { useSequenceStore } from './useSequenceStore'
import type { SequenceStep } from '../protocol/messages'
import { useBlochStore } from '../store/useBlochStore'
import { blochVectorOfSystem } from '../quantum/qubit'
import { isVecCloseTo, vec3 } from '../quantum/vector'

const vector = () => blochVectorOfSystem(useBlochStore.getState().system)
const sequenceNamed = (name: string) => useSequenceStore.getState().sequences.find((entry) => entry.name === name)

const LESSON: readonly SequenceStep[] = [
  { command: { kind: 'setPreset', preset: '|+>' }, note: 'Empezamos en +X' },
  { command: { kind: 'highlightAxis', axis: 'Y' } },
  { command: { kind: 'setPreset', preset: '|-i>' }, note: 'Ahora en -Y' },
]

describe('runNextSequenceStep', () => {
  beforeEach(() => {
    useBlochStore.getState().reset()
    useSequenceStore.setState({ sequences: [], activeName: null, running: false })
    useSequenceStore.getState().upsert({ name: 'lesson', steps: LESSON })
  })

  afterEach(() => vi.useRealTimers())

  it('runs exactly one step per call, in order', async () => {
    expect(await runNextSequenceStep('lesson')).toEqual({ status: 'done' })
    expect(isVecCloseTo(vector(), vec3(1, 0, 0))).toBe(true)
    expect(sequenceNamed('lesson')?.position).toBe(1)

    expect(await runNextSequenceStep('lesson')).toEqual({ status: 'done' })
    expect(useBlochStore.getState().highlightedAxis).toBe('Y')
    expect(sequenceNamed('lesson')?.position).toBe(2)
  })

  it('shows the step note as a caption numbered by step', async () => {
    await runNextSequenceStep('lesson')
    expect(useBlochStore.getState().explanation).toEqual({ title: 'lesson · paso 1 de 3', text: 'Empezamos en +X' })
  })

  it('reports the end of the sequence without running anything else', async () => {
    await runNextSequenceStep('lesson')
    await runNextSequenceStep('lesson')
    await runNextSequenceStep('lesson')
    expect(isVecCloseTo(vector(), vec3(0, -1, 0))).toBe(true)
    expect(await runNextSequenceStep('lesson')).toEqual({ status: 'finished' })
    expect(sequenceNamed('lesson')?.position).toBe(3)
  })

  it('runs a gate step and waits for its animation', async () => {
    useSequenceStore.getState().upsert({ name: 'gate', steps: [{ command: { kind: 'applyGate', gate: 'X' } }] })
    vi.useFakeTimers()
    const pending = runNextSequenceStep('gate')
    expect(useSequenceStore.getState().running).toBe(true)
    await vi.advanceTimersByTimeAsync(7000)
    expect(await pending).toEqual({ status: 'done' })
    expect(isVecCloseTo(vector(), vec3(0, 0, -1), 1e-9)).toBe(true)
    expect(useSequenceStore.getState().running).toBe(false)
  })

  it('reports a failing step, keeps its position and releases the lock', async () => {
    const broken = [{ command: { kind: 'applyGate', gate: 'NOPE' } }] as unknown as readonly SequenceStep[]
    useSequenceStore.getState().upsert({ name: 'broken', steps: broken })
    const result = await runNextSequenceStep('broken')
    expect(result).toMatchObject({ status: 'failed' })
    expect(sequenceNamed('broken')?.position).toBe(0)
    expect(useSequenceStore.getState().running).toBe(false)
  })

  it('does not advance a sequence that was replaced while its step ran', async () => {
    useSequenceStore.getState().upsert({ name: 'gate', steps: [{ command: { kind: 'applyGate', gate: 'X' } }] })
    vi.useFakeTimers()
    const pending = runNextSequenceStep('gate')
    useSequenceStore.getState().upsert({ name: 'gate', steps: [{ command: { kind: 'reset' } }] })
    await vi.advanceTimersByTimeAsync(7000)
    expect(await pending).toMatchObject({ status: 'failed' })
    expect(sequenceNamed('gate')?.position).toBe(0)
  })

  it('refuses to run while another step is in progress', async () => {
    useSequenceStore.getState().setRunning(true)
    expect(await runNextSequenceStep('lesson')).toEqual({ status: 'busy' })
    expect(sequenceNamed('lesson')?.position).toBe(0)
  })

  it('reports a missing sequence', async () => {
    expect(await runNextSequenceStep('nope')).toEqual({ status: 'missing' })
  })
})
