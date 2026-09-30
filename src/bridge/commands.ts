import type { BrowserMessage, CommandMessage, StepCommand } from '../protocol/messages'
import { COLLECTION_LIMITS, TEXT_LIMITS } from '../protocol/vocabulary'
import { useBlochStore } from '../store/useBlochStore'
import { useSequenceStore } from '../sequences/useSequenceStore'
import { BASIS_AXIS } from '../quantum/measurement'
import { liveSnapshot } from './snapshot'
import { tickSimulation } from './simulationClock'
import { waitForAnimations } from './settle'
import { requireFinite, resolveGate, resolvePreset } from './registry'
import { optionalText, requireBasis, requireText, validateSequence } from './stepValidation'

const snapshotReply = (id: string): BrowserMessage => ({ kind: 'snapshot', id, snapshot: liveSnapshot() })

const definedOnly = <T extends object>(values: T): Partial<T> =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Partial<T>

const requireIdleSequences = (): void => {
  if (useSequenceStore.getState().running) {
    throw new Error('The learner is running a sequence step right now. Try again in a moment.')
  }
}

export const executeStep = async (id: string, command: StepCommand): Promise<BrowserMessage> => {
  tickSimulation()
  const store = useBlochStore.getState()

  switch (command.kind) {
    case 'applyGate':
      store.applyGate(resolveGate(command.gate, command.angle))
      await waitForAnimations()
      return snapshotReply(id)

    case 'setState':
      store.setAngles(requireFinite('theta', command.theta), requireFinite('phi', command.phi))
      return snapshotReply(id)

    case 'setPreset':
      store.setState(resolvePreset(command.preset))
      return snapshotReply(id)

    case 'measure': {
      const basis = requireBasis(command.basis)
      const outcome = store.measure(basis)
      return { kind: 'outcome', id, basis, outcome, snapshot: liveSnapshot() }
    }

    case 'runShots': {
      const basis = requireBasis(command.basis)
      const count = requireFinite('shots', command.shots)
      if (!Number.isInteger(count) || count < 1) throw new Error('shots must be a positive integer')
      const { zero, one } = store.runShots(basis, count)
      return { kind: 'shots', id, basis, zero, one, snapshot: liveSnapshot() }
    }

    case 'reset':
      store.reset()
      return snapshotReply(id)

    case 'undo':
      store.undo()
      return snapshotReply(id)

    case 'clearTrail':
      store.clearTrail()
      return snapshotReply(id)

    case 'setPrecession':
      if (command.running) store.setRelaxationRunning(false)
      store.setPrecession({
        running: command.running,
        ...definedOnly({
          axis: command.axis === undefined ? undefined : BASIS_AXIS[requireBasis(command.axis)],
          omega: command.omega === undefined ? undefined : requireFinite('omega', command.omega),
        }),
      })
      return snapshotReply(id)

    case 'setDecoherence':
      if (command.running) store.setPrecession({ running: false })
      store.setRelaxation(definedOnly({ t1: command.t1, t2: command.t2, depolarizingRate: command.depolarizingRate }))
      store.setRelaxationRunning(command.running)
      return snapshotReply(id)

    case 'explain':
      store.setExplanation({
        title: optionalText('title', command.title, TEXT_LIMITS.title),
        text: requireText('text', command.text, TEXT_LIMITS.text),
        formula: optionalText('formula', command.formula, TEXT_LIMITS.formula),
      })
      return snapshotReply(id)

    case 'clearExplanation':
      store.setExplanation(null)
      return snapshotReply(id)

    case 'highlightAxis':
      store.setHighlightedAxis(command.axis === null ? null : requireBasis(command.axis))
      return snapshotReply(id)
  }
}

const loadSequence = (command: Extract<CommandMessage, { kind: 'loadSequence' }>): void => {
  requireIdleSequences()
  const steps = validateSequence(command.name, command.description, command.steps)
  const { sequences } = useSequenceStore.getState()
  const isNew = !sequences.some((sequence) => sequence.name === command.name)
  if (isNew && sequences.length >= COLLECTION_LIMITS.sequences) {
    throw new Error(`This client already holds ${COLLECTION_LIMITS.sequences} sequences; delete one first`)
  }
  useSequenceStore.getState().upsert({ name: command.name, description: command.description, steps })
}

const deleteSequence = (name: string): void => {
  requireIdleSequences()
  if (!useSequenceStore.getState().remove(name)) throw new Error(`No sequence named "${name}" on this client`)
}

export const executeCommand = async (id: string, command: CommandMessage): Promise<BrowserMessage> => {
  tickSimulation()

  switch (command.kind) {
    case 'getState':
      return snapshotReply(id)

    case 'loadSequence':
      loadSequence(command)
      return snapshotReply(id)

    case 'deleteSequence':
      deleteSequence(command.name)
      return snapshotReply(id)

    default:
      return executeStep(id, command)
  }
}
