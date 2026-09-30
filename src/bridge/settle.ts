import { useBlochStore } from '../store/useBlochStore'

const POLL_INTERVAL_MS = 40
export const SETTLE_LIMIT_MS = 6000

const isPageHidden = (): boolean => typeof document !== 'undefined' && document.hidden

const isIdle = (): boolean => {
  const { animation, queue } = useBlochStore.getState()
  return animation === null && queue.length === 0
}

export const waitForAnimations = (limitMs: number = SETTLE_LIMIT_MS): Promise<void> =>
  new Promise((resolve) => {
    const startedAt = Date.now()
    const check = () => {
      if (isIdle()) {
        resolve()
        return
      }
      if (isPageHidden() || Date.now() - startedAt > limitMs) {
        useBlochStore.getState().completeAnimations()
        resolve()
        return
      }
      setTimeout(check, POLL_INTERVAL_MS)
    }
    check()
  })
