import * as XLSX from 'xlsx'
import { today } from './format'
import { azpReportRows, type AzpReport } from './azpReport'

/* Azpetrol / Araz — the report export writer (M17-62, M17-63).

   Ported from `azpReportExport()` (index.html:8915-8931).

   ═══ THIS IS A SEPARATE WRITER, AND THAT IS THE CONTRACT. ═══

   It deliberately does NOT call the shared `xls()` from lib/xls.ts. Legacy
   says so in its own comment above `azpReportRows` (index.html:8911-8913):
   «Hesabat ixracı — AYRI yazıcı … ANBAR-ın paylaşılan xls() funksiyası
   TOXUNULMUR.»

   Reusing `xls()` would silently change the workbook contract in three ways,
   because `xls()` adds what this writer does not:
     * `ws['!autofilter']` over the whole used range,
     * `ws['!freeze'] = { xSplit: 0, ySplit: 1 }`,
     * `ws['!cols']` measured column widths.
   None exists in the legacy report workbook. An autofilter over a report
   whose rows are headings, an opening-balance line, movements and three
   total lines is actively wrong — filtering it would hide the totals that
   give the numbers meaning. The absence is asserted in this module's suite,
   not merely assumed.

   `xls()` would also run every non-header cell through `toNum()`, which
   converts a fully-numeric string to a number — exactly the leading-zero loss
   this writer exists to prevent (below).

   D-T5 IS NOT TOUCHED HERE. This writes the REPORT the user is already
   looking at — the same model the screen renders, via `buildAzpReport()`. The
   full-module template export (`azpExport`, index.html:9715-9756), which
   egresses every card and every non-cancelled movement, is D-T5 and is NOT
   implemented in Phase 17. */

/** The sheet name per mode — index.html:8927. */
export function azpReportSheetName(mode: AzpReport['mode']): string {
  return mode === 'single' ? 'Fərdi hesabat' : 'Qrup hesabatı'
}

/** The download filename — index.html:8928. */
export function azpReportFileName(module: AzpReport['module'], day: string = today()): string {
  return (module === 'azpetrol' ? 'Azpetrol' : 'Araz') + '_hesabat_' + day + '.xlsx'
}

/**
 * Forces every ENTIRELY-NUMERIC string cell to text (M17-62) —
 * index.html:8920-8925.
 *
 * Card numbers are strings like `0012`. Left alone, Excel reads them as
 * numbers and drops the leading zeros, so `0012` becomes `12` and no longer
 * matches the physical card. Setting `t:'s'` and `z:'@'` pins the cell as
 * text.
 *
 * It tests `typeof c.v === 'string'` FIRST, so a genuine number — an amount,
 * a balance — is never converted to text. Only a string that LOOKS numeric is
 * touched. The `!`-prefixed metadata keys are skipped.
 */
export function azpForceTextCells(ws: Record<string, unknown>): void {
  Object.keys(ws).forEach((a) => {
    if (a[0] === '!') return
    const c = ws[a] as { v?: unknown; t?: string; z?: string } | undefined
    if (c && typeof c.v === 'string' && /^[0-9]+$/.test(c.v)) {
      c.t = 's'
      c.z = '@'
    }
  })
}

/** Everything the writer produced, so a caller can toast and a test can look. */
export interface AzpReportWorkbook {
  fileName: string
  sheetName: string
  rows: unknown[][]
}

/**
 * Builds the report workbook and downloads it — index.html:8915-8931.
 *
 * Consumes `azpReportRows(rep)`, the SAME matrix the screen renders from, so
 * an exported figure cannot differ from the displayed one (M17-56). Nothing
 * is recalculated here.
 *
 * Writes no autofilter, no freeze pane and no column widths (M17-63).
 */
export function azpReportExport(rep: AzpReport, day: string = today()): AzpReportWorkbook {
  const rows = azpReportRows(rep)
  const ws = XLSX.utils.aoa_to_sheet(rows) as unknown as Record<string, unknown>
  azpForceTextCells(ws)

  const sheetName = azpReportSheetName(rep.mode)
  const fileName = azpReportFileName(rep.module, day)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws as never, sheetName)
  XLSX.writeFile(wb, fileName)

  return { fileName, sheetName, rows }
}
