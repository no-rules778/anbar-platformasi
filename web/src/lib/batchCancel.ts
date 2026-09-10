import {
  CANCELLABLE_TYPES,
  docCancelledBy,
  docReversalDoc,
  stripRowLevelCancelled,
  type CancelStateMovement,
} from './documentCancelState'
import type { MovementFilterItem, MovementFilterRow } from './movementFilters'
import { routeOrPartner } from './movementRoute'

/* BATCH CANCELLATION — «Qrup üzrə ləğv», Phase 8 milestone I-5 (M8-30, M8-31).

   Ported from index.html:5313-5403: `buildBatchDocs()` (grouping and the
   seven-step eligibility ladder) and `batchFilterDocs()` (the six filters).

   PURE. No React, no Supabase, no store, no DOM. The outcome model, the
   transport and the dialog live elsewhere; this module only decides what a
   document IS and whether it may be selected.

   THE CLIENT MATRIX MIRRORS THE SERVER. `cancel_documents_batch` validates
   every selected document itself and raises on the first refusal, aborting the
   whole batch. This module exists so a document the server will certainly
   refuse is never offered for selection — it is NOT the security boundary, and
   the RPC stays authoritative.

   TWO SERVER CONDITIONS HAVE NO CLIENT-MATRIX COUNTERPART: the non-layer RPC
   rejects a duplicate `doc_num` (the layer RPC applies `DISTINCT`), while
   «document not found» cannot be anticipated from a snapshot the client itself
   read. The payload builder dedupes defensively for one stable contract across
   both capability branches (`selectedDocNums()`), and the server's own text is
   surfaced for the rest. */

/** A movement as the batch builder reads it — the registry row unchanged. */
export type BatchMovement = MovementFilterRow

/** One line of a document, as the confirm step lists it. */
export interface BatchDocDetail {
  code: string
  name: string
  /** The transfer route, or the warehouse for an ordinary document. */
  whRoute: string
  qty: number
  unit: string
  price: number
}

/** One grouped document — the unit of selection. */
export interface BatchDoc {
  /** `'doc:'+doc` or `'legacy:'+id`. The selection key; never the doc number,
      because doc-less rows must not collide. */
  key: string
  /** The document number EXACTLY as stored — never trimmed, never normalised.
      This is the string sent to the server. Empty for a doc-less row. */
  doc: string
  legacy: boolean
  /** The EARLIEST row date, which is what the date filter compares. */
  date: string
  types: string[]
  typeLabel: string
  isTransfer: boolean
  route: string
  lines: number
  totQty: number
  by: string
  codes: string[]
  names: string[]
  whs: string[]
  details: BatchDocDetail[]
  eligible: boolean
  /** The reason text, shown for ineligible documents rather than hiding them. */
  status: string
}

/** The lookups `buildBatchDocs()` needs that a pure module cannot import. */
export interface BatchBuildContext {
  /** `DB.itemBy` — code → nomenclature row, for names, units and prices. */
  itemBy: Map<string, MovementFilterItem>
  /** The known warehouse list, for `routeOrPartner()`. */
  warehouses: string[]
}

/* The reversal test — index.html:5327 plus the server's numbered counter for
   a cancelled doc-less transfer pair. It matches ordinary document reversal,
   numbered transfer reversal and legacy-transfer `... ID:` reversal markers
   on the TRIMMED note. Every one is terminal and must be unselectable. */
const REVERSAL_ANY = /^Ləğv(?::| \(əks yerdəyişmə\)(?::| ID:))/

/* Legacy status texts — index.html:5364-5372, verbatim. */
export const BATCH_STATUS_REVERSAL = 'Əks/ləğv sənədi — ləğv edilmir'
export const BATCH_STATUS_LEGACY = 'Köhnə (sənədsiz) qeyd — yalnız fərdi ləğv'
export const BATCH_STATUS_MIXED = 'Qarışıq sənəd — dəstəklənmir'
export const BATCH_STATUS_TRANSFER_OK = 'Yerdəyişmə — ləğv edilə bilər'
export const BATCH_STATUS_OK = 'Ləğv edilə bilər'
export const BATCH_STATUS_UNSUPPORTED = 'Dəstəklənməyən növ — ləğv edilmir'
export const batchStatusCancelled = (by: string): string =>
  'Artıq ləğv edilib (' + by + ')'

