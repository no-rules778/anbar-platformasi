import { useEffect, useMemo, useRef, useState } from 'react'
import { useMovementsStore } from '../store/movements.store'
import { useAuditLogStore } from '../store/auditLog.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { Button } from '../components/ui/Button'
import { nf, money, fmtD, typeTagClass } from '../lib/format'
import { whLabel, resolveWh, routeOrPartner } from '../lib/movementRoute'
import { cancelledDocFor, type CancelStateMovement } from '../lib/documentCancelState'
import { documentViewKind, IMMUTABLE_RECORD_REFUSAL } from '../lib/documentView'
import { DocumentViewDialog } from '../components/movements/DocumentViewDialog'
import { BatchCancelDialog } from '../components/movements/BatchCancelDialog'
import type { BatchMovement } from '../lib/batchCancel'
import { useBatchCancelStore } from '../store/batchCancel.store'
import { useCorrectionStore } from '../store/correction.store'
import {
  resolvedCorrections, unresolvedCorrectionText,
} from '../lib/correctionReconcile'
import { useOperationStore } from '../store/operation.store'
import { useExportRequestStore } from '../store/exportRequest.store'
import {
  EditDocumentDialog, type EditDocumentTarget,
} from '../components/movements/EditDocumentDialog'
import type { MappedEdit } from '../lib/documentEdit'
import { useToastStore } from '../store/toast.store'
import { useAuthStore } from '../store/auth.store'
import { movementValuation, writeOffUnitPrice } from '../lib/movementValuation'
import { applyCut, SHOW_MAX } from '../lib/showAllCut'
import { xls } from '../lib/xls'
import { movementExportMatrix } from '../lib/movementExport'
import { writeOffExportRows, sourceRows } from '../lib/writeOffExport'
import { xlsWriteOff } from '../lib/xlsWriteOff'
import { fetchWriteoffAllocations } from '../api/writeoffAllocations.api'
import { recorderLabel } from '../lib/recorderLabel'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'
import { isAdmin, type Me } from '../lib/roles'
import {
  MOVEMENT_TYPE_FILTERS,
  filterMovements,
  sortMovements,
  movementKpis,
  movKeyOptions,
  resolveMovKeySelection,
  type MovementFilterRow,
  type MovementFilterItem,
} from '../lib/movementFilters'

/* «Mal hərəkəti» — the read-only registry (Phase 8, milestone I-2).

   Ported from index.html:319-323 (markup) and 1789-1830 (rMov). Every piece of
   logic behind it was built and tested in I-1 and is REUSED here, not
   reimplemented: this component composes, formats and renders.

   READ-ONLY. No cancellation, no RPC, no write of any kind. I-3 adds the
   «Baxış» document INSPECTION layer (index.html:5506-5512 and the four views
   it dispatches to) — its inspection half only. No cancellation, replacement,
   row-cancel or edit control exists here, disabled or otherwise.

   NO CLIENT-SIDE ANBARDAR SCOPING (D2 / M8-42). The legacy screen applies no
   warehouse restriction of its own, and neither does this one. An anbardar's
   rows are limited by the live RLS SELECT policy on `movements`:

     is_admin() OR is_rehber() OR (is_anbardar() AND warehouse = current_user_warehouse())

   To state it exactly: the SERVER scopes the rows; this client does not, and
   must not be described as doing so. Adding a filter here would be an
   unapproved behaviour change that could hide rows the policy returns. */

/** The three `<optgroup>` headings — index.html:1650-1652. */
const GROUP_LABELS = {
  routes: 'Yerdəyişmə marşrutları',
  partners: 'Kontragentlər / layihələr',
  raws: 'Tanınmayan / köhnə idxal',
} as const

/** Refusal shown when the Silinmə report is asked for while a snapshot
    refresh is unresolved — I-9 audit. Same shape as the two mid-read
    refusals: the export is refused, nothing is written, and the user re-runs
    it once the refresh has settled. */
const REFRESH_IN_PROGRESS = 'Məlumat yenilənir — hesabatı yenidən yaradın'

/** The tables whose changes must refresh this screen (M8-14). */
const WATCHED_TABLES = ['movements'] as const

interface Props {
  /** The signed-in user. Needed ONLY for «Qeyd edən»: the legacy mapping's
      third branch falls back to the current user's own name for an id the
      directory does not carry (index.html:990). */
  me: Me
  /** Navigates to «Yeni əməliyyat». M8-13 — a PLAIN page switch: no prefill,
      no draft seeding, no state transfer. The correction transition that DOES
      seed state is `onEditDocument` below. */
  onNewOperation: () => void
  /** I-6 (`M8-37`) — seeds the operation store with the document's lines and
      THEN navigates. Store first, navigation second: both happen or neither
      does, the same order `prefill` + `setPage` uses for Nomenklatura. */
  onEditDocument: (mapped: MappedEdit, docNum: string, type: string) => void
}

