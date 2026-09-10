import type { QaimeConflict } from '../../lib/qaimeConflict'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

/* Qaimə № conflict — M7-89, index.html:4612-4630.

   A HARD block: there is deliberately no «anladım, davam et» button. The same
   invoice number may repeat only when the date AND the counterparty match (a
   continuation of the same delivery); anything else is a data-entry error that
   would corrupt the invoice trail, so the only exit is to close and fix the
   number. Do not add a continue affordance here. */
interface Props {
  conflict: QaimeConflict
  onClose: () => void
}

export function QaimeConflictDialog({ conflict, onClose }: Props) {
  return (
    <Dialog
      title="Qaimə № təkrarlanır"
      onClose={onClose}
      footer={(
        <>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>Bağla</Button>
        </>
      )}
    >
      <div data-testid="qaime-conflict-body">
        <p>
          <b>{conflict.iv}</b> qaimə nömrəsi başqa sənəddə istifadə olunub.
          Eyni qaimə yalnız tarix və qarşı tərəf üst-üstə düşdükdə təkrarlana bilər.
        </p>
        <p>Sənəd: <b>{conflict.doc}</b></p>
        <p>Tarix: {conflict.date}</p>
        <p>Qarşı tərəf: {conflict.partner}</p>
        <p className="hint">Davam etmək üçün qaimə nömrəsini dəyişin.</p>
      </div>
    </Dialog>
  )
}
