import type { Vec3 } from '../quantum/vector'

export type SceneTriple = [number, number, number]

export const SPHERE_RADIUS = 1

export const toSceneVector = (v: Vec3): SceneTriple => [v.x, v.z, -v.y]

export const toScenePoint = (v: Vec3, scale = SPHERE_RADIUS): SceneTriple => [
  v.x * scale,
  v.z * scale,
  -v.y * scale,
]

export const fromSceneVector = (x: number, y: number, z: number): Vec3 => ({ x, y: -z, z: y })
