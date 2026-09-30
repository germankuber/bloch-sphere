import { useBlochStore } from '../store/useBlochStore'

let lastTickAt = Date.now()

export const tickSimulation = (now: number = Date.now()): void => {
  const elapsedSeconds = (now - lastTickAt) / 1000
  lastTickAt = now
  if (elapsedSeconds > 0) useBlochStore.getState().advance(elapsedSeconds)
}
