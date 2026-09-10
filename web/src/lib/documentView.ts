import {
  CANCELLABLE_TYPES,
  docCancelledBy,
  docReversalDoc,
  isCancelDoc,
  isReversalDoc,
  stripRowLevelCancelled,
  type CancelStateMovement,
} from './documentCancelState'
import type { MovementFilterRow } from './movementFilters'

/* Read-only DOCUMENT INSPECTION — Phase 8, milestone I-3.

   Ported from the legacy views at index.html:5012-5087 (ordinary document),
   5209-5263 (transfer document), 5264-5285 (doc-less ordinary), 5286-5308
   (doc-less transfer) and the four-way dispatcher at 5506-5512.

   EVERYTHING HERE IS PURE AND READ-ONLY. No cancellation, no replacement, no
   row-cancel, no edit transition, no RPC, no Supabase import, no mutation of
   any kind. The legacy views mix inspection with the cancellation controls;
   I-3 ports ONLY the inspection half. The action halves are I-4 … I-6 and are
   deliberately absent rather than disabled — see the ledger.

   The dispatcher decision is separated from the rendering so the four branches
   can be tested without a DOM, and so the page never re-derives them. */

/** A movement as the document views read it. Structurally the registry row. */
export type DocumentViewMovement = MovementFilterRow

/**
 * `editMov()` — index.html:5506-5512. Which view a clicked row opens.
 *
 * The legacy order is significant and is preserved exactly: `Yerdəyişmə` is
 * tested FIRST and never falls through to the ordinary branch, because
 * `CANCELLABLE_TYPES` deliberately excludes it (index.html:645) — transfers
 * belong to their own RPC family. A type in neither group is refused.
 */
export type DocumentViewKind =
  | 'transfer-doc'
  | 'legacy-transfer'
  | 'ordinary-doc'
  | 'legacy-ordinary'
  | 'unsupported'

/**
 * The legacy `doc` value — `r.doc_num || ''` (index.html:943), then read back
 * as `m.doc || ''` (index.html:5013 / 5210). NO trimming: the string is kept
 * exactly as stored, so its truthiness and its equality with other rows'
 * values match the original. Only `null`/`undefined` and `''` collapse to ''.
 */
function retainedDocNum(v: string | null | undefined): string {
  return v || ''
}

/** The refusal toast of index.html:5514, verbatim. Shown as an ERROR toast,
    matching the legacy `toast(..., true)`. */
export const IMMUTABLE_RECORD_REFUSAL =
  'Keçirilmiş qeyd dəyişdirilmir və silinmir. Düzəliş üçün ayrıca storno əməliyyatı tələb olunur.'

/**
 * The four-way dispatch, plus the refusal — index.html:5509-5514.
 *
 * The legacy guard is `m.doc ? … : …` over a value mapped as `r.doc_num || ''`
 * (index.html:943). That is JavaScript truthiness on the ORIGINAL string: only
 * `null`/`undefined` and `''` are doc-less. A whitespace-only `doc_num` is a
 * truthy string in legacy and therefore DOES open a document view — trimming
 * here would silently reroute such a row to the legacy doc-less branch.
 */
export function documentViewKind(
  m: Pick<DocumentViewMovement, 'type' | 'doc_num'> | null | undefined,
): DocumentViewKind {
  if (!m) return 'unsupported'
  const hasDoc = Boolean(retainedDocNum(m.doc_num))
  if (m.type === 'Yerdəyişmə') return hasDoc ? 'transfer-doc' : 'legacy-transfer'
  if ((CANCELLABLE_TYPES as readonly string[]).includes(m.type)) {
    return hasDoc ? 'ordinary-doc' : 'legacy-ordinary'
  }
  return 'unsupported'
}

/** The cancellation/reversal status of the inspected document — the three
    legacy status branches that are READ-ONLY. The admin-gated cancellation
    branch (index.html:5044-5049) is I-4 and has no representation here. */
export type DocumentStatus =
  /** «Bu, ləğv (əks yazı) sənədidir» — this document IS a reversal. */
  | { kind: 'reversal' }
  /** «Ləğv edilib · əks sənəd: X» — including the legacy `'—'` fallback. */
  | { kind: 'cancelled'; reversalDoc: string }
  /** Neither: an ordinary, still-standing document. */
  | { kind: 'open' }

/** One rendered line of a document view. */
export interface DocumentViewLine {
  id: string
  date: string
  itemCode: string
  itemName: string | null
  /** Nullable, exactly as `movements.warehouse` is — `whLabel()` renders a
      missing warehouse as '—' rather than the caller inventing one. */
  warehouse: string | null
  /** «Mədaxil: <anbar>» / «Məxaric: <anbar>» for the ordinary view; the
      canonical route for the transfer view. Computed by the caller, which owns
      the warehouse list `routeOrPartner()` needs. */
  direction: string
  /** The legacy `(r.i || r.o) || 0` for ordinary rows and `(r.o || r.i) || 0`
      for transfer rows — the two views differ, so the caller's assembler sets
      it and the renderer never re-derives it. */
  qty: number
  inQty: number
  outQty: number
  price: number | null
  note: string | null
  createdBy: string | null
}

