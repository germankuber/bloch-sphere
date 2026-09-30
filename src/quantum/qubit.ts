import { applyMatrix } from './matrix'
import type { Gate } from './gates'
import {
  KET_ZERO,
  blochVectorOfState,
  globalPhaseOfState,
  stateFromBlochVector,
  withGlobalPhase,
  type QubitState,
} from './state'
import { scaleVec, vecLength, type Vec3 } from './vector'

export interface QubitSystem {
  readonly ket: QubitState
  readonly radius: number
}

const PURE_THRESHOLD = 1 - 1e-6
const VANISHING = 1e-9

export const systemFromState = (ket: QubitState): QubitSystem => ({ ket, radius: 1 })

export const INITIAL_SYSTEM: QubitSystem = systemFromState(KET_ZERO)

export const blochVectorOfSystem = (system: QubitSystem): Vec3 =>
  scaleVec(blochVectorOfState(system.ket), system.radius)

export const systemFromBlochVector = (vector: Vec3, previousKet: QubitState = KET_ZERO): QubitSystem => {
  const length = vecLength(vector)
  if (length < VANISHING) return { ket: previousKet, radius: 0 }
  const ket = withGlobalPhase(stateFromBlochVector(vector), globalPhaseOfState(previousKet))
  return { ket, radius: Math.min(1, length) }
}

export const applyGateToSystem = (system: QubitSystem, gate: Gate): QubitSystem => ({
  ket: applyMatrix(gate.matrix, system.ket),
  radius: system.radius,
})

export const purityOfSystem = (system: QubitSystem): number => (1 + system.radius * system.radius) / 2

export const isPureSystem = (system: QubitSystem): boolean => system.radius >= PURE_THRESHOLD
