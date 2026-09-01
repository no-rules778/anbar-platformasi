import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-md border border-slate-200', className)}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50 text-slate-600">{children}</thead>
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('border-t border-slate-100 px-4 py-2', className)}>{children}</td>
}
