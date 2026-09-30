import { create } from 'zustand'
import type { SequenceStep } from '../protocol/messages'
import { COLLECTION_LIMITS } from '../protocol/vocabulary'
import { validateSequence } from '../bridge/stepValidation'

export interface StoredSequence {
  readonly name: string
  readonly description?: string
  readonly steps: readonly SequenceStep[]
  readonly position: number
}

interface PersistedState {
  readonly sequences: readonly StoredSequence[]
  readonly activeName: string | null
}

export interface SequenceStore extends PersistedState {
  readonly running: boolean
  readonly upsert: (sequence: Omit<StoredSequence, 'position'>) => void
  readonly remove: (name: string) => boolean
  readonly select: (name: string | null) => void
  readonly rewind: (name: string) => void
  readonly markExecuted: (name: string) => void
  readonly setRunning: (running: boolean) => void
}

const STORAGE_KEY = 'bloch-sequences'
const EMPTY: PersistedState = { sequences: [], activeName: null }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export const isStoredSequence = (value: unknown): value is StoredSequence => {
  if (!isRecord(value)) return false
  try {
    validateSequence(value.name, value.description, value.steps)
  } catch {
    return false
  }
  return (
    typeof value.position === 'number' &&
    Number.isInteger(value.position) &&
    value.position >= 0 &&
    value.position <= (value.steps as readonly unknown[]).length
  )
}

export const restoreSequences = (raw: string | null): PersistedState => {
  if (!raw) return EMPTY
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || !Array.isArray(parsed.sequences)) return EMPTY
    const sequences = parsed.sequences.filter(isStoredSequence).slice(0, COLLECTION_LIMITS.sequences)
    const activeName =
      typeof parsed.activeName === 'string' && sequences.some((sequence) => sequence.name === parsed.activeName)
        ? parsed.activeName
        : null
    return { sequences, activeName }
  } catch {
    return EMPTY
  }
}

const readPersisted = (): PersistedState => {
  try {
    return restoreSequences(sessionStorage.getItem(STORAGE_KEY))
  } catch {
    return EMPTY
  }
}

const writePersisted = (state: PersistedState): void => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sequences: state.sequences, activeName: state.activeName }),
    )
  } catch {
    return
  }
}

const updateSequence = (
  sequences: readonly StoredSequence[],
  name: string,
  change: (sequence: StoredSequence) => StoredSequence,
): readonly StoredSequence[] => sequences.map((sequence) => (sequence.name === name ? change(sequence) : sequence))

export const useSequenceStore = create<SequenceStore>((set, get) => ({
  ...readPersisted(),
  running: false,

  upsert: (incoming) => {
    const fresh: StoredSequence = { ...incoming, position: 0 }
    const others = get().sequences.filter((sequence) => sequence.name !== incoming.name)
    set({ sequences: [...others, fresh], activeName: incoming.name })
  },

  remove: (name) => {
    const { sequences, activeName } = get()
    if (!sequences.some((sequence) => sequence.name === name)) return false
    set({
      sequences: sequences.filter((sequence) => sequence.name !== name),
      activeName: activeName === name ? null : activeName,
    })
    return true
  },

  select: (activeName) => set({ activeName }),

  rewind: (name) => set({ sequences: updateSequence(get().sequences, name, (s) => ({ ...s, position: 0 })) }),

  markExecuted: (name) =>
    set({
      sequences: updateSequence(get().sequences, name, (s) => ({
        ...s,
        position: Math.min(s.steps.length, s.position + 1),
      })),
    }),

  setRunning: (running) => set({ running }),
}))

useSequenceStore.subscribe((state) => writePersisted(state))
