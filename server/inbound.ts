import { z } from 'zod'
import type { BrowserMessage } from '../src/protocol/messages'
import { BASIS_NAMES, COLLECTION_LIMITS, TEXT_LIMITS } from '../src/protocol/vocabulary'

const MAX_ERROR_MESSAGE = 500
const MAX_ID = 128

const finite = z.number()
const probabilityPair = z.tuple([finite.min(0).max(1), finite.min(0).max(1)])
const complexValue = z.object({ re: finite, im: finite })

const snapshotSchema = z.object({
  theta: finite,
  phi: finite,
  x: finite,
  y: finite,
  z: finite,
  alpha: complexValue,
  beta: complexValue,
  purity: finite,
  radius: finite,
  probabilities: z.object({ X: probabilityPair, Y: probabilityPair, Z: probabilityPair }),
  history: z.array(z.string().max(COLLECTION_LIMITS.historyLabel)).max(COLLECTION_LIMITS.history),
  animating: z.boolean(),
  sequences: z
    .array(
      z.object({
        name: z.string().min(1).max(TEXT_LIMITS.sequenceName),
        description: z.string().max(TEXT_LIMITS.sequenceDescription).optional(),
        length: z.number().int().min(0).max(TEXT_LIMITS.sequenceSteps),
        position: z.number().int().min(0).max(TEXT_LIMITS.sequenceSteps),
      }),
    )
    .max(COLLECTION_LIMITS.sequences),
  activeSequence: z.string().max(TEXT_LIMITS.sequenceName).nullable(),
})

const requestId = z.string().min(1).max(MAX_ID)
const basis = z.enum(BASIS_NAMES)

const browserMessageSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('snapshot'), id: requestId.optional(), snapshot: snapshotSchema }),
  z
    .object({
      kind: z.literal('shots'),
      id: requestId,
      basis,
      zero: z.number().int().min(0),
      one: z.number().int().min(0),
      snapshot: snapshotSchema,
    })
    .refine((message) => message.zero + message.one > 0, { message: 'shots must not be empty' }),
  z.object({
    kind: z.literal('outcome'),
    id: requestId,
    basis,
    outcome: z.union([z.literal(0), z.literal(1)]),
    snapshot: snapshotSchema,
  }),
  z.object({ kind: z.literal('error'), id: requestId, message: z.string().max(MAX_ERROR_MESSAGE) }),
])

export type InboundResult =
  | { readonly ok: true; readonly message: BrowserMessage }
  | { readonly ok: false; readonly reason: string }

export const parseBrowserMessage = (raw: string): InboundResult => {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'not valid JSON' }
  }
  const parsed = browserMessageSchema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, reason: issue ? `${issue.path.join('.') || 'message'}: ${issue.message}` : 'invalid message' }
  }
  return { ok: true, message: parsed.data }
}
