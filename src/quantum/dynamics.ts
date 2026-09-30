import { complex } from './complex'
import { applyMatrix, matrix2, type Matrix2 } from './matrix'
import { rotationMatrix } from './rotation'
import type { QubitState } from './state'
import { normalizeVec, type Vec3 } from './vector'

export const hamiltonianMatrix = (axis: Vec3, omega: number): Matrix2 => {
  const n = normalizeVec(axis)
  const half = omega / 2
  return matrix2(
    complex(half * n.z),
    complex(half * n.x, -half * n.y),
    complex(half * n.x, half * n.y),
    complex(-half * n.z),
  )
}

export const evolutionMatrix = (axis: Vec3, omega: number, dt: number): Matrix2 =>
  rotationMatrix(axis, omega * dt)

export const evolveState = (state: QubitState, axis: Vec3, omega: number, dt: number): QubitState =>
  applyMatrix(evolutionMatrix(axis, omega, dt), state)
