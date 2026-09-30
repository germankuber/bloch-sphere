export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

export const ZERO_VECTOR = vec3(0, 0, 0)
export const X_AXIS = vec3(1, 0, 0)
export const Y_AXIS = vec3(0, 1, 0)
export const Z_AXIS = vec3(0, 0, 1)

export const addVec = (a: Vec3, b: Vec3): Vec3 => vec3(a.x + b.x, a.y + b.y, a.z + b.z)

export const subtractVec = (a: Vec3, b: Vec3): Vec3 => vec3(a.x - b.x, a.y - b.y, a.z - b.z)

export const scaleVec = (a: Vec3, factor: number): Vec3 => vec3(a.x * factor, a.y * factor, a.z * factor)

export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z

export const cross = (a: Vec3, b: Vec3): Vec3 =>
  vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x)

export const vecLength = (a: Vec3): number => Math.sqrt(dot(a, a))

export const distance = (a: Vec3, b: Vec3): number => vecLength(subtractVec(a, b))

export const normalizeVec = (a: Vec3, fallback: Vec3 = Z_AXIS): Vec3 => {
  const length = vecLength(a)
  return length < 1e-12 ? fallback : scaleVec(a, 1 / length)
}

export const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => addVec(scaleVec(a, 1 - t), scaleVec(b, t))

export const rotateAroundAxis = (vector: Vec3, axis: Vec3, angle: number): Vec3 => {
  const unitAxis = normalizeVec(axis)
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const parallel = scaleVec(unitAxis, dot(unitAxis, vector) * (1 - cosine))
  return addVec(addVec(scaleVec(vector, cosine), scaleVec(cross(unitAxis, vector), sine)), parallel)
}

export const isVecCloseTo = (a: Vec3, b: Vec3, tolerance = 1e-9): boolean => distance(a, b) <= tolerance

export const sphericalToVec = (theta: number, phi: number): Vec3 =>
  vec3(Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta))