const note = (m: { note?: string | null }): string => String(m.note ?? '')

/**
 * `buildBatchDocs()` — index.html:5314-5372.
 *
 * Groups every movement by document, then classifies each group. The order of
 * the ladder is legacy's and is preserved exactly, first match winning:
 *
 *   1. any row is a reversal marker      → ineligible, «əks/ləğv sənədi»
 *   2. doc-less                          → ineligible, individual cancel only
 *   3. already cancelled                 → ineligible, names the reversal doc
 *   4. transfer AND non-transfer rows    → ineligible, mixed
 *   5. pure transfer                     → ELIGIBLE
 *   6. exactly one type, in CANCELLABLE  → ELIGIBLE
 *   7. otherwise                         → ineligible, unsupported type
 *
 * Order is load-bearing: a doc-less row that is also a reversal must report
 * «reversal», not «doc-less», exactly as legacy reports it.
 *
 * INELIGIBLE DOCUMENTS ARE RETURNED, NOT DROPPED. The dialog lists them with
 * their reason. Hiding them would make an ineligible document indistinguishable
 * from a filter miss. The ONE exception is legacy's own: a group whose every
 * line was row-level cancelled or replaced disappears entirely (5330), because
 * nothing of it remains to cancel.
 */
export function buildBatchDocs(
  movements: BatchMovement[],
  ctx: BatchBuildContext,
): BatchDoc[] {
  const byDoc = new Map<string, { key: string; doc: string; legacy: boolean; rows: BatchMovement[] }>()

  for (const m of movements) {
    /* Doc-less rows are never merged into a synthetic document: each keeps its
       own `legacy:<id>` group so it stays visible in search but unselectable. */
    const docNum = m.doc_num || ''
    const key = docNum ? 'doc:' + docNum : 'legacy:' + String(m.id)
    let g = byDoc.get(key)
    if (!g) {
      g = { key, doc: docNum, legacy: !docNum, rows: [] }
      byDoc.set(key, g)
    }
    g.rows.push(m)
  }

  const all = movements as unknown as CancelStateMovement[]
  const out: BatchDoc[] = []

  for (const g of byDoc.values()) {
    const rows = stripRowLevelCancelled(g.rows, all)
    if (!rows.length) continue

    const types = Array.from(new Set(rows.map((r) => r.type)))
    const isTransfer = types.includes('Yerdəyişmə')
    const hasOther = types.some((t) => t !== 'Yerdəyişmə')
    const isRev = rows.some((r) => REVERSAL_ANY.test(note(r).trim()))

    /* Legacy computes the cancellation marker only for a REAL document, and
       only through the family that matches its types — a transfer reads the
       «əks yerdəyişmə» marker, an ordinary document the «Ləğv:» one, and a
       document with any unsupported type reads neither. */
    const cancelledBy = !g.legacy
      ? isTransfer
        ? docReversalDoc(g.doc, all)
        : types.every((t) => (CANCELLABLE_TYPES as readonly string[]).includes(t))
          ? docCancelledBy(g.doc, all)
          : null
      : null

    /* The EARLIEST date, by string sort — the dates are ISO, and this is what
       both filter bounds compare against. */
    const date = rows.map((r) => r.date).sort()[0] || ''
    const by = (rows[0] && rows[0].created_by) || '—'
    const codes = Array.from(new Set(rows.map((r) => r.item_code)))
    const names = codes.map((c) => ctx.itemBy.get(c)?.name || c)
    const whs = Array.from(new Set(rows.map((r) => r.warehouse).filter((w): w is string => !!w)))

    /* A transfer document is summarised from its OUTGOING rows only, so the
       paired in/out lines are not counted twice. A transfer with no outgoing
       row falls back to every row, exactly as legacy does. */
    let base: BatchMovement[]
    let route: string
    if (isTransfer) {
      const outRows = rows.filter((r) => (r.out_qty || 0) > 0)
      base = outRows.length ? outRows : rows
      route = Array.from(new Set(base.map((r) => routeOrPartner(r, ctx.warehouses)))).join(', ')
    } else {
      base = rows
      route = whs.join(', ')
    }
    const lines = base.length
    const totQty = base.reduce(
      (s, r) => s + (isTransfer ? (r.out_qty || r.in_qty || 0) : (r.in_qty || r.out_qty || 0)),
      0,
    )

    const details: BatchDocDetail[] = base.map((r) => {
      const it = ctx.itemBy.get(r.item_code) || {}
      return {
        code: r.item_code,
        name: it.name || r.item_code,
        whRoute: isTransfer
          ? routeOrPartner(r, ctx.warehouses) || '—'
          : r.warehouse || '—',
        qty: (r.out_qty || r.in_qty) || 0,
        unit: 'ədəd',
        price: r.price || it.price || 0,
      }
    })

    let eligible = false
    let status: string
    if (isRev) status = BATCH_STATUS_REVERSAL
    else if (g.legacy) status = BATCH_STATUS_LEGACY
    else if (cancelledBy) status = batchStatusCancelled(cancelledBy)
    else if (isTransfer && hasOther) status = BATCH_STATUS_MIXED
    else if (isTransfer) {
      eligible = true
      status = BATCH_STATUS_TRANSFER_OK
    } else if (types.length === 1 && (CANCELLABLE_TYPES as readonly string[]).includes(types[0])) {
      eligible = true
      status = BATCH_STATUS_OK
    } else status = BATCH_STATUS_UNSUPPORTED

    out.push({
      key: g.key,
      doc: g.doc,
      legacy: g.legacy,
      date,
      types,
      typeLabel: types.join(', '),
      isTransfer,
      route,
      lines,
      totQty,
      by,
      codes,
      names,
      whs,
      details,
      eligible,
      status,
    })
  }

  /* Newest first, then by document number — legacy's own comparator (5373). */
  out.sort(
    (a, b) =>
      (b.date || '').localeCompare(a.date || '') ||
      (a.doc || a.key).localeCompare(b.doc || b.key),
  )
  return out
}

