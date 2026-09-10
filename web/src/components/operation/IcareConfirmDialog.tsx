import { useState } from 'react'
import type { ExposureHit, ExposureLine } from '../../lib/icareExposure'
import { nf } from '../../lib/format'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Table, Thead, Th, Td } from '../ui/Table'

/* İcarə exposure confirmation — M7-81, index.html:4574-4610.

   Moving rented goods is allowed but never silent: the reason is MANDATORY and
   is written into each exposed line's note, and the server records the same
   fact in the audit log (sql/031). The reason gate is implemented TWICE — the
   button is disabled AND the handler refuses — because a disabled button is a
   UI state, not a guarantee (the Phase 5 A02/A03 precedent). */
interface Props {
  hits: readonly ExposureHit<ExposureLine>[]
  onConfirm: (reason: string) => void
  onClose: () => void
}

export function IcareConfirmDialog({ hits, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('')
  const ready = reason.trim().length > 0

  function confirm() {
    /* Second, independent refusal — never rely on `disabled` alone. */
    if (!ready) return
    onConfirm(reason.trim())
  }

  return (
    <Dialog
      title="İcarədə olan maldan istifadə"
      onClose={onClose}
      footer={(
        <>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <Button onClick={confirm} disabled={!ready}>Təsdiq et</Button>
        </>
      )}
    >
      <p>
        Aşağıdakı sətirlər icarədə olan maldan istifadə edir. Davam etmək üçün
        səbəb yazmalısınız.
      </p>

      <Table>
        <Thead>
          <tr>
            <Th>Mal</Th>
            <Th>Anbar</Th>
            <Th right>İcarədən</Th>
          </tr>
        </Thead>
        <tbody>
          {hits.map((h, i) => (
            <tr key={i}>
              <Td>{h.line.name ?? h.line.c}</Td>
              <Td>{h.w}</Td>
              <Td className="num r">{nf(h.exp, 2)} {h.line.unit ?? ''}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <label className="f">
        <span>Səbəb *</span>
        <Input
          value={reason}
          aria-label="Səbəb"
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
    </Dialog>
  )
}
