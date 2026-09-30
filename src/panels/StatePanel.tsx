import { useBlochStore } from '../store/useBlochStore'
import { radiansToDegrees } from '../quantum/angles'
import { useLiveState } from '../store/useLiveState'
import { Panel } from './Panel'
import { anglesOfVector } from '../quantum/state'
import { PRESET_IDS, type PresetId } from '../protocol/vocabulary'
import { resolvePreset } from '../bridge/registry'

const PRESET_LABELS: Readonly<Record<PresetId, string>> = {
  '|0>': '|0⟩',
  '|1>': '|1⟩',
  '|+>': '|+⟩',
  '|->': '|−⟩',
  '|+i>': '|+i⟩',
  '|-i>': '|−i⟩',
}

export const StatePanel = () => {
  const { vector } = useLiveState()
  const setAngles = useBlochStore((store) => store.setAngles)
  const setState = useBlochStore((store) => store.setState)

  const angles = anglesOfVector(vector)

  return (
    <Panel title="Estado">
      <p className="panel-hint">
        Todo estado puro de un qubit es un punto en la superficie de la esfera, fijado por dos ángulos.
      </p>

      <label className="control">
        <span>
          θ (polar) · {radiansToDegrees(angles.theta).toFixed(1)}°
        </span>
        <input
          type="range"
          min={0}
          max={Math.PI}
          step={0.001}
          value={angles.theta}
          onChange={(event) => setAngles(Number(event.target.value), angles.phi)}
        />
      </label>

      <label className="control">
        <span>
          φ (azimutal) · {radiansToDegrees(angles.phi).toFixed(1)}°
        </span>
        <input
          type="range"
          min={0}
          max={Math.PI * 2}
          step={0.001}
          value={angles.phi}
          onChange={(event) => setAngles(angles.theta, Number(event.target.value))}
        />
      </label>

      <div className="preset-grid">
        {PRESET_IDS.map((preset) => (
          <button key={preset} type="button" onClick={() => setState(resolvePreset(preset))}>
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>
    </Panel>
  )
}
