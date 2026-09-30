export interface Complex {
  readonly re: number
  readonly im: number
}

export const complex = (re: number, im = 0): Complex => ({ re, im })

export const COMPLEX_ZERO = complex(0)
export const COMPLEX_ONE = complex(1)
export const COMPLEX_I = complex(0, 1)

export const add = (a: Complex, b: Complex): Complex => complex(a.re + b.re, a.im + b.im)

export const subtract = (a: Complex, b: Complex): Complex => complex(a.re - b.re, a.im - b.im)

export const multiply = (a: Complex, b: Complex): Complex =>
  complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)

export const conjugate = (a: Complex): Complex => complex(a.re, -a.im)

export const scale = (a: Complex, factor: number): Complex => complex(a.re * factor, a.im * factor)

export const abs2 = (a: Complex): number => a.re * a.re + a.im * a.im

export const abs = (a: Complex): number => Math.sqrt(abs2(a))

export const arg = (a: Complex): number => Math.atan2(a.im, a.re)

export const expI = (angle: number): Complex => complex(Math.cos(angle), Math.sin(angle))

export const fromPolar = (radius: number, angle: number): Complex => scale(expI(angle), radius)

export const divide = (a: Complex, b: Complex): Complex => {
  const denominator = abs2(b)
  return scale(multiply(a, conjugate(b)), 1 / denominator)
}

export const sqrt = (a: Complex): Complex => fromPolar(Math.sqrt(abs(a)), arg(a) / 2)

export const isCloseTo = (a: Complex, b: Complex, tolerance = 1e-9): boolean =>
  Math.abs(a.re - b.re) <= tolerance && Math.abs(a.im - b.im) <= tolerance
