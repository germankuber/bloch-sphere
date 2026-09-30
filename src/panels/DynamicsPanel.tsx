import { useBlochStore } from '../store/useBlochStore'
import { Panel } from './Panel'
import type { Vec3 } from '../quantum/vector'
import { BASIS_AXIS } from '../quantum/measurement'
import { BASIS_NAMES } from '../protocol/vocabulary'

const AXES = BASIS_NAMES.map((label) => ({ label, axis: BASIS_AXIS[label] }))

const sameAxis = (a: Vec3, b: Vec3): boolean => a.x === b.x && a.y === b.y && a.z === b.z

export const DynamicsPanel = () => {
  const precession = useBlochStore((store) => store.precession)
  const setPrecession = useBlochStore((store) => store.setPrecession)
  const relaxation = useBlochStore((store) => store.relaxation)
  const setRelaxation = useBlochStore((store) => store.setRelaxation)
  const relaxationRunning = useBlochStore((store) => store.relaxationRunning)
  const setRelaxationRunning = useBlochStore((store) => store.setRelaxationRunning)
  const toggles = useBlochStore((store) => store.toggles)
  const toggle = useBlochStore((store) => store.toggle)
  const clearTrail = useBlochStore((store) => store.clearTrail)
  const animationSpeed = useBlochStore((store) => store.animationSpeed)
  const setAnimationSpeed = useBlochStore((store) => store.setAnimationSpeed)

  return (
    <Panel title="Dinámica" defaultOpen={false}>

      <span className="readout-title">Precesión de Larmor</span>
      <p className="panel-hint">
        Un campo constante hace girar el vector alrededor de su eje, sin cambiar la longitud.
      </p>
      <div className="row-actions">
        {AXES.map((entry) => (
          <button
            key={entry.label}
            type="button"
            className={sameAxis(precession.axis, entry.axis) ? 'active' : ''}
            onClick={() => setPrecession({ axis: entry.axis })}
          >
            {entry.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setRelaxationRunning(false)
            setPrecession({ running: !precession.running })
          }}
        >
          {precession.running ? 'Pausar' : 'Iniciar'}
        </button>
      </div>
      <label className="control">
        <span>ω · {precession.omega.toFixed(2)} rad/s</span>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.01}
          value={precession.omega}
          onChange={(event) => setPrecession({ omega: Number(event.target.value) })}
        />
      </label>

      <span className="readout-title">Decoherencia</span>
      <p className="panel-hint">
        T1 relaja hacia |0⟩, T2 destruye la fase. El vector se acorta y entra en la esfera.
      </p>
      <label className="control">
        <span>T1 · {relaxation.t1.toFixed(1)} s</span>
        <input
          type="range"
          min={0.5}
          max={20}
          step={0.1}
          value={relaxation.t1}
          onChange={(event) => setRelaxation({ t1: Number(event.target.value) })}
        />
      </label>
      <label className="control">
        <span>T2 · {relaxation.t2.toFixed(1)} s</span>
        <input
          type="range"
          min={0.2}
          max={20}
          step={0.1}
          value={relaxation.t2}
          onChange={(event) => setRelaxation({ t2: Number(event.target.value) })}
        />
      </label>
      <label className="control">
        <span>Despolarización · {relaxation.depolarizingRate.toFixed(2)}</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={relaxation.depolarizingRate}
          onChange={(event) => setRelaxation({ depolarizingRate: Number(event.target.value) })}
        />
      </label>
      <div className="row-actions">
        <button
          type="button"
          onClick={() => {
            setPrecession({ running: false })
            setRelaxationRunning(!relaxationRunning)
          }}
        >
          {relaxationRunning ? 'Pausar decoherencia' : 'Iniciar decoherencia'}
        </button>
      </div>

      <span className="readout-title">Visualización</span>
      <label className="control">
        <span>Velocidad de animación · {animationSpeed.toFixed(1)}×</span>
        <input
          type="range"
          min={0.25}
          max={3}
          step={0.05}
          value={animationSpeed}
          onChange={(event) => setAnimationSpeed(Number(event.target.value))}
        />
      </label>
      <div className="row-actions">
        <button type="button" className={toggles.guides ? 'active' : ''} onClick={() => toggle('guides')}>
          Guías
        </button>
        <button type="button" className={toggles.trail ? 'active' : ''} onClick={() => toggle('trail')}>
          Trayectoria
        </button>
        <button type="button" className={toggles.labels ? 'active' : ''} onClick={() => toggle('labels')}>
          Etiquetas
        </button>
        <button type="button" onClick={clearTrail}>
          Limpiar traza
        </button>
      </div>
    </Panel>
  )
}
