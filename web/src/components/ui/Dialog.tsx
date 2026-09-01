import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  footer: ReactNode
  onClose: () => void
}

export function Dialog({ title, children, footer, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        <div className="mb-4">{children}</div>
        <div className="flex items-center justify-end gap-2">{footer}</div>
      </div>
    </div>
  )
}
