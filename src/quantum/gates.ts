import { COMPLEX_ONE, COMPLEX_ZERO, complex, expI, scale, type Complex } from './complex'
import { dagger, matrix2, scaleMatrixReal, type Matrix2 } from './matrix'
import { rotationFromMatrix, rotationMatrix, type Rotation } from './rotation'
import { X_AXIS, Y_AXIS, Z_AXIS } from './vector'

export interface Gate {
  readonly id: string
  readonly label: string
  readonly matrix: Matrix2
  readonly rotation: Rotation
}

const NEGATIVE_ONE = complex(-1)
const IMAGINARY = complex(0, 1)
const NEGATIVE_IMAGINARY = complex(0, -1)

export const createGate = (id: string, label: string, matrix: Matrix2, rotation?: Rotation): Gate => ({
  id,
  label,
  matrix,
  rotation: rotation ?? rotationFromMatrix(matrix),
})

const diagonal = (first: Complex, second: Complex): Matrix2 => matrix2(first, COMPLEX_ZERO, COMPLEX_ZERO, second)

const PAULI_X = matrix2(COMPLEX_ZERO, COMPLEX_ONE, COMPLEX_ONE, COMPLEX_ZERO)
const PAULI_Y = matrix2(COMPLEX_ZERO, NEGATIVE_IMAGINARY, IMAGINARY, COMPLEX_ZERO)
const PAULI_Z = diagonal(COMPLEX_ONE, NEGATIVE_ONE)
const HADAMARD = scaleMatrixReal(matrix2(COMPLEX_ONE, COMPLEX_ONE, COMPLEX_ONE, NEGATIVE_ONE), Math.SQRT1_2)
const PHASE_S = diagonal(COMPLEX_ONE, IMAGINARY)
const PHASE_T = diagonal(COMPLEX_ONE, expI(Math.PI / 4))
const SQRT_X = scaleMatrixReal(
  matrix2(complex(1, 1), complex(1, -1), complex(1, -1), complex(1, 1)),
  0.5,
)

export const GATE_I = createGate('I', 'I', diagonal(COMPLEX_ONE, COMPLEX_ONE))
export const GATE_X = createGate('X', 'X', PAULI_X)
export const GATE_Y = createGate('Y', 'Y', PAULI_Y)
export const GATE_Z = createGate('Z', 'Z', PAULI_Z)
export const GATE_H = createGate('H', 'H', HADAMARD)
export const GATE_S = createGate('S', 'S', PHASE_S)
export const GATE_S_DAGGER = createGate('Sdg', 'S†', dagger(PHASE_S))
export const GATE_T = createGate('T', 'T', PHASE_T)
export const GATE_T_DAGGER = createGate('Tdg', 'T†', dagger(PHASE_T))
export const GATE_SQRT_X = createGate('SX', '√X', SQRT_X)

export const FIXED_GATES: readonly Gate[] = [
  GATE_I,
  GATE_X,
  GATE_Y,
  GATE_Z,
  GATE_H,
  GATE_S,
  GATE_S_DAGGER,
  GATE_T,
  GATE_T_DAGGER,
  GATE_SQRT_X,
]

const degreesLabel = (angle: number): string => `${Math.round((angle * 180) / Math.PI)}°`

const rotationGate = (name: string, axis: typeof X_AXIS, angle: number): Gate =>
  createGate(`${name}:${angle.toFixed(6)}`, `${name}(${degreesLabel(angle)})`, rotationMatrix(axis, angle), {
    axis,
    angle,
  })

export const rxGate = (angle: number): Gate => rotationGate('Rx', X_AXIS, angle)
export const ryGate = (angle: number): Gate => rotationGate('Ry', Y_AXIS, angle)
export const rzGate = (angle: number): Gate => rotationGate('Rz', Z_AXIS, angle)

export const phaseGate = (angle: number): Gate =>
  createGate(`P:${angle.toFixed(6)}`, `P(${degreesLabel(angle)})`, diagonal(COMPLEX_ONE, expI(angle)), {
    axis: Z_AXIS,
    angle,
  })

export const universalGate = (theta: number, phi: number, lambda: number): Gate => {
  const cosine = Math.cos(theta / 2)
  const sine = Math.sin(theta / 2)
  const matrix = matrix2(
    complex(cosine),
    scale(expI(lambda), -sine),
    scale(expI(phi), sine),
    scale(expI(phi + lambda), cosine),
  )
  return createGate(
    `U:${theta.toFixed(6)}:${phi.toFixed(6)}:${lambda.toFixed(6)}`,
    `U(${degreesLabel(theta)},${degreesLabel(phi)},${degreesLabel(lambda)})`,
    matrix,
  )
}
