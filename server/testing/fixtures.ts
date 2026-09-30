import type { BlochSnapshot } from '../../src/protocol/messages'

export const SNAPSHOT: BlochSnapshot = {
  theta: Math.PI / 2,
  phi: 0,
  x: 1,
  y: 0,
  z: 0,
  alpha: { re: Math.SQRT1_2, im: 0 },
  beta: { re: Math.SQRT1_2, im: 0 },
  purity: 1,
  radius: 1,
  probabilities: { Z: [0.5, 0.5], X: [1, 0], Y: [0.5, 0.5] },
  history: ['H'],
  animating: false,
  sequences: [],
  activeSequence: null,
}
