import { useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { nf, fmtD } from '../../lib/format'
import { whLabel } from '../../lib/movementRoute'
import { cancelMovementRow, cancelLayerMovementRow } from '../../api/documentCancel.api'
import {
  rowActionEligibility, reversalDocLabel,
  canWriteCancellation, LAYER_CAPABILITY_UNKNOWN,
} from '../../lib/documentCancelGate'
import type { CancelStateMovement } from '../../lib/documentCancelState'
import type { DocumentView, DocumentViewMovement } from '../../lib/documentView'
import type { MovementFilterItem } from '../../lib/movementFilters'

/* «Sətri ləğv et» — index.html:5088-5122, milestone I-4.

   Cancels ONE line inside a document. The document number and every other line
   are untouched: the server writes the counter entry under the SAME `doc_num`.

   STALE ROWS. The dialog receives an ID and looks the row up in the CURRENT
   store rows on every render — and the submit handler looks it up AGAIN, then
   re-runs the FULL eligibility check, immediately before calling the API.

   THE FULL GATE, NOT THE ROW-LOCAL HALF (I-4 audit, finding 2). Nothing about
   the decision is captured when this dialog opens: `rowActionEligibility()`
   re-reads the row from the current rows, RE-ASSEMBLES the document from those
   same rows, and takes the CURRENT admin flag. So a document that became a
   reversal, was cancelled at document level, turned out to be `lotDoc`, or a
   user who lost admin while the dialog stood open, all refuse here — none of
   them reach the RPC.

   THE SAME GATE DURING RENDER (I-4 UI consistency). The refusal is computed on
   EVERY render from the same `rowActionEligibility()`, so an open dialog whose
   document changed underneath it disables «Sətri ləğv et» and STATES the
   reason, instead of offering an enabled button that answers a click with an
   error toast. There is one rule, called twice — the render gate is not a
   second copy of it.

   The submit-time call stays. It is not redundant: the store can change
   between the click and the handler running, and the handler must refuse on
   its own evidence rather than trusting what render decided.

   The dialog stays OPEN and keeps the typed reason: the state may change back,
   and «İmtina» must always work. */

interface Props {
  rowId: string
  allRows: DocumentViewMovement[]
  itemBy: Map<string, MovementFilterItem>
  /** The live `stock_layers_supported()` flag — picks the layer RPC.
      Meaningful only when `layerReady` is true. */
  layerActive: boolean
  /** Whether the capability probe ANSWERED (I-4 audit, finding 3). This
      dialog chooses between two RPC families, so an unknown capability must
      block the write rather than pick one. */
  layerReady: boolean
  /** The CURRENT admin flag, re-read by the submit handler (finding 2). */
  isAdmin: boolean
  /** Re-assembles the document view from the CURRENT rows, so the submit
      handler can re-run the document-level half of the gate. */
  assemble: (row: CancelStateMovement) => DocumentView | null
  onClose: () => void
  /** Refreshes the movements; its result decides the message shown. */
  onRefresh: () => Promise<{ ok: boolean; error: string | null }>
  onToast: (text: string, isError?: boolean) => void
}

export function CancelRowDialog({
  rowId, allRows, itemBy, layerActive, layerReady, isAdmin, assemble,
  onClose, onRefresh, onToast,
}: Props) {
  const [reason, setReason] = useState('')
  /* Set BEFORE the first await and released in `finally` — the double-submit
     lock. A second click while the RPC is in flight would post a second
     counter entry for the same line. */
  const [inFlight, setInFlight] = useState(false)

  const row = allRows.find((r) => String(r.id) === rowId)

  /* THE RENDER-TIME GATE — the identical composite check the submit handler
     runs. Re-evaluated on every render, so a state change that arrives while
     the dialog stands open disables the action immediately. */
  const eligibilityRefusal = rowActionEligibility(
    {
      rowId,
      allRows: allRows as unknown as CancelStateMovement[],
      admin: isAdmin,
      assemble,
    },
    'cancel-row',
  )

  async function submit() {
    if (inFlight) return
    const why = reason.trim()
    /* The reason is MANDATORY (index.html:5107): it is the audit record of why
       a posted line was withdrawn. */
    if (!why) return

    /* FAIL-CLOSED (finding 3) — `cancelMovementRow` vs its layer variant is a
       choice this dialog cannot make on an unanswered probe. */
    if (!canWriteCancellation(layerReady)) {
      onToast(LAYER_CAPABILITY_UNKNOWN, true)
      return
    }

    /* THE STALE RE-CHECK — the COMPLETE gate, document level included. */
    const refusal = rowActionEligibility(
      {
        rowId,
        allRows: allRows as unknown as CancelStateMovement[],
        admin: isAdmin,
        assemble,
      },
      'cancel-row',
    )
    if (refusal) {
      onToast(refusal, true)
      return
    }
    /* Re-read for the id actually sent; eligibility proved it is present. */
    const current = allRows.find((r) => String(r.id) === rowId)
    if (!current) return

    setInFlight(true)
    try {
      const call = layerActive ? cancelLayerMovementRow : cancelMovementRow
      const res = await call(String(current.id), why)
      if (!res.ok) {
        /* The server's own words, unchanged — they say what actually blocked
           the cancellation. */
        onToast('Ləğv edilmədi: ' + res.error, true)
        return
      }
      const refresh = await onRefresh()
      onClose()
      onToast(
        'Sətir ləğv edildi · sənəd: ' + reversalDocLabel(res.docNum)
        + (refresh.ok ? '' : ' — siyahı yenilənmədi, əvvəlki məlumat göstərilir'),
        !refresh.ok,
      )
    } finally {
      /* Released even on an early return or a throw, so the dialog can never
         be left permanently disabled. */
      setInFlight(false)
    }
  }

  const footer = (
    <>
      <div style={{ flex: 1 }} />
      <Button variant="secondary" onClick={onClose} disabled={inFlight}>İmtina</Button>
      <Button
        variant="danger"
        data-testid="rc-go"
        disabled={
          !row || !reason.trim() || inFlight
          || !canWriteCancellation(layerReady)
          || eligibilityRefusal !== null
        }
        onClick={() => { void submit() }}
      >
        {inFlight ? 'Ləğv edilir…' : 'Sətri ləğv et'}
      </Button>
    </>
  )

  if (!row) {
    return (
      <Dialog title="Sətri ləğv et" footer={footer} onClose={onClose}>
        <div className="empty">
          <b>Qeyd artıq mövcud deyil</b>
          Bu sətir son yenilənmədən sonra siyahıda tapılmadı.
        </div>
      </Dialog>
    )
  }


  const it = itemBy.get(row.item_code)
  const dir = (row.in_qty || 0) > 0 ? 'Mədaxil' : 'Məxaric'

  return (
    <Dialog title="Sətri ləğv et" footer={footer} onClose={onClose}>
      <div className="hint" style={{ marginBottom: 10 }}>
        {fmtD(row.date) + ' · ' + whLabel(row.warehouse) + ' · ' + dir + ' '}
        {nf((row.in_qty || row.out_qty) || 0, 2)}
        {' · ' + (it?.name || row.item_code) + ' · sənəd: '}
        <span className="code">{row.doc_num || '—'}</span>
      </div>

      {/* index.html:5098-5099 — stated plainly, because the difference between
          cancelling a LINE and cancelling a DOCUMENT is the thing an admin
          must not get wrong. */}
      <div
        className="hint"
        style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4, marginBottom: 10 }}
      >
        Yalnız bu sətir əks-yazı ilə ləğv olunur — sənədin digər sətirləri və sənəd nömrəsi
        dəyişmir. Orijinal sətir dəyişməz qalır: ləğv yeni sətir kimi yazılır.
      </div>

      {eligibilityRefusal && (
        <div
          className="hint"
          data-testid="rc-ineligible"
          style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4, marginBottom: 10 }}
        >
          {eligibilityRefusal}
        </div>
      )}

      {!canWriteCancellation(layerReady) && (
        <div
          className="hint"
          data-testid="rc-layer-unknown"
          style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4, marginBottom: 10 }}
        >
          {LAYER_CAPABILITY_UNKNOWN}
        </div>
      )}

      <label className="f">
        <span>Ləğvin səbəbi (audit üçün məcburi)</span>
        <input
          type="text"
          data-testid="rc-why"
          value={reason}
          disabled={inFlight}
          onChange={(e) => setReason(e.target.value)}
          placeholder="məs. sətir səhvən ikiqat daxil edilib"
        />
      </label>
    </Dialog>
  )
}
