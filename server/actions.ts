import { z } from 'zod'
import type { StepCommand } from '../src/protocol/messages'
import {
  BASIS_NAMES,
  GATE_IDS,
  PRESET_IDS,
  MAX_ABS_ANGLE,
  TEXT_LIMITS,
  isParametricGateId,
  type GateId,
} from '../src/protocol/vocabulary'

export const clientIdSchema = z
  .string()
  .min(1)
  .max(32)
  .describe('Target client id as returned by list_clients, for example "tab-1"')

const gateSchema = z.enum(GATE_IDS).describe('Gate identifier. SX is the square root of X.')
const angleSchema = z.number().min(-MAX_ABS_ANGLE).max(MAX_ABS_ANGLE).describe('Rotation angle in radians, between -8 pi and 8 pi')
const presetSchema = z.enum(PRESET_IDS).describe('Cardinal state')
const basisSchema = z.enum(BASIS_NAMES).describe('Measurement basis')
const runningSchema = z.boolean().describe('Whether the process runs')
const timeSchema = z.number().min(0.1).max(60)

export class InvalidActionError extends Error {}

export const requireAngle = (gate: GateId, angle: number | undefined): void => {
  if (isParametricGateId(gate) && angle === undefined) {
    throw new InvalidActionError(`Gate ${gate} requires the angle argument in radians.`)
  }
}

export interface ActionDefinition<Shape extends z.ZodRawShape> {
  readonly title: string
  readonly description: string
  readonly args: Shape
  readonly toCommand: (input: z.infer<z.ZodObject<Shape>>) => StepCommand
  readonly summary: (input: z.infer<z.ZodObject<Shape>>) => string
}

const defineAction = <Shape extends z.ZodRawShape>(definition: ActionDefinition<Shape>): ActionDefinition<Shape> =>
  definition

const degrees = (radians: number): string => ((radians * 180) / Math.PI).toFixed(1)

