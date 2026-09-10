import * as XLSX from 'xlsx'
import { today } from './format'
import {
  SILINME_EXPORT_HEADER,
  SILINME_SOURCE_HEADER,
  type WriteOffExportRow,
  type WriteOffSourceRow,
} from './writeOffExport'

/* `xlsWriteOff()` — index.html:1738-1789. Phase 8 / I-9.

   A SEPARATE writer, deliberately. `lib/xls.ts` is NOT modified and NOT
   reused: its `toNum()` coerces every body cell, so a zero-padded «Kod» or
   «Sənəd №» would be exported as a NUMBER and lose its leading zeros — the
   documented R-F9 behaviour. This report writes those cells as `z:'@'` TEXT
   specifically to prevent that, which is exactly why legacy keeps a second
   writer too. Reusing the shared one would be a regression, not a tidy-up.

   The ordinary Excel export and its writer are untouched by this module.

   NO AUTOFILTER. `xls()` sets `!autofilter`; legacy `xlsWriteOff()` does not,
   and nothing is added here that legacy lacks. `!freeze` IS set, matching
   legacy — and, per I-8, silently ignored by `xlsx@0.18.5`. That is an
   inherited limitation shared with the live platform, not a regression, and it
   is not worked around here.

   Column widths are FIXED literals, not measured from the data as `xls()`
   measures them. Legacy hard-codes both lists and they are reproduced verbatim. */

/** The 17 fixed widths of «Silinmə hesabatı» (index.html:1766). */
const MAIN_COLS = [
  16, 12, 14, 12, 42, 12, 14, 16, 16, 16, 18, 16, 20, 34, 14, 36, 22,
].map((wch) => ({ wch }))

/** The 11 fixed widths of «Mənbə partiyalar» (index.html:1785). */
const SOURCE_COLS = [
  38, 18, 12, 38, 18, 18, 12, 12, 18, 18, 18,
].map((wch) => ({ wch }))

export const MAIN_SHEET_NAME = 'Silinmə hesabatı'
export const SOURCE_SHEET_NAME = 'Mənbə partiyalar'

/** `Silinme_hesabati_<yyyy-mm-dd>.xlsx` — the legacy filename. */
export function writeOffFileName(): string {
  return 'Silinme_hesabati_' + today() + '.xlsx'
}

/**
 * Writes the two-sheet workbook and triggers the download.
 *
 * CELL TYPES, verbatim from legacy:
 *   `S` a plain string · `T` a string with `z:'@'` (TEXT format) · `N` a number
 *
 * An OMITTED cell is a genuinely EMPTY cell — the key is never assigned, so
 * the workbook carries no entry at all. It is never `0` and never `''`. That
 * distinction is the point of building this sheet cell by cell instead of from
 * an array: `aoa_to_sheet` has no omitted form.
 *
 *   col 0  doc            text, OMITTED when falsy
 *   col 3  code           text, ALWAYS
 *   col 6  qty            number, ALWAYS — including a real 0
 *   col 7,8 price, amount number, OMITTED when null
 *   col 9,10,11           number, OMITTED when null
 *   col 12 valuation      string, `|| ''`
 *   col 13 overrideReason string, OMITTED when falsy
 *   col 14 invoice        text, OMITTED when falsy
 *   col 15 note           string, OMITTED when falsy
 *   col 16 by             string, ALWAYS
 *
 * Sheet 2 is APPENDED ONLY WHEN `srcRows.length > 0`. A workbook with no
 * allocations legitimately has one sheet — that is legacy behaviour and the
 * caller, not this writer, is responsible for never reaching here with an
 * unread allocation set.
 */
export function xlsWriteOff(rows: WriteOffExportRow[], srcRows: WriteOffSourceRow[]): void {
  const ws: Record<string, unknown> = {}
  const at = (r: number, c: number): string => XLSX.utils.encode_cell({ r, c })
  const S = (r: number, c: number, v: unknown): void => {
    ws[at(r, c)] = { t: 's', v: String(v) }
  }
  const T = (r: number, c: number, v: unknown): void => {
    ws[at(r, c)] = { t: 's', v: String(v), z: '@' }
  }
  const N = (r: number, c: number, v: number): void => {
    ws[at(r, c)] = { t: 'n', v: Number(v) }
  }

  SILINME_EXPORT_HEADER.forEach((h, c) => S(0, c, h))

  rows.forEach((row, i) => {
    const r = i + 1
    if (row.doc) T(r, 0, row.doc) // an old write-off with no document stays blank
    S(r, 1, row.date)
    S(r, 2, row.wh)
    T(r, 3, row.code)
    S(r, 4, row.name)
    S(r, 5, row.unit)
    N(r, 6, row.qty)
    if (row.price != null) N(r, 7, row.price)
    if (row.amount != null) N(r, 8, row.amount)
    if (row.sourceAmount != null) N(r, 9, row.sourceAmount)
    if (row.knownAmount != null) N(r, 10, row.knownAmount)
    if (row.unknownQty != null) N(r, 11, row.unknownQty)
    S(r, 12, row.valuation || '')
    if (row.overrideReason) S(r, 13, row.overrideReason)
    if (row.invoice) T(r, 14, row.invoice)
    if (row.note) S(r, 15, row.note)
    S(r, 16, row.by)
  })

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: SILINME_EXPORT_HEADER.length - 1 },
  })
  ws['!cols'] = MAIN_COLS
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws as XLSX.WorkSheet, MAIN_SHEET_NAME)

  /* «Mənbə partiyalar» is a separate sheet. The parent's final amount is
     deliberately NOT repeated in it, so an accountant summing the source rows
     cannot double-count (legacy comment, index.html:1771-1772). */
  if (srcRows.length) {
    const sws = XLSX.utils.aoa_to_sheet([[...SILINME_SOURCE_HEADER], ...srcRows])
    sws['!cols'] = SOURCE_COLS
    XLSX.utils.book_append_sheet(wb, sws, SOURCE_SHEET_NAME)
  }

  XLSX.writeFile(wb, writeOffFileName())
}
