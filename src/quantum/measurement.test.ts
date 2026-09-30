import { describe, expect, it } from 'vitest'
import { collapsedVector, outcomeProbabilities, sampleOutcome, sampleShots } from './measurement'
import { isVecCloseTo, vec3 } from './vector'

const sequenceRandom = (values: readonly number[]) => {
  const iterator = values[Symbol.iterator]()
  return () => iterator.next().value ?? 0
}

describe('measurement', () => {
  it('gives certainty along the measured axis', () => {
    expect(outcomeProbabilities(vec3(1, 0, 0), 'X')).toEqual([1, 0])
    expect(outcomeProbabilities(vec3(0, -1, 0), 'Y')).toEqual([0, 1])
  })

  it('gives a fair coin on an orthogonal axis', () => {
    const [zero, one] = outcomeProbabilities(vec3(1, 0, 0), 'Z')
    expect(zero).toBeCloseTo(0.5)
    expect(one).toBeCloseTo(0.5)
  })

  it('gives a fair coin at the center of the sphere', () => {
    expect(outcomeProbabilities(vec3(0, 0, 0), 'Y')).toEqual([0.5, 0.5])
  })

  it('always sums to one', () => {
    const [zero, one] = outcomeProbabilities(vec3(0.3, -0.2, 0.6), 'Z')
    expect(zero + one).toBeCloseTo(1, 12)
  })

  it('samples against the probability of zero', () => {
    expect(sampleOutcome(0.3, () => 0.29)).toBe(0)
    expect(sampleOutcome(0.3, () => 0.31)).toBe(1)
  })

  it('counts shots with an injected random source', () => {
    expect(sampleShots(0.5, 4, sequenceRandom([0.1, 0.9, 0.2, 0.7]))).toEqual([2, 2])
  })

  it('collapses to the pole of the measured axis', () => {
    expect(isVecCloseTo(collapsedVector('Z', 1), vec3(0, 0, -1))).toBe(true)
    expect(isVecCloseTo(collapsedVector('X', 0), vec3(1, 0, 0))).toBe(true)
  })
})
