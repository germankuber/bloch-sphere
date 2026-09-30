import { useBlochStore } from '../store/useBlochStore'
import { Formula } from './Formula'

export const ExplanationOverlay = () => {
  const explanation = useBlochStore((store) => store.explanation)
  const setExplanation = useBlochStore((store) => store.setExplanation)
  const connected = useBlochStore((store) => store.bridgeConnected)
  const clientId = useBlochStore((store) => store.clientId)

  return (
    <div className="overlay">
      <div className={connected ? 'bridge-status online' : 'bridge-status'}>
        <span className="bridge-dot" />
        {connected && clientId ? `Agente conectado · ${clientId}` : 'Agente desconectado'}
      </div>

      {explanation ? (
        <div className="explanation">
          {explanation.title ? <h3>{explanation.title}</h3> : null}
          <p>{explanation.text}</p>
          {explanation.formula ? <Formula block expression={explanation.formula} /> : null}
          <button type="button" className="explanation-close" onClick={() => setExplanation(null)}>
            Cerrar
          </button>
        </div>
      ) : null}
    </div>
  )
}
