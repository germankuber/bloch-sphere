import type { BasisName, CommandKind, GateId, PresetId, StepKind } from './vocabulary'

export interface SequenceSummary {
  readonly name: string
  readonly description?: string
  readonly length: number
  readonly position: number
}

export interface ComplexValue {
  readonly re: number
  readonly im: number
}

export interface BlochSnapshot {
  readonly theta: number
  readonly phi: number
  readonly x: number
  readonly y: number
  readonly z: number
  readonly alpha: ComplexValue
  readonly beta: ComplexValue
  readonly purity: number
  readonly radius: number
  readonly probabilities: Readonly<Record<BasisName, readonly [number, number]>>
  readonly history: readonly string[]
  readonly animating: boolean
  readonly sequences: readonly SequenceSummary[]
  readonly activeSequence: string | null
}

export type StepCommand =
  | { readonly kind: 'applyGate'; readonly gate: GateId; readonly angle?: number }
  | { readonly kind: 'setState'; readonly theta: number; readonly phi: number }
  | { readonly kind: 'setPreset'; readonly preset: PresetId }
  | { readonly kind: 'measure'; readonly basis: BasisName }
  | { readonly kind: 'runShots'; readonly basis: BasisName; readonly shots: number }
  | { readonly kind: 'reset' }
  | { readonly kind: 'undo' }
  | { readonly kind: 'clearTrail' }
  | { readonly kind: 'setPrecession'; readonly running: boolean; readonly axis?: BasisName; readonly omega?: number }
  | {
      readonly kind: 'setDecoherence'
      readonly running: boolean
      readonly t1?: number
      readonly t2?: number
      readonly depolarizingRate?: number
    }
  | { readonly kind: 'explain'; readonly title?: string; readonly text: string; readonly formula?: string }
  | { readonly kind: 'clearExplanation' }
  | { readonly kind: 'highlightAxis'; readonly axis: BasisName | null }

export interface SequenceStep {
  readonly command: StepCommand
  readonly note?: string
}

export type CommandMessage =
  | StepCommand
  | { readonly kind: 'getState' }
  | {
      readonly kind: 'loadSequence'
      readonly name: string
      readonly description?: string
      readonly steps: readonly SequenceStep[]
    }
  | { readonly kind: 'deleteSequence'; readonly name: string }

export type StepKindMismatch = Exclude<StepKind, StepCommand['kind']> | Exclude<StepCommand['kind'], StepKind>
export type CommandKindMismatch =
  | Exclude<CommandKind, CommandMessage['kind']>
  | Exclude<CommandMessage['kind'], CommandKind>

export interface RequestEnvelope {
  readonly kind: 'request'
  readonly id: string
  readonly command: CommandMessage
}

export interface WelcomeMessage {
  readonly kind: 'welcome'
  readonly clientId: string
}

export type BrowserInbound = RequestEnvelope | WelcomeMessage

export type BrowserMessage =
  | { readonly kind: 'snapshot'; readonly id?: string; readonly snapshot: BlochSnapshot }
  | {
      readonly kind: 'shots'
      readonly id: string
      readonly basis: BasisName
      readonly zero: number
      readonly one: number
      readonly snapshot: BlochSnapshot
    }
  | {
      readonly kind: 'outcome'
      readonly id: string
      readonly basis: BasisName
      readonly outcome: 0 | 1
      readonly snapshot: BlochSnapshot
    }
  | { readonly kind: 'error'; readonly id: string; readonly message: string }
