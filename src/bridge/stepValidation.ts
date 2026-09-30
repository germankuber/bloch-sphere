import type { SequenceStep, StepCommand } from '../protocol/messages'
import { isBasisName, isStepKind, TEXT_LIMITS, type BasisName } from '../protocol/vocabulary'
import { requireFinite, resolveGate, resolvePreset } from './registry'

export const requireBasis = (basis: unknown): BasisName => {
  if (!isBasisName(basis)) throw new Error(`Unknown basis ${String(basis)}`)
  return basis
}

export const requireText = (label: string, value: unknown, limit: number): string => {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string`)
  if (value.length > limit) throw new Error(`${label} is longer than ${limit} characters`)
  return value
}

export const optionalText = (label: string, value: unknown, limit: number): string | undefined =>
  value === undefined ? undefined : requireText(label, value, limit)

const optionalFinite = (label: string, value: unknown): void => {
  if (value !== undefined) requireFinite(label, value)
}

const requireBoolean = (label: string, value: unknown): void => {
  if (typeof value !== 'boolean') throw new Error(`${label} must be true or false`)
}

const validateCommand = (command: StepCommand): void => {
  switch (command.kind) {
    case 'applyGate':
      resolveGate(command.gate, command.angle)
      return
    case 'setState':
      requireFinite('theta', command.theta)
      requireFinite('phi', command.phi)
      return
    case 'setPreset':
      resolvePreset(command.preset)
      return
    case 'measure':
      requireBasis(command.basis)
      return
    case 'runShots':
      requireBasis(command.basis)
      if (!Number.isInteger(command.shots) || command.shots < 1) throw new Error('shots must be a positive integer')
      return
    case 'setPrecession':
      requireBoolean('running', command.running)
      if (command.axis !== undefined) requireBasis(command.axis)
      optionalFinite('omega', command.omega)
      return
    case 'setDecoherence':
      requireBoolean('running', command.running)
      optionalFinite('t1', command.t1)
      optionalFinite('t2', command.t2)
      optionalFinite('depolarizingRate', command.depolarizingRate)
      return
    case 'explain':
      optionalText('title', command.title, TEXT_LIMITS.title)
      requireText('text', command.text, TEXT_LIMITS.text)
      optionalText('formula', command.formula, TEXT_LIMITS.formula)
      return
    case 'highlightAxis':
      if (command.axis !== null) requireBasis(command.axis)
      return
    case 'reset':
    case 'undo':
    case 'clearTrail':
    case 'clearExplanation':
      return
  }
}

export const validateStep = (step: SequenceStep, index: number): void => {
  const where = `Step ${index + 1}`
  if (typeof step !== 'object' || step === null || typeof step.command !== 'object' || step.command === null) {
    throw new Error(`${where} is malformed`)
  }
  if (!isStepKind(step.command.kind)) throw new Error(`${where} has an unknown action ${String(step.command.kind)}`)
  optionalText(`${where} note`, step.note, TEXT_LIMITS.note)
  try {
    validateCommand(step.command)
  } catch (error: unknown) {
    throw new Error(`${where}: ${error instanceof Error ? error.message : 'invalid'}`)
  }
}

export const validateSequence = (name: unknown, description: unknown, steps: unknown): readonly SequenceStep[] => {
  requireText('Sequence name', name, TEXT_LIMITS.sequenceName)
  optionalText('Sequence description', description, TEXT_LIMITS.sequenceDescription)
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('A sequence needs at least one step')
  if (steps.length > TEXT_LIMITS.sequenceSteps) {
    throw new Error(`A sequence can have at most ${TEXT_LIMITS.sequenceSteps} steps`)
  }
  const typed = steps as readonly SequenceStep[]
  typed.forEach(validateStep)
  return typed
}
