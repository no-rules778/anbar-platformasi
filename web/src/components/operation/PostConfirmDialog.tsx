import { useState } from 'react'
import { nf } from '../../lib/format'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

/* Post confirmation — M7-92 (normal, index.html:4663-4668) and M7-93 (edit
   mode, 4644-4662).

   Two different dialogs behind one component because they are the same step of
   the same flow. The edit variant carries a MANDATORY reason: `correct_document`
   requires it and writes it to the audit log, so an empty reason must never
   reach the RPC. That gate is implemented twice — disabled button AND an
   independent refusal in the handler.

   `canPost` is NOT re-derived here. The caller passes the SAME gate value it
   used for the panel's button (M7-S5); adding a second condition in this
   component is exactly the disagreement that row forbids. */
interface Props {
  lineCount: number
  editMode: boolean
  editDocNum?: string
  /** The single `canPost` gate, passed in — never recomputed locally. */
  canPost: boolean
  inFlight: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}

export function PostConfirmDialog({
  lineCount, editMode, editDocNum, canPost, inFlight, onConfirm, onClose,
}: Props) {
  const [reason, setReason] = useState('')
  const reasonOk = !editMode || reason.trim().length > 0
  const ready = canPost && !inFlight && reasonOk

  function confirm() {
    /* Independent refusal — the disabled button is a UI state, not a gate. */
    if (!ready) return
    onConfirm(reason.trim())
  }

  return (
    <Dialog
      title={editMode ? 'Düzəliş qeyd edilsin?' : 'Sənəd qeyd edilsin?'}
      onClose={onClose}
      footer={(
        <>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <Button onClick={confirm} disabled={!ready}>
            {editMode ? 'Düzəlişi qeyd et' : 'Qeyd et'}
          </Button>
        </>
      )}
    >
      <div data-testid="post-confirm-body">
        {editMode ? (
          <>
            <p>
              <b>{editDocNum}</b> sənədi düzəldiləcək: köhnə sənəd ləğv edilir və
              yenisi eyni əməliyyat daxilində yazılır.
            </p>
            <p>{nf(lineCount)} sətir yazılacaq.</p>
            <p className="hint">
              Excel ixracını yeniləyin — köhnə sənəd nömrəsi dəyişir.
            </p>
            <label className="f">
              <span>Düzəlişin səbəbi *</span>
              <Input
                value={reason}
                aria-label="Düzəlişin səbəbi"
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <p>{nf(lineCount)} sətir qeyd ediləcək.</p>
            <p className="hint">Qeyd edildikdən sonra sənəd birbaşa redaktə edilə bilməz.</p>
          </>
        )}
      </div>
    </Dialog>
  )
}
