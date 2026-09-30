import type { QubitState } from '../quantum/state'
import {
  KET_MINUS_I,
  KET_ONE,
  KET_PLUS,
  KET_PLUS_I,
  KET_ZERO,
} from '../quantum/state'
import { vec3, ZERO_VECTOR, type Vec3 } from '../quantum/vector'

export interface Lesson {
  readonly title: string
  readonly body: readonly string[]
  readonly formula?: string
  readonly start: QubitState
  readonly challenge?: string
  readonly target?: Vec3
  readonly targetTolerance?: number
}

export const LESSONS: readonly Lesson[] = [
  {
    title: '1 · Qué es un qubit',
    body: [
      'Un bit clásico vale 0 o 1. Un qubit puro es una combinación de ambos, y esa combinación se dibuja como un punto en la superficie de esta esfera.',
      'El polo norte es |0⟩ y el polo sur es |1⟩. Todo lo demás es superposición.',
      'Girá la cámara con el mouse y usá los botones de estados para ver dónde cae cada uno.',
    ],
    formula: '|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle,\\quad |\\alpha|^2 + |\\beta|^2 = 1',
    start: KET_ZERO,
    challenge: 'Llevá el estado al polo sur |1⟩.',
    target: vec3(0, 0, -1),
  },
  {
    title: '2 · Superposición y θ',
    body: [
      'El ángulo θ mide cuánto te alejás del polo norte. Controla el reparto entre |0⟩ y |1⟩.',
      'En el ecuador, θ = 90°, y las dos probabilidades valen exactamente 1/2.',
      'Movés θ y mirás cómo cambian las barras del panel de medición.',
    ],
    formula: 'P(0) = \\cos^2\\tfrac{\\theta}{2},\\qquad P(1) = \\sin^2\\tfrac{\\theta}{2}',
    start: KET_ZERO,
    challenge: 'Poné el vector sobre el ecuador, en |+⟩.',
    target: vec3(1, 0, 0),
  },
  {
    title: '3 · Fase relativa φ',
    body: [
      'El ángulo φ gira el vector alrededor del eje Z. No cambia ninguna probabilidad en la base Z.',
      'Pero sí cambia el estado: |+⟩ y |+i⟩ miden igual en Z y distinto en X y en Y.',
      'La fase global, en cambio, no se ve: multiplicar todo el estado por un número de módulo 1 deja el mismo punto.',
    ],
    formula: '|\\psi\\rangle = \\cos\\tfrac{\\theta}{2}|0\\rangle + e^{i\\varphi}\\sin\\tfrac{\\theta}{2}|1\\rangle',
    start: KET_PLUS,
    challenge: 'Desde |+⟩, llegá a |+i⟩.',
    target: vec3(0, 1, 0),
  },
  {
    title: '4 · Medición',
    body: [
      'Medir no te dice dónde estaba el vector: lo colapsa a un polo del eje que medís.',
      'Una sola medición no te enseña nada del estado. Muchas, sí.',
      'Usá "1000 tiros" y compará la frecuencia experimental con la probabilidad teórica.',
    ],
    formula: 'P(\\pm n) = \\frac{1 \\pm \\vec{r}\\cdot\\hat{n}}{2}',
    start: KET_PLUS,
  },
  {
    title: '5 · Pauli como rotaciones',
    body: [
      'X, Y y Z son medias vueltas (180°) alrededor de sus ejes.',
      'X intercambia |0⟩ y |1⟩ porque girar media vuelta alrededor de X manda el polo norte al sur.',
      'Z deja los polos quietos: por eso no cambia probabilidades en la base Z, solo la fase.',
    ],
    formula: 'X = \\begin{pmatrix}0&1\\\\1&0\\end{pmatrix},\\quad Z = \\begin{pmatrix}1&0\\\\0&-1\\end{pmatrix}',
    start: KET_ZERO,
    challenge: 'Aplicá X partiendo de |0⟩ y verificá que caés en |1⟩.',
    target: vec3(0, 0, -1),
  },
  {
    title: '6 · Hadamard',
    body: [
      'H es la compuerta que crea superposición: lleva |0⟩ a |+⟩.',
      'Su eje de rotación no es X ni Z, sino la diagonal (X+Z)/√2, y gira 180°.',
      'Mirá el eje rosa que aparece durante la animación: eso es el eje real, calculado desde la matriz.',
    ],
    formula: 'H = \\tfrac{1}{\\sqrt{2}}\\begin{pmatrix}1&1\\\\1&-1\\end{pmatrix}',
    start: KET_ZERO,
    challenge: 'Aplicá H dos veces y volvé a |0⟩.',
    target: vec3(0, 0, 1),
  },
  {
    title: '7 · S y T',
    body: [
      'S gira un cuarto de vuelta alrededor de Z; T, un octavo (45°).',
      'Solo mueven la fase φ. Sobre los polos no hacen nada visible.',
      'Con H y S se alcanzan los seis estados cardinales.',
    ],
    formula: 'S = \\begin{pmatrix}1&0\\\\0&i\\end{pmatrix},\\quad T = \\begin{pmatrix}1&0\\\\0&e^{i\\pi/4}\\end{pmatrix}',
    start: KET_ZERO,
    challenge: 'Desde |0⟩, usá H y luego S para llegar a |+i⟩.',
    target: vec3(0, 1, 0),
  },
  {
    title: '8 · Estados mixtos',
    body: [
      'Hasta acá el vector vivió en la superficie: estados puros, pureza 1.',
      'La decoherencia lo acorta. Un vector más corto es un estado mixto: hay incertidumbre clásica además de la cuántica.',
      'En el centro exacto no sabés nada: 50/50 en todas las bases.',
      'Abrí el panel de dinámica, iniciá la decoherencia y mirá la pureza bajar.',
    ],
    formula: '\\rho = \\tfrac{1}{2}(I + \\vec{r}\\cdot\\vec{\\sigma}),\\qquad \\mathrm{Tr}(\\rho^2) = \\tfrac{1+|\\vec{r}|^2}{2}',
    start: KET_PLUS,
  },
]

export const LESSON_TARGETS: readonly Vec3[] = LESSONS.map(
  (lesson) => lesson.target ?? ZERO_VECTOR,
)

export const CARDINAL_HINTS: Readonly<Record<string, QubitState>> = {
  zero: KET_ZERO,
  one: KET_ONE,
  plus: KET_PLUS,
  plusI: KET_PLUS_I,
  minusI: KET_MINUS_I,
}
