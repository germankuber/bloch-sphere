import { beforeEach, describe, expect, it } from 'vitest'
import { useBlochStore } from './useBlochStore'
import { GATE_H, GATE_S, GATE_X, GATE_Z } from '../quantum/gates'
import { blochVectorOfSystem } from '../quantum/qubit'
import { KET_PLUS } from '../quantum/state'
import { isVecCloseTo, vec3, vecLength, Z_AXIS } from '../quantum/vector'

const store = () => useBlochStore.getState()
const vector = () => blochVectorOfSystem(store().system)

describe('useBlochStore', () => {
  beforeEach(() => {
    store().reset()
    store().setAnimationSpeed(1)
    store().setRelaxationRunning(false)
    store().setPrecession({ running: false, axis: Z_AXIS, omega: 1.2 })
  })

  it('animates a gate and then commits the exact algebraic result', () => {
    store().applyGate(GATE_H)
    expect(store().animation).not.toBeNull()
    expect(isVecCloseTo(vector(), vec3(0, 0, 1))).toBe(true)

    store().advance(0.4)
    expect(store().animation).not.toBeNull()
    expect(isVecCloseTo(store().displayVector, vec3(0, 0, 1))).toBe(false)

    store().advance(0.5)
    expect(store().animation).toBeNull()
    expect(isVecCloseTo(vector(), vec3(1, 0, 0), 1e-12)).toBe(true)
    expect(store().history.map((entry) => entry.label)).toEqual(['H'])
  })

  it('queues gates applied during an animation and runs them in order', () => {
    store().applyGate(GATE_H)
    store().applyGate(GATE_S)
    expect(store().queue).toHaveLength(1)
    store().advance(1)
    store().advance(1)
    expect(isVecCloseTo(vector(), vec3(0, 1, 0), 1e-12)).toBe(true)
    expect(store().history.map((entry) => entry.label)).toEqual(['H', 'S'])
  })

  it('completes pending animations instantly', () => {
    store().applyGate(GATE_H)
    store().applyGate(GATE_S)
    store().applyGate(GATE_X)
    store().completeAnimations()
    expect(store().animation).toBeNull()
    expect(store().queue).toHaveLength(0)
    expect(isVecCloseTo(vector(), vec3(0, -1, 0), 1e-12)).toBe(true)
    expect(store().past).toHaveLength(3)
  })

  it('undoes the last gate', () => {
    store().applyGate(GATE_X)
    store().completeAnimations()
    store().undo()
    expect(isVecCloseTo(vector(), vec3(0, 0, 1))).toBe(true)
    expect(store().history).toHaveLength(0)
  })

  it('precesses by exactly omega times the elapsed time, whatever the step size', () => {
    store().setState(KET_PLUS)
    store().setPrecession({ running: true, axis: Z_AXIS, omega: 2 })
    store().advance(0.5)
    const phi = Math.atan2(vector().y, vector().x)
    expect(phi).toBeCloseTo(1, 9)
  })

  it('relaxes toward |0> following the Bloch equations', () => {
    store().setState(KET_PLUS)
    store().setRelaxation({ t1: 1, t2: 0.5, depolarizingRate: 0 })
    store().setRelaxationRunning(true)
    store().advance(1)
    expect(vector().x).toBeCloseTo(Math.exp(-2), 9)
    expect(vector().z).toBeCloseTo(1 - Math.exp(-1), 9)
  })

  it('shrinks toward the center when only depolarizing acts', () => {
    store().setState(KET_PLUS)
    store().setRelaxation({ t1: Infinity, t2: Infinity, depolarizingRate: 1 })
    store().setRelaxationRunning(true)
    store().advance(2)
    expect(vecLength(vector())).toBeCloseTo(Math.exp(-2), 9)
  })

  it('measures with an injected random source and records it in the history', () => {
    store().setState(KET_PLUS)
    expect(store().measure('Z', () => 0.2)).toBe(0)
    expect(isVecCloseTo(vector(), vec3(0, 0, 1))).toBe(true)
    expect(store().history.map((entry) => entry.label)).toEqual(['MZ'])
  })

  it('runs shots through a single store action', () => {
    store().setState(KET_PLUS)
    const values = [0.1, 0.9, 0.2]
    const random = () => values.shift() ?? 0
    expect(store().runShots('Z', 3, random)).toEqual({ basis: 'Z', zero: 2, one: 1 })
    expect(store().shots).toEqual({ basis: 'Z', zero: 2, one: 1 })
  })

  it('undo during an animation reverts the gate being animated', () => {
    store().applyGate(GATE_X)
    store().undo()
    expect(store().animation).toBeNull()
    expect(isVecCloseTo(vector(), vec3(0, 0, 1))).toBe(true)
    expect(store().history).toHaveLength(0)
  })

  it('keeps only the most recent history so snapshots stay within protocol limits', () => {
    Array.from({ length: 520 }).forEach(() => {
      store().applyGate(GATE_Z)
      store().completeAnimations()
    })
    expect(store().history).toHaveLength(500)
    expect(store().past).toHaveLength(500)
  })

  it('reset clears the teaching overlays and stops dynamics', () => {
    store().setExplanation({ text: 'hola' })
    store().setHighlightedAxis('X')
    store().setPrecession({ running: true })
    store().reset()
    expect(store().explanation).toBeNull()
    expect(store().highlightedAxis).toBeNull()
    expect(store().precession.running).toBe(false)
  })
})
