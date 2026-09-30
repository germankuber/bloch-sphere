import { useState } from 'react'
import { Panel } from '../panels/Panel'
import { useSequenceStore } from './useSequenceStore'
import { describeStep } from './describeStep'
import { runNextSequenceStep, type StepRunResult } from './runSequenceStep'

const FEEDBACK: Readonly<Record<StepRunResult['status'], string>> = {
  done: '',
  finished: 'La secuencia ya terminó. Reiniciala para repetirla.',
  busy: 'Esperá a que termine el paso actual.',
  missing: 'La secuencia ya no existe.',
  failed: '',
}

const stepClass = (index: number, position: number): string => {
  if (index < position) return 'sequence-step done'
  if (index === position) return 'sequence-step current'
  return 'sequence-step'
}

export const SequencesPanel = () => {
  const sequences = useSequenceStore((store) => store.sequences)
  const activeName = useSequenceStore((store) => store.activeName)
  const running = useSequenceStore((store) => store.running)
  const select = useSequenceStore((store) => store.select)
  const rewind = useSequenceStore((store) => store.rewind)
  const remove = useSequenceStore((store) => store.remove)
  const [feedback, setFeedback] = useState('')

  const active = sequences.find((sequence) => sequence.name === activeName) ?? null

  const runNext = async () => {
    if (!active) return
    const result = await runNextSequenceStep(active.name)
    setFeedback(result.status === 'failed' ? result.message : FEEDBACK[result.status])
  }

  return (
    <Panel title="Secuencias">
      {sequences.length === 0 ? (
        <p className="panel-hint">
          Todavía no hay secuencias. El agente las carga con create_sequence y vos las ejecutás paso a paso desde acá.
        </p>
      ) : (
        <div className="sequence-list">
          {sequences.map((sequence) => (
            <button
              key={sequence.name}
              type="button"
              className={sequence.name === activeName ? 'active' : ''}
              onClick={() => {
                setFeedback('')
                select(sequence.name)
              }}
            >
              {sequence.name} · {sequence.position}/{sequence.steps.length}
            </button>
          ))}
        </div>
      )}

      {active ? (
        <div className="sequence-detail">
          {active.description ? <p className="panel-hint">{active.description}</p> : null}

          <div className="bar">
            <div
              className="bar-fill zero"
              style={{ width: `${(active.position / active.steps.length) * 100}%` }}
            />
          </div>

          <ol className="sequence-steps">
            {active.steps.map((step, index) => (
              <li key={index} className={stepClass(index, active.position)}>
                <span>{describeStep(step.command)}</span>
                {step.note ? <span className="sequence-note">{step.note}</span> : null}
              </li>
            ))}
          </ol>

          <div className="row-actions">
            <button
              type="button"
              className="primary"
              onClick={runNext}
              disabled={running || active.position >= active.steps.length}
            >
              {active.position >= active.steps.length
                ? 'Terminada'
                : `Ejecutar paso ${active.position + 1} de ${active.steps.length}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setFeedback('')
                rewind(active.name)
              }}
              disabled={running}
            >
              Reiniciar
            </button>
            <button type="button" onClick={() => remove(active.name)} disabled={running}>
              Eliminar
            </button>
          </div>

          {feedback ? <p className="outcome">{feedback}</p> : null}
        </div>
      ) : null}
    </Panel>
  )
}
