import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Runner } from '../run'
import { errorResult } from '../format'
import { clientIdSchema } from '../actions'
import {
  sequenceDescriptionSchema,
  sequenceNameSchema,
  stepsSchema,
  toSequenceSteps,
  type StepInput,
} from '../sequenceSteps'

export const registerSequenceTools = (server: McpServer, run: Runner): void => {
  server.registerTool(
    'create_sequence',
    {
      title: 'Load a named sequence of moves',
      description:
        'Load an ordered stack of moves into one client under a name. Nothing runs yet: the learner executes the steps one at a time from the Secuencias panel, at their own pace, and reads each note as it runs. A sequence with the same name is replaced. Start with set_preset or reset so the sequence does not depend on the current state. Fails if the learner is running a step at that moment.',
      inputSchema: {
        clientId: clientIdSchema,
        name: sequenceNameSchema,
        description: sequenceDescriptionSchema.optional(),
        steps: stepsSchema,
      },
    },
    async ({ clientId, name, description, steps }) => {
      try {
        const converted = toSequenceSteps(steps as readonly StepInput[])
        return await run(
          clientId,
          { kind: 'loadSequence', name, description, steps: converted },
          `Sequence "${name}" loaded with ${converted.length} steps. The learner runs it step by step from the Secuencias panel.`,
        )
      } catch (error: unknown) {
        return errorResult(error instanceof Error ? error.message : 'Invalid sequence')
      }
    },
  )

  server.registerTool(
    'list_sequences',
    {
      title: 'List sequences on a client',
      description:
        'Show the sequences loaded on one client and how many steps the learner has already run in each. Use it to know where the learner is before commenting.',
      inputSchema: { clientId: clientIdSchema },
    },
    ({ clientId }) => run(clientId, { kind: 'getState' }, 'Sequences and current state:'),
  )

  server.registerTool(
    'delete_sequence',
    {
      title: 'Delete a sequence',
      description: 'Remove a sequence from one client by name. Fails if the learner is running a step at that moment.',
      inputSchema: { clientId: clientIdSchema, name: sequenceNameSchema },
    },
    ({ clientId, name }) => run(clientId, { kind: 'deleteSequence', name }, `Sequence "${name}" deleted.`),
  )
}
