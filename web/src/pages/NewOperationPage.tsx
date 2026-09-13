import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useOperationStore, selectCanPost, selectBalance, selectCondOf, selectCondPending,
  selectAllowedWarehouses, selectTransferSources, selectTransferDests,
  type DraftOpLineState,
} from '../store/operation.store'
import { useCorrectionStore } from '../store/correction.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { useToastStore } from '../store/toast.store'
import { OperationForm } from '../components/operation/OperationForm'
import { ItemStatePanel } from '../components/operation/ItemStatePanel'
import { DraftLinesPanel } from '../components/operation/DraftLinesPanel'
import { LoadErrorState } from '../components/operation/LoadErrorState'
import { EditLineDialog } from '../components/operation/EditLineDialog'
import { BulkPickDialog } from '../components/operation/BulkPickDialog'
import { LayerPickDialog } from '../components/operation/LayerPickDialog'
import { IcareConfirmDialog } from '../components/operation/IcareConfirmDialog'
import { QaimeConflictDialog } from '../components/operation/QaimeConflictDialog'
import { PostConfirmDialog } from '../components/operation/PostConfirmDialog'
import { ClearLinesDialog } from '../components/operation/ClearLinesDialog'
import { EditModeBanner } from '../components/operation/EditModeBanner'
import { ItemFormDialog } from '../components/nomenclature/ItemFormDialog'
import { fetchStockLayers } from '../api/stockLayers.api'
import { fetchReferenceValues } from '../api/referenceValues.api'
import { bulkWriteOffRows, type BulkRow } from '../lib/bulkWriteOff'
import { icareExposedLines, applyIcareMark, type ExposureHit, type ExposureLine } from '../lib/icareExposure'
import { documentQaimeConflict, type QaimeConflict } from '../lib/qaimeConflict'
import { validateOpLine, type OpLineInput, type ValidateContext } from '../lib/opLineValidation'
import type { CondSplit } from '../lib/condSplit'
import { partnerOptions, channelOptions, SAHE_MESUL, type OpKind } from '../lib/opTypes'
import type { StockLayer, LayerCalc } from '../lib/layerAllocation'
import { can, isAdmin, type Me } from '../lib/roles'
import { nf, today } from '../lib/format'

/* NewOperationPage — plan T5 (shell, load, Realtime, draft restore) plus the
   H-3 dialog orchestration (T6/T6b).

   H-3 wired every dialog and the gate SEQUENCE that precedes a post — Qaimə
   conflict → İcarə confirmation → the confirm dialog (M7-91). H-4 completes
   it: the confirmation now calls the store's postDocument(), which owns the
   stale re-check, the refusals, the route choice and the cleanup. The page
   adds no posting rule of its own.

   Every dialog button consults the SAME `canPost` gate the panel uses (M7-S5);
   no second, disagreeing condition is introduced anywhere in this file. */
const WATCHED_TABLES = ['items', 'movements', 'warehouses'] as const

/** Which dialog is open. Only one at a time, exactly as the legacy screen. */
type DialogState =
  | { kind: 'none' }
  | { kind: 'clear' }
  | { kind: 'edit-line'; index: number }
  | { kind: 'bulk'; mode: 'wo' | 'mv' }
  | { kind: 'create-item'; presetName: string }
  | { kind: 'qaime'; conflict: QaimeConflict }
  | { kind: 'icare'; hits: ExposureHit<ExposureLine>[]; next: 'post' | 'bulk' }
  | { kind: 'post-confirm' }
  | {
      kind: 'layer'
      row: { code: string; name: string; unit: string; qty: number }
      layers: StockLayer[]
      revision: string
      /** A pending single line, or the bulk row it belongs to. */
      pendingLine: DraftOpLineState | null
      bulkCode: string | null
      /* H-3 — the bulk mode the dialog was opened FROM. The shared dialog is
         reached from both «Sil» and «Köçür», and every return path (confirm,
         «Geri», close) must reopen the list in that same mode. Defaulting to
         'wo' anywhere turns a transfer into a write-off. Null for the
         single-line entry point, which has no list to return to. */
      bulkMode: 'wo' | 'mv' | null
    }

interface Props {
  me: Me
}

