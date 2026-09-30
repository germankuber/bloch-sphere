import { abs2 } from './complex'
import { blochVectorOfState, type QubitState } from './state'
import { X_AXIS, Y_AXIS, Z_AXIS, dot, scaleVec, type Vec3 } from './vector'

export type Basis = 'Z' | 'X' | 'Y'
export type Outcome = 0 | 1
export type RandomSource = () => number

export const BASIS_AXIS: Readonly<Record<Basis, Vec3>> = {
  Z: Z_AXIS,
  X: X_AXIS,
  Y: Y_AXIS,
}

export const BASES: readonly Basis[] = ['Z', 'X', 'Y']

const clampProbability = (p: number): number => Math.max(0, Math.min(1, p))

export const outcomeProbabilities = (bloch: Vec3, basis: Basis): readonly [number, number] => {
  const projection = dot(bloch, BASIS_AXIS[basis])
  return [clampProbability((1 + projection) / 2), clampProbability((1 - projection) / 2)]
}

export const zBasisProbabilities = (state: QubitState): readonly [number, number] => [
  abs2(state.alpha),
  abs2(state.beta),
]

export const probabilitiesOfState = (state: QubitState, basis: Basis): readonly [number, number] =>
  outcomeProbabilities(blochVectorOfState(state), basis)

export const sampleOutcome = (probabilityOfZero: number, random: RandomSource): Outcome =>
  random() < probabilityOfZero ? 0 : 1

export const sampleShots = (
  probabilityOfZero: number,
  shots: number,
  random: RandomSource,
): readonly [number, number] => {
  const zeros = Array.from({ length: shots }).reduce<number>(
    (count) => count + (sampleOutcome(probabilityOfZero, random) === 0 ? 1 : 0),
    0,
  )
  return [zeros, shots - zeros]
}

export const collapsedVector = (basis: Basis, outcome: Outcome): Vec3 =>
  scaleVec(BASIS_AXIS[basis], outcome === 0 ? 1 : -1)

export const outcomeLabel = (basis: Basis, outcome: Outcome): string => {
  const labels: Record<Basis, readonly [string, string]> = {
    Z: ['|0⟩', '|1⟩'],
    X: ['|+⟩', '|−⟩'],
    Y: ['|+i⟩', '|−i⟩'],
  }
  return labels[basis][outcome]
}
