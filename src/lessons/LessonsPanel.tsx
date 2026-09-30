import { useState } from 'react'
import { LESSONS } from './content'
import { Formula } from '../panels/Formula'
import { useBlochStore } from '../store/useBlochStore'
import { blochVectorOfSystem } from '../quantum/qubit'
import { isVecCloseTo } from '../quantum/vector'

const TOLERANCE = 0.06

export const LessonsPanel = () => {
  const [index, setIndex] = useState(0)
  const system = useBlochStore((store) => store.system)
  const setState = useBlochStore((store) => store.setState)

  const lesson = LESSONS[index]
  if (!lesson) return null

  const solved =
    lesson.target !== undefined &&
    isVecCloseTo(blochVectorOfSystem(system), lesson.target, lesson.targetTolerance ?? TOLERANCE)

  return (
    <section className="panel">
      <h2>Lecciones</h2>

      <div className="lesson-nav">
        {LESSONS.map((entry, position) => (
          <button
            key={entry.title}
            type="button"
            className={position === index ? 'active' : ''}
            onClick={() => setIndex(position)}
          >
            {position + 1}
          </button>
        ))}
      </div>

      <h3 className="lesson-title">{lesson.title}</h3>
      {lesson.body.map((paragraph) => (
        <p key={paragraph} className="lesson-text">
          {paragraph}
        </p>
      ))}

      {lesson.formula ? <Formula block expression={lesson.formula} /> : null}

      <div className="row-actions">
        <button type="button" onClick={() => setState(lesson.start)}>
          Estado inicial
        </button>
        <button type="button" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setIndex(Math.min(LESSONS.length - 1, index + 1))}
          disabled={index === LESSONS.length - 1}
        >
          Siguiente
        </button>
      </div>

      {lesson.challenge ? (
        <div className={solved ? 'challenge solved' : 'challenge'}>
          <span className="readout-title">Desafío</span>
          <p className="lesson-text">{lesson.challenge}</p>
          <p className="challenge-status">{solved ? 'Resuelto' : 'Pendiente'}</p>
        </div>
      ) : null}
    </section>
  )
}
