import { useEffect } from 'react'
import { tickSimulation } from './simulationClock'

const TICK_MS = 25

export const useBackgroundClock = (): void => {
  useEffect(() => {
    const timer = setInterval(() => tickSimulation(), TICK_MS)
    return () => clearInterval(timer)
  }, [])
}
