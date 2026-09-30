import { create } from 'zustand'
import { recordStep, startAnimation, stepSimulation, type AnimationState } from './simulationStep'
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
  sampleShots,
  type RandomSource,
  type Basis,
  type Outcome,
} from '../quantum/measurement'
import type { RelaxationParameters } from '../quantum/channels'
import { Z_AXIS, type Vec3 } from '../quantum/vector'

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

export type Axis = Basis

export interface Explanation {
  readonly title?: string
  readonly text: string
  readonly formula?: string
}

export interface VisualToggles {
  readonly guides: boolean
  readonly trail: boolean
  readonly labels: boolean
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
  explanation: Explanation | null
  highlightedAxis: Axis | null
  bridgeConnected: boolean
  clientId: string | null
  applyGate: (gate: Gate) => void
  setAngles: (theta: number, phi: number) => void
  setState: (ket: QubitState) => void
  setBlochVector: (vector: Vec3) => void
  reset: () => void
  undo: () => void
  measure: (basis: Basis, random?: RandomSource) => Outcome
  runShots: (basis: Basis, count: number, random?: RandomSource) => ShotStats
  setShots: (stats: ShotStats | null) => void
  clearTrail: () => void
  toggle: (key: keyof VisualToggles) => void
  setAnimationSpeed: (speed: number) => void
  setRelaxation: (parameters: Partial<RelaxationParameters>) => void
  setRelaxationRunning: (running: boolean) => void
  setPrecession: (settings: Partial<PrecessionSettings>) => void
  setExplanation: (explanation: Explanation | null) => void
  setHighlightedAxis: (axis: Axis | null) => void
  setBridgeConnected: (connected: boolean) => void
  setClientId: (clientId: string | null) => void
  completeAnimations: () => void
  advance: (delta: number) => void
}

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
  explanation: null,
  highlightedAxis: null,
  bridgeConnected: false,
  clientId: null,

  applyGate: (gate) => {
    const { animation, queue } = get()
    if (animation) {
      set({ queue: [...queue, gate] })
      return
    }
    const { system, animationSpeed } = get()
    set({ animation: startAnimation(gate, system, animationSpeed) })
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
      precession: { ...get().precession, running: false },
      explanation: null,
      highlightedAxis: null,
    }),

  undo: () => {
    get().completeAnimations()
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

  measure: (basis, random = Math.random) => {
    get().completeAnimations()
    const { system, past, history } = get()
    const [probabilityOfZero] = outcomeProbabilities(blochVectorOfSystem(system), basis)
    const outcome = sampleOutcome(probabilityOfZero, random)
    const target = collapsedVector(basis, outcome)
    const collapsed = systemFromBlochVector(target, system.ket)
    set({
      system: collapsed,
      displayVector: blochVectorOfSystem(collapsed),
      ...recordStep({ past, history }, system, { id: `M${basis}`, label: `M${basis}` }),
      lastOutcome: outcome,
      animation: null,
      queue: [],
    })
    return outcome
  },

  runShots: (basis, count, random = Math.random) => {
    get().completeAnimations()
    const [probabilityOfZero] = outcomeProbabilities(blochVectorOfSystem(get().system), basis)
    const [zero, one] = sampleShots(probabilityOfZero, count, random)
    const shots: ShotStats = { basis, zero, one }
    set({ shots })
    return shots
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

  setExplanation: (explanation) => set({ explanation }),

  setHighlightedAxis: (highlightedAxis) => set({ highlightedAxis }),

  setBridgeConnected: (bridgeConnected) => set({ bridgeConnected }),

  setClientId: (clientId) => set({ clientId }),

  completeAnimations: () => {
    const { animation, queue, past, history } = get()
    if (!animation) return
    const finished = [animation.gate, ...queue].reduce(
      (accumulated, gate) => ({
        system: applyGateToSystem(accumulated.system, gate),
        ...recordStep(accumulated, accumulated.system, { id: gate.id, label: gate.label }),
      }),
      { system: animation.startSystem, past, history },
    )
    set({
      system: finished.system,
      displayVector: blochVectorOfSystem(finished.system),
      past: finished.past,
      history: finished.history,
      animation: null,
      queue: [],
    })
  },

  advance: (delta) => {
    const update = stepSimulation(get(), delta)
    if (update) set(update)
  },
}))
