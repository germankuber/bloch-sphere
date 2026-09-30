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

const decayFraction = (rate: number, dt: number): number => (rate <= 0 ? 0 : 1 - Math.exp(-rate * dt))

const inverseTime = (time: number): number => (Number.isFinite(time) && time > 0 ? 1 / time : 0)

export const relaxationStep = (r: Vec3, parameters: RelaxationParameters, dt: number): Vec3 => {
  const rateT1 = inverseTime(parameters.t1)
  const rateT2 = inverseTime(parameters.t2)
  const pureDephasingRate = Math.max(0, rateT2 - rateT1 / 2)
  const damped = amplitudeDamping(r, decayFraction(rateT1, dt))
  const dephased = dephasing(damped, decayFraction(2 * pureDephasingRate, dt))
  return depolarizing(dephased, decayFraction(parameters.depolarizingRate, dt))
}
