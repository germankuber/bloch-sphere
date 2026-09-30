import { create } from 'zustand'
import type { Gate } from '../quantum/gates'
import {
  INITIAL_SYSTEM,
  applyGateToSystem,
  blochVectorOfSystem,
  systemFromBlochVector,
  systemFromState,
  type QubitSystem,
} from '../quantum/qubit'
import { stateFromAngles, type QubitState } from '../quantum/state'
import {
  collapsedVector,
  outcomeProbabilities,
  sampleOutcome,
  type Basis,
  type Outcome,
} from '../quantum/measurement'
import { relaxationStep, type RelaxationParameters } from '../quantum/channels'
import { rotateAroundAxis, vec3, Z_AXIS, type Vec3 } from '../quantum/vector'

export interface HistoryEntry {
  readonly id: string
  readonly label: string
}

export interface ShotStats {
  readonly basis: Basis
  readonly zero: number
  readonly one: number
}

export interface PrecessionSettings {
  readonly running: boolean
  readonly axis: Vec3
  readonly omega: number
}

export interface VisualToggles {
  readonly guides: boolean
  readonly trail: boolean
  readonly labels: boolean
}

interface AnimationState {
  readonly gate: Gate
  readonly startVector: Vec3
  readonly startSystem: QubitSystem
  readonly elapsed: number
  readonly duration: number
}

export interface BlochStore {
  system: QubitSystem
  history: readonly HistoryEntry[]
  past: readonly QubitSystem[]
  animation: AnimationState | null
  queue: readonly Gate[]
  displayVector: Vec3
  trail: readonly Vec3[]
  toggles: VisualToggles
  animationSpeed: number
  lastOutcome: Outcome | null
  shots: ShotStats | null
  relaxation: RelaxationParameters
  relaxationRunning: boolean
  precession: PrecessionSettings
  applyGate: (gate: Gate) => void
  setAngles: (theta: number, phi: number) => void
  setState: (ket: QubitState) => void
  setBlochVector: (vector: Vec3) => void
  reset: () => void
  undo: () => void
  measure: (basis: Basis) => void
  setShots: (stats: ShotStats | null) => void
  clearTrail: () => void
  toggle: (key: keyof VisualToggles) => void
  setAnimationSpeed: (speed: number) => void
  setRelaxation: (parameters: Partial<RelaxationParameters>) => void
  setRelaxationRunning: (running: boolean) => void
  setPrecession: (settings: Partial<PrecessionSettings>) => void
  advance: (delta: number) => void
}

const BASE_DURATION = 0.8
const MAX_TRAIL = 400

const pushTrail = (trail: readonly Vec3[], point: Vec3): readonly Vec3[] =>
  trail.length >= MAX_TRAIL ? [...trail.slice(1), point] : [...trail, point]