export function MovementsPage({ me, onNewOperation, onEditDocument }: Props) {
  const {
    operational, rows: allRows, itemBy, warehouses, valuations,
    loading, error, loaded, filters, showAll, layerActive, layerReady, layerFresh,
    setFilters, setMovKey, setShowAll, reset, load,
  } = useMovementsStore()

  /* «Qeyd edən» resolves ids through the `get_user_directory()` map that
     App.tsx ALREADY warms at boot for the audit screen (M4-17). Reading it
     here adds NO second RPC and no fetch of any kind — this screen stays the
     four-read snapshot it documents. An empty map (directory still loading, or
     its read failed) is not an error state: `recorderLabel()` simply falls
     through to the current-user and «digər istifadəçi» branches, exactly as
     the original does when its own `uname` map is empty. */
  const emails = useAuditLogStore((st) => st.emails)

  const showToast = useToastStore((st) => st.show)

  /* M8-15 — the selected row for «Baxış», held as an ID ONLY.

     Deliberately not a copied movement object: a realtime refresh replaces the
     rows in the store, and a copy taken at click time would keep rendering the
     pre-refresh values with no sign that they are stale. The dialog looks the
     id up in the CURRENT rows on every render, and shows an honest unavailable
     state if the refresh removed it. */
  const [viewId, setViewId] = useState<string | null>(null)

  /* «Qrup üzrə ləğv» — I-5. Only the OPEN flag lives here: the dialog builds
     its document list from the CURRENT store rows on every render, so nothing
     about the batch is captured at click time. The unresolved-batch record
     deliberately lives in its own store, not here, so closing this dialog
     cannot clear a block on resubmitting documents whose outcome is unknown. */
  const [batchOpen, setBatchOpen] = useState(false)

  /* Loads any unresolved-batch records this browser already holds
     (`sessionStorage`, scoped to the Supabase PROJECT and ACCOUNT) BEFORE the
     batch dialog can be opened, so a block on documents from an earlier
     unconfirmed attempt survives a page reload, not just a dialog
     close/reopen.

     `me.sbId` — the Supabase auth id — is the account half of the scope, not
     the app-internal `me.id`: the RPC runs as the Supabase identity, so that
     is the identity a pending attempt belongs to. If hydration fails the
     store exposes a blocking `persistenceError` and the dialog refuses to
     dispatch rather than assuming no history exists. */
  const hydrateBatchCancel = useBatchCancelStore((s) => s.hydrate)

  /* I-6 — the document whose correction dialog is open, held as a DOC NUMBER
     only, for the same reason `viewId` is an id: nothing about the document is
     captured at click time. */
  const [editTarget, setEditTarget] = useState<EditDocumentTarget | null>(null)

  /* Unresolved-CORRECTION records, hydrated on the same schedule and from the
     same Supabase identity as the batch records, and for the same reason: a
     block on re-correcting a document whose outcome is unknown must survive a
     page reload, not only a dialog close. Its own store — clearing a batch
     block must never clear a correction block. */
  const hydrateCorrection = useCorrectionStore((s) => s.hydrate)
  const correctionList = useCorrectionStore((s) => s.unresolvedList)
  const clearCorrection = useCorrectionStore((s) => s.clearUnresolved)
  const correctionPersistenceError = useCorrectionStore((s) => s.persistenceError)

  /* Read from the operation store, NOT copied into local state: both feed
     gates that must reflect the CURRENT form, and a stale copy would either
     permit a second concurrent edit (`M8-39`) or omit the draft warning. */
  const editDocNum = useOperationStore((s) => s.editDoc?.docNum ?? null)
  const draftLineCount = useOperationStore((s) => s.lines.length)

  useEffect(() => {
    void load()
    hydrateBatchCancel(me.sbId)
    hydrateCorrection(me.sbId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* M8-14 — realtime. The debounce lives in useRealtimeRefresh (400 ms,
     ported from subscribeRealtime, index.html:1163-1181): a document posting
     writes many movement rows at once, and one refresh must serve the burst.
     Ordering between a realtime refresh and a concurrent user-triggered load
     is handled by the store's request sequence (M8-44), not here. */
  useRealtimeRefresh(true, WATCHED_TABLES, () => { void load() })

  /* RECONCILIATION - the read-side half of the D6 block, and the only
     automatic path that clears a correction record outside the write path.

     Without it an `unknown` correction was permanent: the write path resolves
     only the outcomes it SEES, and the one it never sees is the lost response.
     The admin refreshed this screen, saw the correction applied, and was still
     refused a second correction of that document for the rest of the session.

     It runs over `allRows` - the rows this screen has ALREADY loaded - so it
     issues no query of its own and is a pure derivation. Re-runs whenever
     those rows or the records change, so a refresh landing after the dialog
     closed still resolves the record it belongs to.

     POSITIVE EVIDENCE ONLY. `resolvedCorrections` returns an id only when the
     rows show BOTH the original's cancellation AND a replacement carrying the
     forward-link marker that names it. A missing marker, an empty row set or a
     failed read yields nothing and the block is RETAINED - never read as a
     rollback. The batch reconciliation above is deliberately untouched and
     cannot clear a correction record: separate stores, separate readers. */
  useEffect(() => {
    if (correctionPersistenceError) return
    for (const r of resolvedCorrections(correctionList, allRows)) {
      clearCorrection(r.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, correctionList, correctionPersistenceError])

  /* The search box is debounced like the original's `debounce(upd, 200)`
     (index.html:1626), so typing does not re-filter the whole table per
     keystroke. The INPUT is local and uncontrolled-by-store; the committed
     value goes to the store. `filters.q` is already lowercased and trimmed
     there, matching `upd()`. */
  const [queryInput, setQueryInput] = useState(filters.q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(debounceRef.current), [])

  function onQueryChange(v: string) {
    setQueryInput(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setFilters({ q: v.trim().toLowerCase() }), 200)
  }

  /* `movKeyOptions()` — rebuilt from the rows matching the CURRENT
     warehouse/type/date filters but NOT `MF.p` itself, so choosing a warehouse
     narrows the list while the İstiqamət selection never narrows the list it
     lives in (index.html:1597-1619). */
  const options = useMemo(
    () => movKeyOptions(operational, filters, warehouses),
    [operational, filters, warehouses],
  )

  /* The reset half of `rebuildMovPartnerOptions()` (index.html:1653-1655): a
     selection that is no longer among the options falls back to «all» rather
     than leaving the user with an unexplainable empty result.

     Derived for rendering AND written back to the store, because the filter
     below must use the resolved value — rendering the select as empty while
     still filtering on the stale key would show «all» over a narrowed table. */
  const activeKey = resolveMovKeySelection(filters.p, options)
  useEffect(() => {
    if (activeKey !== filters.p) setMovKey(activeKey)
  }, [activeKey, filters.p, setMovKey])

  const effectiveFilters = useMemo(
    () => ({ ...filters, p: activeKey }),
    [filters, activeKey],
  )

  /** `all` — the FULL filtered, sorted result. The cap is applied after. */
  const all = useMemo(
    () => sortMovements(filterMovements(operational, effectiveFilters, itemBy, warehouses)),
    [operational, effectiveFilters, itemBy, warehouses],
  )

  /* M8-12 — the KPI line is computed over `all`, the complete filtered set,
     NOT over the capped slice. The original passes `all` to every reduce
     (index.html:1795-1797). Using `page` would silently under-report every
     total the moment a filter matched more than 3000 rows — the exact case
     where the totals matter most. */
  const kpis = useMemo(() => movementKpis(all, itemBy), [all, itemBy])

  /** M8-11 — the 3000-row soft cap; `showAll` is sticky across filter changes. */
  const page = applyCut(all, showAll)

  /* M8-50 (I-7) — the ordinary Excel export.

     `all`, NEVER `page`: the cap is a DISPLAY limit. Legacy exports `all`
     (index.html:1848-1849) and so does this; exporting the slice would hand an
     accountant a file silently truncated at 3000 rows.

     GATED ON `loaded`, not on `loading`/`error`. `loaded` means at least one
     COMPLETE four-read snapshot has succeeded, which is the only state in
     which the matrix is trustworthy:

       - before the first success there is nothing to export — the rows,
         the nomenclature index and the valuation map are all empty, and an
         export would produce a header-only file that LOOKS like a valid empty
         result rather than an unfinished read;
       - after a FAILED refresh `loaded` stays true and the store keeps the
         last good snapshot as one unit (M8-45), including its valuation map.
         Exporting then is correct and deliberate: it exports that intact
         snapshot, which is exactly what the «Yenilənmədi» banner says is on
         screen. There is no partial fresh data to leak — a failed refresh
         writes no rows at all.

     A successfully loaded but EMPTY filtered set is not gated: legacy exports
     the header-only workbook in that case and so does this. */
  const canExport = loaded

  function exportXls() {
    xls(
      movementExportMatrix(all, itemBy, warehouses, valuations, emails, me),
      'mal_hereketi',
    )
    /* The legacy success toast (index.html:1234). It lives HERE, at the call
       site, because `lib/xls.ts` is shared with Nomenklatura and deliberately
       carries no toast of its own — see the note in that file. */
    showToast('mal_hereketi.xlsx yükləndi')
  }

  /* M16-11 — a Settings-initiated export, the React form of legacy
     `go('mov'); setTimeout(() => $('#mov-exp').click(), 50)`
     (index.html:7197). The request is consumed ONCE and runs THIS page's
     `exportXls()`, so the matrix, the filters and the `canExport` gate are
     the same ones the on-screen «Excel» button uses — there is no second
     export path.

     Gated on `canExport` exactly like the button: arriving before the first
     complete snapshot must not write a header-only workbook that would read
     as a genuine empty result.

     The request is consumed WHEN THE EXPORT RUNS, not on arrival. Settings
     navigates here while the snapshot is still loading, so `canExport` is
     false on the first render; consuming then would clear the request a tick
     before the data arrived and the user would get no file at all — a silent
     failure, and the one this milestone exists to prevent. Waiting for the
     gate keeps the request alive across that transition, and the unmount
     cleanup below stops it leaking into a later visit. */
  const pendingExport = useExportRequestStore((s) => s.pending)
  const consumeExport = useExportRequestStore((s) => s.consume)
  useEffect(() => {
    if (pendingExport !== 'mov' || !canExport) return
    consumeExport()
    exportXls()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingExport, canExport])

  /* Leaving the page abandons an unsatisfied request: it was addressed to
     THIS visit. Without this, a request dropped by a failed load would fire
     the next time the page happened to open. */
  useEffect(() => () => {
    if (useExportRequestStore.getState().pending === 'mov') consumeExport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* M8-50 (I-9) — the SEPARATE «Silinmə» report, `xlsWriteOff()`.

     ENABLED only when the type filter is exactly «Silinmə» and `loaded` is
     true, matching legacy `#mov-wo-exp` (index.html:1834). An empty filtered
     set writes nothing and toasts, as legacy does — the file is not produced
     as a header-only workbook that would read as a genuine empty result. */
  const isWriteOffFilter = effectiveFilters.t === 'Silinmə'

  /* ALSO GATED ON `!loading` — I-9 audit, unlike the ordinary «Excel» export.

     `loaded` alone answers "has a snapshot ever succeeded", not "is one being
     replaced right now". A refresh that has STARTED but not settled leaves
     `rows`/`valuations` at their previous identities, so the mid-read abort
     below — which compares exactly those identities — cannot see it either:
     both the click-time capture and the post-await check observe the same
     pre-refresh objects, and the file would be written from a snapshot the
     store is already in the act of replacing.

     The ordinary Excel export stays gated on `loaded` alone and is NOT changed
     (M8-50): it is synchronous and issues no second read that could land on
     the far side of a refresh, so it writes the coherent snapshot that is on
     screen at that instant. This report awaits an allocation read, so an
     in-flight refresh is a real window for it and not for the other. */
  const canExportWriteOff = loaded && isWriteOffFilter && !loading

  /** True while an export is in flight — blocks a duplicate concurrent run. */
  const woExportBusy = useRef(false)
  /** False once the page unmounts; the handler must not touch a dead screen. */
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function exportWriteOff() {
    /* DUPLICATE IN-FLIGHT GUARD. The allocation read is awaited, so a second
       click before it resolves would start a second read and produce a second
       download from a possibly different snapshot. A ref, not state: it must
       take effect on THIS click, before React could re-render. */
    if (woExportBusy.current) return

    /* CLICK-TIME REFRESH GUARD — I-9 audit. The disabled button is the primary
       gate, but it is not the only path here: a refresh can begin between the
       render that enabled the button and the click that fires this handler,
       and the store's `loading` flag is the only signal that says so. Refuse
       rather than capture a snapshot that is already being replaced. */
    if (useMovementsStore.getState().loading) {
      showToast(REFRESH_IN_PROGRESS, true)
      return
    }

    woExportBusy.current = true
    try {
      /* THE SNAPSHOT IS CAPTURED AT CLICK TIME — every input, together.

         `all` (the filtered parents), `itemBy`, `valuations`, `emails` and
         `me` are read into locals HERE, and only these locals are used after
         the await. A realtime refresh during the read replaces the store's
         rows and valuation map wholesale (M8-45); reading any of them after
         the await would mix parents captured before the refresh with a
         valuation map from after it, producing a file whose amounts belong to
         neither snapshot. Sheet 1 is therefore built BEFORE the await, from
         one coherent set.

         `rows`/`valuations` identity is also the abort token below: the store
         creates new objects on every successful load, so a changed reference
         is exactly "the snapshot moved under us". */
      const snapRows = allRows
      const snapValuations = valuations
      const parents = writeOffExportRows(all, itemBy, valuations, emails, me)
      const sessionId = me?.sbId ?? null

      if (!parents.length) {
        showToast('Seçilmiş filtrlərə uyğun silinmə qeydi yoxdur', true)
        return
      }

      /* THE CAPABILITY GATE — I-4's `layerReady` distinction, applied to a
         READ rather than a write.

         `layerActive === false` is NOT by itself evidence that layers are off:
         it carries that meaning ONLY when `layerReady` is true. A FAILED probe
         also reports `active:false`, and treating that as "confirmed inactive"
         would silently omit «Mənbə partiyalar» from a report whose source lots
         may well exist — a missing sheet that reads as "this write-off had no
         source lots" when the truth is "we never established whether it did".

         The three states, deliberately separated:

           ready && !active  CONFIRMED INACTIVE. Legacy behaviour preserved
                             exactly: `DB.woAllocs` stays empty, sheet 2 is
                             legitimately absent, sheet 1 is written normally,
                             and no allocation read is issued at all.
           ready && active   read the allocations; sheet 2 per the result.
           !ready            UNKNOWN. Also read. A read that succeeds settles
                             the question better than the probe did; a read
                             that fails refuses the file below rather than
                             quietly dropping the sheet.

         INHERITED DIFFERENCE, stated rather than hidden: legacy reads its
         allocations at PAGE LOAD, inside the same `stock_layers_supported()`
         branch that sets the capability, so it can never reach an export with
         an unresolved capability. This report reads ON DEMAND — which keeps
         the I-2 read-only screen's four-read profile unchanged — and therefore
         can. The `!ready` branch above is the honest handling of a state
         legacy simply cannot enter, not a divergence in the states it can. */
      /* FRESHNESS, not just readiness — I-9 audit.

         `layerReady`/`layerActive` are STICKY by design: the store keeps the
         last known capability when a later probe fails, because losing a probe
         is not evidence that the capability changed (see the store's note).
         That retention is correct for cancellation routing and is left alone.

         It is not enough HERE. `ready && !active` skips the allocation read
         ENTIRELY, so a capability confirmed inactive at boot and merely
         RETAINED across a later successful snapshot whose probe failed would
         omit «Mənbə partiyalar» on evidence nothing has reconfirmed. A missing
         sheet reads as "this write-off had no source lots", never as "we could
         not check" — exactly the silent omission the capability gate exists to
         prevent, arrived at through the cache instead of through the probe.

         `layerFresh` says whether the probe belonging to the APPLIED snapshot
         answered. Only a fresh confirmation may skip the read; a stale one
         falls into the `!ready` branch and READS, which settles the question
         properly or refuses the file. Genuinely confirmed-inactive behaviour
         — fresh `{ready:true, active:false}` — is unchanged: no read, one
         sheet, exactly as legacy. */
      const layerConfirmedInactive = layerFresh && layerReady && !layerActive

      let srcRows: ReturnType<typeof sourceRows>['rows'] = []
      if (!layerConfirmedInactive) {
        const res = await fetchWriteoffAllocations()

        /* ABORT CHECKS, all BEFORE anything is written. A download is the
           irreversible step here: once the file is on disk the user has a
           document they will treat as authoritative. */
        if (!mounted.current) return
        const st = useMovementsStore.getState()
        /* A refresh that STARTED during the read has not replaced the objects
           yet, so the identity check below cannot see it — I-9 audit. Its
           result is about to overwrite the snapshot these parents came from,
           which is the same mismatch, caught one moment earlier. */
        if (st.loading) {
          showToast(REFRESH_IN_PROGRESS, true)
          return
        }
        if (st.rows !== snapRows || st.valuations !== snapValuations) {
          /* The snapshot moved while the read was in flight. The parents were
             captured from the OLD one and the allocations come from the live
             database — combining them is exactly the mismatch this guard
             exists to prevent. Refuse; the user can re-export against the new
             data. */
          showToast('Məlumat yeniləndi — hesabatı yenidən yaradın', true)
          return
        }
        if ((useAuthStore.getState().me?.sbId ?? null) !== sessionId) {
          /* A different user is signed in now. Their visibility is not the one
             the parents were read under. */
          showToast('Sessiya dəyişdi — hesabatı yenidən yaradın', true)
          return
        }

        /* ALL OR NOTHING. A failed read writes NO file — not a one-sheet
           workbook, because a workbook missing «Mənbə partiyalar» is
           indistinguishable from the legitimate no-allocations case and would
           be read as a complete report. This is the one deliberate divergence
           from legacy, which cannot reach this state at all. */
        if (!res.ok) {
          showToast('Mənbə partiyalar oxunmadı — hesabat yaradılmadı', true)
          return
        }
        /* The counts are diagnostics only and are NOT toasted: a parent
           outside the exported filter is the ordinary result of filtering, not
           an anomaly, and warning about it would alarm on every normal export.
           Nor could any count prove the read was untruncated or unfiltered by
           RLS — only `res.ok` speaks to that, and it is checked above. */
        srcRows = sourceRows(res.rows, parents).rows
      }

      if (!mounted.current) return
      xlsWriteOff(parents, srcRows)
      showToast('Silinme_hesabati.xlsx yükləndi (' + parents.length + ' sətir)')
    } finally {
      woExportBusy.current = false
    }
  }

  /* `editMov()` — index.html:5506-5512. The four supported branches open the
     inspection dialog, which decides WHICH view to render; an unsupported type
     is refused with the legacy toast, verbatim, through the existing toast
     system and opens nothing. The decision is made here as well as in the
     dialog so no dialog is ever opened for a type that has no view. */
  function openView(m: MovementFilterRow) {
    if (documentViewKind(m) === 'unsupported') {
      showToast(IMMUTABLE_RECORD_REFUSAL, true)
      return
    }
    setViewId(String(m.id))
  }

  /* Everything still unresolved AFTER reconciliation. Displayed, because a
     block the user cannot see is a refusal with no explanation. */
  const unresolvedNow = correctionList

  return (
    <>
      {(correctionPersistenceError || unresolvedNow.length > 0) && (
        <div className="card" data-testid="mv-correction-unresolved">
          <div className="pad" role="status">
            {correctionPersistenceError
              ? <p className="err">{correctionPersistenceError}</p>
              : unresolvedNow.map((rec) => (
                  <p className="err" key={rec.id}>{unresolvedCorrectionText(rec)}</p>
                ))}
          </div>
        </div>
      )}
      <div className="phead">
        <div>
          <h2>Mal hərəkəti</h2>
          <p>Bütün mədaxil, məxaric və yerdəyişmələrin vahid registri.</p>
        </div>
        <div className="sp" />
        {/* Historical I-7 scope: that milestone shipped only the ordinary
            Excel export. I-9 subsequently added «Silinmə hesabatı» after its
            allocation read, schema and RLS path were implemented and audited.
            `Çap` remains intentionally absent under the 2026-09-08 product
            decision: it never worked in the platform and is not an acceptance
            requirement. «Baxış» is the deliberate per-row affordance below.

            The Excel button is UNGATED by role, matching legacy: `#mov-exp`
            carries no isAdmin() check, unlike `#mov-batch` right below it
            (index.html:1834-1836). Every role that may open this screen may
            export what it can see, and RLS — not the client — decides what
            that is (D2 / M8-42).

            «Qrup üzrə ləğv» IS rendered now: I-5 is included (D3), and the
            button is admin-only exactly as legacy's entry point is
            (index.html:5374). Every RPC behind it re-checks the role
            server-side; this gate only avoids offering a certain refusal. */}
        <Button
          variant="secondary"
          data-testid="mv-export"
          disabled={!canExport}
          onClick={exportXls}
        >
          Excel
        </Button>
        {/* The separate Silinmə report (I-9). UNGATED by role, exactly like
            «Excel» above and legacy `#mov-wo-exp`: every role that may open
            this screen may export what RLS lets it see. Enabled only for the
            «Silinmə» type filter, with the legacy hint preserved. */}
        <Button
          variant="secondary"
          data-testid="mv-export-writeoff"
          disabled={!canExportWriteOff}
          title="Yalnız Silinmə süzgəci seçildikdə"
          onClick={() => { void exportWriteOff() }}
        >
          Silinmə hesabatı
        </Button>
        {isAdmin(me) && (
          <Button
            variant="secondary"
            data-testid="mv-batch-cancel"
            onClick={() => setBatchOpen(true)}
          >
            Qrup üzrə ləğv
          </Button>
        )}
        <Button variant="primary" onClick={onNewOperation}>Yeni əməliyyat</Button>
      </div>

      <div className="filters">
        <input
          type="search"
          aria-label="Axtarış"
          placeholder="Mal adı, kod, kontragent, qaimə…"
          value={queryInput}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {/* Built from ALL configured warehouses (index.html:1619), never from
            the user's own scope. The option VALUE is the stored name and only
            the visible text passes through whLabel() — the name is the key in
            movements.warehouse and in the SQL text comparisons. */}
        <select
          aria-label="Anbar"
          value={filters.w}
          onChange={(e) => setFilters({ w: e.target.value })}
        >
          <option value="">Bütün anbarlar</option>
          {warehouses.map((w) => <option key={w} value={w}>{whLabel(w)}</option>)}
        </select>
        {/* The FIXED eight-type list (index.html:1621) — not CANCELLABLE_TYPES,
            which is a different, shorter list for a different purpose. */}
        <select
          aria-label="Əməliyyat növü"
          value={filters.t}
          onChange={(e) => setFilters({ t: e.target.value })}
        >
          <option value="">Bütün növlər</option>
          {MOVEMENT_TYPE_FILTERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          aria-label="İstiqamət / kontragent"
          value={activeKey}
          onChange={(e) => setMovKey(e.target.value)}
        >
          <option value="">İstiqamət / kontragent</option>
          {(['routes', 'partners', 'raws'] as const).map((g) =>
            options[g].length ? (
              <optgroup key={g} label={GROUP_LABELS[g]}>
                {options[g].map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </optgroup>
            ) : null,
          )}
        </select>
        {/* Both bounds are INCLUSIVE — `m.date < d1` / `m.date > d2`
            (index.html:1665-1666), so a row dated exactly d1 or d2 is kept. */}
        <input
          type="date"
          aria-label="Başlanğıc tarix"
          title="Başlanğıc tarix"
          value={filters.d1}
          onChange={(e) => setFilters({ d1: e.target.value })}
        />
        <input
          type="date"
          aria-label="Son tarix"
          title="Son tarix"
          value={filters.d2}
          onChange={(e) => setFilters({ d2: e.target.value })}
        />
        <Button
          variant="secondary"
          onClick={() => { setQueryInput(''); clearTimeout(debounceRef.current); reset() }}
        >
          Sıfırla
        </Button>
      </div>

      <div className="card">
        <div className="tw">
          {/* A failed refresh keeps the last good snapshot (M8-45), so the
              error is shown ABOVE the table rather than instead of it —
              unless nothing has ever loaded, where there is no table to keep. */}
          {error && loaded && (
            <div className="pad">
              <span className="tag t-rm">Yenilənmədi</span>{' '}
              <span className="hint">
                {error} · Ekranda son uğurlu oxunuşun məlumatı göstərilir.
              </span>
            </div>
          )}
          {/* There is deliberately NO "valuation degraded" notice any more.
              A failed valuation read now fails the whole snapshot (I-2 audit),
              so it surfaces through the ordinary error paths above and the
              previous amounts stay on screen unchanged. A successful read with
              zero rows needs no warning: the legacy per-row fallback is the
              original's own correct behaviour. */}
          {loading && !loaded ? (
            <div className="empty"><b>Yüklənir…</b>Mal hərəkəti Supabase-dən oxunur.</div>
          ) : error && !loaded ? (
            <div className="empty"><b>Yükləmə xətası</b>{error}</div>
          ) : !all.length ? (
            <div className="empty">
              <b>Qeyd yoxdur</b>
              {operational.length ? 'Seçilmiş süzgəclərə uyğun qeyd tapılmadı.' : 'Hələ heç bir hərəkət qeyd edilməyib.'}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tarix</th><th>Anbar</th><th>Kod</th><th>Malın adı</th><th>Növü</th>
                  <th>İstiqamət / Kontragent</th><th>Kanal</th><th>Qaimə №</th>
                  <th className="r">Giriş</th><th className="r">Çıxış</th>
                  <th className="r">Qiymət</th><th className="r">Məbləğ</th>
                  <th>Qeyd</th><th>Qeyd edən</th><th />
                </tr>
              </thead>
              <tbody>
                {page.map((m) => (
                  <MovementRowCells
                    key={String(m.id)}
                    m={m}
                    allRows={allRows}
                    itemBy={itemBy}
                    warehouses={warehouses}
                    valuations={valuations}
                    emails={emails}
                    me={me}
                    onView={openView}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* The footer KPI line — index.html:1826-1828. Rendered from `kpis`,
            which is computed over `all`. */}
        <div
          className="pad"
          style={{ borderTop: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span className="hint">
            {nf(kpis.count)} qeyd · mədaxil <b className="num">{nf(kpis.totalIn, 2)}</b>
            {' · '}məxaric <b className="num">{nf(kpis.totalOut, 2)}</b>
            {' · '}mədaxil dəyəri <b>{money(kpis.inboundValue)}</b>
            {!showAll && all.length > SHOW_MAX && (
              <>
                {' · '}<b>{nf(SHOW_MAX)}</b> göstərilir{' '}
                <Button variant="secondary" size="sm" onClick={() => setShowAll(true)}>
                  {'Hamısını göstər (' + nf(all.length) + ')'}
                </Button>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Only the ID is passed. The dialog resolves it against the CURRENT
          store rows on every render (M8-15 … M8-22). */}
      {viewId !== null && (
        <DocumentViewDialog
          movementId={viewId}
          allRows={allRows}
          itemBy={itemBy}
          warehouses={warehouses}
          valuations={valuations}
          emails={emails}
          me={me}
          /* Admin-only in the UI; every RPC re-checks the role server-side. */
          isAdmin={isAdmin(me)}
          layerActive={layerActive}
          layerReady={layerReady}
          onClose={() => setViewId(null)}
          /* The store keeps the previous snapshot when a refresh fails
             (M8-45), so the dialog can report a stale list without the rows
             being blanked. */
          onRefresh={load}
          onToast={showToast}
          editDocNum={editDocNum}
          onEditDocument={(docNum) => {
            const v = allRows.find((r) => String(r.id) === viewId)
            setEditTarget({
              docNum,
              isOrdinaryDoc: true,
              isCancelledOrReversal: false,
              type: v ? v.type : '',
            })
          }}
        />
      )}

      {/* I-6 — the READ-ONLY impact check and its two modals. It writes
          nothing; confirming only seeds the form and navigates. */}
      {editTarget !== null && (
        <EditDocumentDialog
          target={editTarget}
          isAdmin={isAdmin(me)}
          layerActive={layerActive}
          layerReady={layerReady}
          editDocNum={editDocNum}
          draftLineCount={draftLineCount}
          itemBy={itemBy}
          onClose={() => setEditTarget(null)}
          onToast={showToast}
          onConfirm={(mapped, docNum, type) => {
            setEditTarget(null)
            setViewId(null)
            onEditDocument(mapped, docNum, type)
          }}
        />
      )}

      {batchOpen && (
        <BatchCancelDialog
          allRows={allRows as unknown as BatchMovement[]}
          itemBy={itemBy}
          warehouses={warehouses}
          isAdmin={isAdmin(me)}
          layerActive={layerActive}
          layerReady={layerReady}
          onClose={() => setBatchOpen(false)}
          onRefresh={load}
          onToast={showToast}
        />
      )}
    </>
  )

}

interface RowProps {
  m: MovementFilterRow
  /** The RAW loaded set — `cancelledDocFor()` needs the marker rows that
      `excludeCancelled()` removes, so this is NOT the operational list. */
  allRows: CancelStateMovement[]
  itemBy: Map<string, MovementFilterItem>
  warehouses: string[]
  valuations: Map<string, WriteoffValuationRow>
  /** `get_user_directory()` id → email, for «Qeyd edən». Never fetched here. */
  emails: Map<string, string>
  me: Me
  /** Opens the read-only document inspection dialog (M8-15). */
  onView: (m: MovementFilterRow) => void
}

/* One registry row — index.html:1799-1823.

   Module-level rather than nested inside the page: a component declared inside
   another component is a NEW type on every render, so React unmounts and
   remounts all of its instances each time. At the 3000-row soft cap that is
   3000 remounts per keystroke. */
function MovementRowCells({ m, allRows, itemBy, warehouses, valuations, emails, me, onView }: RowProps) {
  const it = itemBy.get(m.item_code)

  /* M8-05 — the price/amount rule (index.html:1792-1795, 1815).

     A Silinmə row is valued from `writeoff_valuations`; EVERY other type
     falls back `m.price → item.price → 0`. The two chains are not
     interchangeable: applying the nomenclature price to a write-off would
     invent a price the write-off never used, and `final` is authoritative
     precisely because it accounts for the unpriced part. */
  const val = m.type === 'Silinmə' ? movementValuation(m, valuations) : null
  const pr = val
    ? writeOffUnitPrice(m, val)
    : (m.price || it?.price || 0)

  const amount = val
    ? (val.final == null ? '—' : money(val.final))
    : (pr ? money(((m.in_qty || 0) + (m.out_qty || 0)) * pr) : '—')

  const cancelled = cancelledDocFor(m, allRows)
  const note = m.note ?? ''

  return (
    <tr>
      <td>{fmtD(m.date)}</td>
      <td>{whLabel(m.warehouse)}</td>
      <td><span className="code">{m.item_code}</span></td>
      <td>
        <div className="nm">{it?.name || '—'}</div>
        {/* The manual «Müqavilə №» hint, distinct from the system doc_num. */}
        {m.contract_num ? <span className="hint">{m.contract_num}</span> : null}
      </td>
      <td><span className={'tag ' + typeTagClass(m.type)}>{m.type}</span></td>
      <td>
        {routeOrPartner(m, warehouses)}
        {cancelled ? <> <span className="tag t-rm">ləğv edilib</span></> : null}
      </td>
      {/* The channel suppression rule (index.html:1811-1814): on a transfer,
          the warehouse name leaked into `channel` from an old import (e.g.
          «Astara anbar»). It is hidden ONLY when it really does resolve to a
          warehouse — a meaningful non-warehouse channel is still shown. */}
      <td>
        {m.channel && !(m.type === 'Yerdəyişmə' && resolveWh(m.channel, warehouses))
          ? <span className="hint">{m.channel}</span>
          : <span className="muted">—</span>}
      </td>
      <td>{m.invoice_num ? <span className="code">{m.invoice_num}</span> : <span className="muted">—</span>}</td>
      <td className="r">{m.in_qty ? <span style={{ color: 'var(--in)' }}>{nf(m.in_qty, 2)}</span> : '—'}</td>
      <td className="r">{m.out_qty ? <span style={{ color: 'var(--out)' }}>{nf(m.out_qty, 2)}</span> : '—'}</td>
      <td className="r">{pr ? nf(pr, 2) : '—'}</td>
      <td className="r">{amount}</td>
      {/* 40-char truncation with the FULL note in the title attribute. */}
      <td>
        {note
          ? <span className="hint" title={note}>{note.length > 40 ? note.slice(0, 40) + '…' : note}</span>
          : <span className="muted">—</span>}
      </td>
      {/* «Qeyd edən» — the FINAL legacy mapping (index.html:990), not the
          intermediate `created_by || 'sistem'` at 943. `created_by` is a UUID
          column, so rendering the intermediate stage would put a raw UUID on
          screen, which the original never does. All four branches live in the
          pure helper. */}
      <td><span className="hint">{recorderLabel(m.created_by, emails, me)}</span></td>
      <td>
        {/* «Baxış» — the READ-ONLY inspection action (M8-15). It is the only
            control this row offers: no cancel, no replace, no edit. The row
            itself keeps whatever meaning it had; this button is what opens the
            document, exactly as the legacy `data-e` button does. */}
        <Button
          variant="secondary"
          size="sm"
          title="Sənədə baxış"
          onClick={() => onView(m)}
        >
          Baxış
        </Button>
      </td>
    </tr>
  )
}
