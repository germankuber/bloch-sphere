import { describe, expect, it } from 'vitest'
import {
  FIXED_GATES,
  GATE_H,
  GATE_S,
  GATE_T,
  GATE_X,
  phaseGate,
  rxGate,
  ryGate,
  rzGate,
  universalGate,
  type Gate,
} from './gates'
import { applyMatrix, isUnitary } from './matrix'
import { blochVectorOfState, stateFromAngles } from './state'
import { isVecCloseTo, normalizeVec, rotateAroundAxis, vec3, X_AXIS, Z_AXIS } from './vector'

const SAMPLE_STATES = [0, 0.4, 1.1, Math.PI / 2, 2.3, Math.PI].flatMap((theta) =>
  [0, 0.7, Math.PI / 2, 2.9, 4.4].map((phi) => stateFromAngles(theta, phi)),
)

const PARAMETRIC_GATES: readonly Gate[] = [0.3, Math.PI / 3, Math.PI, 5.1].flatMap((angle) => [
  rxGate(angle),
  ryGate(angle),
  rzGate(angle),
  phaseGate(angle),
])

const ALL_GATES = [...FIXED_GATES, ...PARAMETRIC_GATES, universalGate(0.8, 1.9, 2.7)]

describe('gates', () => {
  it.each(ALL_GATES.map((gate) => [gate.label, gate] as const))('%s is unitary', (_, gate) => {
    expect(isUnitary(gate.matrix)).toBe(true)
  })

  it.each(ALL_GATES.map((gate) => [gate.label, gate] as const))(
    '%s rotates the Bloch vector exactly as its matrix acts on the ket',
    (_, gate) => {
      SAMPLE_STATES.forEach((state) => {
        const algebraic = blochVectorOfState(applyMatrix(gate.matrix, state))
        const geometric = rotateAroundAxis(blochVectorOfState(state), gate.rotation.axis, gate.rotation.angle)
        expect(isVecCloseTo(algebraic, geometric, 1e-9)).toBe(true)
      })
    },
  )

  it('derives the textbook axes and angles', () => {
    expect(isVecCloseTo(GATE_X.rotation.axis, X_AXIS)).toBe(true)
    expect(GATE_X.rotation.angle).toBeCloseTo(Math.PI)
    expect(isVecCloseTo(GATE_H.rotation.axis, normalizeVec(vec3(1, 0, 1)))).toBe(true)
    expect(GATE_H.rotation.angle).toBeCloseTo(Math.PI)
    expect(isVecCloseTo(GATE_S.rotation.axis, Z_AXIS)).toBe(true)
    expect(GATE_S.rotation.angle).toBeCloseTo(Math.PI / 2)
    expect(GATE_T.rotation.angle).toBeCloseTo(Math.PI / 4)
  })

  it('uses unique ids so they can be addressed by name', () => {
    const ids = FIXED_GATES.map((gate) => gate.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(['I', 'X', 'Y', 'Z', 'H', 'S', 'Sdg', 'T', 'Tdg', 'SX'])
  })
})
