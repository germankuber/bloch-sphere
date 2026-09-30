import { executeStep } from '../bridge/commands'
import { useBlochStore } from '../store/useBlochStore'
import { useSequenceStore } from './useSequenceStore'

export type StepRunResult =
  | { readonly status: 'done' }
  | { readonly status: 'finished' }
  | { readonly status: 'busy' }
  | { readonly status: 'missing' }
  | { readonly status: 'failed'; readonly message: string }

export const runNextSequenceStep = async (name: string): Promise<StepRunResult> => {
  const sequenceStore = useSequenceStore.getState()
  if (sequenceStore.running) return { status: 'busy' }

  const sequence = sequenceStore.sequences.find((entry) => entry.name === name)
  if (!sequence) return { status: 'missing' }

  const step = sequence.steps[sequence.position]
  if (!step) return { status: 'finished' }

  sequenceStore.setRunning(true)
  try {
    await executeStep(`sequence-${name}-${sequence.position}`, step.command)
    const current = useSequenceStore.getState().sequences.find((entry) => entry.name === name)
    if (current?.steps !== sequence.steps) {
      return { status: 'failed', message: 'La secuencia cambió mientras se ejecutaba el paso.' }
    }
    if (step.note && step.command.kind !== 'explain') {
      useBlochStore.getState().setExplanation({
        title: `${name} · paso ${sequence.position + 1} de ${sequence.steps.length}`,
        text: step.note,
      })
    }
    useSequenceStore.getState().markExecuted(name)
    return { status: 'done' }
  } catch (error: unknown) {
    return { status: 'failed', message: error instanceof Error ? error.message : 'El paso falló' }
  } finally {
    useSequenceStore.getState().setRunning(false)
  }
}
