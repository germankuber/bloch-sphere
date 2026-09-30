import { abs2, complex, conjugate, multiply } from './complex'
import { matrix2, multiplyMatrices, trace, type Matrix2 } from './matrix'
import type { QubitState } from './state'
import { vecLength, type Vec3 } from './vector'

export const densityMatrixFromBloch = (r: Vec3): Matrix2 =>
  matrix2(complex((1 + r.z) / 2), complex(r.x / 2, -r.y / 2), complex(r.x / 2, r.y / 2), complex((1 - r.z) / 2))

export const densityMatrixOfState = (state: QubitState): Matrix2 =>
  matrix2(
    complex(abs2(state.alpha)),
    multiply(state.alpha, conjugate(state.beta)),
    multiply(state.beta, conjugate(state.alpha)),
    complex(abs2(state.beta)),
  )

export const purityOfDensityMatrix = (rho: Matrix2): number => trace(multiplyMatrices(rho, rho)).re

export const purityFromBloch = (r: Vec3): number => {
  const length = vecLength(r)
  return (1 + length * length) / 2
}

export const isPhysicalDensityMatrix = (rho: Matrix2, tolerance = 1e-9): boolean =>
  Math.abs(trace(rho).re - 1) <= tolerance &&
  Math.abs(trace(rho).im) <= tolerance &&
  rho.m00.re >= -tolerance &&
  rho.m11.re >= -tolerance &&
  Math.abs(rho.m01.re - rho.m10.re) <= tolerance &&
  Math.abs(rho.m01.im + rho.m10.im) <= tolerance
