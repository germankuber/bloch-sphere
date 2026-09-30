import { BlochScene } from './sphere/BlochScene'
import { StatePanel } from './panels/StatePanel'
import { GatesPanel } from './panels/GatesPanel'
import { MathPanel } from './panels/MathPanel'
import { MeasurementPanel } from './panels/MeasurementPanel'
import { DynamicsPanel } from './panels/DynamicsPanel'
import { LessonsPanel } from './lessons/LessonsPanel'

export const App = () => (
  <div className="layout">
    <header className="topbar">
      <h1>Esfera de Bloch</h1>
      <span className="subtitle">Simulador interactivo de un qubit</span>
    </header>

    <aside className="sidebar left">
      <StatePanel />
      <GatesPanel />
      <DynamicsPanel />
    </aside>

    <main className="stage">
      <BlochScene />
    </main>

    <aside className="sidebar right">
      <MathPanel />
      <MeasurementPanel />
      <LessonsPanel />
    </aside>
  </div>
)
