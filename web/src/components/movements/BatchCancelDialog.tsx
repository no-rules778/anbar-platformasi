import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { nf, fmtD, money } from '../../lib/format'
import { whLabel } from '../../lib/movementRoute'
import {
  cancelDocumentsBatch,
  cancelLayerDocumentsBatch,
} from '../../api/documentCancel.api'
import {
  canWriteCancellation,
  LAYER_CAPABILITY_UNKNOWN,
  ADMIN_ONLY_DOCUMENT,
} from '../../lib/documentCancelGate'
import {
  buildBatchDocs,
  batchFilterDocs,
  normalizeBatchFilters,
  resolveBatchSelection,
  sameDocNums,
  EMPTY_BATCH_FILTERS,
  BATCH_TYPE_OPTIONS,
  NO_ELIGIBLE_SELECTION,
  type BatchDoc,
  type BatchFilters,
  type BatchMovement,
} from '../../lib/batchCancel'
import {
  classifyFailure,
  validateSuccessBody,
  successMessage,
  rejectedMessage,
  blockedByUnresolved,
  allUnresolvedDocNums,
  unresolvedBlockMessage,
  blockMessageFor,
  unknownResolvedBy,
  observedCancelledDocs,
  UNKNOWN_OUTCOME_MESSAGE,
  UNKNOWN_AND_REFRESH_FAILED_MESSAGE,
  REFRESH_FAILED_MESSAGE,
} from '../../lib/batchOutcome'
import { useBatchCancelStore } from '../../store/batchCancel.store'
import { docCancelledBy, docReversalDoc } from '../../lib/documentCancelState'
import type { MovementFilterItem } from '../../lib/movementFilters'

/* «Qrup üzrə ləğv» — index.html:5309-5505, milestone I-5 (M8-30/31/32).

   Two steps, as legacy has them: a SEARCH step that lists every document with
   its eligibility reason, and a CONFIRM step that shows the selected documents
   line by line before executing one atomic RPC.

   FOUR THINGS THIS FIXES, all recorded in the I-5 proposal:

   1. THE STALE SNAPSHOT (§6). Legacy builds `BC.docs` ONCE (5375) and never
      rebuilds it; the confirm step re-filters on that stale `d.eligible`
      (5454). A document cancelled by another admin meanwhile is still
      submitted, and the server aborts the WHOLE batch naming a document the
      user never touched. Here the documents are rebuilt from the CURRENT store
      rows on every render, and `resolveBatchSelection()` runs AGAIN inside the
      submit handler — one function, two calls, the I-4 pattern.

   2. THE OUTCOME MODEL (§5). Legacy treats every error as «heç bir sənəd ləğv
      edilmədi». That is false whenever a response is lost AFTER the commit.
      See `lib/batchOutcome.ts`: four outcomes, and only a 4xx may claim that
      nothing was written.

   3. THE REFRESH BUG (§8). Legacy puts `loadFromDB()` inside the same `try` as
      the RPC (5491-5504), so a refresh that fails after a SUCCESSFUL
      cancellation reports failure and re-enables the button. Here the RPC
      outcome is decided and reported first; the refresh is a separate phase.

   4. THE COUNT (§4.4). Legacy falls back to `docNums.length` (5498). Not
      ported — the selection size is not evidence of what the server did.

   PRESERVED FROM LEGACY, deliberately: ineligible documents are LISTED with
   their reason rather than hidden (5408), and the selection survives filtering
   (5446-5453, «seçim filtrlə itmir»), which is why the selected count is shown
   independently of the visible list. */

interface Props {
  /** The RAW current rows — markers included, rebuilt on every render. */
  allRows: BatchMovement[]
  itemBy: Map<string, MovementFilterItem>
  warehouses: string[]
  /** Picks the layer RPC family. Meaningful only when `layerReady`. */
  layerActive: boolean
  /** Whether the capability probe ANSWERED — I-4 audit finding 3. */
  layerReady: boolean
  /** The CURRENT admin flag, re-read by the submit handler. */
  isAdmin: boolean
  onClose: () => void
  onRefresh: () => Promise<{ ok: boolean; error: string | null }>
  onToast: (text: string, isError?: boolean) => void
}

type Step = 'search' | 'confirm'