export const useBlochStore = create<BlochStore>((set, get) => ({
  system: INITIAL_SYSTEM,
  history: [],
  past: [],
  animation: null,
  queue: [],
  displayVector: blochVectorOfSystem(INITIAL_SYSTEM),
  trail: [],
  toggles: { guides: true, trail: true, labels: true },
  animationSpeed: 1,
  lastOutcome: null,
  shots: null,
  relaxation: { t1: 6, t2: 3, depolarizingRate: 0 },
  relaxationRunning: false,
  precession: { running: false, axis: Z_AXIS, omega: 1.2 },

  applyGate: (gate) => {
    const { animation, queue } = get()
    if (animation) {
      set({ queue: [...queue, gate] })
      return
    }
    const { system, animationSpeed } = get()
    set({
      animation: {
        gate,
        startVector: blochVectorOfSystem(system),
        startSystem: system,
        elapsed: 0,
        duration: BASE_DURATION / animationSpeed,
      },
    })
  },

  setAngles: (theta, phi) => {
    const system = systemFromState(stateFromAngles(theta, phi))
    set({
      system,
      displayVector: blochVectorOfSystem(system),
      animation: null,
      queue: [],
      lastOutcome: null,
    })
  },

  setState: (ket) => {
    const system = systemFromState(ket)
    set({
      system,
      displayVector: blochVectorOfSystem(system),
      animation: null,
      queue: [],
      lastOutcome: null,
    })
  },

  setBlochVector: (vector) => {
    const system = systemFromBlochVector(vector, get().system.ket)
    set({ system, displayVector: blochVectorOfSystem(system), lastOutcome: null })
  },

  reset: () =>
    set({
      system: INITIAL_SYSTEM,
      displayVector: blochVectorOfSystem(INITIAL_SYSTEM),
      history: [],
      past: [],
      animation: null,
      queue: [],
      trail: [],
      lastOutcome: null,
      shots: null,
      relaxationRunning: false,
    }),

  undo: () => {
    const { past, history } = get()
    const system = past[past.length - 1]
    if (!system) return
    set({
      system,
      displayVector: blochVectorOfSystem(system),
      past: past.slice(0, -1),
      history: history.slice(0, -1),
      animation: null,
      queue: [],
      lastOutcome: null,
    })
  },

  measure: (basis) => {
    const { system, past, history } = get()
    const [probabilityOfZero] = outcomeProbabilities(blochVectorOfSystem(system), basis)
    const outcome = sampleOutcome(probabilityOfZero, Math.random)
    const target = collapsedVector(basis, outcome)
    const collapsed = systemFromBlochVector(target, system.ket)
    set({
      system: collapsed,
      displayVector: blochVectorOfSystem(collapsed),
      past: [...past, system],
      history: [...history, { id: `M${basis}`, label: `M${basis}` }],
      lastOutcome: outcome,
      animation: null,
      queue: [],
    })
  },

  setShots: (stats) => set({ shots: stats }),

  clearTrail: () => set({ trail: [] }),

  toggle: (key) => set((store) => ({ toggles: { ...store.toggles, [key]: !store.toggles[key] } })),

  setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),

  setRelaxation: (parameters) =>
    set((store) => ({ relaxation: { ...store.relaxation, ...parameters } })),

  setRelaxationRunning: (relaxationRunning) => set({ relaxationRunning }),

  setPrecession: (settings) =>
    set((store) => ({ precession: { ...store.precession, ...settings } })),

  advance: (delta) => {
    const store = get()
    const { animation } = store

    if (animation) {
      const elapsed = animation.elapsed + delta
      const progress = Math.min(1, elapsed / animation.duration)
      const angle = animation.gate.rotation.angle * progress
      const rotated = rotateAroundAxis(animation.startVector, animation.gate.rotation.axis, angle)

      if (progress < 1) {
        set({
          animation: { ...animation, elapsed },
          displayVector: rotated,
          trail: store.toggles.trail ? pushTrail(store.trail, rotated) : store.trail,
        })
        return
      }

      const settled = applyGateToSystem(animation.startSystem, animation.gate)
      const [next, ...rest] = store.queue
      set({
        system: settled,
        displayVector: blochVectorOfSystem(settled),
        past: [...store.past, animation.startSystem],
        history: [...store.history, { id: animation.gate.id, label: animation.gate.label }],
        animation: next
          ? {
              gate: next,
              startVector: blochVectorOfSystem(settled),
              startSystem: settled,
              elapsed: 0,
              duration: BASE_DURATION / store.animationSpeed,
            }
          : null,
        queue: next ? rest : [],
      })
      return
    }

    if (store.precession.running) {
      const current = blochVectorOfSystem(store.system)
      const rotated = rotateAroundAxis(current, store.precession.axis, store.precession.omega * delta)
      const system = systemFromBlochVector(rotated, store.system.ket)
      set({
        system,
        displayVector: rotated,
        trail: store.toggles.trail ? pushTrail(store.trail, rotated) : store.trail,
      })
      return
    }

    if (store.relaxationRunning) {
      const current = blochVectorOfSystem(store.system)
      const relaxed = relaxationStep(current, store.relaxation, delta)
      const system = systemFromBlochVector(relaxed, store.system.ket)
      set({ system, displayVector: relaxed })
      return
    }

    const target = blochVectorOfSystem(store.system)
    const drift = vec3(
      target.x - store.displayVector.x,
      target.y - store.displayVector.y,
      target.z - store.displayVector.z,
    )
    if (Math.abs(drift.x) + Math.abs(drift.y) + Math.abs(drift.z) > 1e-6) {
      set({ displayVector: target })
    }
  },
}))