export const ACTIONS = {
  apply_gate: defineAction({
    title: 'Apply a quantum gate',
    description:
      'Apply a single-qubit gate, animated as a rotation around its axis. Answers once the animation has finished, with the resulting state. Rx, Ry, Rz and P require angle in radians.',
    args: { gate: gateSchema, angle: angleSchema.optional() },
    toCommand: ({ gate, angle }) => {
      requireAngle(gate, angle)
      return { kind: 'applyGate', gate, angle }
    },
    summary: ({ gate }) => `Applied ${gate}.`,
  }),
  set_state: defineAction({
    title: 'Set the state from angles',
    description: 'Place the state at polar angle theta and azimuth phi, without animation.',
    args: {
      theta: z.number().min(0).max(Math.PI).describe('Polar angle in radians, 0 to pi'),
      phi: z.number().describe('Azimuthal angle in radians'),
    },
    toCommand: ({ theta, phi }) => ({ kind: 'setState', theta, phi }),
    summary: ({ theta, phi }) => `Moved to theta=${degrees(theta)} deg, phi=${degrees(phi)} deg.`,
  }),
  set_preset: defineAction({
    title: 'Jump to a cardinal state',
    description: 'Jump to one of the six cardinal states of the Bloch sphere.',
    args: { preset: presetSchema },
    toCommand: ({ preset }) => ({ kind: 'setPreset', preset }),
    summary: ({ preset }) => `Set the state to ${preset}.`,
  }),
  measure: defineAction({
    title: 'Measure once and collapse',
    description:
      'Perform a single projective measurement. The state collapses to a pole of the chosen axis; the learner can undo it.',
    args: { basis: basisSchema },
    toCommand: ({ basis }) => ({ kind: 'measure', basis }),
    summary: ({ basis }) => `Measured in basis ${basis}.`,
  }),
  run_shots: defineAction({
    title: 'Repeat a measurement many times',
    description:
      'Sample the same measurement many times without collapsing the state, and show the experimental versus theoretical histogram.',
    args: { basis: basisSchema, shots: z.number().int().min(1).max(100000).describe('Number of repetitions') },
    toCommand: ({ basis, shots }) => ({ kind: 'runShots', basis, shots }),
    summary: ({ basis, shots }) => `Ran ${shots} shots in basis ${basis}.`,
  }),
  set_precession: defineAction({
    title: 'Control Larmor precession',
    description:
      'Start or stop the continuous rotation of the vector around an axis. Starting it stops decoherence; stopping it leaves decoherence alone.',
    args: {
      running: runningSchema,
      axis: basisSchema.optional().describe('Rotation axis, Z by default'),
      omega: z.number().min(0.05).max(8).optional().describe('Angular frequency in rad/s'),
    },
    toCommand: ({ running, axis, omega }) => ({ kind: 'setPrecession', running, axis, omega }),
    summary: ({ running }) => (running ? 'Precession started.' : 'Precession stopped.'),
  }),
  set_decoherence: defineAction({
    title: 'Control decoherence',
    description:
      'Start or stop relaxation, solved exactly from the Bloch equations. T1 relaxes the state toward |0>, T2 destroys the phase (a T2 longer than 2*T1 is limited to 2*T1), and the depolarizing rate shrinks the vector toward the center. Starting it stops precession.',
    args: {
      running: runningSchema,
      t1: timeSchema.optional().describe('Energy relaxation time in seconds'),
      t2: timeSchema.optional().describe('Dephasing time in seconds'),
      depolarizingRate: z.number().min(0).max(5).optional().describe('Depolarizing rate in 1/s'),
    },
    toCommand: ({ running, t1, t2, depolarizingRate }) => ({ kind: 'setDecoherence', running, t1, t2, depolarizingRate }),
    summary: ({ running }) => (running ? 'Decoherence started.' : 'Decoherence stopped.'),
  }),
  explain: defineAction({
    title: 'Write a caption on the sphere',
    description:
      'Show a caption over the sphere so the learner reads the point being made while looking at the geometry. Optional KaTeX formula without delimiters. Keep it to one or two sentences.',
    args: {
      title: z.string().min(1).max(TEXT_LIMITS.title).optional().describe('Short heading'),
      text: z.string().min(1).max(TEXT_LIMITS.text).describe('One or two sentences'),
      formula: z.string().min(1).max(TEXT_LIMITS.formula).optional().describe('KaTeX source, without delimiters'),
    },
    toCommand: ({ title, text, formula }) => ({ kind: 'explain', title, text, formula }),
    summary: () => 'Caption displayed.',
  }),
  clear_explanation: defineAction({
    title: 'Remove the caption',
    description: 'Hide the caption currently shown.',
    args: {},
    toCommand: () => ({ kind: 'clearExplanation' }),
    summary: () => 'Caption cleared.',
  }),
  highlight_axis: defineAction({
    title: 'Highlight one axis',
    description: 'Make one cartesian axis glow so the learner knows which direction is being discussed. Pass null to clear it.',
    args: { axis: basisSchema.nullable().describe('Axis to highlight, or null') },
    toCommand: ({ axis }) => ({ kind: 'highlightAxis', axis }),
    summary: ({ axis }) => (axis ? `Highlighted the ${axis} axis.` : 'Highlight cleared.'),
  }),
  reset: defineAction({
    title: 'Reset the sphere',
    description: 'Return to |0>, clear the gate history, trail, caption and highlight, and stop precession and decoherence.',
    args: {},
    toCommand: () => ({ kind: 'reset' }),
    summary: () => 'Reset to |0>.',
  }),
  undo: defineAction({
    title: 'Undo the last step',
    description: 'Revert the last gate or measurement, finishing any animation in progress first.',
    args: {},
    toCommand: () => ({ kind: 'undo' }),
    summary: () => 'Undid the last step.',
  }),
  clear_trail: defineAction({
    title: 'Clear the trajectory trail',
    description: 'Erase the path drawn by previous rotations.',
    args: {},
    toCommand: () => ({ kind: 'clearTrail' }),
    summary: () => 'Trail cleared.',
  }),
} as const

export type ActionName = keyof typeof ACTIONS

export const ACTION_NAMES = Object.keys(ACTIONS) as ActionName[]

export const actionDefinition = (name: ActionName): ActionDefinition<z.ZodRawShape> =>
  ACTIONS[name] as unknown as ActionDefinition<z.ZodRawShape>
