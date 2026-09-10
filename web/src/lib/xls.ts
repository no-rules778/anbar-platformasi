import * as XLSX from 'xlsx'
import { today } from './format'

/* Excel export — ported from xls() (index.html:1219-1236).

   DEPENDENCY NOTE: the production platform loads `xlsx@0.18.5` from a CDN
   (index.html:5), and `npm i xlsx` resolves to that same 0.18.5 — the npm
   registry's newest published build. `npm audit` reports two high-severity
   advisories against it (prototype pollution, ReDoS) with "no fix available",
   because SheetJS publishes newer releases only from its own CDN.

   It is kept deliberately, as an ACCEPTED RISK rather than a safe choice.
   Matching production preserves parity and adds no exposure the live system
   does not already carry, but it does not make the version safe: both
   advisories concern PARSING an attacker-influenced workbook, and the import
   path really does parse one — chosen by an authorised user, in their own
   browser, but hostile input all the same. Export is generation-only and is
   not exposed.

   Fixed releases (0.19.3+, 0.20.2+) exist only on SheetJS's own CDN; npm's
   newest published version is still 0.18.5, so `fixAvailable: false` is
   accurate for this dependency channel. Moving to the CDN build changes the
   supply chain and is a platform-wide decision, not one for this module.

   Full reasoning, verification and the conditions that would reopen it:
   docs/superpowers/decisions/2026-09-03-xlsx-dependency-risk.md (R-F7). */

/* `toNum` — index.html:1212-1218, ported exactly.

   Only a string that is ENTIRELY a number (optionally signed, with one
   decimal separator that may be a comma) converts; a name or an empty cell is
   returned untouched.

   INHERITED BEHAVIOUR, corrected note (Codex audit, 2026-09-03 §3): a
   zero-padded item code is NOT protected by this test. `0000001` matches
   `^-?\d+$` and is exported as the NUMBER 1, losing its leading zeros. An
   earlier version of this comment claimed the opposite; it was wrong.

   The legacy implementation does exactly the same, so this is a pre-existing
   export characteristic, not a regression introduced by the migration, and it
   is preserved deliberately for parity. Changing it would alter the Excel
   output contract and needs its own decision under §7 of the migration
   principles — do not "fix" it in passing. Registry R-F9. */
export function toNum(v: unknown): unknown {
  if (typeof v === 'number') return v
  const s = String(v == null ? '' : v).trim()
  if (!s || !/^-?\d+([.,]\d+)?$/.test(s)) return v
  const n = Number(s.replace(',', '.'))
  return isNaN(n) ? v : n
}

/* `csv(rows, name)` — index.html:1199-1209, the download half only.

   The legacy toast («<name> faylı yükləndi») is deliberately NOT here: this
   module carries no toast of its own (see the note on `xls()` at the call
   sites), so the caller decides what to say. Semicolon-separated, CRLF rows,
   a UTF-8 BOM so Excel opens Azerbaijani text correctly, and quoting only
   where a cell contains `"`, `;` or a newline — exactly the original test. */
export function csvDownload(rows: unknown[][], name: string): void {
  const body = rows
    .map((r) =>
      r
        .map((c) => {
          const s = c == null ? '' : String(c)
          return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
        })
        .join(';'),
    )
    .join('\r\n')
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name + '_' + today() + '.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/* M9-119 — the legacy guard `if (typeof XLSX === 'undefined')` (1220).

   The production platform loads SheetJS from a CDN, so "the library did not
   load" is a real runtime state there. Here `xlsx` is a bundled static
   import, so the namespace object always exists; what can still be absent is
   its API surface (a broken or stubbed module). The guard therefore tests the
   two functions `xls()` actually calls rather than the namespace itself. */
function xlsxAvailable(): boolean {
  const u = (XLSX as { utils?: { aoa_to_sheet?: unknown } }).utils
  return typeof u?.aoa_to_sheet === 'function'
    && typeof (XLSX as { writeFile?: unknown }).writeFile === 'function'
}

/** What `xls()` actually wrote — the caller chooses the toast (M9-119). */
export type XlsOutcome = 'xlsx' | 'csv'

/**
 * Writes a 2-D array to `<name>_<yyyy-mm-dd>.xlsx`, or — when the workbook
 * library is unavailable — to `<name>_<yyyy-mm-dd>.csv` (M9-119), returning
 * which one happened so the caller can toast the legacy message.
 *
 * Row 0 is treated as the header: it is stringified, while every later row is
 * passed through toNum so numbers export as numbers, not text. Column widths
 * are measured over the first 400 rows only — the original's own bound.
 */
export function xls(rows: unknown[][], name: string, sheet?: string): XlsOutcome {
  if (!xlsxAvailable()) {
    csvDownload(rows, name)
    return 'csv'
  }
  const data = rows.map((r, i) => (i === 0 ? r.map((c) => String(c == null ? '' : c)) : r.map(toNum)))
  const ws = XLSX.utils.aoa_to_sheet(data)

  const widths = (data[0] ?? []).map((h, i) => {
    let m = String(h).length
    for (let r = 1; r < Math.min(data.length, 400); r++) {
      m = Math.max(m, String(data[r][i] == null ? '' : data[r][i]).length)
    }
    return { wch: Math.min(Math.max(m + 2, 8), 55) }
  })
  ws['!cols'] = widths
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: data.length - 1, c: (data[0] ?? []).length - 1 },
    }),
  }
  /* The original sets a freeze pane below the header row. */
  ;(ws as Record<string, unknown>)['!freeze'] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, (sheet || 'Hesabat').slice(0, 28))
  XLSX.writeFile(wb, name + '_' + today() + '.xlsx')
  return 'xlsx'
}

/* The Nomenklatura export matrix — index.html:2452-2453.

   `price || ''` keeps a missing price an EMPTY cell rather than a zero, and a
   missing balance falls back to {q:0, val:0} so the row still exports. The
   value column is a 2-decimal STRING, matching `b.val.toFixed(2)`. */
export const NOMENCLATURE_EXPORT_HEADER = [
  'Kod', 'Malın adı', 'Ölçü vahidi', 'Son qiymət', 'Ümumi qalıq', 'Dəyər',
]

export interface NomenclatureExportRow {
  code: string
  name: string
  unit: string | null
  price: number | null
  q: number
  val: number
}

export function nomenclatureExportMatrix(rows: NomenclatureExportRow[]): unknown[][] {
  const body: unknown[][] = rows.map(
    (i) => [i.code, i.name, i.unit ?? '', i.price || '', i.q, i.val.toFixed(2)],
  )
  return [[...NOMENCLATURE_EXPORT_HEADER], ...body]
}
