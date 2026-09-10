import * as XLSX from 'xlsx'
import { today } from './format'
import type { GroupRow } from './groupFilters'

/* Mal qrupları Excel export — xlsGroups() (index.html:2855-2881).

   The original's own header states the boundary, and this port keeps it
   (registry M6-33…M6-38, R-G4, proposal §7.20):

     "Yalnız bu funksiya üçün ayrıca XLSX strukturu. Paylaşılan xls()
      TOXUNULMUR. Statik dəyərlər: düstur/PowerQuery/makro yoxdur, SON şablonu
      ilə əlaqə yoxdur."

   This module therefore builds its worksheet CELL BY CELL and must never be
   routed through the shared `xls()`. Two concrete reasons, not stylistic ones:

     * `xls()` maps every body cell through `toNum`, which converts a
       zero-padded code such as `0000001` into the NUMBER 1 (inherited
       behaviour R-F9). Here the code must stay TEXT with its leading zeros,
       so it is written `{ t: 's', z: '@' }` (2865).
     * A missing price must leave a GENUINELY EMPTY cell — the original simply
       does not create it (2868-2869). Writing `''` or 0 would be a different
       workbook.

   This phase adds EXPORT ONLY. No workbook is parsed here, so the `R-F7`
   SheetJS advisories — both about parsing — are not engaged, and the accepted
   version is unchanged (proposal §7.23). */

/** Header, verbatim from index.html:2859 (M6-33). */
export const GROUPS_EXPORT_HEADER = [
  'Kod', 'Malın adı', 'Miqdar', 'Son alış qiyməti', 'Anbar', 'İxrac tarixi',
]

/** Column widths, verbatim from index.html:2875. */
export const GROUPS_EXPORT_COLS = [
  { wch: 12 }, { wch: 42 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 22 },
]

/** Sheet name (2877) and filename stem (2878). */
export const GROUPS_SHEET_NAME = 'Mal qrupları'

/**
 * The export stamp — `new Date(snapTs).toLocaleString('az-AZ', {timeZone:'Asia/Baku'})`
 * (index.html:2857). Repeated on every row (M6-36).
 *
 * Taken as a parameter rather than read from the clock so the caller can pass
 * the instant of the SUCCESSFUL refresh (M6-31) and so a test can assert a
 * fixed value (R-G6).
 */
export function groupsExportStamp(snapTs: number): string {
  return new Date(snapTs).toLocaleString('az-AZ', { timeZone: 'Asia/Baku' })
}

/**
 * Builds the worksheet exactly as the original does. Exposed separately from
 * the download so the cell types can be asserted without touching the DOM.
 */
export function buildGroupsSheet(rows: GroupRow[], snapTs: number): XLSX.WorkSheet {
  const stampStr = groupsExportStamp(snapTs)
  const ws: XLSX.WorkSheet = {}

  GROUPS_EXPORT_HEADER.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h }
  })

  rows.forEach((row, i) => {
    const r = i + 1
    // Code as TEXT so a leading zero survives (2865) — M6-34.
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: String(row.code), z: '@' }
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: String(row.name || '') }
    ws[XLSX.utils.encode_cell({ r, c: 2 })] = { t: 'n', v: Number(row.qty) }
    /* M6-35 — no cell at all when the price is absent. The original's guard is
       `row.price != null && !isNaN(+row.price)` (2867). */
    if (row.price != null && !isNaN(Number(row.price))) {
      ws[XLSX.utils.encode_cell({ r, c: 3 })] = { t: 'n', v: Number(row.price) }
    }
    /* M6-S7 — the RAW stored warehouse value, as the original writes it
       (`String(row.wh || '')`, 2870). whLabel() is NOT applied here. */
    ws[XLSX.utils.encode_cell({ r, c: 4 })] = { t: 's', v: String(row.wh || '') }
    ws[XLSX.utils.encode_cell({ r, c: 5 })] = { t: 's', v: stampStr }
  })

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: GROUPS_EXPORT_HEADER.length - 1 },
  })
  ws['!cols'] = GROUPS_EXPORT_COLS.map((c) => ({ ...c }))
  return ws
}

/** `mal_qruplari_<yyyy-mm-dd>.xlsx` — index.html:2878 (M6-37). */
export function groupsExportFilename(): string {
  return 'mal_qruplari_' + today() + '.xlsx'
}

export interface XlsGroupsResult {
  ok: boolean
  /** Rows written, for the caller's toast (2880). */
  count: number
  error?: string
}

/**
 * `xlsGroups(rows, snapTs)` — index.html:2855-2881.
 *
 * Returns a result rather than toasting itself, so the page owns the message
 * and the function stays testable. M6-38: a missing SheetJS is reported, and
 * nothing is downloaded.
 */
export function xlsGroups(rows: GroupRow[], snapTs: number): XlsGroupsResult {
  if (typeof XLSX === 'undefined' || typeof XLSX.writeFile !== 'function') {
    return { ok: false, count: 0, error: 'Excel kitabxanası yüklənmədi' }
  }
  const ws = buildGroupsSheet(rows, snapTs)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, GROUPS_SHEET_NAME)
  XLSX.writeFile(wb, groupsExportFilename())
  return { ok: true, count: rows.length }
}
