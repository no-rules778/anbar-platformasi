import * as XLSXns from 'xlsx'
import { nf, today } from './format'
import { toNum } from './xls'
import {
  FULL_EXPORT_NO_XLSX, FULL_EXPORT_SHEETS, FULL_EXPORT_RAW_SHEETS,
  activePositionCount, balanceMatrix, fullExportDoneMessage, fullExportFileName,
  fullExportWidths, movementRegistryMatrix, nomenclatureMatrix, partnersMatrix,
  purchasesMatrix, rawItemsMatrix, rawMovementsMatrix, rawPartnersMatrix,
  type FullExportInput,
} from './fullExport'

/* «⬇ Tam ixrac» — the WORKBOOK ASSEMBLY, ported from `fullExport()`
   (index.html:7597-7671).

   The matrices live in `fullExport.ts`; this module only turns them into a
   workbook and hands it to the writer. The split keeps every ordering,
   filtering and calculation rule testable without SheetJS.

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL EXPORT WAS RUN. ═══ */

export interface FullExportDeps {
  xlsx?: Pick<typeof XLSXns, 'utils' | 'writeFile'> | null
  day?: string
}

export interface FullExportOutcome {
  ok: boolean
  fileName: string | null
  message: string
  isError: boolean
}

/** The legacy availability guard (7598), testing the API actually used. */
function available(X: Pick<typeof XLSXns, 'utils' | 'writeFile'> | null): boolean {
  if (!X) return false
  /* Through `unknown`: `XLSX$Utils` is an interface with no index signature,
     so TypeScript refuses a direct cast to a record. The runtime check is the
     point — a stubbed or broken module can supply anything. */
  const u = (X as unknown as { utils?: Record<string, unknown> }).utils
  return typeof u?.aoa_to_sheet === 'function'
    && typeof u?.book_new === 'function'
    && typeof u?.book_append_sheet === 'function'
    && typeof (X as unknown as { writeFile?: unknown }).writeFile === 'function'
}

/**
 * `fullExport()` — index.html:7597-7671.
 *
 * ═══ AN EMPTY SNAPSHOT STILL DOWNLOADS. ═══
 *
 * The control flow is legacy's, with no additions. The ONLY refusal is the
 * library-missing guard at 7598; there is no emptiness check anywhere in the
 * legacy function. An empty dataset therefore writes `Anbar_<today>.xlsx`
 * with all eight worksheets and their header rows, exactly as production
 * does today. Parity is the requirement here: a port that refused where the
 * original wrote would be a behaviour change, not a safeguard.
 */
export function fullRunExport(
  input: FullExportInput, deps: FullExportDeps = {},
): FullExportOutcome {
  const X = deps.xlsx === undefined ? XLSXns : deps.xlsx
  if (!available(X)) {
    return { ok: false, fileName: null, message: FULL_EXPORT_NO_XLSX, isError: true }
  }

  const XLSX = X as Pick<typeof XLSXns, 'utils' | 'writeFile'>
  const day = deps.day ?? today()
  const fileName = fullExportFileName(day)

  const presentation = [
    movementRegistryMatrix(input),
    balanceMatrix(input),
    purchasesMatrix(input),
    nomenclatureMatrix(input),
    partnersMatrix(input),
  ]

  const wb = XLSX.utils.book_new()

  /* The five presentation sheets: every non-header row through `toNum`, so
     numbers land as numbers (7610, 7618, 7627, 7635). «Kontragentlər» is the
     exception — legacy passes it RAW (7640), keeping a VÖEN a string. */
  presentation.forEach((rows, i) => {
    const coerce = i < 4
    const data = coerce ? rows.map((r, ri) => (ri === 0 ? r : r.map(toNum))) : rows
    const ws = XLSX.utils.aoa_to_sheet(data) as Record<string, unknown>
    ws['!cols'] = fullExportWidths(rows)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rows.length - 1, c: (rows[0] ?? []).length - 1 },
      }),
    }
    XLSX.utils.book_append_sheet(wb, ws as XLSXns.WorkSheet, FULL_EXPORT_SHEETS[i])
  })

  /* The three RAW sheets — no coercion, no widths, no filter (7655-7667). */
  const raw = [rawItemsMatrix(input), rawMovementsMatrix(input), rawPartnersMatrix(input)]
  raw.forEach((rows, i) => {
    XLSX.utils.book_append_sheet(
      wb, XLSX.utils.aoa_to_sheet(rows), FULL_EXPORT_RAW_SHEETS[i],
    )
  })

  XLSX.writeFile(wb, fileName)

  return {
    ok: true,
    fileName,
    message: fullExportDoneMessage(
      fileName,
      nf(input.movements.length),
      nf(input.items.length),
      nf(activePositionCount(input.indexes)),
    ),
    isError: false,
  }
}
