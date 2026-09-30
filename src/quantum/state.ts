import {
  COMPLEX_ONE,
  COMPLEX_ZERO,
  abs,
  abs2,
  add,
  arg,
  complex,
  conjugate,
  expI,
  multiply,
  scale,
  type Complex,
} from './complex'
import { vec3, vecLength, type Vec3 } from './vector'

export interface QubitState {
  readonly alpha: Complex
  readonly beta: Complex
}

export interface BlochAngles {
  readonly theta: number
  readonly phi: number
}

const TWO_PI = 2 * Math.PI
const EPSILON = 1e-12
const INVERSE_SQRT_TWO = Math.SQRT1_2

export const wrapAngle = (angle: number): number => ((angle % TWO_PI) + TWO_PI) % TWO_PI

export const stateNorm2 = (state: QubitState): number => abs2(state.alpha) + abs2(state.beta)

export const createState = (alpha: Complex, beta: Complex): QubitState => {
  const norm = Math.sqrt(abs2(alpha) + abs2(beta))
  if (norm < EPSILON) return KET_ZERO
  return { alpha: scale(alpha, 1 / norm), beta: scale(beta, 1 / norm) }
}

export const stateFromAngles = (theta: number, phi: number): QubitState => ({
  alpha: complex(Math.cos(theta / 2)),
  beta: scale(expI(phi), Math.sin(theta / 2)),
})

export const KET_ZERO: QubitState = { alpha: COMPLEX_ONE, beta: COMPLEX_ZERO }
export const KET_ONE: QubitState = { alpha: COMPLEX_ZERO, beta: COMPLEX_ONE }
export const KET_PLUS: QubitState = { alpha: complex(INVERSE_SQRT_TWO), beta: complex(INVERSE_SQRT_TWO) }
export const KET_MINUS: QubitState = { alpha: complex(INVERSE_SQRT_TWO), beta: complex(-INVERSE_SQRT_TWO) }
export const KET_PLUS_I: QubitState = { alpha: complex(INVERSE_SQRT_TWO), beta: complex(0, INVERSE_SQRT_TWO) }
export const KET_MINUS_I: QubitState = { alpha: complex(INVERSE_SQRT_TWO), beta: complex(0, -INVERSE_SQRT_TWO) }

export const innerProduct = (bra: QubitState, ket: QubitState): Complex =>
  add(multiply(conjugate(bra.alpha), ket.alpha), multiply(conjugate(bra.beta), ket.beta))

export const blochVectorOfState = (state: QubitState): Vec3 => {
  const coherence = multiply(conjugate(state.alpha), state.beta)
  return vec3(2 * coherence.re, 2 * coherence.im, abs2(state.alpha) - abs2(state.beta))
}

export const anglesOfState = (state: QubitState): BlochAngles => {
  const theta = 2 * Math.atan2(abs(state.beta), abs(state.alpha))
  const hasPhase = abs(state.alpha) > 1e-9 && abs(state.beta) > 1e-9
  const phi = hasPhase ? wrapAngle(arg(state.beta) - arg(state.alpha)) : 0
  return { theta, phi }
}

export const globalPhaseOfState = (state: QubitState): number => {
  const { phi } = anglesOfState(state)
  return abs(state.alpha) > 1e-9 ? arg(state.alpha) : arg(state.beta) - phi
}

export const anglesOfVector = (vector: Vec3): BlochAngles => {
  const length = vecLength(vector)
  if (length < EPSILON) return { theta: 0, phi: 0 }
  const theta = Math.acos(Math.max(-1, Math.min(1, vector.z / length)))
  const horizontal = Math.hypot(vector.x, vector.y)
  const phi = horizontal < 1e-9 ? 0 : wrapAngle(Math.atan2(vector.y, vector.x))
  return { theta, phi }
}

export const stateFromBlochVector = (vector: Vec3): QubitState => {
  const { theta, phi } = anglesOfVector(vector)
  return stateFromAngles(theta, phi)
}

export const withGlobalPhase = (state: QubitState, phase: number): QubitState => {
  const shift = expI(phase - globalPhaseOfState(state))
  return { alpha: multiply(state.alpha, shift), beta: multiply(state.beta, shift) }
}
