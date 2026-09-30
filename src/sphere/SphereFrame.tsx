import { useMemo } from 'react'
import { Line, Text } from '@react-three/drei'
import { useBlochStore } from '../store/useBlochStore'
import { SPHERE_RADIUS, toScenePoint, type SceneTriple } from './coordinates'
import { scaleVec, sphericalToVec, X_AXIS, Y_AXIS, Z_AXIS } from '../quantum/vector'

const MERIDIAN_COUNT = 12
const PARALLEL_COUNT = 5
const SEGMENTS = 96

const GRID_COLOR = '#2f4b63'
const EQUATOR_COLOR = '#4ea3d8'

const circlePoints = (theta: number): SceneTriple[] =>
  Array.from({ length: SEGMENTS + 1 }, (_, index) => {
    const phi = (index / SEGMENTS) * Math.PI * 2
    return toScenePoint(sphericalToVec(theta, phi))
  })

const meridianPoints = (phi: number): SceneTriple[] =>
  Array.from({ length: SEGMENTS + 1 }, (_, index) => {
    const theta = (index / SEGMENTS) * Math.PI
    return toScenePoint(sphericalToVec(theta, phi))
  })

const AXIS_LABELS = [
  { text: '|0⟩', axis: '+Z', position: [0, 0, 1], color: '#8ee6a0' },
  { text: '|1⟩', axis: '−Z', position: [0, 0, -1], color: '#8ee6a0' },
  { text: '|+⟩', axis: '+X', position: [1, 0, 0], color: '#f5d17a' },
  { text: '|−⟩', axis: '−X', position: [-1, 0, 0], color: '#f5d17a' },
  { text: '|+i⟩', axis: '+Y', position: [0, 1, 0], color: '#c2a6f0' },
  { text: '|−i⟩', axis: '−Y', position: [0, -1, 0], color: '#c2a6f0' },
] as const

const CARTESIAN_AXES = [
  { name: 'X', direction: X_AXIS, color: '#f5d17a' },
  { name: 'Y', direction: Y_AXIS, color: '#c2a6f0' },
  { name: 'Z', direction: Z_AXIS, color: '#8ee6a0' },
] as const

const AXIS_EXTENT = 1.32

interface SphereFrameProps {
  readonly showLabels: boolean
}

export const SphereFrame = ({ showLabels }: SphereFrameProps) => {
  const highlightedAxis = useBlochStore((store) => store.highlightedAxis)

  const parallels = useMemo(
    () =>
      Array.from({ length: PARALLEL_COUNT }, (_, index) =>
        circlePoints(((index + 1) / (PARALLEL_COUNT + 1)) * Math.PI),
      ),
    [],
  )

  const meridians = useMemo(
    () =>
      Array.from({ length: MERIDIAN_COUNT }, (_, index) =>
        meridianPoints((index / MERIDIAN_COUNT) * Math.PI * 2),
      ),
    [],
  )

  const equator = useMemo(() => circlePoints(Math.PI / 2), [])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 48]} />
        <meshStandardMaterial
          color="#1a3550"
          transparent
          opacity={0.16}
          roughness={0.45}
          metalness={0.1}
        />
      </mesh>

      {parallels.map((points, index) => (
        <Line key={`parallel-${index}`} points={points} color={GRID_COLOR} lineWidth={1} transparent opacity={0.55} />
      ))}

      {meridians.map((points, index) => (
        <Line key={`meridian-${index}`} points={points} color={GRID_COLOR} lineWidth={1} transparent opacity={0.45} />
      ))}

      <Line points={equator} color={EQUATOR_COLOR} lineWidth={2} />

      {CARTESIAN_AXES.map((entry) => {
        const highlighted = highlightedAxis === entry.name
        return (
          <Line
            key={`axis-${entry.name}`}
            points={[
              toScenePoint(scaleVec(entry.direction, -AXIS_EXTENT)),
              toScenePoint(scaleVec(entry.direction, AXIS_EXTENT)),
            ]}
            color={highlighted ? '#ffffff' : entry.color}
            lineWidth={highlighted ? 4 : 1.6}
            transparent
            opacity={highlighted ? 1 : 0.75}
          />
        )
      })}

      {AXIS_LABELS.map((label) => {
        const direction = { x: label.position[0], y: label.position[1], z: label.position[2] }
        const stateAnchor = toScenePoint(direction, 1.2)
        const axisAnchor = toScenePoint(direction, 1.42)
        return (
          <group key={label.text}>
            {showLabels ? (
              <group>
                <Text
                  position={stateAnchor}
                  fontSize={0.13}
                  color={label.color}
                  anchorX="center"
                  anchorY="middle"
                >
                  {label.text}
                </Text>
                <Text
                  position={axisAnchor}
                  fontSize={0.1}
                  color={label.color}
                  fillOpacity={0.72}
                  anchorX="center"
                  anchorY="middle"
                >
                  {label.axis}
                </Text>
              </group>
            ) : null}
          </group>
        )
      })}
    </group>
  )
}
