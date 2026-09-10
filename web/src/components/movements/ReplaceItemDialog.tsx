import { useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { nf, fmtD } from '../../lib/format'
import { whLabel } from '../../lib/movementRoute'
import { replaceMovementItem } from '../../api/documentCancel.api'
import { rowActionEligibility, reversalDocLabel } from '../../lib/documentCancelGate'
import type { CancelStateMovement } from '../../lib/documentCancelState'
import { searchReplacementItems, MIN_QUERY_LENGTH } from '../../lib/replaceItemSearch'
import type { DocumentView, DocumentViewMovement } from '../../lib/documentView'
import type { MovementFilterItem } from '../../lib/movementFilters'

/* «Malı əvəz et · sətir üzrə» — index.html:4947-5011, milestone I-4.
   Decision `D4`, resolved as INCLUDED for parity.

   The server writes a counter line plus a new-item line under the SAME
   `doc_num`; the document is not split and the original row is not modified.
   Document number, date, warehouse, quantity, price, partner and invoice
   number are all preserved by the server.

   THERE IS NO LAYER VARIANT. `replace_movement_item` is the only live
   replacement function, so the capability flag selects nothing here. The
   partia-valued case is excluded by `canReplaceItems()`, which refuses a
   `lotDoc` document entirely — and the submit handler re-checks it, so a
   document that BECOMES lot-valued while this dialog stands open is refused
   too (I-4 audit, finding 2).

   Unlike row cancellation, replacement IS offered on a doc-less legacy record:
   `legacyCancelView()` renders «Malı əvəz et» (index.html:5275). The gate
   distinguishes the two actions rather than treating them as one.

   THE SAME GATE DURING RENDER (I-4 UI consistency). `rowActionEligibility()`
   runs on EVERY render, not only at submit, so a dialog left open across a
   change disables «Malı əvəz et» and STATES why rather than offering an
   enabled button that refuses on click. One rule, called twice.

   The submit-time call stays: the store can change between click and handler,
   so the handler refuses on its own evidence. The dialog stays open, the typed
   reason and the picked item survive, and «İmtina» always works. */

interface Props {
  rowId: string
  allRows: DocumentViewMovement[]
  itemBy: Map<string, MovementFilterItem>
  /** The CURRENT admin flag, re-read by the submit handler (finding 2). */
  isAdmin: boolean
  /** Re-assembles the document view from the CURRENT rows. */
  assemble: (row: CancelStateMovement) => DocumentView | null
  onClose: () => void
  onRefresh: () => Promise<{ ok: boolean; error: string | null }>
  onToast: (text: string, isError?: boolean) => void
}

export function ReplaceItemDialog({
  rowId, allRows, itemBy, isAdmin, assemble, onClose, onRefresh, onToast,
}: Props) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [inFlight, setInFlight] = useState(false)

  const row = allRows.find((r) => String(r.id) === rowId)

  /* THE RENDER-TIME GATE — the identical composite check the submit handler
     runs, re-evaluated on every render. */
  const eligibilityRefusal = rowActionEligibility(
    {
      rowId,
      allRows: allRows as unknown as CancelStateMovement[],
      admin: isAdmin,
      assemble,
    },
    'replace-item',
  )

  async function submit() {
    if (inFlight) return
    const why = reason.trim()
    if (!picked || !why) return

    /* Re-gate against the CURRENT rows — the COMPLETE gate, document level
       included. See CancelRowDialog. */
    const refusal = rowActionEligibility(
      {
        rowId,
        allRows: allRows as unknown as CancelStateMovement[],
        admin: isAdmin,
        assemble,
      },
      'replace-item',
    )
    if (refusal) {
      onToast(refusal, true)
      return
    }
    const current = allRows.find((r) => String(r.id) === rowId)
    if (!current) return
    /* The item may have changed under us — replacing an item with itself is
       not a correction. */
    if (picked === current.item_code) {
      onToast('Yeni mal cari maldan fərqli olmalıdır', true)
      return
    }

    setInFlight(true)
    try {
      const res = await replaceMovementItem(String(current.id), picked, why)
      if (!res.ok) {
        onToast('Əvəzlənmədi: ' + res.error, true)
        return
      }
      const refresh = await onRefresh()
      onClose()
      onToast(
        'Mal əvəzləndi: ' + (res.oldItemCode || current.item_code)
        + ' → ' + (res.newItemCode || picked)
        + ' · sənəd: ' + reversalDocLabel(res.docNum)
        + (refresh.ok ? '' : ' — siyahı yenilənmədi, əvvəlki məlumat göstərilir'),
        !refresh.ok,
      )
    } finally {
      setInFlight(false)
    }
  }

  const footer = (
    <>
      <div style={{ flex: 1 }} />
      <Button variant="secondary" onClick={onClose} disabled={inFlight}>İmtina</Button>
      <Button
        data-testid="rp-go"
        disabled={
          !row || !picked || !reason.trim() || inFlight
          || eligibilityRefusal !== null
        }
        onClick={() => { void submit() }}
      >
        {inFlight ? 'Əvəzlənir…' : 'Malı əvəz et'}
      </Button>
    </>
  )

  if (!row) {
    return (
      <Dialog title="Malı əvəz et · sətir üzrə" footer={footer} onClose={onClose}>
        <div className="empty">
          <b>Qeyd artıq mövcud deyil</b>
          Bu sətir son yenilənmədən sonra siyahıda tapılmadı.
        </div>
      </Dialog>
    )
  }


  const it = itemBy.get(row.item_code)
  const dir = (row.in_qty || 0) > 0 ? 'Mədaxil' : 'Məxaric'
  /* The current item is excluded by the search itself. */
  const hits = searchReplacementItems(query, itemBy, row.item_code)
  const pickedName = picked ? (itemBy.get(picked)?.name || picked) : null

  return (
    <Dialog title="Malı əvəz et · sətir üzrə" footer={footer} onClose={onClose}>
      <div className="hint" style={{ marginBottom: 10 }}>
        {fmtD(row.date) + ' · ' + whLabel(row.warehouse) + ' · ' + dir + ' '}
        {nf((row.in_qty || row.out_qty) || 0, 2)}
        {' · sənəd: '}
        <span className="code">{row.doc_num || '—'}</span>
      </div>

      {eligibilityRefusal && (
        <div
          className="hint"
          data-testid="rp-ineligible"
          style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4, marginBottom: 10 }}
        >
          {eligibilityRefusal}
        </div>
      )}

      {/* index.html:4959-4961. */}
      <div
        className="hint"
        style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4, marginBottom: 10 }}
      >
        Orijinal sətir dəyişmir. Eyni sənədin içində əks sətir və yeni mal sətri yazılır —
        sənəd nömrəsi, tarix, anbar, miqdar, qiymət, kontragent və Qaimə № saxlanılır.
      </div>

      <label className="f">
        <span>Köhnə mal</span>
        <input type="text" readOnly value={(it?.name || '') + ' · ' + row.item_code} />
      </label>

      <label className="f">
        <span>Yeni mal (ad və ya kod yazın)</span>
        <input
          type="text"
          data-testid="rp-item"
          autoComplete="off"
          value={query}
          disabled={inFlight}
          onChange={(e) => { setQuery(e.target.value); setPicked(null) }}
          placeholder="məs. kabel, 0000123…"
        />
        <span className="hint" data-testid="rp-sel">
          {picked
            ? <>{'Seçildi: '}<b>{pickedName}</b>{' · '}<span className="code">{picked}</span></>
            : 'Seçilməyib'}
        </span>
      </label>

      {query.trim().length >= MIN_QUERY_LENGTH && !picked && (
        <div className="card" data-testid="rp-res" style={{ marginBottom: 10 }}>
          {hits.length ? hits.map((h) => (
            <div
              key={h.code}
              role="button"
              tabIndex={0}
              data-testid={'rp-hit-' + h.code}
              style={{ padding: '7px 9px', cursor: 'pointer', borderBottom: '1px solid var(--line-2)' }}
              onClick={() => { setPicked(h.code); setQuery(h.name || h.code) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { setPicked(h.code); setQuery(h.name || h.code) }
              }}
            >
              <b>{h.name || h.code}</b>
              <div className="hint"><span className="code">{h.code}</span></div>
            </div>
          )) : <div className="hint" style={{ padding: 9 }}>Tapılmadı</div>}
        </div>
      )}

      <label className="f">
        <span>Əvəzləmənin səbəbi (audit üçün məcburi)</span>
        <input
          type="text"
          data-testid="rp-why"
          value={reason}
          disabled={inFlight}
          onChange={(e) => setReason(e.target.value)}
          placeholder="məs. qaimədə səhv mal kodu göstərilib"
        />
      </label>
    </Dialog>
  )
}
