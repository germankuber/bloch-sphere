import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ACTION_NAMES, actionDefinition, type ActionName } from './actions'
import { stepsSchema, toSequenceSteps, type StepInput } from './sequenceSteps'
import { STEP_KINDS } from '../src/protocol/vocabulary'

const validate = (name: ActionName, input: Record<string, unknown>) =>
  z.object(actionDefinition(name).args).safeParse(input)

const commandFor = (name: ActionName, input: Record<string, unknown>) => actionDefinition(name).toCommand(input)

describe('actions', () => {
  it('cover every step kind of the protocol exactly once', () => {
    const samples: Record<ActionName, Record<string, unknown>> = {
      apply_gate: { gate: 'H' },
      set_state: { theta: 1, phi: 2 },
      set_preset: { preset: '|+>' },
      measure: { basis: 'Z' },
      run_shots: { basis: 'X', shots: 10 },
      set_precession: { running: true },
      set_decoherence: { running: false },
      explain: { text: 'hola' },
      clear_explanation: {},
      highlight_axis: { axis: 'Y' },
      reset: {},
      undo: {},
      clear_trail: {},
    }
    const kinds = ACTION_NAMES.map((name) => commandFor(name, samples[name]).kind).sort()
    expect(kinds).toEqual([...STEP_KINDS].sort())
  })

  it('translates arguments into protocol commands', () => {
    expect(commandFor('apply_gate', { gate: 'Rx', angle: 1 })).toEqual({ kind: 'applyGate', gate: 'Rx', angle: 1 })
    expect(commandFor('set_state', { theta: 1, phi: 2 })).toEqual({ kind: 'setState', theta: 1, phi: 2 })
    expect(commandFor('highlight_axis', { axis: null })).toEqual({ kind: 'highlightAxis', axis: null })
    expect(commandFor('set_decoherence', { running: true, t1: 2 })).toMatchObject({ kind: 'setDecoherence', t1: 2 })
  })

  it('requires an angle for parametric gates', () => {
    expect(() => commandFor('apply_gate', { gate: 'Ry' })).toThrow(/requires the angle/)
  })

  it.each([
    ['apply_gate', { gate: 'SqrtX' }],
    ['set_state', { theta: 4, phi: 0 }],
    ['set_state', { theta: -0.1, phi: 0 }],
    ['run_shots', { basis: 'Z', shots: 0 }],
    ['run_shots', { basis: 'Z', shots: 100001 }],
    ['run_shots', { basis: 'Z', shots: 2.5 }],
    ['measure', { basis: 'W' }],
    ['set_precession', { running: true, omega: 100 }],
    ['set_decoherence', { running: true, t1: 0 }],
    ['explain', { text: '' }],
    ['explain', { text: 'x'.repeat(601) }],
    ['explain', { text: 'ok', formula: 'x'.repeat(301) }],
    ['set_state', { theta: Number.POSITIVE_INFINITY, phi: 0 }],
    ['apply_gate', { gate: 'Rx', angle: 30 }],
  ] as const)('rejects %s with %j', (name, input) => {
    expect(validate(name, input).success).toBe(false)
  })
})

describe('sequence steps', () => {
  it('accepts every action with its tool arguments plus a note', () => {
    const parsed = stepsSchema.safeParse([
      { action: 'set_preset', preset: '|0>', note: 'inicio' },
      { action: 'apply_gate', gate: 'Rx', angle: 1 },
      { action: 'measure', basis: 'Z' },
      { action: 'highlight_axis', axis: null },
      { action: 'explain', text: 'hola', formula: 'x' },
      { action: 'reset' },
    ])
    expect(parsed.success).toBe(true)
  })

  it.each([
    ['an unknown action', [{ action: 'teleport' }]],
    ['an empty list', []],
    ['an unknown gate', [{ action: 'apply_gate', gate: 'SqrtX' }]],
    ['a note that is too long', [{ action: 'reset', note: 'x'.repeat(401) }]],
    ['an explain text that is too long', [{ action: 'explain', text: 'x'.repeat(601) }]],
    ['too many steps', Array.from({ length: 101 }, () => ({ action: 'reset' }))],
  ])('rejects %s', (_, steps) => {
    expect(stepsSchema.safeParse(steps).success).toBe(false)
  })

  it('translates steps into protocol commands and keeps the notes', () => {
    const steps: StepInput[] = [
      { action: 'set_preset', preset: '|+>', note: 'inicio' },
      { action: 'apply_gate', gate: 'S' },
      { action: 'run_shots', basis: 'Y', shots: 100 },
    ]
    expect(toSequenceSteps(steps)).toEqual([
      { command: { kind: 'setPreset', preset: '|+>' }, note: 'inicio' },
      { command: { kind: 'applyGate', gate: 'S', angle: undefined }, note: undefined },
      { command: { kind: 'runShots', basis: 'Y', shots: 100 }, note: undefined },
    ])
  })

  it('names the offending step', () => {
    expect(() => toSequenceSteps([{ action: 'reset' }, { action: 'apply_gate', gate: 'Ry' }])).toThrow(
      /Step 2 \(apply_gate\): Gate Ry requires the angle/,
    )
  })
})