/** The assembled, fully derived content of a document view. */
export interface DocumentView {
  kind: DocumentViewKind
  /** The SYSTEM document number (`movements.doc_num`), or '' for a legacy
      doc-less record. NEVER invented: a doc-less record shows no number. */
  docNum: string
  /** The clicked row's type — the document's type. */
  type: string
  /** The clicked row, kept so the legacy header (item name, recorder) can be
      rendered from the SAME row the original reads (index.html:5015, 5052). */
  clicked: DocumentViewMovement
  status: DocumentStatus
  /** The visible lines, AFTER `stripRowLevelCancelled()` and, for a transfer,
      after the outbound-only reduction. May legitimately be empty — see
      `emptyAfterStrip`. */
  lines: DocumentViewLine[]
  /**
   * The «N sətir» count of the legacy header (index.html:5052 / 5238): the
   * POST-strip DOCUMENT rows, `rows.length`.
   *
   * This is NOT `lines.length` for a transfer. `rows` holds every post-strip
   * database leg while `preview` holds the outbound legs only
   * (index.html:5211-5217), and the header deliberately reports `rows.length`.
   * A normal two-leg transfer therefore reads «2 sətir» while rendering ONE
   * outbound preview row. The two concepts are kept separate so the renderer
   * never derives one from the other.
   */
  headerLineCount: number
  /** How many lines the document had BEFORE stripping. Kept only so a caller
      can tell a genuinely empty document from a fully stripped one; the
      header's count is `headerLineCount`. */
  rawLineCount: number
  /**
   * TRUE when the document HAD lines and every one of them was removed by
   * row-level stripping (risk R6).
   *
   * This is a valid, partially modified document — every line was individually
   * replaced or row-cancelled — and it is NOT the same thing as a cancelled
   * document. `status` stays `open` for it, and the renderer must say so. The
   * flag exists precisely so no caller is tempted to infer cancellation from
   * an empty line list.
   */
  emptyAfterStrip: boolean
  /** The unique, non-empty manual «Qaimə №» values — `docRefsLine()`. */
  invoiceNums: string[]
  /** The unique, non-empty manual «Müqavilə №» values — `docRefsLine()`. */
  contractNums: string[]
  /**
   * `lotDoc` — index.html:5019. TRUE when ANY line of the document has a
   * `writeoff_valuations` entry, i.e. the document is partia-valued.
   *
   * Derived over the WHOLE document, never over the clicked row alone: the
   * legacy expression is `rows.some(...)`, and checking only the clicked row
   * would let a lot-valued document look unvalued whenever the user happened
   * to click a line that carries no valuation.
   *
   * I-3 DERIVES it and renders it as information. It gates nothing: the
   * control it gates in legacy (`canReplaceRows`, index.html:5023) is item
   * replacement, which is decision `D4` / milestone I-4 and is not built here.
   */
  lotDoc: boolean
}

/** The valuation lookup, narrowed to the one operation this module needs. */
export interface ValuationLookup {
  has: (movementId: string) => boolean
}

interface AssembleOptions {
  /** The clicked row. */
  movement: DocumentViewMovement
  /** The RAW loaded movement set — markers included. `excludeCancelled()`
      removes exactly the marker rows the status helpers must find, so passing
      the operational list here would report an already-cancelled document as
      open. */
  allRows: DocumentViewMovement[]
  /** Nomenclature index, for the line's item name. */
  itemName: (code: string) => string | null
  /** Ordinary: «Mədaxil/Məxaric: <anbar>». Transfer: the canonical route. */
  direction: (row: DocumentViewMovement) => string
  /** `DB.woVals`, for `lotDoc`. */
  valuations: ValuationLookup
}

const text = (v: unknown): string => String(v ?? '').trim()

/** `docRefsLine()`'s uniqueness rule — index.html:4918: trim, drop empties,
    de-duplicate, PRESERVING first-seen order. */
function uniqueRefs(rows: DocumentViewMovement[], key: 'invoice_num' | 'contract_num'): string[] {
  return Array.from(new Set(rows.map((r) => text(r[key])).filter(Boolean)))
}

function line(
  r: DocumentViewMovement,
  qty: number,
  opts: Pick<AssembleOptions, 'itemName' | 'direction'>,
): DocumentViewLine {
  return {
    id: String(r.id),
    date: r.date,
    itemCode: r.item_code,
    itemName: opts.itemName(r.item_code),
    warehouse: r.warehouse,
    direction: opts.direction(r),
    qty,
    inQty: r.in_qty || 0,
    outQty: r.out_qty || 0,
    price: r.price,
    note: r.note,
    createdBy: r.created_by ?? null,
  }
}

