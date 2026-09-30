import type { StepCommand } from '../protocol/messages'
import { formatDegrees } from '../quantum/angles'

export const describeStep = (command: StepCommand): string => {
  switch (command.kind) {
    case 'applyGate':
      return command.angle === undefined
        ? `Compuerta ${command.gate}`
        : `Compuerta ${command.gate}(${formatDegrees(command.angle)})`
    case 'setState':
      return `Estado θ=${formatDegrees(command.theta)}, φ=${formatDegrees(command.phi)}`
    case 'setPreset':
      return `Estado ${command.preset}`
    case 'measure':
      return `Medir en base ${command.basis}`
    case 'runShots':
      return `${command.shots} tiros en base ${command.basis}`
    case 'reset':
      return 'Reiniciar a |0⟩'
    case 'undo':
      return 'Deshacer'
    case 'clearTrail':
      return 'Limpiar trayectoria'
    case 'setPrecession':
      return command.running ? `Precesión alrededor de ${command.axis ?? 'Z'}` : 'Detener precesión'
    case 'setDecoherence':
      return command.running ? 'Iniciar decoherencia' : 'Detener decoherencia'
    case 'explain':
      return command.title ? `Explicación: ${command.title}` : 'Explicación'
    case 'clearExplanation':
      return 'Ocultar explicación'
    case 'highlightAxis':
      return command.axis ? `Resaltar eje ${command.axis}` : 'Quitar resaltado'
  }
}
