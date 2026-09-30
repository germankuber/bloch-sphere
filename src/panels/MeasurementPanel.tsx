import { useBlochStore } from '../store/useBlochStore'
import { useLiveState } from '../store/useLiveState'
import { Panel } from './Panel'
import { BASES, outcomeProbabilities, outcomeLabel } from '../quantum/measurement'

const SHOT_OPTIONS = [100, 1000] as const

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`

export const MeasurementPanel = () => {
  const { vector } = useLiveState()
  const measure = useBlochStore((store) => store.measure)
  const shots = useBlochStore((store) => store.shots)
  const runShots = useBlochStore((store) => store.runShots)
  const lastOutcome = useBlochStore((store) => store.lastOutcome)


  return (
    <Panel title="Medición">
      <p className="panel-hint">
        Medir no lee el estado: lo colapsa. La esfera te da las probabilidades, no el resultado.
      </p>

      {BASES.map((basis) => {
        const [probabilityOfZero, probabilityOfOne] = outcomeProbabilities(vector, basis)
        return (
          <div key={basis} className="basis-block">
            <div className="basis-head">
              <span>Base {basis}</span>
              <button type="button" onClick={() => void measure(basis)}>
                Medir
              </button>
            </div>
            <div className="bar">
              <div className="bar-fill zero" style={{ width: percent(probabilityOfZero) }} />
            </div>
            <div className="bar-legend">
              <span>
                {outcomeLabel(basis, 0)} · {percent(probabilityOfZero)}
              </span>
              <span>
                {outcomeLabel(basis, 1)} · {percent(probabilityOfOne)}
              </span>
            </div>
            <div className="row-actions">
              {SHOT_OPTIONS.map((count) => (
                <button key={count} type="button" onClick={() => runShots(basis, count)}>
                  {count} tiros
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {lastOutcome !== null ? (
        <p className="outcome">Último resultado: {lastOutcome}</p>
      ) : null}

      {shots ? (
        <div className="shots">
          <span className="readout-title">
            {shots.zero + shots.one} tiros en base {shots.basis}
          </span>
          <div className="shots-row">
            <span>{outcomeLabel(shots.basis, 0)}</span>
            <div className="bar">
              <div
                className="bar-fill zero"
                style={{ width: percent(shots.zero / (shots.zero + shots.one)) }}
              />
            </div>
            <span>{shots.zero}</span>
          </div>
          <div className="shots-row">
            <span>{outcomeLabel(shots.basis, 1)}</span>
            <div className="bar">
              <div
                className="bar-fill one"
                style={{ width: percent(shots.one / (shots.zero + shots.one)) }}
              />
            </div>
            <span>{shots.one}</span>
          </div>
          <p className="panel-hint">
            Teórico: {percent(outcomeProbabilities(vector, shots.basis)[0])} /{' '}
            {percent(outcomeProbabilities(vector, shots.basis)[1])}. Más tiros, más cerca.
          </p>
        </div>
      ) : null}
    </Panel>
  )
}
