import {
  GATE_H,
  GATE_I,
  GATE_S,
  GATE_S_DAGGER,
  GATE_SQRT_X,
  GATE_T,
  GATE_T_DAGGER,
  GATE_X,
  GATE_Y,
  GATE_Z,
  phaseGate,
  rxGate,
  ryGate,
  rzGate,
  type Gate,
} from '../quantum/gates'
import {
  KET_MINUS,
  KET_MINUS_I,
  KET_ONE,
  KET_PLUS,
  KET_PLUS_I,
  KET_ZERO,
  type QubitState,
} from '../quantum/state'
import {
  isGateId,
  isParametricGateId,
  isPresetId,
  MAX_ABS_ANGLE,
  type FixedGateId,
  type ParametricGateId,
  type PresetId,
} from '../protocol/vocabulary'

const FIXED_GATES_BY_ID: Readonly<Record<FixedGateId, Gate>> = {
  I: GATE_I,
  X: GATE_X,
  Y: GATE_Y,
  Z: GATE_Z,
  H: GATE_H,
  S: GATE_S,
  Sdg: GATE_S_DAGGER,
  T: GATE_T,
  Tdg: GATE_T_DAGGER,
  SX: GATE_SQRT_X,
}

const PARAMETRIC_GATES_BY_ID: Readonly<Record<ParametricGateId, (angle: number) => Gate>> = {
  Rx: rxGate,
  Ry: ryGate,
  Rz: rzGate,
  P: phaseGate,
}

const PRESETS_BY_ID: Readonly<Record<PresetId, QubitState>> = {
  '|0>': KET_ZERO,
  '|1>': KET_ONE,
  '|+>': KET_PLUS,
  '|->': KET_MINUS,
  '|+i>': KET_PLUS_I,
  '|-i>': KET_MINUS_I,
}

export const requireFinite = (label: string, value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`)
  return value
}

export const resolveGate = (id: unknown, angle: unknown): Gate => {
  if (!isGateId(id)) throw new Error(`Unknown gate ${String(id)}`)
  if (isParametricGateId(id)) {
    if (angle === undefined) throw new Error(`Gate ${id} requires an angle in radians`)
    const radians = requireFinite(`Angle of ${id}`, angle)
    if (Math.abs(radians) > MAX_ABS_ANGLE) throw new Error(`Angle of ${id} must be between -8π and 8π`)
    return PARAMETRIC_GATES_BY_ID[id](radians)
  }
  return FIXED_GATES_BY_ID[id]
}

export const resolvePreset = (id: unknown): QubitState => {
  if (!isPresetId(id)) throw new Error(`Unknown preset ${String(id)}`)
  return PRESETS_BY_ID[id]
}