export function BatchCancelDialog({
  allRows, itemBy, warehouses, layerActive, layerReady, isAdmin,
  onClose, onRefresh, onToast,
}: Props) {
  const [step, setStep] = useState<Step>('search')
  const [raw, setRaw] = useState<BatchFilters>(EMPTY_BATCH_FILTERS)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [reversalDate, setReversalDate] = useState('')
  const [inFlight, setInFlight] = useState(false)
  /* The document list the user actually CONFIRMED. If the resolved payload
     differs at submit time, the confirmation no longer covers what would be
     sent, and the user is returned to the confirm step to approve the new
     list. */
  const [confirmedDocNums, setConfirmedDocNums] = useState<string[] | null>(null)

  /* SYNCHRONOUS duplicate-submit protection WITHIN one mounted instance.
     `useState` updates are async and batched: two clicks dispatched in the
     same tick both observe `inFlight` as false and both call the RPC. The ref
     is written BEFORE the first await and read first, so the second click
     returns immediately. The state flag exists only to re-render the
     disabled button.

     This ref alone does NOT protect across a close/reopen — `Dialog`'s mask
     and × call `onClose` unconditionally, even mid-request, which unmounts
     this component and destroys the ref. `beginPending`/`isPending` on the
     store (below) cover that case; this ref only saves the extra store
     round-trip for the common same-instance double-click. */
  const submitting = useRef(false)

  const unresolvedList = useBatchCancelStore((s) => s.unresolvedList)
  const persistenceError = useBatchCancelStore((s) => s.persistenceError)
  const beginAttempt = useBatchCancelStore((s) => s.beginAttempt)
  const setPhase = useBatchCancelStore((s) => s.setPhase)
  const setRefreshFailed = useBatchCancelStore((s) => s.setRefreshFailed)
  const clearUnresolved = useBatchCancelStore((s) => s.clearUnresolved)
  const beginPending = useBatchCancelStore((s) => s.beginPending)
  const endPending = useBatchCancelStore((s) => s.endPending)
  const isPending = useBatchCancelStore((s) => s.isPending)

  /* Rebuilt from the CURRENT rows — never captured at open. */
  const docs = useMemo(
    () => buildBatchDocs(allRows, { itemBy, warehouses }),
    [allRows, itemBy, warehouses],
  )
  const filters = useMemo(() => normalizeBatchFilters(raw), [raw])
  const visible = useMemo(() => batchFilterDocs(docs, filters), [docs, filters])

  /* The render-time resolution — the SAME function the submit handler calls. */
  const resolution = useMemo(
    () => resolveBatchSelection(docs, selected),
    [docs, selected],
  )

  const blockedDocs = blockedByUnresolved(unresolvedList, resolution.docNums)
  const capabilityBlocked = !canWriteCancellation(layerReady)
  /* PERSISTENCE IS A GATE, not a nicety — I-5 correction 2. If the pending
     history could not be read, the client cannot show that these documents
     are free of an earlier unconfirmed attempt, so it must not dispatch. */
  const persistenceBlocked = persistenceError != null

  /* RECONCILIATION — the only automatic path that clears an unresolved
     record, and only on POSITIVE evidence. Runs against the CURRENT rows on
     every render (the same rows the rest of the dialog already rebuilds
     from), so a refresh that lands after this dialog reopens still resolves
     the record it belongs to. A record with no positively-confirmed markers,
     or whose refresh failed, is left untouched — see `unknownResolvedBy`. */
  useEffect(() => {
    for (const u of unresolvedList) {
      /* EACH DOCUMENT IS READ THROUGH ITS OWN FAMILY — I-5 correction 3.
         This used to call `docCancelledBy` for every document, which only
         matches the ORDINARY marker `'Ləğv: <doc>'`. A transfer is marked
         `'Ləğv (əks yerdəyişmə): <doc>'` and was therefore never observable
         as cancelled, so any batch containing one could never resolve. */
      const cancelledNow = observedCancelledDocs(u.docNums, allRows, {
        ordinary: docCancelledBy,
        transfer: docReversalDoc,
      })
      if (unknownResolvedBy(u, cancelledNow)) clearUnresolved(u.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, unresolvedList])

  /* GUARDED CLOSE. `Dialog`'s own × button and mask-click call `onClose`
     UNCONDITIONALLY (`ui/Dialog.tsx`) — they were built before I-5 and know
     nothing about a request being in flight. The footer's own «Bağla»/«Geri»
     buttons already carry `disabled={inFlight}`, but `Dialog` bypasses that:
     without this wrapper, clicking the mask or × mid-submission unmounts this
     component while its RPC promise is still pending, destroying the
     `submitting` ref and the `inFlight` state along with it — the exact
     resubmission hazard `beginPending`/`isPending` exist to close on the
     STORE side. Guarding it here closes it on the UI side too, so a pending
     request is never interruptible by the parts of `Dialog` this component
     does not control. */
  const guardedClose = () => {
    if (inFlight) {
      onToast('Sorğu göndərilir — nəticə gələnə qədər gözləyin', true)
      return
    }
    onClose()
  }

  const toggle = (key: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
    /* Changing the selection invalidates any prior confirmation. */
    setConfirmedDocNums(null)
  }

  function review() {
    if (!resolution.eligible.length) {
      onToast(NO_ELIGIBLE_SELECTION, true)
      return
    }
    setConfirmedDocNums(resolution.docNums)
    setStep('confirm')
  }

  async function execute() {
    /* Synchronous first, before any await or state read. */
    if (submitting.current) return
    if (!isAdmin) {
      onToast(ADMIN_ONLY_DOCUMENT, true)
      return
    }
    if (capabilityBlocked) {
      onToast(LAYER_CAPABILITY_UNKNOWN, true)
      return
    }
    /* Refuse rather than dispatch blind — the message names the actual fix. */
    if (persistenceError != null) {
      onToast(persistenceError, true)
      return
    }

    /* THE FRESH RE-CHECK — the identical call the render gate makes, run again
       against the rows as they are NOW. */
    const fresh = resolveBatchSelection(docs, selected)
    if (!fresh.eligible.length) {
      onToast(NO_ELIGIBLE_SELECTION, true)
      setStep('search')
      setConfirmedDocNums(null)
      return
    }
    /* A selected document that became ineligible is NAMED and the user must
       confirm the reduced list — nothing is sent silently. */
    if (!confirmedDocNums || !sameDocNums(confirmedDocNums, fresh.docNums)) {
      setConfirmedDocNums(fresh.docNums)
      setStep('confirm')
      onToast(
        'Seçim dəyişdi — göndəriləcək sənədləri yenidən təsdiqləyin',
        true,
      )
      return
    }

    /* An unresolved earlier batch blocks ITS OWN documents only — checked
       against EVERY unresolved batch, not just the most recent one. */
    const held = blockedByUnresolved(unresolvedList, fresh.docNums)
    if (held.length) {
      /* Phase-aware: a batch the server CONFIRMED must not be described as
         unconfirmed just because its refresh failed. */
      onToast(blockMessageFor(unresolvedList, held), true)
      return
    }
    /* A request already in flight for one of these documents, started from
       an earlier (possibly now-unmounted) instance of this dialog. Without
       this check, closing the dialog mid-request and reopening it creates a
       fresh `submitting` ref that reads false, and the SAME documents can be
       resubmitted while the first request is still outstanding. */
    if (isPending(fresh.docNums)) {
      onToast(unresolvedBlockMessage(fresh.docNums), true)
      return
    }

    submitting.current = true
    setInFlight(true)
    const submitted = fresh.docNums

    /* PERSIST THE ATTEMPT BEFORE DISPATCHING — I-5 correction 2. A reload
       while the RPC is outstanding must restore UNCERTAINTY, not a clean
       slate: the in-memory reservation below dies with the page, and without
       this record nothing would show the batch was ever sent. If the record
       cannot be persisted the request is REFUSED — dispatching without a
       durable trace is the failure mode this guards against. */
    const attemptId = beginAttempt(submitted)
    if (attemptId === null) {
      submitting.current = false
      setInFlight(false)
      onToast(
        useBatchCancelStore.getState().persistenceError
          ?? 'Qrup ləğvi qeydi saxlanmadı — sorğu göndərilmir.',
        true,
      )
      return
    }

    beginPending(submitted)
    try {
      const call = layerActive ? cancelLayerDocumentsBatch : cancelDocumentsBatch
      const res = await call(submitted, reversalDate || null)

      /* The localhost write guard refused before any network call — nothing
         was sent, so this is a confirmed rejection, not an unknown. */
      if (res.blocked) {
        /* Nothing was sent, so the attempt record describes no live request
           and is dropped — this is a CONFIRMED rejection. */
        clearUnresolved(attemptId)
        onToast(rejectedMessage(res.error ?? ''), true)
        return
      }

      if (!res.ok) {
        /* CLASSIFY — the presence of an error object proves nothing; only a
           4xx status proves the server rejected. */
        if (classifyFailure({
          message: res.error ?? '',
          status: res.status,
          code: res.code,
        }) === 'rejected') {
          /* The server is KNOWN not to have written, so the attempt record is
             dropped and these documents stay cancellable. */
          clearUnresolved(attemptId)
          onToast(rejectedMessage(res.error ?? ''), true)
          return
        }
        await recordUnknown(attemptId)
        return
      }

      /* A 2xx is not yet a success: the body must be coherent. */
      const validation = validateSuccessBody(res.data, submitted.length)
      if (validation.kind !== 'valid') {
        await recordUnknown(attemptId)
        return
      }

      /* CONFIRMED SUCCESS. The RPC outcome is decided and reported BEFORE the
         refresh is attempted — the refresh can no longer turn a success into
         a reported failure.

         THE RECORD IS KEPT, in the `'success'` phase — I-5 correction 1.
         Previously the reservation was released here and the dialog closed
         unconditionally, recording nothing. If the refresh then failed, the
         screen still showed the PRE-cancellation rows, and reopening against
         those stale rows let the very same batch be submitted again. A
         confirmed success whose refresh failed is not "finished": the
         database moved and the screen did not.

         The record is distinct from an UNKNOWN one — this batch is KNOWN to
         have succeeded — and it is cleared by the same reconciliation effect
         as soon as fresh rows show the documents cancelled. */
      endPending(submitted)

      let refreshOk = false
      let refreshError: string | null = null
      try {
        const refresh = await onRefresh()
        refreshOk = refresh.ok
        refreshError = refresh.error
      } catch {
        /* A THROWN refresh is a failed refresh. The success message below is
           still accurate — the server confirmed the cancellation before this
           call was ever made. */
        refreshOk = false
      }
      void refreshError

      if (refreshOk) {
        /* Fresh rows are loaded; the reconciliation effect will clear the
           record on the next render if they show the cancellations, and the
           record correctly survives if they do not. */
        setPhase(attemptId, 'success', false)
        onClose()
        onToast(successMessage(validation.body.count), false)
        return
      }

      /* Refresh failed: keep the record AND the dialog open, so the block is
         visible where the user is. The message states the success plainly. */
      setPhase(attemptId, 'success', true)
      setStep('confirm')
      onToast(
        successMessage(validation.body.count) + ' — ' + REFRESH_FAILED_MESSAGE,
        true,
      )
      return
    } finally {
      /* Released on every path so the UI never freezes. Whether EXECUTE is
         re-enabled is a separate question, decided by the outcome: only a
         confirmed rejection leaves the button usable, because only there is
         the server known not to have written. `endPending` is idempotent —
         calling it again after the success path already released it is
         harmless (`Set.delete` on an absent key is a no-op). */
      endPending(submitted)
      submitting.current = false
      setInFlight(false)
    }
  }

  /* UNKNOWN — record the uncertainty FIRST, before the refresh is even
     attempted. A refresh that fails or throws must not lose the record: the
     outcome is already unknown regardless of whether the follow-up refresh
     succeeds, and losing the record here would silently re-permit
     resubmission of documents whose server outcome was never learned. */
  async function recordUnknown(id: string) {
    /* The record already exists — it was persisted BEFORE dispatch, in the
       `'pending'` phase. Learning that the outcome is unknown only advances
       its phase; there is no window in which no record exists. */
    setPhase(id, 'unknown', false)
    let refreshOk = false
    try {
      const refresh = await onRefresh()
      refreshOk = refresh.ok
    } catch {
      refreshOk = false
    }
    /* Updated IN PLACE — the same record created above, not a duplicate.
       A failed or thrown refresh only changes the flag; the uncertainty
       itself was already recorded before this await ran. */
    if (!refreshOk) setRefreshFailed(id, true)
    setStep('confirm')
    onToast(
      refreshOk ? UNKNOWN_OUTCOME_MESSAGE : UNKNOWN_AND_REFRESH_FAILED_MESSAGE,
      true,
    )
  }

  const heldNow = allUnresolvedDocNums(unresolvedList)

  const executeDisabled =
    inFlight
    || !isAdmin
    || capabilityBlocked
    || persistenceBlocked
    || !resolution.eligible.length
    || blockedDocs.length > 0

  /* ------------------------------ SEARCH ------------------------------ */
  if (step === 'search') {
    const footer = (
      <>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={guardedClose} disabled={inFlight}>Bağla</Button>
        <Button
          data-testid="bc-review"
          disabled={!resolution.eligible.length || inFlight}
          onClick={review}
        >
          Davam et
        </Button>
      </>
    )
    return (
      <Dialog title="Qrup üzrə ləğv — sənəd axtarışı" footer={footer} onClose={guardedClose}>
        <div className="hint" style={{ marginBottom: 8 }}>
          Yalnız etibarlı sənəd nömrəsi olan əməliyyatlar. Artıq ləğv edilmiş,
          əks/ləğv, qarışıq və köhnə (sənədsiz) qeydlər seçilə bilməz və səbəbi
          göstərilir.
        </div>

        {heldNow.length > 0 && (
          <div className="hint" data-testid="bc-unresolved" style={{ marginBottom: 8 }}>
            <b>{blockMessageFor(unresolvedList, heldNow)}</b>
            <div style={{ marginTop: 4 }}>{heldNow.join(', ')}</div>
          </div>
        )}

        {!isAdmin && (
          <div className="hint" data-testid="bc-admin-only">{ADMIN_ONLY_DOCUMENT}</div>
        )}
        {capabilityBlocked && (
          <div className="hint" data-testid="bc-capability">{LAYER_CAPABILITY_UNKNOWN}</div>
        )}
        {persistenceBlocked && (
          <div className="hint" data-testid="bc-persistence">{persistenceError}</div>
        )}

        <div className="row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <label className="f">
            <span>Tarix (başlanğıc)</span>
            <input
              type="date" data-testid="bc-from" value={raw.from}
              onChange={(e) => setRaw((p) => ({ ...p, from: e.target.value }))}
            />
          </label>
          <label className="f">
            <span>Tarix (son)</span>
            <input
              type="date" data-testid="bc-to" value={raw.to}
              onChange={(e) => setRaw((p) => ({ ...p, to: e.target.value }))}
            />
          </label>
          <label className="f">
            <span>Anbar</span>
            <select
              data-testid="bc-wh" value={raw.wh}
              onChange={(e) => setRaw((p) => ({ ...p, wh: e.target.value }))}
            >
              <option value="">Bütün anbarlar</option>
              {warehouses.map((w) => (
                <option key={w} value={w}>{whLabel(w)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <label className="f">
            <span>Növ</span>
            <select
              data-testid="bc-type" value={raw.type}
              onChange={(e) => setRaw((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="">Bütün növlər</option>
              {BATCH_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="f">
            <span>Sənəd №</span>
            <input
              data-testid="bc-doc" value={raw.doc}
              onChange={(e) => setRaw((p) => ({ ...p, doc: e.target.value }))}
            />
          </label>
          <label className="f">
            <span>Mal (kod və ya ad)</span>
            <input
              data-testid="bc-item" value={raw.q}
              onChange={(e) => setRaw((p) => ({ ...p, q: e.target.value }))}
            />
          </label>
        </div>

        <div className="hint" data-testid="bc-selcnt" style={{ margin: '8px 0' }}>
          {resolution.eligible.length
            ? nf(resolution.eligible.length) + ' sənəd seçilib'
            : 'Sənəd seçin'}
        </div>

        {visible.length === 0 ? (
          <div className="empty"><b>Sənəd tapılmadı</b>Axtarış şərtlərini dəyişin.</div>
        ) : (
          <div className="tw" style={{ maxHeight: '46vh', overflow: 'auto' }}>
            <table data-testid="bc-list">
              <thead>
                <tr>
                  <th />
                  <th>Sənəd</th>
                  <th>Tarix</th>
                  <th>Növ</th>
                  <th>Anbar / marşrut</th>
                  <th style={{ textAlign: 'right' }}>Sətir</th>
                  <th>Vəziyyət</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((d) => (
                  <tr key={d.key} data-testid={'bc-row-' + d.key}>
                    <td>
                      <input
                        type="checkbox"
                        data-testid={'bc-cb-' + d.key}
                        disabled={!d.eligible}
                        checked={selected.has(d.key)}
                        onChange={(e) => toggle(d.key, e.target.checked)}
                      />
                    </td>
                    <td><span className="code">{d.doc || '—'}</span></td>
                    <td>{fmtD(d.date)}</td>
                    <td>{d.typeLabel}</td>
                    <td>{d.route}</td>
                    <td style={{ textAlign: 'right' }}>{nf(d.lines)}</td>
                    <td>{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Dialog>
    )
  }

  /* ------------------------------ CONFIRM ------------------------------ */
  const sel = resolution.eligible
  const totLines = sel.reduce((s, d) => s + d.lines, 0)
  const totQty = sel.reduce((s, d) => s + d.totQty, 0)

  const footer = (
    <>
      <Button variant="secondary" onClick={() => setStep('search')} disabled={inFlight}>
        Geri
      </Button>
      <div style={{ flex: 1 }} />
      <Button
        variant="danger"
        data-testid="bc-exec"
        disabled={executeDisabled}
        onClick={() => { void execute() }}
      >
        {inFlight ? 'Ləğv edilir…' : nf(sel.length) + ' sənədi ləğv et'}
      </Button>
    </>
  )

  return (
    <Dialog title="Qrup üzrə ləğv — təsdiq" footer={footer} onClose={guardedClose}>
      <div className="hint" style={{ padding: 9, borderRadius: 4, marginBottom: 10 }}>
        Aşağıdakı <b>{nf(sel.length)}</b> sənəd bir atomar əməliyyatda ləğv
        ediləcək. Hər sənəd üçün əks-yazı yaradılır, orijinal sətirlər dəyişmir.
        Hər hansı sənəd ləğv edilə bilməzsə, <b>heç bir</b> sənəd ləğv olunmur.
      </div>

      {persistenceBlocked && (
        <div className="hint" data-testid="bc-persistence-confirm" style={{ marginBottom: 10 }}>
          {persistenceError}
        </div>
      )}

      {heldNow.length > 0 && (
        <div className="hint" data-testid="bc-unresolved-confirm" style={{ marginBottom: 10 }}>
          <b>{blockMessageFor(unresolvedList, heldNow)}</b>
          <div style={{ marginTop: 4 }} data-testid="bc-unresolved-docs">
            {heldNow.join(', ')}
          </div>
        </div>
      )}

      {resolution.dropped.length > 0 && (
        <div className="hint" data-testid="bc-dropped" style={{ marginBottom: 10 }}>
          <b>Bu sənədlər artıq ləğv edilə bilmir və göndərilmir:</b>
          <ul style={{ margin: '4px 0 0 16px' }}>
            {resolution.dropped.map((d) => (
              <li key={d.key}>{(d.doc || d.key) + ' — ' + d.status}</li>
            ))}
          </ul>
        </div>
      )}

      {sel.length === 0 ? (
        <div className="empty"><b>{NO_ELIGIBLE_SELECTION}</b></div>
      ) : (
        sel.map((d: BatchDoc) => (
          <div className="card" key={d.key} style={{ marginTop: 8 }}>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px',
            }}>
              <b className="code">{d.doc}</b>
              <span>{fmtD(d.date)}</span>
              <span>{d.typeLabel}</span>
              <span className="hint" style={{ marginLeft: 'auto' }}>
                {nf(d.lines)} sətir · {nf(d.totQty, 2)}
              </span>
            </div>
            <div className="tw" style={{ maxHeight: '32vh', overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Kod</th><th>Malın adı</th><th>Anbar / marşrut</th>
                    <th style={{ textAlign: 'right' }}>Miqdar</th>
                    <th>Ölçü</th>
                    <th style={{ textAlign: 'right' }}>Vahid qiyməti</th>
                  </tr>
                </thead>
                <tbody>
                  {d.details.map((x, i) => (
                    <tr key={d.key + ':' + x.code + ':' + i}>
                      <td><span className="code">{x.code}</span></td>
                      <td>{x.name}</td>
                      <td>{x.whRoute}</td>
                      <td style={{ textAlign: 'right' }}>{nf(x.qty, 2)}</td>
                      <td>{x.unit}</td>
                      <td style={{ textAlign: 'right' }}>{x.price ? money(x.price) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <div className="row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <div className="kpi">
          <div className="s">Cəmi sənəd</div>
          <div className="v">{nf(sel.length)}</div>
        </div>
        <div className="kpi">
          <div className="s">Cəmi sətir / miqdar</div>
          <div className="v">{nf(totLines)} · {nf(totQty, 2)}</div>
        </div>
      </div>

      <label className="f" style={{ maxWidth: 220, marginTop: 10 }}>
        <span>Ləğv (əks-yazı) tarixi</span>
        <input
          type="date" data-testid="bc-date" value={reversalDate}
          onChange={(e) => setReversalDate(e.target.value)}
        />
      </label>
    </Dialog>
  )
}
