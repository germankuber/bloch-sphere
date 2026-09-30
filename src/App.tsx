import { BlochScene } from './sphere/BlochScene'
import { ExplanationOverlay } from './panels/ExplanationOverlay'
import { useBridge } from './bridge/useBridge'
import { useBackgroundClock } from './bridge/useBackgroundClock'
import { StatePanel } from './panels/StatePanel'
import { GatesPanel } from './panels/GatesPanel'
import { MathPanel } from './panels/MathPanel'
import { MeasurementPanel } from './panels/MeasurementPanel'
import { DynamicsPanel } from './panels/DynamicsPanel'
import { LessonsPanel } from './lessons/LessonsPanel'
import { SequencesPanel } from './sequences/SequencesPanel'

export const App = () => {
  useBridge()
  useBackgroundClock()

  return (
  <div className="layout">
    <header className="topbar">
      <h1>Esfera de Bloch</h1>
      <span className="subtitle">Simulador interactivo de un qubit</span>
    </header>

    <aside className="sidebar left">
      <SequencesPanel />
      <StatePanel />
      <GatesPanel />
      <DynamicsPanel />
    </aside>

    <main className="stage">
      <BlochScene />
      <ExplanationOverlay />
    </main>

    <aside className="sidebar right">
      <MathPanel />
      <MeasurementPanel />
      <LessonsPanel />
    </aside>
  </div>
  )
}
