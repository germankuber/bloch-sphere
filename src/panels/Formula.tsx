import { useMemo } from 'react'
import katex from 'katex'

const MAX_SIZE_EM = 20
const MAX_MACRO_EXPANSIONS = 500

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
        trust: false,
        strict: 'ignore',
        maxSize: MAX_SIZE_EM,
        maxExpand: MAX_MACRO_EXPANSIONS,
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
