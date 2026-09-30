import { Canvas } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import { useBlochStore } from '../store/useBlochStore'
import { SphereFrame } from './SphereFrame'
import { StateVector } from './StateVector'
import { toSceneVector } from './coordinates'
import { scaleVec } from '../quantum/vector'

const RotationAxis = () => {
  const animation = useBlochStore((store) => store.animation)
  if (!animation) return null
  const axis = animation.gate.rotation.axis
  return (
    <Line
      points={[toSceneVector(scaleVec(axis, -1.35)), toSceneVector(scaleVec(axis, 1.35))]}
      color="#ff8fd8"
      lineWidth={2.5}
      transparent
      opacity={0.9}
    />
  )
}

const Trail = () => {
  const trail = useBlochStore((store) => store.trail)
  const enabled = useBlochStore((store) => store.toggles.trail)
  if (!enabled || trail.length < 2) return null
  return <Line points={trail.map(toSceneVector)} color="#57d9c4" lineWidth={2} transparent opacity={0.75} />
}

const SceneContent = () => {
  const displayVector = useBlochStore((store) => store.displayVector)
  const guides = useBlochStore((store) => store.toggles.guides)
  const labels = useBlochStore((store) => store.toggles.labels)

  return (
    <group>
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />
      <directionalLight position={[-3, -2, -3]} intensity={0.35} />
      <SphereFrame showLabels={labels} />
      <Trail />
      <RotationAxis />
      <StateVector vector={displayVector} showGuides={guides} />
      <OrbitControls enablePan={false} minDistance={2} maxDistance={7} />
    </group>
  )
}

export const BlochScene = () => (
  <Canvas camera={{ position: [2.6, 1.9, 2.6], fov: 45 }} dpr={[1, 2]}>
    <color attach="background" args={['#0b1622']} />
    <SceneContent />
  </Canvas>
)
