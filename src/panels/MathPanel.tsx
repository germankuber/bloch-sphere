import { useBlochStore } from '../store/useBlochStore'
import { Formula } from './Formula'
import { blochVectorOfSystem, purityOfSystem } from '../quantum/qubit'
import { anglesOfVector } from '../quantum/state'
import { densityMatrixFromBloch } from '../quantum/density'
import { abs, arg, type Complex } from '../quantum/complex'

const toDegrees = (radians: number): number => (radians * 180) / Math.PI

const signed = (value: number): string => (value < 0 ? `- ${Math.abs(value).toFixed(3)}` : `+ ${value.toFixed(3)}`)

const rectangular = (z: Complex): string => `${z.re.toFixed(3)} ${signed(z.im)}i`

const polar = (z: Complex): string => {
  const modulus = abs(z)
  if (modulus < 1e-9) return '0'
  return `${modulus.toFixed(3)}\\,e^{i\\,${toDegrees(arg(z)).toFixed(1)}^{\\circ}}`
}

export const MathPanel = () => {
  const system = useBlochStore((store) => store.system)
  const vector = blochVectorOfSystem(system)
  const angles = anglesOfVector(vector)
  const rho = densityMatrixFromBloch(vector)
  const purity = purityOfSystem(system)
  const { alpha, beta } = system.ket

  return (
    <section className="panel">
      <h2>Lectura matemática</h2>

      <div className="readout">
        <Formula
          block
          expression={`|\\psi\\rangle = (${rectangular(alpha)})\\,|0\\rangle + (${rectangular(beta)})\\,|1\\rangle`}
        />
        <Formula block expression={`\\alpha = ${polar(alpha)} \\qquad \\beta = ${polar(beta)}`} />
      </div>

      <div className="readout">
        <span className="readout-title">Forma angular</span>
        <Formula
          block
          expression={`|\\psi\\rangle = \\cos\\tfrac{\\theta}{2}|0\\rangle + e^{i\\varphi}\\sin\\tfrac{\\theta}{2}|1\\rangle`}
        />
        <Formula
          block
          expression={`= ${Math.cos(angles.theta / 2).toFixed(3)}\\,|0\\rangle + e^{i\\,${toDegrees(angles.phi).toFixed(1)}^{\\circ}}\\,${Math.sin(angles.theta / 2).toFixed(3)}\\,|1\\rangle`}
        />
      </div>

      <div className="readout">
        <span className="readout-title">Vector de Bloch</span>
        <Formula
          block
          expression={`\\vec{r} = (${vector.x.toFixed(3)},\\; ${vector.y.toFixed(3)},\\; ${vector.z.toFixed(3)})`}
        />
        <div className="readout-row">
          <span>θ = {toDegrees(angles.theta).toFixed(1)}° ({angles.theta.toFixed(3)} rad)</span>
          <span>φ = {toDegrees(angles.phi).toFixed(1)}° ({angles.phi.toFixed(3)} rad)</span>
        </div>
      </div>

      <div className="readout">
        <span className="readout-title">Matriz densidad y pureza</span>
        <Formula
          block
          expression={`\\rho = \\begin{pmatrix} ${rho.m00.re.toFixed(3)} & ${rectangular(rho.m01)} \\\\ ${rectangular(rho.m10)} & ${rho.m11.re.toFixed(3)} \\end{pmatrix}`}
        />
        <Formula block expression={`\\mathrm{Tr}(\\rho^2) = ${purity.toFixed(4)}`} />
        <p className="panel-hint">
          Pureza 1 significa estado puro sobre la superficie. Por debajo de 1 el vector vive dentro de la esfera.
        </p>
      </div>
    </section>
  )
}
