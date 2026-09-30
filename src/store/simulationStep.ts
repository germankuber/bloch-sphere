import type { Gate } from '../quantum/gates'
import { applyGateToSystem, blochVectorOfSystem, systemFromBlochVector, type QubitSystem } from '../quantum/qubit'
import { relaxationStep } from '../quantum/channels'
import { isVecCloseTo, rotateAroundAxis, type Vec3 } from '../quantum/vector'
import type { BlochStore, HistoryEntry } from './useBlochStore'
import { COLLECTION_LIMITS } from '../protocol/vocabulary'

export interface AnimationState {
  readonly gate: Gate
  readonly startVector: Vec3
  readonly startSystem: QubitSystem
  readonly elapsed: number
  readonly duration: number
}

export type SimulationState = Pick<
  BlochStore,
  | 'system'
  | 'displayVector'
  | 'animation'
  | 'queue'
  | 'past'
  | 'history'
  | 'trail'
  | 'toggles'
  | 'precession'
  | 'relaxation'
  | 'relaxationRunning'
  | 'animationSpeed'
>

const BASE_ANIMATION_SECONDS = 0.8
const MAX_TRAIL_POINTS = 400
const DISPLAY_TOLERANCE = 1e-6

export const startAnimation = (gate: Gate, system: QubitSystem, animationSpeed: number): AnimationState => ({
  gate,
  startVector: blochVectorOfSystem(system),
  startSystem: system,
  elapsed: 0,
  duration: BASE_ANIMATION_SECONDS / animationSpeed,
})

const keepLatest = <T>(items: readonly T[], limit: number): readonly T[] =>
  items.length > limit ? items.slice(items.length - limit) : items

export const recordStep = (
  state: Pick<SimulationState, 'past' | 'history'>,
  previous: QubitSystem,
  entry: HistoryEntry,
): Pick<SimulationState, 'past' | 'history'> => ({
  past: keepLatest([...state.past, previous], COLLECTION_LIMITS.history),
  history: keepLatest([...state.history, entry], COLLECTION_LIMITS.history),
})

export const pushTrail = (trail: readonly Vec3[], point: Vec3): readonly Vec3[] =>
  trail.length >= MAX_TRAIL_POINTS ? [...trail.slice(1), point] : [...trail, point]

const trailWith = (state: SimulationState, point: Vec3): readonly Vec3[] =>
  state.toggles.trail ? pushTrail(state.trail, point) : state.trail

const stepAnimation = (state: SimulationState, animation: AnimationState, delta: number): Partial<SimulationState> => {
  const elapsed = animation.elapsed + delta
  const progress = Math.min(1, elapsed / animation.duration)

  if (progress < 1) {
    const rotated = rotateAroundAxis(
      animation.startVector,
      animation.gate.rotation.axis,
      animation.gate.rotation.angle * progress,
    )
    return { animation: { ...animation, elapsed }, displayVector: rotated, trail: trailWith(state, rotated) }
  }

  const settled = applyGateToSystem(animation.startSystem, animation.gate)
  const [next, ...rest] = state.queue
  return {
    system: settled,
    displayVector: blochVectorOfSystem(settled),
    ...recordStep(state, animation.startSystem, { id: animation.gate.id, label: animation.gate.label }),
    animation: next ? startAnimation(next, settled, state.animationSpeed) : null,
    queue: next ? rest : [],
  }
}

const stepPrecession = (state: SimulationState, delta: number): Partial<SimulationState> => {
  const { axis, omega } = state.precession
  const rotated = rotateAroundAxis(blochVectorOfSystem(state.system), axis, omega * delta)
  return {
    system: systemFromBlochVector(rotated, state.system.ket),
    displayVector: rotated,
    trail: trailWith(state, rotated),
  }
}

const stepRelaxation = (state: SimulationState, delta: number): Partial<SimulationState> => {
  const relaxed = relaxationStep(blochVectorOfSystem(state.system), state.relaxation, delta)
  return { system: systemFromBlochVector(relaxed, state.system.ket), displayVector: relaxed }
}

export const stepSimulation = (state: SimulationState, delta: number): Partial<SimulationState> | null => {
  if (state.animation) return stepAnimation(state, state.animation, delta)
  if (state.precession.running) return stepPrecession(state, delta)
  if (state.relaxationRunning) return stepRelaxation(state, delta)

  const target = blochVectorOfSystem(state.system)
  return isVecCloseTo(target, state.displayVector, DISPLAY_TOLERANCE) ? null : { displayVector: target }
}
