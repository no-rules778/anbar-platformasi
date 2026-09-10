import { create } from 'zustand'
import { fetchItems, type ItemRow } from '../api/items.api'
import { fetchItemMovements } from '../api/itemMovements.api'
import { fetchWarehouses } from '../api/warehouses.api'
import { readPartners } from '../api/partners.api'
import { fetchStockConditions, toCondMap } from '../api/stockConditions.api'
import { fetchReferenceValues } from '../api/referenceValues.api'
import { fetchSplitSupported } from '../api/movementSplit.api'
import { fetchLayerCapability } from '../api/stockLayers.api'
import { fetchTransferDestinations } from '../api/transferDestinations.api'
import { buildItemIndexes, type ItemIndexes } from '../lib/itemIndex'
import { excludeCancelled } from '../lib/operationalMovements'
import { allowedWarehouses, transferSourceWarehouses, transferDestWarehouses } from '../lib/warehouseScope'
import type { Me } from '../lib/roles'
import { isAdmin as roleIsAdmin, can } from '../lib/roles'
import {
  foldCoreReads, canPost as computeCanPost, postBlockReason as computePostBlockReason,
  type ReadinessState, type ReadResult, type PostBlockReason, type EligibilityLine,
} from '../lib/opReadiness'
import type { OpKind, LocationEntry, PartnerEntry } from '../lib/opTypes'
import type { BulkLot, BulkOverride } from '../lib/bulkWriteOff'
import type { CondRecord, CondSplit } from '../lib/condSplit'
import { condPending as condPendingOf, SPLIT_UNSUPPORTED_MSG } from '../lib/condSplit'
import {
  restoreDraft, serialiseDraft, shouldSaveDraft, draftKey, DRAFT_MAX_LINES,
  type DraftLine,
} from '../lib/opDraft'
import { staleRecheck } from '../lib/opStaleRecheck'
import { editRestoreQty, isInitialBalanceLine, INIT_BAL_ADMIN_ONLY_MSG } from '../lib/opLineValidation'
import {
  toMovementPayload, toTransferPayload, toCorrectionPayload, splitByRoute,
  type DraftOpLine,
} from '../lib/opPayload'
import {
  postMovementDocument, postTransferDocument,
  postLayerMovementDocument, postLayerTransferDocument, correctDocument,
} from '../api/postMovementDocument.api'
import { nf } from '../lib/format'
import {
  classifyCorrectionFailure, validateCorrectionBody,
  correctionRejectedMessage, correctionSuccessMessage,
  correctionUnknownMessage, correctionRefreshFailedMessage,
  correctionBlockedMessage,
} from '../lib/correctionOutcome'
import { useCorrectionStore } from './correction.store'

/** The record could not be persisted and no more specific reason was set. */
const CORRECTION_UNPROTECTED =
  'Düzəliş qeydi saxlanmadı — sorğu göndərilmir. Səhifəni yeniləyin və yenidən cəhd edin.'

/* Zustand store for «Yeni əməliyyat» — plan T4.

   Holds the legacy OP/BW/EL/DLP-BLP state in one place (proposal §4). This
   milestone (H-2) implements `load()` atomically over the five core reads,
   the four optional probes into their own readiness flags, draft
   persistence/restore, request-key invalidation, the in-flight lock and
   `prefill()`. Dialog-driven state (bulk pick, layer pick, edit-line working
   copy) is exposed as plain fields so H-3 can wire dialogs against it without
   inventing a second store; posting orchestration beyond the gate itself is
   H-3/H-4 work — this store exposes `canPost`/`postBlockReason` from T2b as
   the ONLY gate and adds no second condition anywhere. */

export interface DraftOpLineState extends DraftLine {
  d: string
  t: string
  /** Quantity — redeclared because `DraftLine`'s index signature would
      otherwise widen it to `unknown`. */
  q: number
  w2?: string | null
  p?: string | null
  ch?: string | null
  ct?: string | null
  iv?: string | null
  note?: string | null
  cond?: Partial<CondSplit> | null
  layerRevision?: string | null
  allocations?: { layer_id: string; qty: number }[] | null
  /** Distinct source-layer unit prices shown in the draft table (M7-40). */
  priceVariants?: number[] | null
  finalAmount?: string | number | null
  overrideReason?: string | null
  name?: string
  unit?: string
  pr?: number | null
}

export interface OpHeader {
  d: string
  t: string
  w: string
  w2: string
  p: string
  ch: string
  ct: string
  iv: string
  note: string
  /** Price — `in` tab only, seeded once from the picked item's price. */
  pr: string
}

