import { z } from 'zod'
import type { SequenceStep } from '../src/protocol/messages'
import { TEXT_LIMITS } from '../src/protocol/vocabulary'
import { ACTION_NAMES, actionDefinition, type ActionName } from './actions'

const noteSchema = z
  .string()
  .min(1)
  .max(TEXT_LIMITS.note)
  .optional()
  .describe('Caption shown to the learner when this step runs')

const stepVariants = ACTION_NAMES.map((name) =>
  z.object({ action: z.literal(name), ...actionDefinition(name).args, note: noteSchema }),
)

type StepVariant = (typeof stepVariants)[number]

const stepSchema = z.discriminatedUnion('action', stepVariants as [StepVariant, ...StepVariant[]])

export const stepsSchema = z
  .array(stepSchema)
  .min(1)
  .max(TEXT_LIMITS.sequenceSteps)
  .describe(
    `Ordered steps. Each step is { action, ...arguments, note? } where action is one of ${ACTION_NAMES.join(', ')} and the arguments are the same as that tool's, without clientId.`,
  )

export const sequenceNameSchema = z
  .string()
  .min(1)
  .max(TEXT_LIMITS.sequenceName)
  .describe('Unique sequence name on that client')

export const sequenceDescriptionSchema = z
  .string()
  .min(1)
  .max(TEXT_LIMITS.sequenceDescription)
  .describe('What the sequence teaches')

export interface StepInput {
  readonly action: ActionName
  readonly note?: string
  readonly [argument: string]: unknown
}

export const toSequenceSteps = (steps: readonly StepInput[]): readonly SequenceStep[] =>
  steps.map((step, index) => {
    const { action, note, ...args } = step
    try {
      return { command: actionDefinition(action).toCommand(args), note }
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'invalid step'
      throw new Error(`Step ${index + 1} (${action}): ${reason}`)
    }
  })