/**
 * Assembles the view for a clicked movement — the read-only half of
 * `documentCancelView()` / `transferDocView()` / `legacyCancelView()` /
 * `legacyTransferCancelView()`.
 *
 * Returns null for an unsupported type: the caller shows the refusal toast
 * instead of a dialog, exactly as `editMov()` does.
 */
export function assembleDocumentView(opts: AssembleOptions): DocumentView | null {
  const { movement: m, allRows, valuations } = opts
  const kind = documentViewKind(m)
  if (kind === 'unsupported') return null

  const docNum = retainedDocNum(m.doc_num)
  const isDocView = kind === 'transfer-doc' || kind === 'ordinary-doc'
  const cancelState = allRows as unknown as CancelStateMovement[]

  /* index.html:5014 / 5211 — the document's lines are the rows sharing BOTH
     the `doc_num` AND the movement type. The type predicate is not redundant:
     a document number is unique per posting, but the legacy filter carries it,
     and dropping it would let a differently-typed row that happens to share the
     number join the document and be counted, valued and displayed as part of
     it. A doc-less record is its own single line (`[m]`).

     The comparison is EXACT, on the retained (untrimmed) value: legacy filters
     with `x.doc === doc` over `r.doc_num || ''`, so two rows whose numbers
     differ only in surrounding whitespace are different documents there and
     must stay different here. */
  const documentRows = isDocView
    ? allRows.filter((x) => retainedDocNum(x.doc_num) === docNum && x.type === m.type)
    : [m]

  /* index.html:5014 / 5211 — stripping applies to BOTH document views. A
     doc-less record is `[m]` in legacy and is NOT stripped, so a legacy row is
     shown even when it carries its own marker; that is the original's
     behaviour and is preserved. */
  const visible = isDocView ? stripRowLevelCancelled(documentRows, cancelState) : documentRows

  /* The transfer view shows OUTBOUND legs only (index.html:5216-5217): a
     transfer is written as two database rows, one out of the source and one
     into the destination, and rendering both would show one logical transfer
     twice with a doubled line count. The legacy fallback is preserved: when
     stripping leaves no outbound leg at all, the remaining rows are shown
     rather than nothing. */
  const isTransfer = kind === 'transfer-doc' || kind === 'legacy-transfer'
  let rendered = visible
  if (isTransfer) {
    const out = visible.filter((r) => (r.out_qty || 0) > 0)
    rendered = out.length ? out : visible
  }

  /* The two views take the quantity from opposite ends of the same fallback:
     ordinary `(i || o)`, transfer `(o || i)` (index.html:5033 / 5220). */
  const lines = rendered.map((r) =>
    line(r, isTransfer ? (r.out_qty || r.in_qty || 0) : (r.in_qty || r.out_qty || 0), opts),
  )

  /* index.html:5016-5017 / 5213-5214 — the two families use DIFFERENT markers,
     so the transfer helpers must not be used for an ordinary document or the
     reverse: a cancelled purchase would read as open. A doc-less record has no
     document-level status; its per-id status is the legacy view's own
     `cancelledDocFor()` and is resolved by the caller, which already renders
     the registry's «ləğv edilib» tag from it. */
  let status: DocumentStatus = { kind: 'open' }
  if (isDocView) {
    const isRev = isTransfer
      ? isReversalDoc(docNum, cancelState)
      : isCancelDoc(docNum, cancelState)
    const revDoc = isTransfer
      ? docReversalDoc(docNum, cancelState)
      : docCancelledBy(docNum, cancelState)
    /* Legacy order: the "this IS a reversal" branch wins over "was cancelled"
       (index.html:5036-5039 / 5223-5226). */
    if (isRev) status = { kind: 'reversal' }
    else if (revDoc) status = { kind: 'cancelled', reversalDoc: revDoc }
  }

  return {
    kind,
    docNum,
    type: m.type,
    clicked: m,
    status,
    lines,
    /* Legacy `nf(rows.length)` — the post-strip DOCUMENT rows, which for a
       transfer include the inbound legs the preview omits. */
    headerLineCount: visible.length,
    rawLineCount: documentRows.length,
    /* An empty line list is only meaningful when there WAS something to strip.
       It never implies cancellation — see the field's own note. */
    emptyAfterStrip: documentRows.length > 0 && visible.length === 0,
    /* `docRefsLine(rows)` is fed the POST-strip list for a document view and
       the single row for a legacy one (index.html:5053 / 5239 / 5274 / 5296). */
    invoiceNums: uniqueRefs(visible, 'invoice_num'),
    contractNums: uniqueRefs(visible, 'contract_num'),
    /* Over the WHOLE document (post-strip, as legacy's `rows`), never the
       clicked row alone. */
    lotDoc: visible.some((r) => valuations.has(String(r.id))),
  }
}
