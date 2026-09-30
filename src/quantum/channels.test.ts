import { describe, expect, it } from 'vitest'
import { amplitudeDamping, dephasing, depolarizing, relaxationStep } from './channels'
import { isVecCloseTo, vec3, vecLength } from './vector'

const PLUS = vec3(1, 0, 0)

describe('channels', () => {
  it('amplitude damping drives any state toward |0>', () => {
    expect(isVecCloseTo(amplitudeDamping(vec3(0, 0, -1), 1), vec3(0, 0, 1))).toBe(true)
  })

  it('dephasing kills coherence and keeps populations', () => {
    const dephased = dephasing(vec3(0.6, 0, 0.8), 1)
    expect(isVecCloseTo(dephased, vec3(0, 0, 0.8))).toBe(true)
  })

  it('depolarizing shrinks the vector uniformly', () => {
    expect(vecLength(depolarizing(PLUS, 0.25))).toBeCloseTo(0.75)
  })

  it('never pushes a state outside the sphere', () => {
    const relaxed = relaxationStep(vec3(0, 0.6, -0.8), { t1: 2, t2: 1, depolarizingRate: 0.3 }, 0.4)
    expect(vecLength(relaxed)).toBeLessThanOrEqual(1)
  })

  it('does not depend on how elapsed time is split into ticks', () => {
    const parameters = { t1: 3, t2: 1.5, depolarizingRate: 0.2 }
    const oneJump = relaxationStep(PLUS, parameters, 2)
    const manyTicks = Array.from({ length: 80 }).reduce<typeof PLUS>(
      (vector) => relaxationStep(vector, parameters, 2 / 80),
      PLUS,
    )
    expect(isVecCloseTo(oneJump, manyTicks, 1e-9)).toBe(true)
  })

  it('reduces to amplitude damping when only T1 acts', () => {
    const state = vec3(0.6, 0, -0.8)
    const relaxed = relaxationStep(state, { t1: 2, t2: Infinity, depolarizingRate: 0 }, 0.7)
    expect(isVecCloseTo(relaxed, amplitudeDamping(state, 1 - Math.exp(-0.7 / 2)), 1e-12)).toBe(true)
  })

  it('reduces to depolarizing when only the depolarizing rate acts', () => {
    const state = vec3(0, 0.6, 0.8)
    const relaxed = relaxationStep(state, { t1: Infinity, t2: Infinity, depolarizingRate: 0.9 }, 1.3)
    expect(isVecCloseTo(relaxed, depolarizing(state, 1 - Math.exp(-0.9 * 1.3)), 1e-12)).toBe(true)
  })

  it('settles at the z equilibrium set by T1 against depolarizing', () => {
    const settled = relaxationStep(vec3(0, 0, -1), { t1: 1, t2: 1, depolarizingRate: 1 }, 60)
    expect(settled.z).toBeCloseTo(0.5, 9)
  })

  it('limits T2 to twice T1, the physical bound', () => {
    const state = vec3(1, 0, 0)
    const unphysical = relaxationStep(state, { t1: 1, t2: 50, depolarizingRate: 0 }, 1)
    const bound = relaxationStep(state, { t1: 1, t2: 2, depolarizingRate: 0 }, 1)
    expect(isVecCloseTo(unphysical, bound, 1e-12)).toBe(true)
  })

  it('does nothing when no time passes', () => {
    const state = vec3(0.3, -0.4, 0.5)
    expect(isVecCloseTo(relaxationStep(state, { t1: 1, t2: 0.5, depolarizingRate: 2 }, 0), state, 1e-15)).toBe(true)
  })

  it('keeps every state inside the sphere for many parameter sets', () => {
    const states = [vec3(1, 0, 0), vec3(0, 0, -1), vec3(0.6, 0.8, 0), vec3(0, 0.6, -0.8)]
    const parameterSets = [0.2, 1, 7].flatMap((t1) =>
      [0.1, 1, 20].flatMap((t2) => [0, 0.5, 3].map((depolarizingRate) => ({ t1, t2, depolarizingRate }))),
    )
    states.forEach((state) =>
      parameterSets.forEach((parameters) =>
        [0.01, 0.5, 5].forEach((dt) =>
          expect(vecLength(relaxationStep(state, parameters, dt))).toBeLessThanOrEqual(1 + 1e-12),
        ),
      ),
    )
  })

  it('treats a non positive time constant as no relaxation', () => {
    expect(isVecCloseTo(relaxationStep(PLUS, { t1: 0, t2: 0, depolarizingRate: 0 }, 5), PLUS)).toBe(true)
  })
})
