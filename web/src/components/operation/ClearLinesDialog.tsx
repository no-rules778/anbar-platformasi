import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

/* «Sətirləri təmizlə» confirmation — M7-44, index.html:4562-4572.

   The confirmation is the whole point of the row: without it a misclick
   discards an unposted document AND its saved draft. Cancelling must leave
   both untouched, so this component owns no state and clears nothing itself —
   it only reports the user's answer. */
interface Props {
  count: number
  onConfirm: () => void
  onClose: () => void
}

export function ClearLinesDialog({ count, onConfirm, onClose }: Props) {
  return (
    <Dialog
      title="Sətirlər təmizlənsin?"
      onClose={onClose}
      footer={(
        <>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <Button variant="danger" onClick={onConfirm}>Təmizlə</Button>
        </>
      )}
    >
      <div data-testid="clear-lines-body">
        <p>{count} sətir silinəcək. Bu əməliyyat geri qaytarıla bilməz.</p>
        <p className="hint">Sənəd hələ qeyd edilməyib — bazada heç nə dəyişmir.</p>
      </div>
    </Dialog>
  )
}