/** The six filter inputs — index.html:5380-5387. Every one is optional. */
export interface BatchFilters {
  from: string
  to: string
  wh: string
  type: string
  /** Item search: matched against BOTH codes and names, case-insensitively. */
  q: string
  /** Document number substring, case-insensitive. */
  doc: string
}

export const EMPTY_BATCH_FILTERS: BatchFilters = {
  from: '',
  to: '',
  wh: '',
  type: '',
  q: '',
  doc: '',
}

/**
 * `batchFilterDocs()` — index.html:5388-5403.
 *
 * The date bounds are INCLUSIVE and compare the group's EARLIEST row date as a
 * plain string (`< from`, `> to`), which is correct for ISO dates and is
 * exactly what legacy does. A document whose later lines fall outside the range
 * is still matched by its earliest date — deliberate parity.
 *
 * `q` and `doc` are lower-cased substring tests; the caller passes them already
 * trimmed and lower-cased, as legacy does at the input boundary.
 */
export function batchFilterDocs(docs: BatchDoc[], f: BatchFilters): BatchDoc[] {
  return docs.filter((d) => {
    if (f.from && (d.date || '') < f.from) return false
    if (f.to && (d.date || '') > f.to) return false
    if (f.wh && !d.whs.includes(f.wh)) return false
    if (f.type && !d.types.includes(f.type)) return false
    if (f.doc && d.doc.toLowerCase().indexOf(f.doc) < 0) return false
    if (
      f.q &&
      !(
        d.codes.some((c) => c.toLowerCase().indexOf(f.q) >= 0) ||
        d.names.some((n) => (n || '').toLowerCase().indexOf(f.q) >= 0)
      )
    )
      return false
    return true
  })
}

