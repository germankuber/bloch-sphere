import { useBlochStore } from '../store/useBlochStore'
import { blochVectorOfSystem } from '../quantum/qubit'
import { anglesOfVector } from '../quantum/state'
import {
  KET_MINUS,
  KET_MINUS_I,
  KET_ONE,
  KET_PLUS,
  KET_PLUS_I,
  KET_ZERO,
  type QubitState,
} from '../quantum/state'

const PRESETS: readonly { readonly label: string; readonly ket: QubitState }[] = [
  { label: '|0⟩', ket: KET_ZERO },
  { label: '|1⟩', ket: KET_ONE },
  { label: '|+⟩', ket: KET_PLUS },
  { label: '|−⟩', ket: KET_MINUS },
  { label: '|+i⟩', ket: KET_PLUS_I },
  { label: '|−i⟩', ket: KET_MINUS_I },
]

const toDegrees = (radians: number): number => (radians * 180) / Math.PI

export const StatePanel = () => {
  const system = useBlochStore((store) => store.system)
  const setAngles = useBlochStore((store) => store.setAngles)
  const setState = useBlochStore((store) => store.setState)

  const angles = anglesOfVector(blochVectorOfSystem(system))

  return (
    <section className="panel">
      <h2>Estado</h2>
      <p className="panel-hint">
        Todo estado puro de un qubit es un punto en la superficie de la esfera, fijado por dos ángulos.
      </p>

      <label className="control">
        <span>
          θ (polar) · {toDegrees(angles.theta).toFixed(1)}°
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
          φ (azimutal) · {toDegrees(angles.phi).toFixed(1)}°
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
        {PRESETS.map((preset) => (
          <button key={preset.label} type="button" onClick={() => setState(preset.ket)}>
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  )
}
