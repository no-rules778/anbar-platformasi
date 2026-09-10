import type { MovementFilterItem, MovementFilterRow } from './movementFilters'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'
import type { WriteoffAllocationRow } from '../api/writeoffAllocations.api'
import type { RecorderMe } from './recorderLabel'
import { movementValuation } from './movementValuation'
import { recorderLabel } from './recorderLabel'

/* The separate «Silinmə» report — `writeOffExportRows()` (index.html:1709-1731)
   and the source-lot half of `xlsWriteOff()` (index.html:1774-1782). Phase 8,
   I-9, the second deliverable of M8-50 that I-7 deferred.

   This module builds ROWS ONLY — no store access, no XLSX import, no download.
   Writing the workbook is `lib/xlsWriteOff.ts`. That split is what makes every
   rule below testable without a DOM or a file.

   SCOPE: this report alone. The ordinary registry export (`movementExport.ts`
   → `lib/xls.ts`), «Çap», the SON export and the import path are untouched. */

/** The exact legacy header, in the legacy order (index.html:1699). */
export const SILINME_EXPORT_HEADER = [
  'Sənəd №', 'Tarix', 'Anbar', 'Kod', 'Malın adı', 'Ölçü vahidi',
  'Silinən miqdar', 'Yekun vahid qiyməti', 'Yekun məbləğ', 'Mənbə məbləği',
  'Məlum qiymətli hissə', 'Qiymətsiz miqdar', 'Qiymətləndirmə üsulu',
  'Admin dəyişiklik səbəbi', 'Qaimə №', 'Qeyd', 'Qeyd edən',
]

/** The exact legacy source-sheet header (index.html:1700). */
export const SILINME_SOURCE_HEADER = [
  'Silmə hərəkəti ID', 'Sənəd №', 'Kod', 'Mənbə hərəkəti ID', 'Mənbə sənəd №',
  'Mənbə Qaimə №', 'Mənbə tarixi', 'Miqdar', 'Qiymət statusu',
  'Mənbə vahid qiyməti', 'Mənbə məbləği',
]

/** One «Silinmə hesabatı» row. `null` means an OMITTED cell, never a zero. */
export interface WriteOffExportRow {
  /** Used to join the source sheet; never written to a cell. */
  movementId: string
  doc: string
  date: string
  wh: string
  code: string
  name: string
  unit: string
  qty: number
  price: number | null
  amount: number | null
  sourceAmount: number | null
  knownAmount: number | null
  unknownQty: number | null
  valuation: string
  overrideReason: string
  invoice: string
  note: string
  by: string
}

/**
 * The REPORT's unit price — index.html:1713-1714, ported exactly:
 *
 *   `val.final != null && qty > 0` → `final / qty` at FOUR decimals
 *   else `m.pr` when `> 0`         → that price
 *   else                           → NULL
 *
 * DELIBERATELY NOT `writeOffUnitPrice()` from `movementValuation.ts`, and this
 * is not a duplication oversight. That helper shares the FIRST branch but ends
 * `Number(m.price ?? 0) || 0` — it is the TABLE's cell, which must always
 * render a number. Its fallback therefore returns:
 *
 *   a missing or zero price → 0
 *   a NEGATIVE price        → that negative number, unfiltered
 *
 * This report requires `null` in both of those cases: the legacy `> 0` test
 * admits only a positive fallback, and a null price is an OMITTED cell (a
 * genuinely blank «Yekun vahid qiyməti»), whereas a 0 would read as a real
 * price of zero and would sum into a spreadsheet average. Reusing the table
 * helper here would silently change the exported cell for exactly the unvalued
 * rows this report exists to make visible.
 *
 * `movementValuation()` — the shared helper that decides WHAT a write-off is
 * worth — IS reused unchanged, and is not modified by this milestone. Only the
 * price EXPRESSION is report-specific.
 */
export function writeOffReportPrice(
  qty: number,
  final: number | null,
  price: number | null | undefined,
): number | null {
  if (final != null && qty > 0) return Number((final / qty).toFixed(4))
  /* The legacy `(m.pr != null && +m.pr > 0) ? +m.pr : null`. A NaN price fails
     `> 0` and yields null, matching the coercion legacy performs. */
  const pr = Number(price ?? 0)
  return Number.isFinite(pr) && pr > 0 ? pr : null
}

/**
 * `writeOffExportRows` — index.html:1709-1731, row for row.
 *
 * @param movs       the FULL filtered set, never the capped page slice.
 * @param itemBy     the nomenclature index — `name` and `unit`.
 * @param valuations `DB.woVals`, passed explicitly to keep this pure.
 * @param emails     `get_user_directory()` id → email, for «Qeyd edən».
 * @param me         the signed-in user, for the same mapping.
 *
 * The `type === 'Silinmə'` filter is legacy's own and is kept even though the
 * caller only enables the button for that type filter: the two gates are
 * independent, and a row of another type must never reach this sheet.
 */
