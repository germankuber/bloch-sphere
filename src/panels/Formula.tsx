import { useMemo } from 'react'
import katex from 'katex'

interface FormulaProps {
  readonly expression: string
  readonly block?: boolean
}

export const Formula = ({ expression, block = false }: FormulaProps) => {
  const html = useMemo(
    () =>
      katex.renderToString(expression, {
        displayMode: block,
        throwOnError: false,
        output: 'html',
      }),
    [expression, block],
  )

  return (
    <span
      className={block ? 'formula formula-block' : 'formula'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