export function NewOperationPage({ me }: Props) {
  const state = useOperationStore()
  const { readiness, loading, lines, restoredAt } = state
  const toast = useToastStore((s) => s.show)
  /* A01 — the one-time boot restore must complete BEFORE the save-on-every-
     mutation effect is allowed to run. Without this gate, the save effect
     fires on mount for the initial empty `lines`, and `saveDraftNow()`
     removes the just-written localStorage key — the later restore then finds
     nothing. `restoreArmed` flips true only once, after `restoreDraftOnBoot`
     resolves (successfully or not), never before. */
  const restoreArmed = useRef(false)
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })
  /* M7-39 — the EXPLICIT single-line commit signal handed to OperationForm,
     which returns focus to item search only when it advances. It is bumped at
     exactly the two points where one draft line reaches `addLineRaw` from a
     user's commit action: `onCommitLine` and a CONFIRMED single-line
     `confirmLayers`. It is deliberately NOT bumped by `restoreDraftOnBoot`,
     edit-mode hydration, `applyBulk`, removal, clearing or `refresh` — those
     change `lines` without a commit, so the size of `lines` cannot stand in
     for this (Codex audit 2026-09-09). Monotonic: it only ever increases. */
  const [commitSignal, setCommitSignal] = useState(0)
  /* The bulk selection held across the İcarə confirmation, so confirming
     re-runs the apply with the marked note rather than losing the selection. */
  const pendingBulk = useRef<{ sel: Map<string, number>; split: Map<string, Partial<CondSplit>>; note: string } | null>(null)
  /* Units and categories for the reused ItemFormDialog (T6b). Loaded lazily —
     the reference directory is an OPTIONAL read and must never gate this
     screen (M7-S4). */
  const [itemRefs, setItemRefs] = useState<{ units: string[]; categories: string[] }>({ units: [], categories: [] })

  /* A08 — a restore attempt is only safe against a HEALTHY core snapshot. The
     permission re-filter reads `core.warehouses`; on a failed core load that
     set is empty, every stored line would classify as `no-permission` and the
     draft would be deleted. So:
       · core load succeeded  → attempt the restore, then arm saving;
       · core load FAILED     → neither restore nor arm. The stored draft is
         left untouched and the save effect stays disabled, so the empty
         `lines` of the error screen cannot overwrite it either. A retry or a
         remount with a healthy snapshot restores it later.
     The store refuses the unsafe case a second time (`skipped`), so neither
     layer alone can cause the loss. */
  function attemptRestore() {
    const res = useOperationStore.getState().restoreDraftOnBoot(me)
    if (res.restored) {
      /* M7-54 — index.html:3828 toast wording, ported verbatim. */
      toast(
        `${nf(useOperationStore.getState().lines.length)} sətirlik qaralama bərpa edildi`
        + (res.dropped ? ` · ${nf(res.dropped)} sətir icazə səbəbindən atıldı` : ''),
        res.dropped > 0,
      )
    }
    return res
  }

  useEffect(() => {
    if (!readiness.loaded) {
      void useOperationStore.getState().load(me).then((r) => {
        if (!r.ok || r.error != null) return
        attemptRestore()
        restoreArmed.current = true
      })
    } else {
      /* Already-healthy snapshot on mount (a remount after a successful load
         elsewhere): actually ATTEMPT the restore rather than only arming
         future saves — otherwise the first mutation's save would overwrite a
         draft that was never read. `restoreDraftOnBoot` is itself a no-op
         when `lines` is already populated. */
      if (readiness.coreError == null) attemptRestore()
      restoreArmed.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* I-6 / D6 — the unresolved-CORRECTION records are hydrated HERE as well as
     on «Mal hərəkəti».

     The correction is SUBMITTED from this screen, and after a reload a user
     can arrive here directly — restored into edit mode, or navigating straight
     to «Yeni əməliyyat» — without ever opening the movements screen. Hydrating
     only there would leave the store unscoped on this path, and `beginAttempt`
     refuses without a scope: the correction would be blocked with a
     persistence message instead of being protected. Hydration is idempotent
     and reads one `sessionStorage` key, so doing it on both screens costs
     nothing and closes the gap. */
  useEffect(() => {
    useCorrectionStore.getState().hydrate(me?.sbId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.sbId])

  /* M7-119 — a Realtime refresh must NOT discard OP.lines. The store's
     load()/refresh() never clears `lines`, so this subscription is safe by
     construction; the store test suite pins it directly. */
  useRealtimeRefresh(true, WATCHED_TABLES, () => { void useOperationStore.getState().refresh(me) })

  /* Draft lines are saved on every mutation — mirrors the legacy
     save-on-every-change contract (index.html:3765-3775). Edit mode never
     writes (M7-52), handled inside saveDraftNow itself. Gated on
     `restoreArmed` (A01) so the initial empty-lines render never wipes a
     draft the boot restore has not attempted to read yet. */
  useEffect(() => {
    if (!restoreArmed.current) return
    useOperationStore.getState().saveDraftNow(me)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines])

  const canPost = useMemo(() => selectCanPost(state, me), [state, me])

  /* ONE validation context, built from the same selectors the form uses, so a
     line edited in the dialog is judged by exactly the rules that admitted it
     (M7-32 — there is no second validator anywhere). */
  function validateCtx(): ValidateContext {
    const s = useOperationStore.getState()
    return {
      itemBy: new Map(
        Array.from(s.core.itemBy.entries()).map(([c, it]) => [c, { code: it.code, name: it.name, unit: it.unit ?? '' }]),
      ),
      balanceOf: (w: string, c: string) => selectBalance(s, w, c),
      allowedWarehouses: selectAllowedWarehouses(s, me),
      transferSources: selectTransferSources(s, me),
      transferDests: selectTransferDests(s, me),
      lines: s.lines as unknown as OpLineInput[],
      isAdmin: isAdmin(me),
      restore: s.editDoc?.restore,
    }
  }

  const bulkRows: BulkRow[] = useMemo(() => {
    if (dialog.kind !== 'bulk') return []
    return bulkWriteOffRows(
      state.header.w,
      state.core.indexes.bal,
      new Map(
        Array.from(state.core.itemBy.entries()).map(([c, it]) => [
          c, { code: it.code, name: it.name, unit: it.unit, price: it.price },
        ]),
      ),
      state.lines,
    )
  }, [dialog, state.header.w, state.core.indexes.bal, state.core.itemBy, state.lines])

  const partnerList = useMemo(
    () => partnerOptions(state.kind, {
      warehouses: state.core.warehouses,
      locations: state.core.locations,
      partners: state.core.partners,
    }),
    [state.kind, state.core.warehouses, state.core.locations, state.core.partners],
  )

  const channelList = useMemo(
    () => channelOptions({ ready: state.refsReady, channels: state.channels }, state.observedChannels),
    [state.refsReady, state.channels, state.observedChannels],
  )

  /* T6b — the reused ItemFormDialog needs the unit and category directories.
     They are fetched only when the dialog is actually opened, and a failure
     leaves the dialog's own «no active unit» refusal (M7-21f) to fire. */
  useEffect(() => {
    if (dialog.kind !== 'create-item' || itemRefs.units.length > 0) return
    void fetchReferenceValues().then((r) => {
      setItemRefs({
        units: r.values.unit.filter((u) => u.active).map((u) => u.name),
        categories: r.values.category.filter((c) => c.active).map((c) => c.name),
      })
    })
  }, [dialog, itemRefs.units.length])

  function onSetKind(k: OpKind) {
    useOperationStore.getState().setKind(k)
  }

  function onSetHeaderField(patch: Partial<Record<string, string>>) {
    useOperationStore.getState().setHeaderField(patch as never)
  }

  function onSetPick(code: string | null) {
    useOperationStore.getState().setPick(code)
  }

  function onCommitLine(line: DraftOpLineState) {
    useOperationStore.getState().addLineRaw(line)
    /* M7-39 — commit point 1 of 2, bumped only AFTER the line is actually
       added. A validation failure returns inside the form and never reaches
       here. */
    setCommitSignal((n) => n + 1)
  }

  /* M7-72 — a layered non-inbound line cannot be committed until its source
     layers are chosen. A failed `get_stock_layers` does NOT open the dialog
     and does NOT add the line; other lines are unaffected. */
  async function onNeedsLayerPick(line: DraftOpLineState) {
    const res = await fetchStockLayers(line.w, line.c)
    if (!res.ok) { toast('Partiyalar yüklənmədi: ' + (res.error ?? 'bilinmir'), true); return }
    setDialog({
      kind: 'layer',
      row: { code: line.c, name: line.name ?? line.c, unit: line.unit ?? '', qty: line.q },
      layers: res.layers,
      revision: res.revision,
      pendingLine: line,
      bulkCode: null,
      bulkMode: null,
    })
  }

  /* M7-21a — the click hides the result list and opens the create dialog with
     the current search text UNTRIMMED, exactly as `editItem(null, inp.value)`
     does. The permission and localhost guards live inside the reused dialog
     (M7-21c); no second gate is added here. */
  function onCreateItem(searchText: string) {
    setDialog({ kind: 'create-item', presetName: searchText })
  }

  /* M7-21d — a successful create reloads the nomenclature so the new item is
     selectable, closes the dialog, and leaves the header, the draft lines and
     the search text untouched. `refresh()` never clears `lines` (M7-119). */
  function onItemCreated() {
    setDialog({ kind: 'none' })
    void useOperationStore.getState().refresh(me)
  }

  function onRemoveLine(index: number) {
    useOperationStore.getState().removeLine(index)
  }

  /* M7-46 — a layered line carries `allocations` that describe a specific
     source selection; editing its quantity would leave them mismatched, so
     the legacy screen refuses and asks the user to delete and re-add. */
  function onEditLine(index: number) {
    const store = useOperationStore.getState()
    const line = store.lines[index]
    if (!line) return
    if (Array.isArray(line.allocations) && line.allocations.length > 0) {
      toast('Partiyalı sətri düzəltmək olmur — silib yenidən əlavə edin.', true)
      return
    }
    store.openEditLine(index)
    setDialog({ kind: 'edit-line', index })
  }

  function onSaveEditLine(line: DraftOpLineState) {
    useOperationStore.getState().saveEditLine(line)
    setDialog({ kind: 'none' })
  }

  /* M7-44 — clearing is confirmed first; cancelling changes nothing. */
  function onClearLines() {
    setDialog({ kind: 'clear' })
  }

  function confirmClearLines() {
    useOperationStore.getState().clearLines()
    setDialog({ kind: 'none' })
  }

  /* M7-57 — the open guards. Each refusal is its own message, and none of
     them is a substitute for the server's own checks. */
  function onOpenBulk(mode: 'wo' | 'mv') {
    const s = useOperationStore.getState()
    if (!can(me, 'mv.add')) { toast('İcazəniz yoxdur.', true); return }
    if (s.editDoc != null) { toast('Düzəliş rejimində qrup seçimi mümkün deyil.', true); return }
    if (!s.header.w) { toast('Əvvəlcə anbar seçin.', true); return }
    const sources = mode === 'mv' ? selectTransferSources(s, me) : selectAllowedWarehouses(s, me)
    if (!sources.includes(s.header.w)) { toast('Bu anbar üzrə icazəniz yoxdur.', true); return }
    if (mode === 'mv' && (!s.header.w2 || s.header.w2 === s.header.w)) {
      toast('Mənbədən fərqli təyinat anbarı seçin.', true)
      return
    }
    /* H3-A05 — opening is the ONLY reset point (legacy 4120-4124); the shared
       note is seeded from the document note exactly as `BW.note` is. */
    useOperationStore.getState().openBulk(mode, (s.header.note ?? '').trim())
    setDialog({ kind: 'bulk', mode })
  }

  /* M7-66 / M7-67 — apply is ALL-OR-NOTHING. Every produced line is validated
     first and the batch is committed only if every one passes; a single
     failure adds NOTHING. Nothing here writes to Supabase (M7-68): the batch
     only appends draft lines.

     M7-69 — İcarə exposure is probed BEFORE the commit. On exposure the
     confirmation runs first and the reason is appended to the shared note,
     then the apply re-runs with `bulkIcareOk` set. */
  function applyBulk(sel: Map<string, number>, split: Map<string, Partial<CondSplit>>, note: string, icareOk: boolean) {
    const s = useOperationStore.getState()
    const mode = dialog.kind === 'bulk' ? dialog.mode : 'wo'
    const built: DraftOpLineState[] = []

    for (const [code, q] of sel) {
      const it = s.core.itemBy.get(code)
      if (!it) { toast(`${code} nomenklaturada yoxdur.`, true); return }
      const line: DraftOpLineState = {
        kind: mode === 'mv' ? 'mv' : 'out',
        w: s.header.w,
        w2: mode === 'mv' ? s.header.w2 : undefined,
        c: code,
        q,
        d: s.header.d || today(),
        t: mode === 'mv' ? 'Yerdəyişmə' : 'Silinmə',
        /* On a transfer the counterparty IS the destination warehouse. */
        p: mode === 'mv' ? s.header.w2 : SAHE_MESUL,
        ch: s.header.ch,
        ct: s.header.ct,
        iv: s.header.iv,
        note,
        cond: split.get(code) ?? null,
        name: it.name,
        unit: it.unit ?? '',
        pr: mode === 'mv' ? null : (it.price ?? null),
      }

      /* H-3 — a bulk row that carries a chosen lot must produce the SAME
         layered payload the single-line path produces (confirmLayers below);
         a bulk write-off that silently drops the layer price or the admin
         override posts different numbers than the identical single line.
           · the layer `sourceAmount` is preserved by deriving the price from
             it exactly as M7-74 does — amount ÷ quantity — and a null amount
             stays null so the panel renders «—» rather than 0;
           · `layerRevision` is the revision `get_stock_layers` returned FOR
             THIS ROW, not the capability version from
             `stock_layers_supported()`, which is an unrelated number and
             would fail the server's concurrency check;
           · the admin final-amount override travels with the line. */
      const lot = s.bulkLots.get(code)
      if (lot) {
        line.allocations = lot.allocations
        line.layerRevision = lot.revision
        line.priceVariants = lot.priceVariants
        line.pr = lot.sourceAmount == null || !q ? null : +(lot.sourceAmount / q).toFixed(4)
        const ov = s.bulkValues.get(code)
        if (ov?.finalAmount) {
          line.finalAmount = ov.finalAmount
          line.overrideReason = ov.reason || null
        }
      }
      built.push(line)
    }

    /* Validate every line against the draft AS IT GROWS, so two bulk rows on
       the same warehouse+item cannot together exceed the balance. */
    const ctx = validateCtx()
    const growing = [...s.lines]
    for (const line of built) {
      const res = validateOpLine(line as unknown as OpLineInput, {
        ...ctx,
        lines: growing as unknown as OpLineInput[],
      })
      if (!res.ok) { toast(`${line.c}: ${res.error}`, true); return }
      if (res.q !== line.q) {
        toast(`${line.c}: seçilmiş miqdar qalıqdan çoxdur.`, true)
        return
      }
      growing.push(line)
    }

    if (!icareOk) {
      const hits = icareExposedLines(built as unknown as ExposureLine[], (w, c) => ({
        cond: selectCondOf(s, w, c),
        balance: selectBalance(s, w, c),
      }))
      if (hits.length > 0) {
        setDialog({ kind: 'icare', hits, next: 'bulk' })
        pendingBulk.current = { sel, split, note }
        return
      }
    }

    for (const line of built) useOperationStore.getState().addLineRaw(line)
    /* The batch is committed, so the whole bulk draft is spent. */
    useOperationStore.setState({
      bulkOpen: false,
      bulkQuery: '',
      bulkSel: new Map(),
      bulkSplit: new Map(),
      bulkLots: new Map(),
      bulkValues: new Map(),
      bulkNote: '',
      bulkIcareOk: false,
    })
    setDialog({ kind: 'none' })
    toast(`${nf(built.length)} sətir əlavə edildi`)
  }

  /* M7-75 — a bulk row's layer selection reuses the SAME dialog the single
     line uses; only the confirm target differs. */
  async function onPickBulkLayers(row: BulkRow, qty: number) {
    const s = useOperationStore.getState()
    /* H3-A05 — the mode now lives in the store and survives the unmount, so
       it is read from there rather than from the dialog being replaced. */
    const mode = s.bulkMode
    const res = await fetchStockLayers(s.header.w, row.c)
    if (!res.ok) { toast('Partiyalar yüklənmədi: ' + (res.error ?? 'bilinmir'), true); return }
    setDialog({
      kind: 'layer',
      row: { code: row.c, name: row.name, unit: row.unit, qty },
      layers: res.layers,
      revision: res.revision,
      pendingLine: null,
      bulkCode: row.c,
      bulkMode: mode,
    })
  }

  /* M7-75 — a stored allocation is reusable ONLY when it was built from the
     revision `get_stock_layers` just returned. A differing revision means the
     underlying layers moved, so the stale allocation is discarded and the row
     is re-picked from scratch (index.html:4327-4329). */
  function survivingAllocation(code: string | null, revision: string) {
    if (!code) return undefined
    const lot = useOperationStore.getState().bulkLots.get(code)
    if (!lot || lot.revision !== revision) return undefined
    return new Map(lot.allocations.map((a) => [a.layer_id, a.qty]))
  }

  /* H-3 — a bulk row whose quantity or condition split changed no longer
     matches the allocation chosen for it, so both the stored lot and the
     admin override are dropped and the row must be re-picked. Doing nothing
     would post allocations that do not sum to the line quantity. */
  function onInvalidateBulkLot(code: string) {
    useOperationStore.getState().invalidateBulkLot(code)
  }

  /* Confirming an allocation either commits the pending single line or stores
     the lot against the bulk row and returns to the list. */
  function confirmLayers(result: LayerCalc & {
    priceVariants: number[]
    finalAmount: string
    overrideReason: string
  }) {
    if (dialog.kind !== 'layer') return

    if (dialog.bulkCode) {
      const lots = new Map(useOperationStore.getState().bulkLots)
      lots.set(dialog.bulkCode, {
        allocations: result.allocations,
        sourceAmount: result.sourceAmount,
        priceVariants: result.priceVariants,
        /* The revision this very allocation was built from — see BulkLot. */
        revision: dialog.revision || null,
      })
      const values = new Map(useOperationStore.getState().bulkValues)
      if (result.finalAmount) {
        values.set(dialog.bulkCode, { finalAmount: result.finalAmount, reason: result.overrideReason })
      } else {
        /* A cleared override must not leave the previous one standing. */
        values.delete(dialog.bulkCode)
      }
      useOperationStore.setState({ bulkLots: lots, bulkValues: values })
      /* H-3 / H3-A05 — return to the list in the mode it was opened from, with
         the draft intact: the store holds it, so the remount re-renders the
         same selection, splits, note and search text. */
      setDialog({ kind: 'bulk', mode: dialog.bulkMode ?? useOperationStore.getState().bulkMode })
      return
    }

    const line = dialog.pendingLine
    if (!line) { setDialog({ kind: 'none' }); return }
    /* M7-74 — the displayed price is the shown amount ÷ quantity; a null
       sourceAmount stays null so the panel renders «—», never 0. */
    useOperationStore.getState().addLineRaw({
      ...line,
      allocations: result.allocations,
      priceVariants: result.priceVariants,
      layerRevision: dialog.revision,
      pr: result.sourceAmount == null ? null : +(result.sourceAmount / line.q).toFixed(4),
      finalAmount: result.finalAmount || null,
      overrideReason: result.overrideReason || null,
    })
    /* M7-39 — commit point 2 of 2: the CONFIRMED single-line layer return.
       Reached only past the `dialog.bulkCode` branch above (a bulk lot stores
       an allocation and appends nothing) and past the missing-`pendingLine`
       guard, so opening the dialog and closing it without confirming leaves
       the signal where it was. */
    setCommitSignal((n) => n + 1)
    setDialog({ kind: 'none' })
  }

  /* M7-91 — the post gate SEQUENCE: the single `canPost` gate, then the Qaimə
     conflict (a hard block), then İcarə confirmation, then the confirm dialog.
     The write follows from the dialog's confirmation (confirmPost). */
  function onPost() {
    if (!canPost) return
    const s = useOperationStore.getState()

    const conflict = documentQaimeConflict(
      s.lines.map((l) => ({ kind: l.kind, iv: l.iv ?? null, d: l.d, p: l.p ?? null, w2: l.w2 ?? null })),
      /* M7-90 — compared only against OPERATIONAL movements; `indexes.
         operational` is already `excludeCancelled()`-filtered, so a cancelled
         document cannot raise a conflict. */
      s.core.indexes.operational.map((m) => ({
        iv: m.invoice_num, d: m.date, p: m.partner, doc: m.doc_num,
      })),
      s.editDoc?.docNum ?? null,
    )
    if (conflict) { setDialog({ kind: 'qaime', conflict }); return }

    const hits = icareExposedLines(s.lines as unknown as ExposureLine[], (w, c) => ({
      cond: selectCondOf(s, w, c),
      balance: selectBalance(s, w, c),
    }))
    if (hits.length > 0) { setDialog({ kind: 'icare', hits, next: 'post' }); return }

    setDialog({ kind: 'post-confirm' })
  }

  /* M7-82 — the previous marker is stripped before re-appending, because the
     user can confirm İcarə and then cancel the post dialog; plain
     concatenation would stack two markers on the second attempt. */
  function confirmIcare(reason: string) {
    if (dialog.kind !== 'icare') return
    const next = dialog.next
    if (next === 'bulk') {
      const pending = pendingBulk.current
      pendingBulk.current = null
      if (!pending) { setDialog({ kind: 'none' }); return }
      const marked = new Map(pending.sel)
      applyBulk(marked, pending.split, applyIcareMark(pending.note, reason), true)
      return
    }
    const s = useOperationStore.getState()
    const exposed = new Set(dialog.hits.map((h) => `${h.w}|${h.line.c}`))
    useOperationStore.setState({
      lines: s.lines.map((l) =>
        exposed.has(`${l.w}|${l.c}`) ? { ...l, note: applyIcareMark(l.note, reason) } : l,
      ),
    })
    /* H-3 — this edits draft lines, so the idempotency key computed for the
       PREVIOUS content must be dropped, exactly as addLineRaw / removeLine /
       saveEditLine do. Keeping it would let the post reuse a key that no
       longer describes the document being sent. */
    useOperationStore.getState().invalidateRequestKey()
    setDialog({ kind: 'post-confirm' })
  }

  /* H-4 — the real post. Every decision lives in the store's postDocument()
     (M7-96…M7-104): the stale re-check, the layer-mixing refusals, the route
     choice, the two sequential calls and the success cleanup. This function
     only closes the dialog and turns the outcome into a message, so there is
     no second copy of the posting rules in the page.

     The dialog is closed BEFORE the await, exactly as the legacy screen does
     (index.html:4667) — but the protection against a second submit is the
     store's in-flight lock (M7-108), which `canPost` already reads, not the
     dialog being gone. */
  async function confirmPost(reason: string) {
    setDialog({ kind: 'none' })
    const res = await useOperationStore.getState().postDocument(me, { reason })
    if (res.kind === 'refused') { toast(res.message, true); return }
    if (res.kind === 'partial') {
      /* M7-103 — the first call is already committed. Saying nothing was
         written would be false, so the real condition is stated. */
      toast(
        res.message
        + ' — DİQQƏT: yerdəyişmə sətirləri artıq yazılıb'
        + (res.writtenDocNum ? ` (${res.writtenDocNum})` : '')
        + '. Sənəd yarımçıqdır — qalan sətirləri yoxlayın.',
        true,
      )
      return
    }
    if (res.kind === 'corrected') { toast(res.message); return }
    /* I-6 / D6 — the two outcomes that are NOT a plain success and NOT a
       confirmed refusal. Both are shown as errors so they cannot be mistaken
       for a completed correction, and neither claims the document is
       unchanged. Edit mode is deliberately left ON for `correction-unknown`:
       the store keeps the lines so nothing typed is lost while the admin
       reconciles, and a repeat submit is refused by the correction store. */
    if (res.kind === 'correction-unknown') { toast(res.message, true); return }
    if (res.kind === 'correction-stale') { toast(res.message, true); return }
    toast(res.message)
    /* A drop or a trim is reported alongside the success, never instead of it. */
    if (res.notice) toast(res.notice, true)
  }

  function onExitEditMode() {
    useOperationStore.getState().exitEditMode()
    toast('Düzəlişdən imtina edildi — sənəd dəyişməyib.')
  }

  return (
    <>
      <div className="phead">
        <div>
          <h2>Yeni əməliyyat</h2>
          {/* M18-53 — index.html:296 verbatim. «Mədaxil, məxaric və
              yerdəyişmə sənədləri.» was a React paraphrase that dropped both
              facts the legacy subtitle actually states: that all three kinds
              are recorded from ONE form, and that a transfer writes TWO
              records. */}
          <p>Mədaxil, məxaric və anbarlararası yerdəyişməni bir formadan qeyd edin. Yerdəyişmə avtomatik olaraq iki qeyd yaradır.</p>
        </div>
      </div>

      {/* M7-110 — the banner states the one fact the screen cannot show: the
          correction has not reached the database yet. */}
      {state.editDoc && (
        <EditModeBanner docNum={state.editDoc.docNum} onExit={onExitEditMode} />
      )}

      {loading && !readiness.loaded ? (
        <div className="card"><div className="empty"><b>Yüklənir…</b></div></div>
      ) : readiness.coreError && !readiness.loaded ? (
        <LoadErrorState error={readiness.coreError} />
      ) : (
        /* M18-40 — the two-column workspace, index.html:297 verbatim.

           This was `<div className="grid2">`, a class name that exists in NO
           stylesheet — not index.css, not the legacy <style> block. An
           undefined class is inert, so the card laid out as a full-width
           block and the form stretched down the whole page; that is the
           reported defect, measured in Chrome as
           `display:block; grid-template-columns:none`.

           The legacy authority is `.grid` (display:grid;gap:12px) carrying an
           INLINE template, which is the idiom every other migrated screen
           already uses (Dashboard 1.35fr 1fr, Settings/Finance 1fr 1fr). No
           new CSS rule is invented for a class legacy never had. */
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,.85fr)' }}>
          <OperationForm
            me={me}
            state={state}
            onSetKind={onSetKind}
            onSetHeaderField={onSetHeaderField}
            onSetPick={onSetPick}
            onConsumePrefill={() => useOperationStore.getState().consumePrefill()}
            onCommitLine={onCommitLine}
            commitSignal={commitSignal}
            onNeedsLayerPick={onNeedsLayerPick}
            onCreateItem={onCreateItem}
            onOpenBulk={onOpenBulk}
          />
          {/* M18-41 — the RIGHT column, index.html:303-310. Legacy stacks two
              cards in one plain <div>: «Sənədin sətirləri» FIRST, then
              «Seçilmiş malın vəziyyəti» beneath it at margin-top:12px.

              React had the lines panel OUTSIDE the grid entirely, rendered
              below both columns, and the item-state panel alone on the right —
              so the document lines never appeared beside the form at all.
              Both panels keep their own props, state and guards; only their
              placement changes. */}
          <div>
            {readiness.loaded && (
              <DraftLinesPanel
                lines={state.lines}
                restoredAt={restoredAt}
                onDismissRestoreBanner={() => useOperationStore.setState({ restoredAt: null })}
                onRemove={onRemoveLine}
                onEdit={onEditLine}
                canPost={canPost}
                editMode={state.editDoc != null}
                onPost={onPost}
                onClear={onClearLines}
              />
            )}
            <div style={{ marginTop: 12 }}>
              <ItemStatePanel code={state.pick} bal={state.core.indexes.bal} />
            </div>
          </div>
        </div>
      )}

      {readiness.loaded && readiness.coreError && (
        <div className="hint" style={{ color: 'var(--alarm)' }}>{readiness.coreError}</div>
      )}

      {dialog.kind === 'clear' && (
        <ClearLinesDialog
          count={state.lines.length}
          onConfirm={confirmClearLines}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}

      {dialog.kind === 'edit-line' && state.lines[dialog.index] && (
        <EditLineDialog
          index={dialog.index}
          line={state.lines[dialog.index]}
          ctx={validateCtx()}
          channels={channelList}
          partners={partnerList}
          warehouses={selectAllowedWarehouses(state, me)}
          transferDests={selectTransferDests(state, me)}
          onSave={onSaveEditLine}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}

      {dialog.kind === 'bulk' && (
        <BulkPickDialog
          mode={dialog.mode}
          warehouse={state.header.w}
          rows={bulkRows}
          condOf={(code) => selectCondOf(state, state.header.w, code)}
          condPendingOf={(code) => selectCondPending(state, state.header.w, code)}
          layerActive={state.layerActive}
          lots={state.bulkLots}
          values={state.bulkValues}
          /* H3-A05 — the draft is the store's, so it survives the layer
             dialog unmounting this component. */
          query={state.bulkQuery}
          sel={state.bulkSel}
          split={state.bulkSplit}
          note={state.bulkNote}
          onQueryChange={(query) => useOperationStore.getState().setBulkDraft({ query })}
          onSelChange={(sel, split) => useOperationStore.getState().setBulkDraft({ sel, split })}
          onNoteChange={(note) => useOperationStore.getState().setBulkDraft({ note })}
          onPickLayers={onPickBulkLayers}
          /* H-3 — a changed quantity or bucket drops the row's stale lot and
             admin override; the dialog cannot do it because the parent owns
             both maps. */
          onInvalidateLot={onInvalidateBulkLot}
          onApply={({ sel, split, note }) => applyBulk(sel, split, note, state.bulkIcareOk)}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}

      {dialog.kind === 'layer' && (
        <LayerPickDialog
          code={dialog.row.code}
          name={dialog.row.name}
          unit={dialog.row.unit}
          warehouse={state.header.w}
          requiredQty={dialog.row.qty}
          layers={dialog.layers}
          /* M7-73 — the admin final-amount override is offered on `out` only. */
          showFinalAmount={isAdmin(me) && state.kind === 'out'}
          /* M7-75 — reopen with the allocation already chosen for this row,
             but only if it matches the revision just fetched. */
          initialSelection={survivingAllocation(dialog.bulkCode, dialog.revision)}
          initialFinalAmount={dialog.bulkCode
            ? state.bulkValues.get(dialog.bulkCode)?.finalAmount ?? ''
            : ''}
          initialOverrideReason={dialog.bulkCode
            ? state.bulkValues.get(dialog.bulkCode)?.reason ?? ''
            : ''}
          onConfirm={confirmLayers}
          /* M7-75 — a bulk row returns to the list rather than discarding it,
             in the SAME mode it was opened from (H-3). */
          onBack={dialog.bulkCode
            ? () => setDialog({ kind: 'bulk', mode: dialog.bulkMode ?? 'wo' })
            : undefined}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}

      {dialog.kind === 'icare' && (
        <IcareConfirmDialog
          hits={dialog.hits}
          onConfirm={confirmIcare}
          onClose={() => { pendingBulk.current = null; setDialog({ kind: 'none' }) }}
        />
      )}

      {dialog.kind === 'qaime' && (
        <QaimeConflictDialog
          conflict={dialog.conflict}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}

      {dialog.kind === 'post-confirm' && (
        <PostConfirmDialog
          lineCount={state.lines.length}
          editMode={state.editDoc != null}
          editDocNum={state.editDoc?.docNum}
          /* The SAME gate the panel's button used — M7-S5. */
          canPost={canPost}
          inFlight={state.inFlight}
          onConfirm={confirmPost}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}

      {/* T6b — the Phase 5 dialog, REUSED. Item creation is not
          reimplemented; the only addition is the `presetName` prop. */}
      {dialog.kind === 'create-item' && (
        <ItemFormDialog
          item={null}
          items={state.core.items}
          units={itemRefs.units}
          categories={itemRefs.categories}
          me={me}
          presetName={dialog.presetName}
          onSaved={onItemCreated}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}
    </>
  )
}
