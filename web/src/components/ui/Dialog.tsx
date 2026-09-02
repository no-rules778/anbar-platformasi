import type { ReactNode } from 'react'

/* The platform's modal: a full-screen `.mask` plus a centred `.modal` with a
   sticky header, a `.body` and a sticky footer (index.html:127-136). */
interface Props {
  title: string
  children: ReactNode
  footer: ReactNode
  onClose: () => void
}

export function Dialog({ title, children, footer, onClose }: Props) {
  return (
    <>
      <div className="mask" onClick={onClose} />
      <div className="modal" role="dialog" aria-label={title}>
        <header>
          <h3>{title}</h3>
          <div className="sp" />
          <button className="x" onClick={onClose} aria-label="Bağla">×</button>
        </header>
        <div className="body">{children}</div>
        <footer>{footer}</footer>
      </div>
    </>
  )
}
