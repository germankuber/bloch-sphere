import { describe, expect, it } from 'vitest'
import {
  KET_MINUS,
  KET_MINUS_I,
  KET_ONE,
  KET_PLUS,
  KET_PLUS_I,
  KET_ZERO,
  anglesOfState,
  blochVectorOfState,
  stateFromAngles,
  stateFromBlochVector,
  stateNorm2,
  withGlobalPhase,
} from './state'
import { isVecCloseTo, vec3 } from './vector'

describe('state', () => {
  it.each([
    ['|0>', KET_ZERO, vec3(0, 0, 1)],
    ['|1>', KET_ONE, vec3(0, 0, -1)],
    ['|+>', KET_PLUS, vec3(1, 0, 0)],
    ['|->', KET_MINUS, vec3(-1, 0, 0)],
    ['|+i>', KET_PLUS_I, vec3(0, 1, 0)],
    ['|-i>', KET_MINUS_I, vec3(0, -1, 0)],
  ])('%s sits on its axis of the sphere', (_, ket, expected) => {
    expect(isVecCloseTo(blochVectorOfState(ket), expected)).toBe(true)
  })

  it('keeps states normalized for any angles', () => {
    ;[0, 0.5, 1.7, Math.PI].forEach((theta) =>
      [0, 1, 3, 6].forEach((phi) => expect(stateNorm2(stateFromAngles(theta, phi))).toBeCloseTo(1, 12)),
    )
  })

  it('round trips angles through the ket', () => {
    const angles = anglesOfState(stateFromAngles(1.2, 2.5))
    expect(angles.theta).toBeCloseTo(1.2, 12)
    expect(angles.phi).toBeCloseTo(2.5, 12)
  })

  it('round trips a Bloch vector through the ket', () => {
    const vector = vec3(0.36, -0.48, 0.8)
    expect(isVecCloseTo(blochVectorOfState(stateFromBlochVector(vector)), vector, 1e-12)).toBe(true)
  })

  it('does not move the Bloch vector when only the global phase changes', () => {
    const state = stateFromAngles(0.9, 1.4)
    const shifted = withGlobalPhase(state, 2.2)
    expect(shifted.alpha).not.toEqual(state.alpha)
    expect(isVecCloseTo(blochVectorOfState(shifted), blochVectorOfState(state), 1e-12)).toBe(true)
  })
})
