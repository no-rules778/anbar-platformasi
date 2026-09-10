import type { MovementFilterItem, MovementFilterRow } from './movementFilters'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'
import type { RecorderMe } from './recorderLabel'
import { movementValuation, writeOffUnitPrice } from './movementValuation'
import { movKeyText } from './movementKey'
import { recorderLabel } from './recorderLabel'
import { whLabel } from './movementRoute'

/* The «Mal hərəkəti» Excel matrix — index.html:1848-1849 (M8-50, I-7).

   This module builds the 2-D array ONLY. Writing the workbook stays in
   `lib/xls.ts`, which is already a faithful port of the shared `xls()` helper
   and is deliberately NOT modified here: the legacy export is a plain `xls()`
   call with no per-cell typing of its own, unlike `xlsWriteOff()`.

   Keeping the matrix pure — no store access, no XLSX import — is what makes
   every rule below testable without a DOM, a download or a mock workbook.

   SCOPE: the ordinary registry export only. «Çap», the separate Silinmə
   report (`xlsWriteOff`, its own 17-column header and its «Mənbə partiyalar»
   sheet fed by `stock_layer_allocations`), the SON export and the import path
   are all OUT of scope and remain deferred. */

/** The exact legacy header, in the legacy order (index.html:1848). */
export const MOVEMENT_EXPORT_HEADER = [
  'Tarix', 'Anbar', 'Kod', 'Malın adı', 'Ölçü', 'Növü',
  'İstiqamət / Kontragent', 'Alınma kanalı', 'Giriş', 'Çıxış',
  'Vahid qiyməti', 'Məbləğ', 'Müqavilə', 'Qaimə', 'Qeyd edən',
]

/**
 * `movementExportMatrix` — the body of the `xls([...])` call at
 * index.html:1848-1849, row for row.
 *
 * @param rows        the FULL filtered, sorted set (`all` in `rMov()`), never
 *                    the capped page slice. The caller owns that distinction;
 *                    passing `page` here would silently truncate the export at
 *                    `SHOW_MAX` and the matrix cannot detect it.
 * @param itemBy      the nomenclature index — `name` and `unit` are read here.
 * @param warehouses  needed by `movKeyText()` to resolve a transfer route.
 * @param valuations  `DB.woVals`. Passed EXPLICITLY rather than read from the
 *                    store: this function must stay pure, and omitting the map
 *                    is not a harmless default — every Silinmə row would fall
 *                    back to `qty × price` and the exported accounting amounts
 *                    would silently disagree with the screen.
 * @param emails      `get_user_directory()` id → email, for «Qeyd edən».
 * @param me          the signed-in user, for the same mapping.
 */
export function movementExportMatrix(
  rows: MovementFilterRow[],
  itemBy: Map<string, MovementFilterItem>,
  warehouses: string[],
  valuations: Map<string, WriteoffValuationRow>,
  emails: Map<string, string>,
  me: RecorderMe | null | undefined,
): unknown[][] {
  const body: unknown[][] = rows.map((m) => {
    const it = itemBy.get(m.item_code)

    /* The SAME two price chains the table renders (M8-05). A Silinmə row is
       valued from the stored map; every other type falls back
       `m.price → item.price → 0`. */
    const val = m.type === 'Silinmə' ? movementValuation(m, valuations) : null
    const pr = val ? writeOffUnitPrice(m, val) : (m.price || it?.price || 0)

    /* The legacy amount asymmetry, ported deliberately rather than tidied:
       a Silinmə row exports the stored `final` as a NUMBER (empty when null),
       while every other row exports `((in + out) * pr).toFixed(2)` — a 2-dp
       STRING. `toNum()` inside `xls()` converts that string back to a number,
       so the sheet is numeric either way; the difference is only in what
       reaches the writer. Normalising it here would change the exported cell
       for one of the two branches. */
    const amount: unknown = val
      ? (val.final == null ? '' : val.final)
      : (pr ? (((m.in_qty || 0) + (m.out_qty || 0)) * pr).toFixed(2) : '')

    return [
      /* RAW `m.date`, NOT fmtD(). The screen formats dates; this export does
         not, and an ISO date is what a spreadsheet can actually sort. */
      m.date,
      whLabel(m.warehouse),
      m.item_code,
      it?.name || '',
      it?.unit || '',
      m.type,
      /* The canonical route for a resolved transfer, the partner text
         otherwise — identical to the İstiqamət cell on screen. */
      movKeyText(m, warehouses),
      m.channel || '',
      /* `m.i || ''` / `m.o || ''`: an absent or zero quantity exports as an
         EMPTY cell, not a 0. A zero would read as a genuine zero-quantity
         movement and would sum into a spreadsheet total. */
      m.in_qty || '',
      m.out_qty || '',
      pr || '',
      amount,
      m.contract_num || '',
      m.invoice_num || '',
      /* `m.by` at index.html:1849 is the FINAL mapped label, not the raw
         column: the load pass at index.html:990 rewrites `m.by` in place
         before any render or export reads it. Exporting `created_by` directly
         would put a raw UUID in the sheet — the same defect the I-2 audit
         found in the table cell (M8-04). The legacy `|| ''` is therefore
         unreachable: the mapping always returns a non-empty string. */
      recorderLabel(m.created_by, emails, me),
    ]
  })

  return [[...MOVEMENT_EXPORT_HEADER], ...body]
}
