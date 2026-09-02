import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

/* `.tw` is the platform's scroll wrapper; `th`/`td` are styled globally
   (index.html:73-81). */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('tw', className)}>
      <table>{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>
}

export function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return <th className={right ? 'r' : undefined}>{children}</th>
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={className}>{children}</td>
}
