import type { ReactNode } from 'react'

interface PanelProps {
  readonly title: string
  readonly defaultOpen?: boolean
  readonly children: ReactNode
}

export const Panel = ({ title, defaultOpen = true, children }: PanelProps) => (
  <details className="panel" open={defaultOpen}>
    <summary className="panel-summary">{title}</summary>
    <div className="panel-body">{children}</div>
  </details>
)