/** Normalises the raw filter inputs the way legacy does at the DOM boundary. */
export function normalizeBatchFilters(raw: Partial<BatchFilters>): BatchFilters {
  return {
    from: raw.from || '',
    to: raw.to || '',
    wh: raw.wh || '',
    type: raw.type || '',
    q: (raw.q || '').trim().toLowerCase(),
    doc: (raw.doc || '').trim().toLowerCase(),
  }
}

/**
 * The type filter's options — index.html:5406.
 *
 * `['Yerdəyişmə'] + CANCELLABLE_TYPES` is the CANCELLABLE set, so a document of
 * an unsupported type cannot be reached through this filter at all: it is only
 * visible with the type filter cleared. That is a legacy quirk, ported
 * faithfully and flagged rather than "improved" — changing it would change
 * which documents a user can find, which is a behaviour change needing
 * approval.
 */
export const BATCH_TYPE_OPTIONS: readonly string[] = ['Yerdəyişmə', ...CANCELLABLE_TYPES]

/**
 * THE SELECTION → PAYLOAD step, and the ONE place eligibility is re-checked
 * before a call — the two-call pattern I-4 established for
 * `rowActionEligibility()`: the render gate and the submit gate are two calls
 * to ONE function, so the rule cannot drift.
 *
 * `docs` must be REBUILT from the CURRENT rows by the caller, not the snapshot
 * captured when the dialog opened. Legacy's bug is exactly this: `BC.docs` is
 * built once (5375) and `renderBatchConfirm()` re-filters on the stale
 * `d.eligible` (5454), so a document cancelled by another admin meanwhile is
 * still submitted — and the server then aborts the WHOLE batch with a message
 * naming a document the user did not touch.
 */
export interface BatchSelectionResult {
  /** The documents still eligible and still selected. */
  eligible: BatchDoc[]
  /** Selected keys whose document is no longer eligible, with the new reason. */
  dropped: { key: string; doc: string; status: string }[]
  /** Selected keys that have vanished from the rows entirely. */
  vanished: string[]
  /** The deduped payload, in the order the server sees it. */
  docNums: string[]
}

/** The refusal shown when nothing eligible remains — index.html:5455. */
export const NO_ELIGIBLE_SELECTION = 'Ləğv üçün etibarlı sənəd seçilməyib'

/**
 * Re-derives the selection against the CURRENT documents.
 *
 * Called twice with the same arguments: once to render the confirm step, once
 * immediately before the RPC. Any document that became ineligible in between is
 * reported in `dropped` so the dialog can name it and require a renewed
 * confirmation — nothing is ever sent silently.
 *
 * The payload preserves the document string EXACTLY as stored and dedupes
 * defensively. The non-layer RPC rejects duplicates while the layer RPC applies
 * `DISTINCT`; the client sends the same stable unique contract to either one,
 * even though a Set-keyed selection makes a duplicate nearly unreachable.
 */
export function resolveBatchSelection(
  docs: BatchDoc[],
  selected: ReadonlySet<string>,
): BatchSelectionResult {
  const byKey = new Map(docs.map((d) => [d.key, d]))
  const eligible: BatchDoc[] = []
  const dropped: { key: string; doc: string; status: string }[] = []
  const vanished: string[] = []

  /* Iterate the DOCUMENT order, not the Set's insertion order, so the payload
     and the confirm list are both stable and match what the user sees. */
  for (const d of docs) {
    if (!selected.has(d.key)) continue
    if (d.eligible) eligible.push(d)
    else dropped.push({ key: d.key, doc: d.doc, status: d.status })
  }
  for (const key of selected) {
    if (!byKey.has(key)) vanished.push(key)
  }

  const seen = new Set<string>()
  const docNums: string[] = []
  for (const d of eligible) {
    if (seen.has(d.doc)) continue
    seen.add(d.doc)
    docNums.push(d.doc)
  }

  return { eligible, dropped, vanished, docNums }
}

/**
 * Whether two selections agree on what would be submitted.
 *
 * The confirm step shows a specific list of documents. If the set changes
 * between confirming and executing — because the store refreshed underneath, or
 * a document became ineligible — the user must confirm again rather than have a
 * different batch sent than the one they approved.
 */
export function sameDocNums(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
