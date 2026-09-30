import { COMPLEX_ONE, complex, divide, sqrt } from './complex'
import { determinant, matrix2, scaleMatrix, type Matrix2 } from './matrix'
import { Z_AXIS, normalizeVec, vec3, type Vec3 } from './vector'

export interface Rotation {
  readonly axis: Vec3
  readonly angle: number
}

const NEGLIGIBLE = 1e-9

const firstSignificantComponent = (v: Vec3): number =>
  [v.x, v.y, v.z].find((component) => Math.abs(component) > NEGLIGIBLE) ?? 0

export const rotationMatrix = (axis: Vec3, angle: number): Matrix2 => {
  const n = normalizeVec(axis)
  const cosine = Math.cos(angle / 2)
  const sine = Math.sin(angle / 2)
  return matrix2(
    complex(cosine, -sine * n.z),
    complex(-sine * n.y, -sine * n.x),
    complex(sine * n.y, -sine * n.x),
    complex(cosine, sine * n.z),
  )
}

export const rotationFromMatrix = (unitary: Matrix2): Rotation => {
  const phaseRoot = sqrt(determinant(unitary))
  const special = scaleMatrix(unitary, divide(COMPLEX_ONE, phaseRoot))
  const cosine = (special.m00.re + special.m11.re) / 2
  const raw = vec3(
    -(special.m01.im + special.m10.im) / 2,
    (special.m10.re - special.m01.re) / 2,
    (special.m11.im - special.m00.im) / 2,
  )
  const ambiguous = Math.abs(cosine) < NEGLIGIBLE
  const flip = ambiguous ? firstSignificantComponent(raw) < 0 : cosine < 0
  const sign = flip ? -1 : 1
  const sinHalf = Math.hypot(raw.x, raw.y, raw.z)
  if (sinHalf < NEGLIGIBLE) return { axis: Z_AXIS, angle: 0 }
  const axis = vec3((sign * raw.x) / sinHalf, (sign * raw.y) / sinHalf, (sign * raw.z) / sinHalf)
  return { axis, angle: 2 * Math.atan2(sinHalf, sign * cosine) }
}
