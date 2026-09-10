import { useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { canEditDocument } from '../../lib/documentEdit'
import { nf, fmtD, today } from '../../lib/format'
import { whLabel, routeOrPartner } from '../../lib/movementRoute'
import { recorderLabel, type RecorderMe } from '../../lib/recorderLabel'
import { cancelledDocFor } from '../../lib/documentCancelState'
import {
  assembleDocumentView,
  type DocumentView,
  type DocumentViewMovement,
  type ValuationLookup,
} from '../../lib/documentView'
import {
  canCancelDocument, canCancelLegacy, canActOnRow,
  canReplaceItems, canCancelRows,
  canWriteCancellation, LAYER_CAPABILITY_UNKNOWN,
  reversalDocLabel, normalizeReversalDate,
  ADMIN_ONLY_DOCUMENT, ADMIN_ONLY_LEGACY, ADMIN_ONLY_LEGACY_TRANSFER,
} from '../../lib/documentCancelGate'
import type { CancelStateMovement } from '../../lib/documentCancelState'
import {
  cancelDocument, cancelLayerDocument,
  cancelTransferDocument, cancelLayerTransferDocument,
  cancelLegacyMovement, cancelLayerLegacyMovement,
  cancelLegacyTransfer, cancelLayerLegacyTransfer,
} from '../../api/documentCancel.api'
import { CancelRowDialog } from './CancelRowDialog'
import { ReplaceItemDialog } from './ReplaceItemDialog'
import type { MovementFilterItem } from '../../lib/movementFilters'

/* The document dialog — inspection (I-3) plus CANCELLATION (I-4).

   Renders the four legacy views (index.html:5012-5087, 5209-5263, 5264-5285,
   5286-5308). I-3 built the inspection half; I-4 adds the action half:

     «Əməliyyatı ləğv et»    ordinary document      cancel_document
     «Yerdəyişməni ləğv et»  transfer document      cancel_transfer_document
     «Əməliyyatı ləğv et»    doc-less ordinary      cancel_legacy_movement
     «Yerdəyişməni ləğv et»  doc-less transfer      cancel_legacy_transfer
     «Sətri ləğv et»         one line               cancel_movement_row
     «Malı əvəz et»          one line's item        replace_movement_item

   each with its layer variant where one exists. «Sənədi redaktə et» (the
   correction flow) is I-6 and is wired here: the button opens
   `EditDocumentDialog`, which performs the READ-ONLY impact check. It writes
   nothing — the correction itself is submitted from «Yeni əməliyyat».

   ONE GATE. A control is rendered only when `documentCancelGate` allows it,
   and every submit handler re-runs the SAME function against the CURRENT rows
   before calling the API — so a stale dialog cannot act on a row whose state
   changed while it stood open. The UI gate is a usability filter, not the
   security boundary: every RPC is SECURITY DEFINER and re-checks the role.

   REVERSALS CREATE NEW ROWS. Nothing here modifies or deletes an original
   movement; a cancellation posts a counter entry and the original stays
   visible in the audit trail. The dialog says so on screen.

   STALE DATA: this component receives an ID, never a copied movement. Its row
   is looked up from `allRows` on EVERY render, so a realtime refresh that
   changed or removed the row is reflected immediately instead of leaving a
   snapshot from the moment of the click on screen. */

interface Props {
  /** The selected movement's id — NOT a copied movement object. */
  movementId: string
  /** The RAW loaded set (markers included), straight from the store. */
  allRows: DocumentViewMovement[]
  itemBy: Map<string, MovementFilterItem>
  warehouses: string[]
  valuations: ValuationLookup
  /** `get_user_directory()` id → email, for the recorder labels. */
  emails: Map<string, string>
  me: RecorderMe | null
  /** Admin-only in the UI; the server remains authoritative (M8-23). */
  isAdmin: boolean
  /** The live `stock_layers_supported()` flag — picks the layer RPCs (M8-26).
      Meaningful only when `layerReady` is true. */
  layerActive: boolean
  /** Whether the capability probe ANSWERED. While false the capability is
      unknown and no cancellation RPC may be chosen (I-4 audit, finding 3). */
  layerReady: boolean
  onClose: () => void
  /** Refreshes the movements. A FAILED refresh keeps the previous snapshot
      (the store's M8-45 rule); the toast then says the list is stale. */
  onRefresh: () => Promise<{ ok: boolean; error: string | null }>
  onToast: (text: string, isError?: boolean) => void
  /** I-6 — opens the correction flow for this document. Absent while the
      caller does not support it, in which case no button is rendered. */
  onEditDocument?: (docNum: string) => void
  /** The document already in edit mode, if any (`M8-39`). */
  editDocNum?: string | null
}

const TITLES: Record<DocumentView['kind'], (v: DocumentView) => string> = {
  /* index.html:5237 — «Yerdəyişmə sənədi · <doc>». */
  'transfer-doc': (v) => 'Yerdəyişmə sənədi' + (v.docNum ? ' · ' + v.docNum : ''),
  /* index.html:5051 — «<növ> sənədi · <doc>». */
  'ordinary-doc': (v) => v.type + ' sənədi' + (v.docNum ? ' · ' + v.docNum : ''),
  /* index.html:5274 / 5296 — the legacy titles carry the ITEM CODE, never a
     document number: a doc-less record has none and one must not be invented. */
  'legacy-ordinary': (v) => 'Köhnə əməliyyat · ' + v.clicked.item_code,
  'legacy-transfer': (v) => 'Köhnə yerdəyişmə · ' + v.clicked.item_code,
  unsupported: () => '',
}

export function DocumentViewDialog({
  movementId, allRows, itemBy, warehouses, valuations, emails, me,
  isAdmin, layerActive, layerReady, onClose, onRefresh, onToast,
  onEditDocument, editDocNum = null,
}: Props) {
  /* The reversal date. Pre-filled with today, exactly as the legacy inputs are
     (index.html:5047). Blank means OMIT the argument so the server's
     CURRENT_DATE default applies — see `withDate()` in the API module. */
  const [reversalDate, setReversalDate] = useState(today())
  /* Set BEFORE the first await, released in `finally`. A second click while
     the RPC is in flight would post a second reversal document. */
  const [inFlight, setInFlight] = useState(false)
  /* The row-level dialogs, held as IDs for the same reason the page holds
     this one as an ID. */
  const [rowCancelId, setRowCancelId] = useState<string | null>(null)
  const [replaceId, setReplaceId] = useState<string | null>(null)

  /* Recomputed on every render from the CURRENT rows — see the stale-data note
     above. `find` on the raw set, because a row-level-cancelled or marker row
     can still be the one that was clicked. */
  const movement = allRows.find((r) => String(r.id) === movementId)

  const closeButton = (
    <>
      <div style={{ flex: 1 }} />
      <Button variant="secondary" onClick={onClose}>Bağla</Button>
    </>
  )
  const footer = closeButton

  /* An honest unavailable state. The row was present when «Baxış» was clicked
     and a refresh has since removed it, so there is nothing truthful left to
     show — and showing the pre-refresh copy would be a lie about live data. */
  if (!movement) {
    return (
      <Dialog title="Qeyd mövcud deyil" footer={footer} onClose={onClose}>
        <div className="empty">
          <b>Qeyd artıq mövcud deyil</b>
          Seçilmiş qeyd son yenilənmədən sonra siyahıda tapılmadı. Pəncərəni bağlayıb
          registrdən yenidən seçin.
        </div>
      </Dialog>
    )
  }

  const view = assembleDocumentView({
    movement,
    allRows,
    itemName: (code) => itemBy.get(code)?.name ?? null,
    /* Ordinary: «Mədaxil/Məxaric: <anbar>» (index.html:5026). Transfer: the
       CANONICAL route display, reused from A12 (index.html:5220). */
    direction: (r) =>
      r.type === 'Yerdəyişmə'
        ? routeOrPartner(r, warehouses)
        : ((r.in_qty || 0) > 0 ? 'Mədaxil: ' : 'Məxaric: ') + whLabel(r.warehouse),
    valuations,
  })

  /* Unreachable from the page — «Baxış» refuses an unsupported type with the
     legacy toast before opening anything — but a dialog that cannot assemble
     must never render a half-built document. */
  if (!view) {
    return (
      <Dialog title="Qeyd mövcud deyil" footer={footer} onClose={onClose}>
        <div className="empty"><b>Bu növ üçün sənəd baxışı yoxdur</b></div>
      </Dialog>
    )
  }

  const it = itemBy.get(movement.item_code)
  const isTransfer = view.kind === 'transfer-doc' || view.kind === 'legacy-transfer'
  const isDocView = view.kind === 'transfer-doc' || view.kind === 'ordinary-doc'
  /* The legacy doc-less views resolve their status per-id, not per-document
     (index.html:5265 / 5287). */
  const legacyCancelledBy = isDocView ? null : cancelledDocFor(movement, allRows)

  /* THE SINGLE GATE, shared by the visible button and the submit handler. */
  const mayCancelDoc = canCancelDocument(view, isAdmin)
  const mayCancelLegacy = !isDocView && canCancelLegacy(movement, allRows, isAdmin)
  const mayCancel = mayCancelDoc || mayCancelLegacy
  /* The two row actions have DIFFERENT matrices (I-4 audit, finding 1): a
     doc-less legacy record offers replacement but never row cancellation,
     because `legacyCancelView()` (index.html:5264-5275) has no such control
     and `cancel_movement_row` cancels a line inside a document. */
  /* `replace_movement_item` has no stock-layer variant. The ordinary RPC is
     therefore offered only after the capability probe positively confirms
     that layers are inactive. This is stricter than relying on the server's
     layer trigger: an action that can never succeed must not be presented. */
  const mayReplace = layerReady && !layerActive
    && canReplaceItems(view, allRows as unknown as CancelStateMovement[], isAdmin)
  const mayCancelRow = canCancelRows(view, isAdmin)
  const mayUseRowActions = mayReplace || mayCancelRow
  /* No cancellation family may be selected while the capability is unknown. */
  const mayWrite = canWriteCancellation(layerReady)

  /* «Ləğv zamanı əks mədaxil/məxaric …» — the direction legacy computes from
     the document's own rows (index.html:5017). */
  const inbound = view.lines.some((l) => l.inQty > 0)

  async function submitCancel() {
    if (inFlight) return
    /* FAIL-CLOSED (finding 3). Re-checked here, not only at render: the
       capability can go unknown while this dialog stands open. Zero RPC
       calls while it is. */
    if (!canWriteCancellation(layerReady)) {
      onToast(LAYER_CAPABILITY_UNKNOWN, true)
      return
    }

    /* THE STALE RE-CHECK. Re-read the clicked row and RE-ASSEMBLE the view
       from the CURRENT rows, then re-run the same gate the button used. A
       document cancelled by someone else while this dialog stood open is
       refused here rather than cancelled twice. */
    const current = allRows.find((r) => String(r.id) === movementId)
    if (!current) {
      onToast('Bu qeyd artıq mövcud deyil', true)
      return
    }
    const fresh = assembleDocumentView({
      movement: current,
      allRows,
      itemName: (code) => itemBy.get(code)?.name ?? null,
      direction: () => '',
      valuations,
    })
    if (!fresh) {
      onToast('Bu qeyd artıq mövcud deyil', true)
      return
    }
    const freshIsDocView = fresh.kind === 'ordinary-doc' || fresh.kind === 'transfer-doc'
    const allowed = freshIsDocView
      ? canCancelDocument(fresh, isAdmin)
      : canCancelLegacy(current, allRows, isAdmin)
    if (!allowed) {
      onToast('Bu sənəd artıq ləğv edilib və ya ləğv edilə bilməz', true)
      return
    }

    /* Blank → omit the argument entirely so the server default applies. */
    const date = normalizeReversalDate(reversalDate)

    setInFlight(true)
    try {
      /* M8-26 — the LAYER variant is chosen by the live capability flag, and
         the argument name follows the CHOSEN RPC, never the family. The two
         transfer functions take different names (`D-I1`); routing through the
         typed API functions is what keeps them straight. */
      let res
      if (fresh.kind === 'transfer-doc') {
        res = layerActive
          ? await cancelLayerTransferDocument(fresh.docNum, date)
          : await cancelTransferDocument(fresh.docNum, date)
      } else if (fresh.kind === 'ordinary-doc') {
        res = layerActive
          ? await cancelLayerDocument(fresh.docNum, date)
          : await cancelDocument(fresh.docNum, date)
      } else if (fresh.kind === 'legacy-transfer') {
        res = layerActive
          ? await cancelLayerLegacyTransfer(String(current.id), date)
          : await cancelLegacyTransfer(String(current.id), date)
      } else {
        res = layerActive
          ? await cancelLayerLegacyMovement(String(current.id), date)
          : await cancelLegacyMovement(String(current.id), date)
      }

      if (!res.ok) {
        /* Verbatim server text — it states exactly what blocked the
           cancellation (short stock, an ambiguous legacy pair, …). */
        onToast('Ləğv edilmədi: ' + res.error, true)
        return
      }

      /* A FAILED refresh keeps the previous snapshot (the store's rule). The
         cancellation still succeeded, so this is not an error about the write
         — it is a warning that the list on screen is now stale. */
      const refresh = await onRefresh()
      onClose()
      const what = isTransfer ? 'Yerdəyişmə ləğv edildi' : 'Əməliyyat ləğv edildi'
      onToast(
        what + ' · əks sənəd: ' + reversalDocLabel(res.reversalDocNum)
        + (refresh.ok ? '' : ' — siyahı yenilənmədi, əvvəlki məlumat göstərilir'),
        !refresh.ok,
      )
    } finally {
      setInFlight(false)
    }
  }

  /* «Sənədi redaktə et» — I-6 (`M8-33`, `M8-38`). Rendered ONLY when the same
     gate the handler re-runs allows it, so a layer-accounted, cancelled,
     doc-less or non-admin document never shows the control at all (legacy
     5052 omits the button rather than disabling it). The gate is asked here,
     at render, from CURRENT props — never from a value captured earlier. */
  const editGate = canEditDocument({
    isAdmin,
    docNum: view.docNum,
    isOrdinaryDoc: view.kind === 'ordinary-doc',
    /* The SAME status rule the cancellation gate uses (`canCancelDocument`):
       anything but `open` is a reversal, an already-cancelled document or a
       state with no live rows, and none of those may be corrected. */
    isCancelledOrReversal: view.status.kind !== 'open',
    layerActive,
    layerReady,
    editDocNum,
  })

  const editButton = editGate.allowed && onEditDocument ? (
    <Button
      variant="secondary"
      data-testid="dc-edit"
      disabled={inFlight}
      onClick={() => onEditDocument(view.docNum)}
    >
      Sənədi redaktə et
    </Button>
  ) : null

  const actionFooter = mayCancel ? (
    <>
      {editButton}
      <div style={{ flex: 1 }} />
      <Button variant="secondary" onClick={onClose} disabled={inFlight}>İmtina</Button>
      <Button
        variant="danger"
        data-testid="dc-go"
        disabled={inFlight || !mayWrite}
        onClick={() => { void submitCancel() }}
      >
        {inFlight
          ? 'Ləğv edilir…'
          : isTransfer ? 'Yerdəyişməni ləğv et' : 'Əməliyyatı ləğv et'}
      </Button>
    </>
  ) : closeButton

  /* Re-assembles the document from whatever rows are CURRENT at the moment it
     is called. Handed to the child dialogs so their submit handlers can re-run
     the document-level half of the gate against live data rather than against
     anything captured when they opened (finding 2). */
  const assembleCurrent = (row: CancelStateMovement): DocumentView | null =>
    assembleDocumentView({
      movement: row as unknown as DocumentViewMovement,
      allRows,
      itemName: (code) => itemBy.get(code)?.name ?? null,
      direction: () => '',
      valuations,
    })

  /* The row-level dialogs replace this one while they are open, so a single
     modal is on screen at a time and the row cannot be acted on from two
     places at once. */
  if (rowCancelId) {
    return (
      <CancelRowDialog
        rowId={rowCancelId}
        allRows={allRows}
        itemBy={itemBy}
        layerActive={layerActive}
        layerReady={layerReady}
        isAdmin={isAdmin}
        assemble={assembleCurrent}
        onClose={() => setRowCancelId(null)}
        onRefresh={onRefresh}
        onToast={onToast}
      />
    )
  }
  if (replaceId) {
    return (
      <ReplaceItemDialog
        rowId={replaceId}
        allRows={allRows}
        itemBy={itemBy}
        isAdmin={isAdmin}
        assemble={assembleCurrent}
        onClose={() => setReplaceId(null)}
        onRefresh={onRefresh}
        onToast={onToast}
      />
    )
  }

  return (
    <Dialog title={TITLES[view.kind](view)} footer={actionFooter} onClose={onClose}>
      {/* The header line — index.html:5052 / 5238 for a document, 5274 / 5296
          for a legacy record. The recorder is the FINAL legacy mapping
          (index.html:990) through the same pure helper the table uses, so no
          raw UUID can reach the screen here either. */}
      {isDocView ? (
        <div className="hint" style={{ marginBottom: 10 }}>
          {(it?.name || '—') + ' · ' + nf(view.headerLineCount) + ' sətir · qeyd edən: '}
          {recorderLabel(movement.created_by, emails, me)}
        </div>
      ) : (
        <div className="hint" style={{ marginBottom: 10 }}>
          {(it?.name || '—') + ' · ' + fmtD(movement.date) + ' · '}
          {isTransfer ? routeOrPartner(movement, warehouses) : whLabel(movement.warehouse)}
          {' · ' + nf((movement.in_qty || movement.out_qty) || 0, 2) + ' · qeyd edən: '}
          {recorderLabel(movement.created_by, emails, me)}
        </div>
      )}

      {/* The SYSTEM document number, shown SEPARATELY from the manual Qaimə and
          Müqavilə values (index.html:4913-4915). The three are different
          fields and are never merged: `doc_num` is server-generated,
          `invoice_num` and `contract_num` are typed by the user. */}
      <div className="hint" data-testid="doc-sysnum" style={{ marginBottom: 10 }}>
        {'Sistem sənəd №: '}
        {view.docNum
          ? <span className="code">{view.docNum}</span>
          : <span className="muted">—</span>}
      </div>

      {/* `docRefsLine()` — index.html:4916-4924. Qaimə is ALWAYS shown, with an
          em-dash when empty; Müqavilə only when a value exists. Both list the
          unique non-empty values of the whole document. */}
      <div className="hint" data-testid="doc-refs" style={{ marginBottom: 10 }}>
        {'Qaimə №: '}
        {view.invoiceNums.length
          ? view.invoiceNums.map((v, i) => (
              <span key={v}>{i ? ', ' : ''}<span className="code">{v}</span></span>
            ))
          : <span className="muted">—</span>}
        {view.contractNums.length ? (
          <>
            {' · Müqavilə №: '}
            {view.contractNums.map((v, i) => (
              <span key={v}>{i ? ', ' : ''}<span className="code">{v}</span></span>
            ))}
          </>
        ) : null}
      </div>

      <div className="card">
        <div className="tw">
          {view.lines.length ? (
            <table>
              <thead>
                <tr>
                  <th>Tarix</th><th>Mal</th><th>Anbar</th><th>İstiqamət</th>
                  <th className="r">Miqdar</th><th className="r">Qiymət</th>
                  <th className="r">Məbləğ</th><th>Qeyd</th><th>Qeyd edən</th>
                  {/* The per-row controls — index.html:5019-5022. The column
                      exists only when the document offers them at all. */}
                  {mayUseRowActions && <th />}
                </tr>
              </thead>
              <tbody>
                {view.lines.map((l) => (
                  <tr key={l.id}>
                    <td>{fmtD(l.date)}</td>
                    <td>
                      <div className="nm">{l.itemName || l.itemCode}</div>
                      <span className="code">{l.itemCode}</span>
                    </td>
                    <td>{whLabel(l.warehouse)}</td>
                    <td>{l.direction}</td>
                    <td className="r">{nf(l.qty, 2)}</td>
                    <td className="r">{l.price ? nf(l.price, 2) : <span className="muted">—</span>}</td>
                    <td className="r">
                      {l.price ? nf(l.qty * l.price, 2) : <span className="muted">—</span>}
                    </td>
                    <td>
                      {l.note
                        ? <span className="hint" title={l.note}>{l.note}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td>
                      <span className="hint">{recorderLabel(l.createdBy, emails, me)}</span>
                    </td>
                    {/* A row already cancelled or replaced shows the legacy
                        tag instead of the two buttons (index.html:5021). */}
                    {mayUseRowActions && (
                      <td>
                        {canActOnRow({ id: l.id }, allRows) ? (
                          <>
                            {mayReplace && (
                              <Button
                                size="sm"
                                variant="secondary"
                                data-testid={'repl-' + l.id}
                                onClick={() => setReplaceId(l.id)}
                              >
                                Malı əvəz et
                              </Button>
                            )}
                            {mayReplace && mayCancelRow ? ' ' : null}
                            {mayCancelRow && (
                              <Button
                                size="sm"
                                variant="danger"
                                data-testid={'rowcancel-' + l.id}
                                onClick={() => setRowCancelId(l.id)}
                              >
                                Sətri ləğv et
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="tag t-rm">ləğv edilib</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Risk R6. A document every one of whose lines was individually
               replaced or row-cancelled is a VALID partially modified state.
               It is explicitly NOT called cancelled here: the document-level
               status above is what decides that, and it stays «open». */
            <div className="empty">
              <b>Görünən sətir yoxdur</b>
              {view.emptyAfterStrip
                ? 'Bu sənədin bütün sətirləri ayrıca əvəzlənib və ya sətir üzrə ləğv edilib. Sənədin özü ləğv edilməyib.'
                : 'Bu sənəddə göstəriləcək sətir tapılmadı.'}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {/* The three READ-ONLY status branches — index.html:5036-5041 and
            5223-5228. The admin cancellation branch is I-4 and is absent. */}
        {view.status.kind === 'reversal' ? (
          <div className="hint" style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4 }}>
            {isTransfer
              ? 'Bu, əks yerdəyişmə (ləğv) sənədidir. Yenidən ləğv edilə bilməz.'
              : 'Bu, ləğv (əks yazı) sənədidir. Yenidən ləğv edilə bilməz.'}
          </div>
        ) : view.status.kind === 'cancelled' ? (
          <div className="hint" style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4 }}>
            <b>Ləğv edilib</b>{' · əks sənəd: '}
            {/* The legacy `'—'` fallback is preserved: a marker row with no
                doc_num still proves the reversal happened. */}
            <span className="code">{view.status.reversalDoc}</span>
            {'. Orijinal sətirlər dəyişməz saxlanılır.'}
          </div>
        ) : legacyCancelledBy ? (
          <div className="hint" style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4 }}>
            <b>Ləğv edilib</b>{' · əks sənəd: '}
            <span className="code">{legacyCancelledBy}</span>.
          </div>
        ) : !isAdmin ? (
          /* index.html:5042-5043 / 5229-5230 / 5270 / 5292 — the non-admin
             branch comes AFTER the reversal and cancelled branches, so a
             read-only user sees the document's real state first. The server
             enforces the same rule independently. */
          <div className="hint" style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4 }}>
            {isDocView
              ? ADMIN_ONLY_DOCUMENT
              : isTransfer ? ADMIN_ONLY_LEGACY_TRANSFER : ADMIN_ONLY_LEGACY}
          </div>
        ) : mayCancel ? (
          <>
            {/* index.html:5046 / 5232 / 5268 / 5290. The direction is the
                document's own, and the short-stock warning is shown only for
                the inbound case that can actually fail on stock. */}
            <div className="hint" style={{ margin: '4px 0 8px' }}>
              {isTransfer
                ? (isDocView
                    ? 'Ləğv zamanı təyinatdan mənbəyə əks yerdəyişmə yeni sənəd kimi yazılır. Orijinal sətirlər dəyişmir. Təyinat anbarında qalıq çatmırsa, ləğv baş tutmur.'
                    : 'Server yalnız bir etibarlı qarşı cüt taparsa əks yerdəyişmə yaradır. Cüt qeyri-müəyyəndirsə və ya qalıq çatmırsa, heç nə yazılmır.')
                : (isDocView
                    ? 'Ləğv zamanı ' + (inbound ? 'əks məxaric' : 'əks mədaxil')
                      + ' yeni sənəd kimi yazılır. Orijinal sətirlər dəyişmir.'
                      + (inbound ? ' Qalıq çatmırsa, ləğv baş tutmur.' : '')
                    : 'Sənəd nömrəsi olmayan bu köhnə qeyd yalnız əks '
                      + (inbound ? 'məxaric' : 'mədaxil')
                      + ' ilə ləğv edilir. Orijinal qeyd dəyişmir.'
                      + (inbound ? ' Qalıq çatmırsa, heç nə yazılmır.' : ''))}
            </div>
            <label className="f" style={{ maxWidth: 220 }}>
              <span>{isTransfer ? 'Əks yerdəyişmə tarixi' : 'Ləğv tarixi'}</span>
              <input
                type="date"
                data-testid="dc-date"
                value={reversalDate}
                disabled={inFlight}
                onChange={(e) => setReversalDate(e.target.value)}
              />
            </label>
            {/* index.html:5048 — with layers active a posted document is not
                edited in place; the safe route is cancel and re-post. */}
            {layerActive && (
              <div className="hint" style={{ marginTop: 8 }}>
                Partiya uçotu aktiv olduqda sənəd birbaşa redaktə edilmir və sətirdə mal
                əvəzlənmir. Dəyişiklik üçün təhlükəsiz ləğv edin və düzgün partiyalarla
                yeni sənəd yaradın.
              </div>
            )}
          </>
        ) : !isDocView ? (
          <div className="hint" style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4 }}>
            {isTransfer
              ? 'Bu köhnə yerdəyişmənin etibarlı sənəd nömrəsi yoxdur. Ləğv ayrıca təsdiqlənmiş storno əməliyyatı tələb edir.'
              : 'Bu qeydin etibarlı sənəd nömrəsi yoxdur. Ləğv ayrıca təsdiqlənmiş storno əməliyyatı tələb edir.'}
          </div>
        ) : null}

        {/* `lotDoc` — derived over the WHOLE document (index.html:5019). In
            I-4 it GATES the per-row controls (`canUseRowActions`), so the note
            explains why «Malı əvəz et» is absent on a partia-valued document
            rather than leaving the user to guess. */}
        {view.lotDoc && (
          <div className="hint" style={{ marginTop: 8 }}>
            Bu sənəd partiya uçotu ilə dəyərləndirilib — sətir üzrə mal əvəzləmə təklif
            olunmur. Dəyişiklik üçün sənədi bütövlükdə ləğv edin.
          </div>
        )}

        {/* The capability is unknown — say so honestly and ask for a reload,
            rather than disabling a button with no stated reason (finding 3). */}
        {mayCancel && !mayWrite && (
          <div
            className="hint"
            data-testid="layer-unknown"
            style={{ marginTop: 8, padding: 9, background: 'var(--out-l)', borderRadius: 4 }}
          >
            {LAYER_CAPABILITY_UNKNOWN}{' '}
            <Button
              size="sm"
              variant="secondary"
              data-testid="layer-retry"
              onClick={() => { void onRefresh() }}
            >
              Yenidən cəhd et
            </Button>
          </div>
        )}

        {/* Said once, plainly, wherever a cancellation is on offer: this is the
            one thing an admin must not misunderstand about what the button
            does. Nothing here edits or deletes an existing row. */}
        {mayCancel && (
          <div className="hint" style={{ marginTop: 8 }}>
            Ləğv yeni əks sətirlər yaradır — orijinal qeydlər dəyişdirilmir və silinmir.
          </div>
        )}
      </div>
    </Dialog>
  )
}
