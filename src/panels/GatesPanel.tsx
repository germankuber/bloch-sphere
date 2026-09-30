import { useState } from 'react'
import { useBlochStore } from '../store/useBlochStore'
import {
  FIXED_GATES,
  phaseGate,
  rxGate,
  ryGate,
  rzGate,
  type Gate,
} from '../quantum/gates'

const GATE_NOTES: Readonly<Record<string, string>> = {
  I: 'No hace nada. Sirve de referencia.',
  X: 'NOT cuántica: media vuelta alrededor de X. Intercambia |0⟩ y |1⟩.',
  Y: 'Media vuelta alrededor de Y.',
  Z: 'Media vuelta alrededor de Z. Deja |0⟩ y |1⟩ fijos y cambia la fase relativa.',
  H: 'Hadamard: lleva |0⟩ a |+⟩. Media vuelta alrededor del eje (X+Z)/√2.',
  S: 'Cuarto de vuelta alrededor de Z. Lleva |+⟩ a |+i⟩.',
  Sdg: 'Inversa de S: cuarto de vuelta en sentido contrario.',
  T: 'Octavo de vuelta alrededor de Z (45°).',
  Tdg: 'Inversa de T.',
  SqrtX: 'Raíz de X: cuarto de vuelta alrededor de X.',
}

const toDegrees = (radians: number): number => (radians * 180) / Math.PI

const formatAxis = (gate: Gate): string => {
  const { x, y, z } = gate.rotation.axis
  return `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
}

const PARAMETRIC = [
  { id: 'Rx', label: 'Rx(θ)', build: rxGate },
  { id: 'Ry', label: 'Ry(θ)', build: ryGate },
  { id: 'Rz', label: 'Rz(θ)', build: rzGate },
  { id: 'P', label: 'P(φ)', build: phaseGate },
] as const

export const GatesPanel = () => {
  const applyGate = useBlochStore((store) => store.applyGate)
  const history = useBlochStore((store) => store.history)
  const undo = useBlochStore((store) => store.undo)
  const reset = useBlochStore((store) => store.reset)
  const [angle, setAngle] = useState(Math.PI / 2)

  return (
    <section className="panel">
      <h2>Compuertas</h2>
      <p className="panel-hint">
        Toda compuerta de un qubit es una rotación de la esfera. Pasá el cursor para ver su eje y su ángulo.
      </p>

      <div className="gate-grid">
        {FIXED_GATES.map((gate) => (
          <button
            key={gate.id}
            type="button"
            onClick={() => applyGate(gate)}
            title={`${GATE_NOTES[gate.id] ?? ''}\nEje ${formatAxis(gate)} · ${toDegrees(gate.rotation.angle).toFixed(0)}°`}
          >
            {gate.label}
          </button>
        ))}
      </div>

      <label className="control">
        <span>Ángulo paramétrico · {toDegrees(angle).toFixed(0)}°</span>
        <input
          type="range"
          min={0}
          max={Math.PI * 2}
          step={0.001}
          value={angle}
          onChange={(event) => setAngle(Number(event.target.value))}
        />
      </label>

      <div className="gate-grid">
        {PARAMETRIC.map((entry) => (
          <button key={entry.id} type="button" onClick={() => applyGate(entry.build(angle))}>
            {entry.label}
          </button>
        ))}
      </div>

      <div className="row-actions">
        <button type="button" onClick={undo} disabled={history.length === 0}>
          Deshacer
        </button>
        <button type="button" onClick={reset}>
          Reiniciar
        </button>
      </div>

      <div className="circuit">
        <span className="circuit-label">Circuito</span>
        <div className="circuit-track">
          {history.length === 0 ? (
            <span className="circuit-empty">sin compuertas</span>
          ) : (
            history.map((entry, index) => (
              <span key={`${entry.id}-${index}`} className="chip">
                {entry.label}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
