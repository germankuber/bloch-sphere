import { useBlochStore } from './useBlochStore'
import { systemFromBlochVector, type QubitSystem } from '../quantum/qubit'
import type { Vec3 } from '../quantum/vector'

export interface LiveState {
  readonly system: QubitSystem
  readonly vector: Vec3
  readonly animating: boolean
}

export const useLiveState = (): LiveState => {
  const system = useBlochStore((store) => store.system)
  const displayVector = useBlochStore((store) => store.displayVector)
  const animation = useBlochStore((store) => store.animation)
  const precessing = useBlochStore((store) => store.precession.running)
  const relaxing = useBlochStore((store) => store.relaxationRunning)

  const moving = animation !== null || precessing || relaxing
  if (!moving) return { system, vector: displayVector, animating: false }

  return {
    system: systemFromBlochVector(displayVector, system.ket),
    vector: displayVector,
    animating: animation !== null,
  }
}
