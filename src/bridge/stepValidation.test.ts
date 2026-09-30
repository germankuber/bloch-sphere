import { describe, expect, it } from 'vitest'
import { validateSequence, validateStep } from './stepValidation'
import type { SequenceStep } from '../protocol/messages'

const fromStorage = (value: unknown): SequenceStep => value as SequenceStep

describe('validateStep', () => {
  it.each([
    ['a gate', { command: { kind: 'applyGate', gate: 'Rx', angle: 1 } }],
    ['a state', { command: { kind: 'setState', theta: 1, phi: 0 } }],
    ['a caption', { command: { kind: 'explain', text: 'hola' }, note: 'nota' }],
    ['a highlight reset', { command: { kind: 'highlightAxis', axis: null } }],
    ['a decoherence change', { command: { kind: 'setDecoherence', running: true, t1: 2 } }],
  ])('accepts %s', (_, step) => {
    expect(() => validateStep(fromStorage(step), 0)).not.toThrow()
  })

  it.each([
    ['a missing command', {}, /malformed/],
    ['an unknown kind', { command: { kind: 'teleport' } }, /unknown action/],
    ['an out of range angle', { command: { kind: 'applyGate', gate: 'Rz', angle: 100 } }, /between -8π and 8π/],
    ['a text angle', { command: { kind: 'setState', theta: '1', phi: 0 } }, /theta/],
    ['a fractional shot count', { command: { kind: 'runShots', basis: 'Z', shots: 2.5 } }, /positive integer/],
    ['a string flag', { command: { kind: 'setPrecession', running: 'yes' } }, /running/],
    ['an unknown axis', { command: { kind: 'highlightAxis', axis: 'W' } }, /basis/],
    ['a huge note', { command: { kind: 'reset' }, note: 'x'.repeat(401) }, /longer than/],
  ])('rejects %s', (_, step, message) => {
    expect(() => validateStep(fromStorage(step), 2)).toThrow(message)
  })

  it('names the step that failed', () => {
    expect(() => validateStep(fromStorage({ command: { kind: 'measure', basis: 'W' } }), 4)).toThrow(/^Step 5/)
  })
})

describe('validateSequence', () => {
  it('rejects bad names, descriptions and step lists', () => {
    const steps = [{ command: { kind: 'reset' } }]
    expect(() => validateSequence('', undefined, steps)).toThrow(/name/)
    expect(() => validateSequence('ok', 42, steps)).toThrow(/description/)
    expect(() => validateSequence('ok', undefined, [])).toThrow(/at least one step/)
    expect(() => validateSequence('ok', undefined, 'steps')).toThrow(/at least one step/)
    expect(() => validateSequence('ok', undefined, Array.from({ length: 101 }, () => steps[0]))).toThrow(/at most/)
  })
})
