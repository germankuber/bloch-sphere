import { describe, expect, expectTypeOf, it } from 'vitest'
import type { CommandKindMismatch, StepKindMismatch } from './messages'
import {
  BASIS_NAMES,
  FIXED_GATE_IDS,
  GATE_IDS,
  PARAMETRIC_GATE_IDS,
  PRESET_IDS,
  isCommandKind,
  isGateId,
  type BasisName,
} from './vocabulary'
import { FIXED_GATES } from '../quantum/gates'
import { BASES, type Basis } from '../quantum/measurement'
import { resolveGate, resolvePreset } from '../bridge/registry'

describe('protocol vocabulary', () => {
  it('keeps the command unions and the kind lists identical at compile time', () => {
    expectTypeOf<StepKindMismatch>().toBeNever()
    expectTypeOf<CommandKindMismatch>().toBeNever()
    expectTypeOf<Basis>().toEqualTypeOf<BasisName>()
  })

  it('names exactly the fixed gates the domain defines', () => {
    expect(FIXED_GATES.map((gate) => gate.id)).toEqual([...FIXED_GATE_IDS])
  })

  it.each(FIXED_GATE_IDS.map((id) => [id]))('resolves the fixed gate %s', (id) => {
    expect(resolveGate(id, undefined).id).toBe(id)
  })

  it.each(PARAMETRIC_GATE_IDS.map((id) => [id]))('resolves the parametric gate %s with an angle', (id) => {
    expect(resolveGate(id, 0.5).matrix).toBeDefined()
    expect(() => resolveGate(id, undefined)).toThrow(/requires an angle/)
  })

  it.each(PRESET_IDS.map((id) => [id]))('resolves the preset %s', (id) => {
    expect(resolvePreset(id).alpha).toBeDefined()
  })

  it('shares the measurement bases with the domain', () => {
    expect([...BASES].sort()).toEqual([...BASIS_NAMES].sort())
  })

  it('rejects anything outside the vocabulary', () => {
    expect(isGateId('SqrtX')).toBe(false)
    expect(isGateId(GATE_IDS[0])).toBe(true)
    expect(isCommandKind('setAngles')).toBe(false)
    expect(() => resolveGate('NOPE', undefined)).toThrow(/Unknown gate/)
    expect(() => resolvePreset('|2>')).toThrow(/Unknown preset/)
    expect(() => resolveGate('Rx', Number.NaN)).toThrow(/finite/)
  })
})