function emptyHeader(): OpHeader {
  return { d: '', t: '', w: '', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' }
}

export interface EditDocState {
  docNum: string
  /** `w|c` → outbound quantity to restore during validation (M7-37). */
  restore: Map<string, number>
  type: string
  direction: string
}

const EMPTY_INDEXES: ItemIndexes = {
  byItem: new Map(),
  bal: [],
  priceObs: new Map(),
  operational: [],
}

interface CoreSnapshot {
  items: ItemRow[]
  itemBy: Map<string, ItemRow>
  indexes: ItemIndexes
  warehouseRows: { name: string; type: string | null; active: boolean | null }[]
  /** Active `anbar` warehouse names — index.html DB.whs. */
  warehouses: string[]
  /** Non-anbar active locations — feeds partnerOptions('out'). */
  locations: LocationEntry[]
  partners: PartnerEntry[]
  condByKey: Map<string, CondRecord>
}

function emptyCoreSnapshot(): CoreSnapshot {
  return {
    items: [],
    itemBy: new Map(),
    indexes: EMPTY_INDEXES,
    warehouseRows: [],
    warehouses: [],
    locations: [],
    partners: [],
    condByKey: new Map(),
  }
}

/**
 * What a post attempt did — M7-102/M7-103/M7-104.
 *
 * `partial` is the one outcome the legacy screen produces but never NAMES: a
 * document holding both transfer and non-transfer lines is written by TWO
 * sequential server calls, and if the second fails the first is ALREADY
 * COMMITTED. The original just toasts «Əməliyyat qeyd edilmədi», which reads
 * as "nothing was written" and is false. It is surfaced honestly here.
 *
 * `notice` carries the stale-recheck report so a drop/trim is reported even on
 * an otherwise successful post.
 */
/* I-6 adds two outcomes, and ONLY for the correction path. `corrected` keeps
   its meaning (a confirmed, reconciled success); `correction-unknown` and
   `correction-stale` are the two states the pre-I-6 code collapsed into
   `refused` with the sentence «sənədi dəyişməyib» — false whenever the write
   committed and the response was lost. See `lib/correctionOutcome.ts`. */
export type PostOutcome =
  | { kind: 'refused'; message: string; partial?: false }
  | { kind: 'partial'; message: string; writtenDocNum: string | null }
  | { kind: 'posted'; message: string; notice: string | null; rowCount: number }
  | { kind: 'corrected'; message: string }
  /** The correction MAY have committed. Never says the document is unchanged. */
  | { kind: 'correction-unknown'; message: string }
  /** Confirmed committed, but the follow-up refresh failed — screen is stale. */
  | { kind: 'correction-stale'; message: string }

export interface OperationState {
  /* ---------- core snapshot ---------- */
  core: CoreSnapshot
  readiness: ReadinessState
  loading: boolean

  /* ---------- optional/tier-2 extras ---------- */
  refsReady: boolean
  channels: { name: string; active: boolean }[]
  observedChannels: string[]
  layerActive: boolean
  layerVersion: number
  transferDests: string[]
  transferDestsReady: boolean

  /* ---------- form/document state ---------- */
  kind: OpKind
  header: OpHeader
  /** Per-tab header capture — M7-05. */
  headerByKind: Partial<Record<OpKind, OpHeader>>
  lines: DraftOpLineState[]
  pick: string | null
  /* M5-55 / M7-115 — the PENDING prefill.

     `prefill(code)` is called from Nomenklatura BEFORE «Yeni əməliyyat» is
     mounted, so at that moment `core.itemBy` is empty (the page has not loaded
     yet) and there is nothing to resolve the code against. `pick` alone is
     therefore not enough: the form's price-seeding effect keys on `pick` and
     would run once, against an empty snapshot, and never again once the items
     arrive — the item would be "selected" with no unit, no balance panel and
     no seeded price.

     So the request is recorded separately and CONSUMED by the form only once
     the code actually resolves. It survives the page load and any refresh in
     between, and is cleared exactly once, when it has been applied. */
  pendingPrefill: string | null
  requestKey: string
  editDoc: EditDocState | null
  restoredAt: number | null
  inFlight: boolean

  /* ---------- bulk «Malları seç» state ----------

     H3-A05 — this draft lives in the STORE, not inside BulkPickDialog.
     Opening the layer picker unmounts the bulk dialog, so component-local
     state was lost on every «Partiya seç» round trip: a partial quantity
     (3 of 10) came back unselected, and re-selecting reset it to the full 10.
     The legacy screen keeps the same draft in its module-level `BW` object
     (index.html:4020) and resets it only when the bulk dialog is OPENED
     (4120-4124), never when returning from the layer picker. */
  bulkOpen: boolean
  /** The mode the list was opened in — a transfer must not return as 'wo'. */
  bulkMode: 'wo' | 'mv'
  /** Search text — legacy `BW.q`, re-rendered from state at 4134. */
  bulkQuery: string
  bulkSel: Map<string, number>
  bulkSplit: Map<string, Partial<CondSplit>>
  bulkLots: Map<string, BulkLot>
  bulkValues: Map<string, BulkOverride>
  bulkNote: string
  bulkIcareOk: boolean

  /* ---------- edit-line working copy ---------- */
  editLineIndex: number | null
  editLineDraft: DraftOpLineState | null

  /* ---------- layer picker (single line + bulk) ---------- */
  layerPickerOpen: boolean
  layerPickerCode: string | null
  layerPickerWarehouse: string | null

  /* ---------- actions ---------- */
  setKind: (k: OpKind) => void
  setHeaderField: (patch: Partial<OpHeader>) => void
  setPick: (code: string | null) => void
  prefill: (code: string) => void
  /** Clears the pending prefill once the form has actually applied it. */
  consumePrefill: () => void
  invalidateRequestKey: () => void
  ensureRequestKey: () => string
  addLineRaw: (line: DraftOpLineState) => void
  removeLine: (index: number) => void
  clearLines: () => void
  setInFlight: (v: boolean) => void
  openEditLine: (index: number) => void
  closeEditLine: () => void
  saveEditLine: (line: DraftOpLineState) => void
  enterEditMode: (doc: EditDocState, lines: DraftOpLineState[], header: Partial<OpHeader>) => void
  exitEditMode: () => void
  setBulkOpen: (v: boolean) => void
  /** H3-A05 — opens the list and RESETS the draft (legacy 4120-4124). */
  openBulk: (mode: 'wo' | 'mv', note: string) => void
  /** Patches the surviving bulk draft; returning from the layer picker must
      never go through `openBulk`, which would clear it. */
  setBulkDraft: (patch: {
    query?: string
    sel?: Map<string, number>
    split?: Map<string, Partial<CondSplit>>
    note?: string
  }) => void
  /** H3-A05 — a changed quantity or split invalidates that row's stored lot
      and admin override; both are meaningless for a different quantity. */
  invalidateBulkLot: (code: string) => void

  /** M7-96…M7-104 — the real post orchestration (H-4). */
  postDocument: (me: Me | null, args: { reason?: string }) => Promise<PostOutcome>

  load: (me: Me | null) => Promise<{ ok: boolean; error: string | null }>
  refresh: (me: Me | null) => Promise<{ ok: boolean; error: string | null }>
  saveDraftNow: (me: Me | null) => void
  restoreDraftOnBoot: (me: Me | null) => { restored: boolean; dropped: number; ts: number | null; skipped: boolean }
  reset: () => void
}

/** Legacy `crypto.randomUUID()` with a manual fallback — index.html:3193-3198. */
function newRequestKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function deriveCore(args: {
  items: ItemRow[]
  movements: Awaited<ReturnType<typeof fetchItemMovements>>['rows']
  warehouseRows: { name: string; type: string | null; active: boolean | null }[]
  partnerRows: { name: string; active: boolean }[]
  condRows: Awaited<ReturnType<typeof fetchStockConditions>>['rows']
}): CoreSnapshot {
  const indexes = buildItemIndexes(args.items, args.movements)
  const warehouses = args.warehouseRows
    .filter((w) => w.active !== false && w.type === 'anbar')
    .map((w) => w.name)
  const locations: LocationEntry[] = args.warehouseRows
    .filter((w) => w.type !== 'anbar')
    .map((w) => ({ name: w.name, kind: w.type ?? '', active: w.active !== false }))
  const partners: PartnerEntry[] = args.partnerRows.map((p) => ({ name: p.name, active: p.active !== false }))
  return {
    items: args.items,
    itemBy: new Map(args.items.map((i) => [i.code, i])),
    indexes,
    warehouseRows: args.warehouseRows,
    warehouses,
    locations,
    partners,
    condByKey: toCondMap(args.condRows),
  }
}

/** Removes the persisted draft — the legacy `clearDraft()` (index.html:3781).
    Storage failures are swallowed: a quota/disabled-storage error must never
    turn a successful post into a visible error. */
function clearStoredDraft(me: Me | null): void {
  try { localStorage.removeItem(draftKey(me?.id)) } catch { /* ignore */ }
}

/** Balance lookup the validator/bucket maths consumes — IX.bal for one w+c. */
function balanceOf(indexes: ItemIndexes, w: string, c: string): number {
  const row = indexes.bal.find((b) => b.w === w && b.c === c)
  return row ? row.q : 0
}

export const useOperationStore = create<OperationState>((set, get) => ({
  core: emptyCoreSnapshot(),
  readiness: {
    loaded: false,
    coreError: null,
    failedCore: null,
    splitReady: false,
    layerActive: false,
    refsReady: false,
    transferDestsReady: false,
  },
  loading: false,

  refsReady: false,
  channels: [],
  observedChannels: [],
  layerActive: false,
  layerVersion: 0,
  transferDests: [],
  transferDestsReady: false,

  kind: 'in',
  header: emptyHeader(),
  headerByKind: {},
  lines: [],
  pick: null,
  pendingPrefill: null,
  requestKey: '',
  editDoc: null,
  restoredAt: null,
  inFlight: false,

  bulkOpen: false,
  bulkMode: 'wo',
  bulkQuery: '',
  bulkSel: new Map(),
  bulkSplit: new Map(),
  bulkLots: new Map(),
  bulkValues: new Map(),
  bulkNote: '',
  bulkIcareOk: false,

  editLineIndex: null,
  editLineDraft: null,

  layerPickerOpen: false,
  layerPickerCode: null,
  layerPickerWarehouse: null,

  /* M7-03 — switching tabs captures the outgoing header (M7-05) and restores
     the incoming tab's own header only when it was captured under the SAME
     kind; otherwise a blank header is used. Every tab switch invalidates the
     request key (M7-106). */
  setKind: (k) => set((s) => {
    if (k === s.kind) return s
    const headerByKind = { ...s.headerByKind, [s.kind]: s.header }
    const restored = headerByKind[k]
    return {
      kind: k,
      header: restored ?? emptyHeader(),
      headerByKind,
      requestKey: '',
    }
  }),

  setHeaderField: (patch) => set((s) => ({ header: { ...s.header, ...patch }, requestKey: '' })),

  /* M7-23 — changing the source warehouse on out/mv clears the picked item,
     because the stock filter now describes a different warehouse; `in` keeps
     the selection. Left to the caller (the form) to invoke via setHeaderField
     followed by setPick(null) — this action only records the pick itself. */
  setPick: (code) => set({ pick: code }),

  /* prefill(code) — M5-55 / M7-115. Sets the pending pick independently of any
     component being mounted; NewOperationPage applies it through the same
     pickItem() logic the combobox uses (proposal §8). Navigation to `op` is
     App.tsx's job.

     `pendingPrefill` is set ALONGSIDE `pick` so the form can tell a prefill
     apart from an ordinary combobox selection and finish applying it once the
     snapshot resolves the code — see the field's own comment. */
  prefill: (code) => set({ pick: code, pendingPrefill: code }),

  consumePrefill: () => set({ pendingPrefill: null }),

  invalidateRequestKey: () => set({ requestKey: '' }),

  ensureRequestKey: () => {
    const cur = get().requestKey
    if (cur) return cur
    const key = newRequestKey()
    set({ requestKey: key })
    return key
  },

  /* Committing a line clears the selection AND any unconsumed prefill: the
     request has been spent, and leaving it standing would re-select the item
     the user just added. */
  addLineRaw: (line) => set((s) => ({ lines: [...s.lines, line], requestKey: '', pick: null, pendingPrefill: null })),

  removeLine: (index) => set((s) => ({
    lines: s.lines.filter((_, i) => i !== index),
    requestKey: '',
  })),

  clearLines: () => set({ lines: [], requestKey: '', restoredAt: null }),

  setInFlight: (v) => set({ inFlight: v }),

  /* M7-46 — a layered line (one carrying `allocations`) cannot be opened for
     edit; the caller is expected to have refused before calling this. */
  openEditLine: (index) => set((s) => {
    const line = s.lines[index]
    if (!line) return s
    return { editLineIndex: index, editLineDraft: { ...line } }
  }),

  closeEditLine: () => set({ editLineIndex: null, editLineDraft: null }),

  /* saveEditLine — M7-49. The caller (the dialog) has already run
     validateOpLine({skipIndex}) and only calls this on success; this action
     just commits the working copy and invalidates the request key. */
  saveEditLine: (line) => set((s) => {
    if (s.editLineIndex == null) return s
    const lines = s.lines.slice()
    lines[s.editLineIndex] = line
    return { lines, editLineIndex: null, editLineDraft: null, requestKey: '' }
  }),

  /* enterEditMode — M7-109. Loads a document's lines into the form, sets
     editDoc with its restore map, switches the tab to the document's
     direction and seeds the header.

     THE HEADER MERGE STARTS FROM AN EMPTY HEADER, NOT THE CURRENT ONE (I-6).
     It previously merged over `s.header`, so any field the caller omitted
     SURVIVED from whatever the user had typed before entering edit mode — a
     previous draft's Qaimə №, contract, note or price leaking into the
     corrected document and reaching `correct_document` as if it belonged to
     it. Legacy assigns a WHOLE `OP.hdr` object (index.html:5195-5196) and so
     has no such carry-over. `emptyHeader()` restores that: a field the caller
     does not supply is blank, never inherited.

     `headerByKind` is deliberately NOT consulted either — the per-tab capture
     (M7-05) exists to restore what the user was composing, and a corrected
     document's header comes from the DOCUMENT.

     The persisted draft is not cleared here and must not be: `shouldSaveDraft`
     returns false in edit mode, so the very next `saveDraftNow` (which the
     page runs on every `lines` change) REMOVES the stored key. Clearing here
     as well would delete a draft on a path that can still be refused. */
  enterEditMode: (doc, lines, header) => set(() => ({
    editDoc: doc,
    lines,
    kind: (doc.direction === 'mv' ? 'mv' : doc.direction === 'out' ? 'out' : 'in') as OpKind,
    header: { ...emptyHeader(), ...header },
    requestKey: '',
    restoredAt: null,
  })),

  exitEditMode: () => set({
    editDoc: null,
    lines: [],
    requestKey: '',
    restoredAt: null,
  }),

  setBulkOpen: (v) => set({ bulkOpen: v }),

  /* H3-A05 — OPENING the list is the only thing that clears the draft, exactly
     as the legacy `bulkWriteOffOpen` does (index.html:4120-4124): search,
     selection, splits, lots, overrides and the İcarə acknowledgement all
     reset, and the shared note is seeded from the document note. Returning
     from the layer picker deliberately does NOT come through here. */
  openBulk: (mode, note) => set({
    bulkOpen: true,
    bulkMode: mode,
    bulkQuery: '',
    bulkSel: new Map(),
    bulkSplit: new Map(),
    bulkLots: new Map(),
    bulkValues: new Map(),
    bulkNote: note,
    bulkIcareOk: false,
  }),

  setBulkDraft: (patch) => set((s) => ({
    bulkQuery: patch.query ?? s.bulkQuery,
    bulkSel: patch.sel ?? s.bulkSel,
    bulkSplit: patch.split ?? s.bulkSplit,
    bulkNote: patch.note ?? s.bulkNote,
  })),

  invalidateBulkLot: (code) => set((s) => {
    if (!s.bulkLots.has(code) && !s.bulkValues.has(code)) return {}
    const bulkLots = new Map(s.bulkLots)
    const bulkValues = new Map(s.bulkValues)
    bulkLots.delete(code)
    bulkValues.delete(code)
    return { bulkLots, bulkValues }
  }),

  /* postDocument() — the real orchestration, index.html:4686-4872 (H-4).

     ORDER, and why each step is where it is:

       1. `canPost` — the SINGLE gate (M7-S5). The panel button, the confirm
          dialog and this handler all read the same value; this is the third
          reading of the same rule, not a fourth competing rule.
       2. the in-flight lock, set BEFORE the first await and released in a
          `finally` (M7-108). A second click while in flight calls nothing:
          `canPost` is false because `inFlight` is true.
       3. the layer/edit-mode refusal (4687-4690) and the Admin-only historical
          opening-balance refusal (4695-4698) — both are session-race guards,
          not primary validation.
       4. the stale-response re-check (M7-96).
       5. edit mode → `correct_document` and return (M7-97).
       6. the layer-mixing refusals (M7-98) and the split-support refusals.
       7. routing (M7-101) and the two sequential calls (M7-103).
       8. success cleanup (M7-104).

     Nothing here toasts or navigates: the page owns presentation. Every write
     goes through the API layer, which consults `blockedReason` itself
     (M7-122) — the disabled button is never the only guard. */
  postDocument: async (me, args) => {
    const s0 = get()
    /* The SAME gate, read once. */
    if (!selectCanPost(s0, me)) {
      return { kind: 'refused', message: 'Sənəd qeyd edilmədi.' } as PostOutcome
    }

    set({ inFlight: true })
    try {
      const s = get()

      /* 4687-4690 — a layer-accounted document is not corrected in place. */
      if (s.layerActive && s.editDoc) {
        return {
          kind: 'refused',
          message: 'Partiya uçotunda keçirilmiş sənəd birbaşa dəyişdirilmir — ləğv edib düzgün partiyalarla yenisini yaradın.',
        }
      }

      /* 4695-4698 — the role can change mid-session, so the client rule is
         re-checked here even though addLine already refused it. The whole
         document is refused: this is a permission violation, not a stock race.
         The binding ban is the server's (sql/016). */
      if (!roleIsAdmin(me) && s.lines.some((l) => isInitialBalanceLine(l.t, l.p, l.ch))) {
        return { kind: 'refused', message: `${INIT_BAL_ADMIN_ONLY_MSG} Sənəd qeyd edilmədi.` }
      }

      /* ---- M7-96: recompute availability immediately before writing ---- */
      const verdict = staleRecheck(
        s.lines,
        (w, c) => balanceOf(s.core.indexes, w, c),
        (w, c) => editRestoreQty(s.editDoc?.restore, w, c),
      )
      if (verdict.outcome === 'abort' || verdict.outcome === 'empty') {
        /* The draft is untouched in both cases — `staleRecheck` copies rather
           than mutates, and nothing has been committed here. */
        return { kind: 'refused', message: verdict.message }
      }
      const lines = verdict.lines
      const notice = verdict.message
      if (verdict.changed) {
        /* Lines were dropped or trimmed, so the document being sent is not the
           one the key was computed for — M7-106. The key is invalidated and,
           for the layer routes, a fresh one is generated below. */
        set({ lines, requestKey: '' })
      }

      /* ---- M7-97: edit mode is its own transaction ---- */
      if (s.editDoc) {
        if (lines.some((l) => l.kind === 'mv')) {
          return { kind: 'refused', message: 'Yerdəyişmə sətri düzəliş sənədinə əlavə edilə bilməz.' }
        }
        const reason = String(args.reason ?? '').trim()
        if (!reason) return { kind: 'refused', message: 'Düzəlişin səbəbi tələb olunur.' }

        const doc = s.editDoc.docNum
        const n = lines.length
        const correction = useCorrectionStore.getState()

        /* D6 — REPEAT PROTECTION, checked in the STORE so no caller can route
           around a disabled button. An unresolved earlier attempt on THIS
           document blocks a second one across dialog close/reopen and reload. */
        if (correction.persistenceError) {
          return { kind: 'refused', message: correction.persistenceError }
        }
        const blocking = correction.blockingFor(doc)
        if (blocking) {
          return { kind: 'refused', message: correctionBlockedMessage(doc) }
        }
        if (correction.isPending(doc)) {
          return { kind: 'refused', message: correctionBlockedMessage(doc) }
        }

        /* Persisted BEFORE dispatch: a reload between the request and its
           answer must not grant permission to resend. A record that cannot be
           persisted refuses the dispatch outright. */
        const attemptId = correction.beginAttempt(doc, n)
        if (attemptId == null) {
          return {
            kind: 'refused',
            message: useCorrectionStore.getState().persistenceError ?? CORRECTION_UNPROTECTED,
          }
        }
        correction.beginPending(doc)

        let res: Awaited<ReturnType<typeof correctDocument>>
        try {
          res = await correctDocument(
            doc,
            lines.map((l) => toCorrectionPayload(l as unknown as DraftOpLine)),
            reason,
          )
        } finally {
          useCorrectionStore.getState().endPending(doc)
        }

        if (!res.ok) {
          /* The guard refused before any network call, so nothing was sent and
             the document is genuinely untouched. That is the ONE failure the
             client can speak about with certainty. */
          if (res.blocked) {
            useCorrectionStore.getState().clearUnresolved(attemptId)
            return {
              kind: 'refused',
              message: correctionRejectedMessage(res.error ?? 'server xətası', doc),
            }
          }
          const verdictKind = classifyCorrectionFailure({
            message: res.error ?? '',
            status: res.status,
            code: res.code,
          })
          if (verdictKind === 'rejected') {
            /* POSITIVE EVIDENCE that the server saw and refused the statement:
               the document is unchanged, the draft is kept, and the record is
               cleared because nothing is left unresolved. */
            useCorrectionStore.getState().clearUnresolved(attemptId)
            return {
              kind: 'refused',
              message: correctionRejectedMessage(res.error ?? 'server xətası', doc),
            }
          }
          /* UNKNOWN. The correction may have committed. The record stays and
             blocks a repeat; the draft is KEPT so nothing the admin typed is
             lost while they reconcile. Edit mode is deliberately left ON:
             exiting it would suggest the attempt is over. */
          useCorrectionStore.getState().setPhase(attemptId, 'unknown')
          return {
            kind: 'correction-unknown',
            message: correctionUnknownMessage(res.error ?? 'server xətası', doc),
          }
        }

        /* A 2xx is necessary, not sufficient — validate the body against the
           CORRECTION contract (never the batch validator, whose count and
           `results` keys this RPC does not emit). */
        const valid = validateCorrectionBody(res.data, doc)
        if (!valid.ok) {
          useCorrectionStore.getState().setPhase(attemptId, 'unknown')
          return {
            kind: 'correction-unknown',
            message: correctionUnknownMessage(valid.reason, doc),
          }
        }

        const newDocNum = valid.body.newDocNum
        /* The write is CONFIRMED. The record is moved to `success` and keeps
           `reconciled:false`, so it goes on BLOCKING a second correction of
           this document for the whole of the reload below — during which the
           screen still shows the pre-correction rows. Releasing the block here
           (the pre-fix behaviour) opened a window in which the admin, looking
           at an apparently uncorrected document, could correct it again. */
        useCorrectionStore.getState().setPhase(attemptId, 'success', { newDocNum })
        set({
          editDoc: null,
          lines: [],
          requestKey: '',
          restoredAt: null,
          header: { ...get().header, iv: '', ct: '' },
        })
        clearStoredDraft(me)
        /* `load()` is NOT exception-safe: only its `fetchWarehouses` leg has a
           rejection handler, so any other reader that REJECTS (rather than
           returning `ok:false`) propagates out of this `await`. Unguarded,
           that threw past every line below — the record was left at
           `success`/not-reconciled with no outcome reported, and the caller
           saw a raw rejection for a correction that had actually committed.
           A throw is treated as exactly what it is: a failed refresh over a
           confirmed write. */
        let reload: { ok: boolean; error: string | null }
        try {
          reload = await get().load(me)
        } catch (err) {
          reload = { ok: false, error: err instanceof Error ? err.message : 'Naməlum xəta' }
        }
        /* `load()` reports `ok` from `folded.loaded`, which STAYS TRUE when a
           previous snapshot exists — the M8-45 rule that a failed refresh
           keeps the old rows rather than blanking the screen. So `ok` alone
           cannot detect a failed post-write refresh: the honest signal is
           `coreError`, which is set on every failed core read regardless of
           whether a snapshot survived. Reading only `ok` here would report a
           confirmed success over a stale list with no warning. */
        if (!reload.ok || reload.error != null) {
          /* Committed, but the screen cannot prove it. The record is KEPT with
             `refreshFailed` and still NOT reconciled, so a second correction of
             this document is still refused until the list is readable again. */
          useCorrectionStore.getState().setPhase(attemptId, 'success', {
            newDocNum,
            refreshFailed: true,
          })
          return {
            kind: 'correction-stale',
            message: correctionRefreshFailedMessage(doc, newDocNum),
          }
        }
        /* Confirmed AND reconciled — the only path that clears the record.
           `reconciled` is written before the clear so that a storage failure
           inside `clearUnresolved` leaves behind a record that is correctly
           marked non-blocking rather than one that blocks a document already
           known to be corrected. */
        useCorrectionStore.getState().setPhase(attemptId, 'success', {
          newDocNum,
          refreshFailed: false,
          reconciled: true,
        })
        useCorrectionStore.getState().clearUnresolved(attemptId)
        return {
          kind: 'corrected',
          message: correctionSuccessMessage(doc, newDocNum, valid.body.rowCount ?? n),
        }
      }

      /* ---- routing ---- */
      const { mvLines, other } = splitByRoute(lines)

      /* M7-98 — with layers active a transfer and anything else cannot share
         one document: the two RPCs each own the whole allocation set. */
      if (s.layerActive && mvLines.length && other.length) {
        return {
          kind: 'refused',
          message: 'Partiyalı rejimdə yerdəyişmə və digər əməliyyatlar bir sənəddə qarışdırıla bilməz.',
        }
      }

      let writtenDocNum: string | null = null
      let rowCount = 0

      if (mvLines.length) {
        const payload = mvLines.map((l) => toTransferPayload(l as unknown as DraftOpLine))
        /* A split the server cannot store would be silently ignored and the
           goods would arrive unmarked — blocked, never passed through. */
        if (payload.some((p) => p.conditions) && !s.readiness.splitReady) {
          return { kind: 'refused', message: SPLIT_UNSUPPORTED_MSG }
        }
        if (s.layerActive && mvLines.some((l) => !Array.isArray(l.allocations) || !l.allocations.length)) {
          return {
            kind: 'refused',
            message: 'Yerdəyişmə qeyd edilmədi: Partiya seçilməyib — sətri silib yenidən əlavə edin',
          }
        }
        /* M7-101 — layers active uses the layer route WITH the request key;
           the non-layer route has no key parameter at all (M7-107). */
        const res = s.layerActive
          ? await postLayerTransferDocument(payload, get().ensureRequestKey())
          : await postTransferDocument(payload)
        if (!res.ok) {
          /* M7-102 — lines untouched, server message verbatim, legacy prefix. */
          return { kind: 'refused', message: `Yerdəyişmə qeyd edilmədi: ${res.error ?? 'server xətası'}` }
        }
        writtenDocNum = res.docNum
        rowCount += res.rowCount
      }

      if (other.length) {
        const payload = other.map((l) => toMovementPayload(l as unknown as DraftOpLine))
        if (payload.some((p) => p.conditions) && !s.readiness.splitReady) {
          /* M7-103 — if the transfer leg already succeeded, saying "nothing
             was written" would be false. */
          return mvLines.length
            ? { kind: 'partial', message: SPLIT_UNSUPPORTED_MSG, writtenDocNum }
            : { kind: 'refused', message: SPLIT_UNSUPPORTED_MSG }
        }
        /* M7-101 — a LAYERED movement post is outbound only. */
        const isLayerOut = s.layerActive && other.some((l) => l.kind !== 'in')
        let refusal: string | null = null
        if (isLayerOut && other.some((l) => l.kind === 'in')) {
          refusal = 'Mədaxil və məxaric partiyalı rejimdə eyni sənəddə qarışdırıla bilməz'
        } else if (isLayerOut && other.some((l) => !Array.isArray(l.allocations) || !l.allocations.length)) {
          refusal = 'Partiya seçilməyib — sətiri silib «Malları seç» vasitəsilə yenidən əlavə edin'
        }
        const res = refusal
          ? { ok: false as const, error: refusal, docNum: null, rowCount: 0 }
          : isLayerOut
            ? await postLayerMovementDocument(payload, get().ensureRequestKey())
            : await postMovementDocument(payload)
        if (!res.ok) {
          const message = `Əməliyyat qeyd edilmədi: ${res.error ?? 'server xətası'}`
          return mvLines.length
            ? { kind: 'partial', message, writtenDocNum }
            : { kind: 'refused', message }
        }
        writtenDocNum = writtenDocNum ?? res.docNum
        rowCount += res.rowCount
      }

      /* ---- M7-104: success cleanup ---- */
      const n = lines.length
      set({
        lines: [],
        requestKey: '',
        restoredAt: null,
        /* Date and warehouse are RETAINED so the next document continues the
           same session; the invoice and contract numbers belong to the
           document just written and are blanked. */
        header: { ...get().header, iv: '', ct: '' },
      })
      clearStoredDraft(me)
      await get().load(me)
      return {
        kind: 'posted',
        message: `${nf(n)} sətir qeyd edildi`,
        notice,
        rowCount: rowCount || n,
      }
    } finally {
      /* Released on EVERY path — refusal, thrown error or success (M7-108). */
      set({ inFlight: false })
    }
  },

  /* load() — atomic over the five core reads only (T4, proposal §5.3).
     Any core read failing — including a PARTIAL page failure, per M7-S2 —
     yields `loaded:false` (unless a previous good snapshot exists, in which
     case it is RETAINED per M7-S6) and an explicit error. No partial dataset
     is ever committed: the five reads are awaited together and folded through
     foldCoreReads() BEFORE any set() touches `core`.

     The four optional probes run independently and never gate the core
     commit — a failed probe only changes its own readiness flag, exactly as
     the matrix (T2b) prescribes. */
  load: async (_me) => {
    set({ loading: true })
    const wasLoaded = get().readiness.loaded

    const [itemsRes, movementsRes, warehouseRows, partnersRes, condRes] = await Promise.all([
      fetchItems(),
      fetchItemMovements(),
      fetchWarehouses().then(
        (rows) => ({ rows: rows.map((w) => ({ name: w.name, type: w.type, active: w.active })), ok: true, error: null as string | null }),
        (err) => ({ rows: [] as { name: string; type: string | null; active: boolean | null }[], ok: false, error: err instanceof Error ? err.message : 'Naməlum xəta' }),
      ),
      readPartners(),
      fetchStockConditions(),
    ])

    const coreResults: Record<string, ReadResult<unknown>> = {
      items: { rows: itemsRes.rows, ok: itemsRes.ok, error: itemsRes.error },
      movements: { rows: movementsRes.rows, ok: movementsRes.ok, error: movementsRes.error },
      warehouses: { rows: warehouseRows.rows, ok: warehouseRows.ok, error: warehouseRows.error },
      partners: { rows: partnersRes.rows, ok: partnersRes.ok, error: partnersRes.error, partial: partnersRes.partial },
      stock_conditions: { rows: condRes.rows, ok: condRes.ok, error: condRes.error, partial: condRes.partial },
    }
    const folded = foldCoreReads(coreResults, wasLoaded)

    /* The four optional probes — run regardless of the core result, since a
       core failure must not prevent the screen from later recovering readable
       readiness state once the user retries. They never affect `folded`. */
    const [refsRes, splitReady, layerCap, transferDestsRes] = await Promise.all([
      fetchReferenceValues(),
      fetchSplitSupported(),
      fetchLayerCapability(),
      fetchTransferDestinations(warehouseRows.ok ? warehouseRows.rows.filter((w) => w.active !== false && w.type === 'anbar').map((w) => w.name) : []),
    ])

    const patch: Partial<OperationState> = {
      loading: false,
      readiness: {
        loaded: folded.loaded,
        coreError: folded.coreError,
        failedCore: folded.failedCore,
        splitReady,
        layerActive: layerCap.active,
        refsReady: refsRes.ready,
        transferDestsReady: transferDestsRes.ok,
      },
      refsReady: refsRes.ready,
      channels: refsRes.values.channel,
      /* A04 — the legacy fallback (index.html:3214, `normalMovements().map(m
         => m.ch)`) derives observed channels from the movement's CHANNEL
         field, not its operation type. Cancelled/hidden rows are excluded
         first, exactly as `normalMovements()` does. */
      observedChannels: Array.from(
        new Set(excludeCancelled(movementsRes.rows).map((m) => m.channel ?? '')),
      ).filter(Boolean),
      layerActive: layerCap.active,
      layerVersion: layerCap.version,
      transferDests: transferDestsRes.names,
      transferDestsReady: transferDestsRes.ok,
    }

    /* M7-S6 — a failed refresh after a good load keeps the PREVIOUS snapshot.
       `folded.loaded` is true in BOTH the "fresh success" and the "retained
       after failure" case (previouslyLoaded), so `coreError` — not `loaded`
       — is what tells them apart: only a genuinely fresh, error-free read may
       overwrite `core`. `core` is simply omitted from the patch otherwise, so
       Zustand's shallow merge leaves the existing snapshot in place. */
    if (folded.loaded && folded.coreError == null) {
      patch.core = deriveCore({
        items: itemsRes.rows,
        movements: movementsRes.rows,
        warehouseRows: warehouseRows.rows,
        partnerRows: partnersRes.rows.map((p) => ({ name: (p as { name: string }).name, active: (p as { active?: boolean }).active !== false })),
        condRows: condRes.rows,
      })
    }

    set(patch)
    return { ok: folded.loaded, error: folded.coreError }
  },

  /* refresh() — identical to load() by design, exactly like Phase 6's
     fetchItemGroupsSnapshot()/refresh() pairing: named separately because a
     future change to the reload path is a deliberate change to both. */
  refresh: (me) => get().load(me),

  /* saveDraftNow — M7-51/M7-52. Edit mode never writes a draft (opDraft's
     shouldSaveDraft refuses); this is a no-op there rather than a silent
     write, matching the legacy guard. Storage failures are swallowed — a
     quota error must not break the screen. */
  saveDraftNow: (me) => {
    const s = get()
    const editMode = s.editDoc != null
    if (!shouldSaveDraft(s.lines, editMode)) {
      try { localStorage.removeItem(draftKey(me?.id)) } catch { /* ignore */ }
      return
    }
    const payload = serialiseDraft({
      kind: s.kind,
      lines: s.lines as unknown as DraftLine[],
      hdr: s.header,
      requestKey: s.requestKey,
    })
    try {
      localStorage.setItem(draftKey(me?.id), JSON.stringify(payload))
    } catch {
      /* quota or storage-disabled — swallowed, matching the legacy behaviour */
    }
  },

  /* restoreDraftOnBoot — M7-53/M7-54. Only meaningful when `lines` is empty;
     the caller (the page, on mount) is responsible for calling this once. The
     permission re-filter uses allowedWarehouses ∪ sourceWarehouses via
     restoreDraft()'s own `allowedWarehouses` argument — the store passes the
     UNION so a transfer-source-only warehouse is not wrongly dropped.

     A08 — the permission re-filter is only MEANINGFUL against a healthy core
     snapshot. Without one, `core.warehouses` is empty, every stored line
     classifies as `no-permission`, and the `no-permission` branch below would
     DELETE the stored draft — turning a temporary read failure into permanent
     local data loss. So a missing/failed core snapshot returns
     `skipped:true` and touches neither the store nor localStorage; the draft
     survives for a later retry or remount. */
  restoreDraftOnBoot: (me) => {
    const s = get()
    if (!s.readiness.loaded || s.readiness.coreError != null) {
      return { restored: false, dropped: 0, ts: null, skipped: true }
    }
    if (s.lines.length > 0) return { restored: false, dropped: 0, ts: null, skipped: true }
    let raw: string | null = null
    try {
      raw = localStorage.getItem(draftKey(me?.id))
    } catch {
      return { restored: false, dropped: 0, ts: null, skipped: false }
    }
    const allowed = new Set([
      ...allowedWarehouses(me, s.core.warehouses),
      ...transferSourceWarehouses(me, s.core.warehouses),
    ])
    const res = restoreDraft(raw, Array.from(allowed))
    if (!res.ok) {
      if (res.reason !== 'absent') {
        try { localStorage.removeItem(draftKey(me?.id)) } catch { /* ignore */ }
      }
      return { restored: false, dropped: 0, ts: null, skipped: false }
    }
    set({
      kind: res.kind as OpKind,
      lines: res.lines as unknown as DraftOpLineState[],
      header: (res.hdr as OpHeader) ?? emptyHeader(),
      requestKey: res.requestKey,
      restoredAt: res.ts,
    })
    return { restored: true, dropped: res.dropped, ts: res.ts, skipped: false }
  },

  reset: () => set({
    kind: 'in',
    header: emptyHeader(),
    headerByKind: {},
    lines: [],
    pick: null,
    pendingPrefill: null,
    requestKey: '',
    editDoc: null,
    restoredAt: null,
    inFlight: false,
    bulkOpen: false,
    bulkMode: 'wo',
    bulkQuery: '',
    bulkSel: new Map(),
    bulkSplit: new Map(),
    bulkLots: new Map(),
    bulkValues: new Map(),
    bulkNote: '',
    bulkIcareOk: false,
    editLineIndex: null,
    editLineDraft: null,
  }),
}))

/* ---------- selectors the page/form consume ---------- */

/** `canPost`/`postBlockReason` — the SINGLE gate from T2b (M7-S5). No second
    condition is added here or anywhere else. */
export function selectCanPost(s: OperationState, me: Me | null): boolean {
  return computeCanPost({
    readiness: s.readiness,
    lines: s.lines as unknown as EligibilityLine[],
    canAdd: can(me, 'mv.add'),
    inFlight: s.inFlight,
  })
}

export function selectPostBlockReason(s: OperationState, me: Me | null): PostBlockReason | null {
  return computePostBlockReason({
    readiness: s.readiness,
    lines: s.lines as unknown as EligibilityLine[],
    canAdd: can(me, 'mv.add'),
    inFlight: s.inFlight,
  })
}

/** D-H1 — transfer source/destination options, narrowed for an anbardar. */
export function selectTransferSources(s: OperationState, me: Me | null): string[] {
  return transferSourceWarehouses(me, s.core.warehouses)
}

export function selectTransferDests(s: OperationState, me: Me | null): string[] {
  return transferDestWarehouses(me, s.transferDests)
}

export function selectAllowedWarehouses(s: OperationState, me: Me | null): string[] {
  return allowedWarehouses(me, s.core.warehouses)
}

export function selectBalance(s: OperationState, w: string, c: string): number {
  return balanceOf(s.core.indexes, w, c)
}

export function selectCondOf(s: OperationState, w: string, c: string): CondRecord | null {
  return s.core.condByKey.get(`${w}|${c}`) ?? null
}

export function selectCondPending(s: OperationState, w: string, c: string) {
  return condPendingOf(s.lines as unknown as { kind: string; w: string; c: string; cond?: Partial<CondSplit> | null }[], w, c)
}

export { emptyHeader, DRAFT_MAX_LINES, roleIsAdmin }