export function writeOffExportRows(
  movs: MovementFilterRow[],
  itemBy: Map<string, MovementFilterItem>,
  valuations: Map<string, WriteoffValuationRow>,
  emails: Map<string, string>,
  me: RecorderMe | null | undefined,
): WriteOffExportRow[] {
  return (movs || [])
    .filter((m) => m && m.type === 'Silinmə')
    .map((m) => {
      const it = itemBy.get(m.item_code)
      const qty = Number(m.out_qty ?? 0) || 0
      const val = movementValuation(m, valuations)
      const s = (v: unknown): string => String(v == null ? '' : v)

      return {
        movementId: s(m.id),
        doc: s(m.doc_num),
        date: s(m.date),
        /* RAW `m.w`, NOT whLabel(). Legacy writes `String(m.w)` here
           (index.html:1720) while the ORDINARY export maps the warehouse
           through `whLabel()`. The two exports genuinely differ and the
           difference is preserved rather than harmonised — this report's
           «Anbar» column is the stored value. */
        wh: s(m.warehouse),
        code: s(m.item_code),
        name: s(it?.name),
        unit: s(it?.unit),
        /* Always a number, including a real 0 — the one field with no omitted
           form, so a zero-quantity write-off stays visible. */
        qty,
        price: writeOffReportPrice(qty, val.final, m.price),
        /* Straight from the valuation. A stored `final_amount` of 0 is a REAL
           zero and is written as one; only `null` omits the cell. */
        amount: val.final,
        sourceAmount: val.source,
        knownAmount: val.known,
        unknownQty: val.unknownQty,
        valuation: val.method,
        overrideReason: val.reason,
        invoice: s(m.invoice_num),
        note: s(m.note),
        /* The FINAL mapped label, as everywhere else — exporting `created_by`
           would put a raw UUID in the sheet. Legacy's `m.by` at this point has
           already been rewritten in place by the load pass (index.html:990). */
        by: recorderLabel(m.created_by, emails, me),
      }
    })
}

/** A «Mənbə partiyalar» row: the legacy array, in the legacy column order. */
export type WriteOffSourceRow = [
  string, string, string, string, string, string, string,
  number, string, number | '', number | '',
]

/** Diagnostic counts. INTERNAL ONLY — see the note on `sourceRows()`. */
export interface SourceRowCounts {
  /** Allocation rows read from the database. */
  read: number
  /** Non-null `reversed_at`, excluded client-side. */
  reversed: number
  /** Non-reversed, parent not in the exported set. A NORMAL consequence of
      filtering — NOT an orphan and NOT an error. */
  outsideFilter: number
  /** Rows actually written to the sheet. */
  written: number
}

export interface SourceRowsResult {
  rows: WriteOffSourceRow[]
  counts: SourceRowCounts
}

/**
 * The «Mənbə partiyalar» body — index.html:1774-1782.
 *
 * Two exclusions, both legacy's, both client-side:
 *   `a.reversedAt`                → a REVERSED allocation is not a source lot.
 *   `!byMovement.has(movementId)` → the parent is not in the exported set.
 *
 * THE SECOND IS NOT AN ERROR AND NOT AN ORPHAN. A parent outside the exported
 * filter is the ordinary, expected result of filtering by warehouse, date or
 * type: the user asked for a subset, and the allocations of the rows they
 * excluded are correctly absent. Calling that an orphan, or warning about it,
 * would raise an alarm on every normal filtered export.
 *
 * The counts are returned all the same, but as INTERNAL diagnostics — for
 * tests and for a developer reading a failure — and the caller does NOT put
 * them in a user-facing toast. They are also not evidence of completeness:
 * a count cannot distinguish a legitimately filtered parent from one hidden by
 * movement RLS, and it cannot detect rows a truncated read never returned at
 * all. Only the read's own `ok:false` can speak to that, which is why the
 * caller refuses to write ANY file when the read fails.
 *
 * Columns 1 and 2 («Sənəd №», «Kod») come from the PARENT row, not from the
 * allocation — legacy reads them off `p`, and the allocation's own
 * `source_doc_num_snapshot` belongs in column 4 instead.
 *
 * The final amount is deliberately NOT repeated here (legacy comment,
 * index.html:1771-1772): summing source rows must not double-count the parent.
 */
export function sourceRows(
  allocations: WriteoffAllocationRow[],
  rows: WriteOffExportRow[],
): SourceRowsResult {
  const byMovement = new Map(rows.map((r) => [r.movementId, r]))
  const out: WriteOffSourceRow[] = []
  const counts: SourceRowCounts = { read: 0, reversed: 0, outsideFilter: 0, written: 0 }

  for (const a of allocations || []) {
    counts.read += 1
    if (a.reversed_at) {
      counts.reversed += 1
      continue
    }
    const key = String(a.writeoff_movement_id == null ? '' : a.writeoff_movement_id)
    const p = byMovement.get(key)
    if (!p) {
      counts.outsideFilter += 1
      continue
    }
    const s = (v: unknown): string => String(v == null ? '' : v)
    out.push([
      key,
      p.doc,
      p.code,
      s(a.source_movement_id),
      s(a.source_doc_num_snapshot),
      s(a.source_invoice_snapshot),
      s(a.source_date_snapshot),
      Number(a.qty ?? 0) || 0,
      s(a.price_status_snapshot),
      /* `== null ? '' :` — legacy writes an EMPTY STRING here, not an omitted
         cell. This sheet is built with `aoa_to_sheet`, which has no omitted
         form; the asymmetry with sheet 1 is legacy's and is preserved. */
      a.unit_price_snapshot == null ? '' : a.unit_price_snapshot,
      a.source_amount_snapshot == null ? '' : a.source_amount_snapshot,
    ])
    counts.written += 1
  }

  return { rows: out, counts }
}
