export const FIXED_GATE_IDS = ['I', 'X', 'Y', 'Z', 'H', 'S', 'Sdg', 'T', 'Tdg', 'SX'] as const
export const PARAMETRIC_GATE_IDS = ['Rx', 'Ry', 'Rz', 'P'] as const
export const GATE_IDS = [...FIXED_GATE_IDS, ...PARAMETRIC_GATE_IDS] as const

export const PRESET_IDS = ['|0>', '|1>', '|+>', '|->', '|+i>', '|-i>'] as const

export const BASIS_NAMES = ['X', 'Y', 'Z'] as const

export const STEP_KINDS = [
  'applyGate',
  'setState',
  'setPreset',
  'measure',
  'runShots',
  'reset',
  'undo',
  'clearTrail',
  'setPrecession',
  'setDecoherence',
  'explain',
  'clearExplanation',
  'highlightAxis',
] as const

export const COMMAND_KINDS = [...STEP_KINDS, 'getState', 'loadSequence', 'deleteSequence'] as const

export type FixedGateId = (typeof FIXED_GATE_IDS)[number]
export type ParametricGateId = (typeof PARAMETRIC_GATE_IDS)[number]
export type GateId = (typeof GATE_IDS)[number]
export type PresetId = (typeof PRESET_IDS)[number]
export type BasisName = (typeof BASIS_NAMES)[number]
export type StepKind = (typeof STEP_KINDS)[number]
export type CommandKind = (typeof COMMAND_KINDS)[number]

const includes = <T extends string>(values: readonly T[], candidate: unknown): candidate is T =>
  typeof candidate === 'string' && (values as readonly string[]).includes(candidate)

export const isGateId = (candidate: unknown): candidate is GateId => includes(GATE_IDS, candidate)
export const isParametricGateId = (candidate: unknown): candidate is ParametricGateId =>
  includes(PARAMETRIC_GATE_IDS, candidate)
export const isPresetId = (candidate: unknown): candidate is PresetId => includes(PRESET_IDS, candidate)
export const isBasisName = (candidate: unknown): candidate is BasisName => includes(BASIS_NAMES, candidate)
export const isStepKind = (candidate: unknown): candidate is StepKind => includes(STEP_KINDS, candidate)
export const isCommandKind = (candidate: unknown): candidate is CommandKind => includes(COMMAND_KINDS, candidate)

export const TEXT_LIMITS = {
  title: 80,
  text: 600,
  formula: 300,
  note: 400,
  sequenceName: 60,
  sequenceDescription: 300,
  sequenceSteps: 100,
} as const

export const COLLECTION_LIMITS = {
  history: 500,
  sequences: 50,
  historyLabel: 16,
} as const

export const MAX_ABS_ANGLE = 8 * Math.PI
