import type { BlochSnapshot, SequenceSummary } from '../protocol/messages'
import { blochVectorOfSystem, purityOfSystem } from '../quantum/qubit'
import { anglesOfVector } from '../quantum/state'
import { outcomeProbabilities } from '../quantum/measurement'
import { useBlochStore } from '../store/useBlochStore'
import { useSequenceStore, type StoredSequence } from '../sequences/useSequenceStore'

export const summarizeSequences = (sequences: readonly StoredSequence[]): readonly SequenceSummary[] =>
  sequences.map(({ name, description, steps, position }) => ({ name, description, length: steps.length, position }))

export const liveSnapshot = (): BlochSnapshot => {
  const { system, history, animation } = useBlochStore.getState()
  const { sequences, activeName } = useSequenceStore.getState()
  const vector = blochVectorOfSystem(system)
  const angles = anglesOfVector(vector)
  const [z0, z1] = outcomeProbabilities(vector, 'Z')
  const [x0, x1] = outcomeProbabilities(vector, 'X')
  const [y0, y1] = outcomeProbabilities(vector, 'Y')

  return {
    theta: angles.theta,
    phi: angles.phi,
    x: vector.x,
    y: vector.y,
    z: vector.z,
    alpha: { re: system.ket.alpha.re, im: system.ket.alpha.im },
    beta: { re: system.ket.beta.re, im: system.ket.beta.im },
    purity: purityOfSystem(system),
    radius: system.radius,
    probabilities: { Z: [z0, z1], X: [x0, x1], Y: [y0, y1] },
    history: history.map((entry) => entry.label),
    animating: animation !== null,
    sequences: summarizeSequences(sequences),
    activeSequence: activeName,
  }
}
