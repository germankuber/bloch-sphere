import {
  COMPLEX_ONE,
  COMPLEX_ZERO,
  add,
  conjugate,
  multiply,
  scale,
  subtract,
  type Complex,
} from './complex'
import type { QubitState } from './state'

export interface Matrix2 {
  readonly m00: Complex
  readonly m01: Complex
  readonly m10: Complex
  readonly m11: Complex
}

export const matrix2 = (m00: Complex, m01: Complex, m10: Complex, m11: Complex): Matrix2 => ({
  m00,
  m01,
  m10,
  m11,
})

export const IDENTITY_MATRIX = matrix2(COMPLEX_ONE, COMPLEX_ZERO, COMPLEX_ZERO, COMPLEX_ONE)

export const multiplyMatrices = (a: Matrix2, b: Matrix2): Matrix2 =>
  matrix2(
    add(multiply(a.m00, b.m00), multiply(a.m01, b.m10)),
    add(multiply(a.m00, b.m01), multiply(a.m01, b.m11)),
    add(multiply(a.m10, b.m00), multiply(a.m11, b.m10)),
    add(multiply(a.m10, b.m01), multiply(a.m11, b.m11)),
  )

export const dagger = (m: Matrix2): Matrix2 =>
  matrix2(conjugate(m.m00), conjugate(m.m10), conjugate(m.m01), conjugate(m.m11))

export const addMatrices = (a: Matrix2, b: Matrix2): Matrix2 =>
  matrix2(add(a.m00, b.m00), add(a.m01, b.m01), add(a.m10, b.m10), add(a.m11, b.m11))

export const scaleMatrix = (m: Matrix2, factor: Complex): Matrix2 =>
  matrix2(multiply(m.m00, factor), multiply(m.m01, factor), multiply(m.m10, factor), multiply(m.m11, factor))

export const scaleMatrixReal = (m: Matrix2, factor: number): Matrix2 =>
  matrix2(scale(m.m00, factor), scale(m.m01, factor), scale(m.m10, factor), scale(m.m11, factor))

export const trace = (m: Matrix2): Complex => add(m.m00, m.m11)

export const determinant = (m: Matrix2): Complex =>
  subtract(multiply(m.m00, m.m11), multiply(m.m01, m.m10))

export const applyMatrix = (m: Matrix2, state: QubitState): QubitState => ({
  alpha: add(multiply(m.m00, state.alpha), multiply(m.m01, state.beta)),
  beta: add(multiply(m.m10, state.alpha), multiply(m.m11, state.beta)),
})

export const isUnitary = (m: Matrix2, tolerance = 1e-9): boolean => {
  const product = multiplyMatrices(dagger(m), m)
  const close = (a: Complex, b: Complex) => Math.abs(a.re - b.re) <= tolerance && Math.abs(a.im - b.im) <= tolerance
  return (
    close(product.m00, COMPLEX_ONE) &&
    close(product.m11, COMPLEX_ONE) &&
    close(product.m01, COMPLEX_ZERO) &&
    close(product.m10, COMPLEX_ZERO)
  )
}
