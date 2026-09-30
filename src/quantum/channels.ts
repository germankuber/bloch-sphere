import { scaleVec, vec3, type Vec3 } from './vector'

export interface RelaxationParameters {
  readonly t1: number
  readonly t2: number
  readonly depolarizingRate: number
}

export const amplitudeDamping = (r: Vec3, gamma: number): Vec3 => {
  const transverse = Math.sqrt(1 - gamma)
  return vec3(r.x * transverse, r.y * transverse, (1 - gamma) * r.z + gamma)
}

export const dephasing = (r: Vec3, lambda: number): Vec3 => {
  const transverse = Math.sqrt(1 - lambda)
  return vec3(r.x * transverse, r.y * transverse, r.z)
}

export const depolarizing = (r: Vec3, probability: number): Vec3 => scaleVec(r, 1 - probability)

const inverseTime = (time: number): number => (Number.isFinite(time) && time > 0 ? 1 / time : 0)

export const relaxationStep = (r: Vec3, parameters: RelaxationParameters, dt: number): Vec3 => {
  const energyRate = inverseTime(parameters.t1)
  const depolarizingRate = Math.max(0, parameters.depolarizingRate)
  const transverseRate = Math.max(inverseTime(parameters.t2), energyRate / 2) + depolarizingRate
  const longitudinalRate = energyRate + depolarizingRate
  const equilibriumZ = longitudinalRate > 0 ? energyRate / longitudinalRate : r.z
  const transverseFactor = Math.exp(-transverseRate * dt)
  const longitudinalFactor = Math.exp(-longitudinalRate * dt)
  return vec3(
    r.x * transverseFactor,
    r.y * transverseFactor,
    equilibriumZ + (r.z - equilibriumZ) * longitudinalFactor,
  )
}
