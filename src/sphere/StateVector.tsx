import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { toSceneVector, type SceneTriple } from './coordinates'
import { sphericalToVec, vecLength, type Vec3 } from '../quantum/vector'
import { anglesOfVector } from '../quantum/state'

const VECTOR_COLOR = '#ffd166'
const GUIDE_COLOR = '#6f8fa8'
const ARC_SEGMENTS = 48
const TIP_LENGTH = 0.11
const TIP_RADIUS = 0.038
const SHAFT_RADIUS = 0.012

const UP = new THREE.Vector3(0, 1, 0)

interface StateVectorProps {
  readonly vector: Vec3
  readonly showGuides: boolean
}

const polarArcPoints = (theta: number, phi: number): SceneTriple[] =>
  Array.from({ length: ARC_SEGMENTS + 1 }, (_, index) =>
    toSceneVector(sphericalToVec((index / ARC_SEGMENTS) * theta, phi)),
  ).map(([x, y, z]) => [x * 0.36, y * 0.36, z * 0.36] as SceneTriple)

const azimuthArcPoints = (phi: number): SceneTriple[] =>
  Array.from({ length: ARC_SEGMENTS + 1 }, (_, index) =>
    toSceneVector(sphericalToVec(Math.PI / 2, (index / ARC_SEGMENTS) * phi)),
  ).map(([x, y, z]) => [x * 0.5, y * 0.5, z * 0.5] as SceneTriple)

export const StateVector = ({ vector, showGuides }: StateVectorProps) => {
  const length = vecLength(vector)
  const scene = useMemo(() => new THREE.Vector3(...toSceneVector(vector)), [vector])

  const orientation = useMemo(() => {
    if (length < 1e-6) return new THREE.Quaternion()
    const direction = scene.clone().normalize()
    return new THREE.Quaternion().setFromUnitVectors(UP, direction)
  }, [scene, length])

  const angles = useMemo(() => anglesOfVector(vector), [vector])
  const equatorProjection = useMemo<SceneTriple>(
    () => toSceneVector({ x: vector.x, y: vector.y, z: 0 }),
    [vector],
  )

  if (length < 1e-6) {
    return (
      <mesh>
        <sphereGeometry args={[0.045, 24, 24]} />
        <meshStandardMaterial color={VECTOR_COLOR} emissive={VECTOR_COLOR} emissiveIntensity={0.7} />
      </mesh>
    )
  }

  const shaftLength = Math.max(0, length - TIP_LENGTH)
  const tipCenter = scene.clone().multiplyScalar((length - TIP_LENGTH / 2) / length)
  const shaftCenter = scene.clone().multiplyScalar(shaftLength / 2 / length)

  return (
    <group>
      <mesh position={shaftCenter} quaternion={orientation}>
        <cylinderGeometry args={[SHAFT_RADIUS, SHAFT_RADIUS, shaftLength, 20]} />
        <meshStandardMaterial color={VECTOR_COLOR} emissive={VECTOR_COLOR} emissiveIntensity={0.35} />
      </mesh>

      <mesh position={tipCenter} quaternion={orientation}>
        <coneGeometry args={[TIP_RADIUS, TIP_LENGTH, 24]} />
        <meshStandardMaterial color={VECTOR_COLOR} emissive={VECTOR_COLOR} emissiveIntensity={0.45} />
      </mesh>

      {showGuides ? (
        <group>
          <Line
            points={[toSceneVector(vector), equatorProjection]}
            color={GUIDE_COLOR}
            lineWidth={1.2}
            dashed
            dashSize={0.04}
            gapSize={0.03}
            transparent
            opacity={0.8}
          />
          <Line
            points={[[0, 0, 0], equatorProjection]}
            color={GUIDE_COLOR}
            lineWidth={1.2}
            dashed
            dashSize={0.04}
            gapSize={0.03}
            transparent
            opacity={0.7}
          />
          <Line points={polarArcPoints(angles.theta, angles.phi)} color="#8ee6a0" lineWidth={2} />
          <Line points={azimuthArcPoints(angles.phi)} color="#c2a6f0" lineWidth={2} />
        </group>
      ) : null}
    </group>
  )
}
