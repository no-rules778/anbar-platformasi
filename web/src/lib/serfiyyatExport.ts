import * as XLSX from 'xlsx'
import { today } from './format'
import type { SmReportRow } from './serfiyyat'
import { summariseByProject } from './serfiyyatFilters'

/* «Sərfiyyat Materialları» Excel export — smExportExcel()
   (index.html:6714-6726).

   TWO SHEETS, which is why this cannot go through the shared `xls()` helper:
   that one builds a single sheet. The precedent is `xlsGroups.ts`, which
   likewise builds its own workbook rather than widening `xls()` (M13-88).

   The original bypasses `xls()` ENTIRELY — no `toNum` coercion, no column
   widths, no autofilter, no freeze pane. Nothing is added here that the
   original does not write: an "improved" workbook would be a different file
   from the one users reconcile against.

   D-N7 / M13-89: when the library is unavailable it reports the failure and
   writes NOTHING. Unlike `xls()` there is NO CSV fallback, and adding one
   would be an improvement this phase deliberately does not make. */

/** «Jurnal» header — index.html:6716, fifteen columns in this exact order. */
export const SM_EXPORT_HEADER = [
  'Tarix', 'Sənəd №', 'Qaimə №', 'Layihə', 'Material', 'Kod', 'Ölçü', 'Miqdar',
  'Qiymət', 'Cəm', 'Kontragent', 'Avtomobil', 'Alınma kanalı', 'Qeyd', 'Daxil edən',
]

/** «Yekun» header — index.html:6719. */
export const SM_SUMMARY_HEADER = ['Layihə', 'Cəm']

export const SM_SHEET_JURNAL = 'Jurnal'
export const SM_SHEET_YEKUN = 'Yekun'

/** `Serfiyyat_materiallari_{today}.xlsx` — index.html:6725. */
export const smExportFilename = (): string =>
  'Serfiyyat_materiallari_' + today() + '.xlsx'

/** The «Jurnal» rows as an array of arrays — index.html:6717. */
export function buildJurnalAoa(rows: readonly SmReportRow[]): unknown[][] {
  return [SM_EXPORT_HEADER, ...rows.map((r) => [
    r.d, r.docNum, r.iv, r.proj, r.item, r.code, r.unit, r.qty,
    r.price, r.sum, r.kontragent, r.avto, r.kanal, r.note, r.by,
  ])]
}

/**
 * The «Yekun» rows — index.html:6718-6719.
 *
 * Per-project totals in FIRST-APPEARANCE order, from the same aggregation the
 * on-screen «Yekun» block uses, so the sheet and the screen cannot drift.
 */
export function buildYekunAoa(rows: readonly SmReportRow[]): unknown[][] {
  return [SM_SUMMARY_HEADER, ...summariseByProject(rows).map((s) => [s.key, s.sum])]
}

export interface SmExportResult {
  ok: boolean
  /** Rows written, for the caller's toast (6726). */
  count: number
  error?: string
}

/**
 * M13-88, M13-89 — builds and writes the two-sheet workbook.
 *
 * Returns a result rather than toasting itself, so the page owns the message
 * and this stays testable, exactly as `xlsGroups()` does.
 */
export function exportSerfiyyatWorkbook(rows: readonly SmReportRow[]): SmExportResult {
  if (typeof XLSX === 'undefined' || typeof XLSX.writeFile !== 'function') {
    /* M13-89 — nothing is written, and there is NO CSV fallback (D-N7). */
    return { ok: false, count: 0, error: 'Excel kitabxanası yüklənmədi' }
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildJurnalAoa(rows)), SM_SHEET_JURNAL)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildYekunAoa(rows)), SM_SHEET_YEKUN)
  XLSX.writeFile(wb, smExportFilename())
  return { ok: true, count: rows.length }
}
