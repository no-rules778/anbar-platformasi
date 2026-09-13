import type { ItemRow } from '../api/items.api'
import type { MovementRow } from '../api/itemMovements.api'
import type { PartnerRow } from '../api/partners.api'
import type { ItemIndexes } from './itemIndex'
import { whLabel } from './movementRoute'

/* «⬇ Tam ixrac» — the whole-dataset workbook, ported from `fullExport()`
   (index.html:7597-7671).

   This module builds MATRICES ONLY. No XLSX import, no store access, no
   download: the workbook assembly lives in `fullExportRun.ts`. Keeping the
   matrices pure is what lets every rule below be tested without a DOM, a
   file or a mock workbook.

   ═══ NO SECOND DATA MODEL. ═══

   Every number here comes from the ALREADY ACCEPTED derivations:
   `IX.bal` / `IX.byItem` from `buildItemIndexes()` (lib/itemIndex.ts) and the
   operational movement set it already computed (`indexes.operational`, the
   legacy `normalMovements()`). Nothing re-derives a balance, a quantity or a
   value. If an exported figure ever disagrees with the Balances page, the bug
   is in the shared derivation, not in two rival copies of it — which is the
   whole reason this file computes nothing of its own.

   ═══ THE `toNum` COERCION IS APPLIED BY THE WRITER, NOT HERE. ═══

   Legacy maps every non-header row through `toNum` at the point of sheet
   creation (7610, 7618, 7627, 7635). `fullExportRun.ts` does the same with
   the shared `toNum` from `lib/xls.ts`. The three RAW sheets (`_items`,
   `_movements`, `_partners`) are deliberately NOT coerced — legacy passes
   them straight to `aoa_to_sheet` (7658, 7662, 7667) so they stay a faithful
   database echo. */

/** `dsort` — index.html:601. Plain string compare, NOT localeCompare. */
const dsort = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const num = (v: number | null | undefined): number => (v == null || isNaN(Number(v)) ? 0 : Number(v))

/** The five presentation sheets, in the exact legacy append order. */
export const FULL_EXPORT_SHEETS = [
  'Hərəkət registri', 'Anbar qalıqları', 'Satınalmalar', 'Nomenklatura', 'Kontragentlər',
] as const

/** The three raw sheets, appended after the presentation five (7655-7667). */
export const FULL_EXPORT_RAW_SHEETS = ['_items', '_movements', '_partners'] as const

export const MOV_HEADER = [
  'Tarix', 'Anbar', 'Kod', 'Malın adı', 'Ölçü', 'Növü', 'Kontragent', 'Kanal',
  'Giriş', 'Çıxış', 'Qiymət', 'Məbləğ', 'Müqavilə №', 'Qaimə №', 'Qeyd edən',
] as const

export const BAL_HEADER = [
  'Anbar', 'Kod', 'Malın adı', 'Ölçü', 'Mədaxil', 'Məxaric', 'Qalıq', 'Qiymət', 'Dəyər',
] as const

export const FIL_HEADER = [
  'Tarix', 'Malın adı', 'Kod', 'Ölçü', 'Miqdar', 'Qiymət', 'Məbləğ',
  'Kanal', 'Kontragent', 'Müqavilə №', 'Qaimə №',
] as const

export const NOM_HEADER = [
  'Kod', 'Malın adı', 'Ölçü vahidi', 'Son qiymət (₼)', 'Ümumi qalıq', 'Dəyər',
] as const

export const KNT_HEADER = [
  'Kontragentin adı', 'VÖEN', 'Müqavilə №', 'Müqavilə tarixi',
] as const

export const RAW_ITEMS_HEADER = ['code', 'name', 'unit', 'price', 'price_source'] as const
export const RAW_MOVS_HEADER = [
  'date', 'warehouse', 'item_code', 'in_qty', 'out_qty', 'type', 'partner',
  'channel', 'contract_num', 'invoice_num', 'price', 'note', 'doc_num',
] as const
export const RAW_PARTNERS_HEADER = ['name', 'voen', 'contract', 'contract_date'] as const

/* A partner row as the export reads it. `partners` is a generated Supabase
   row type whose optional reference columns are not in the narrow shape this
   module needs, so the fields are read defensively rather than cast. */
type PartnerLike = Partial<PartnerRow> & { name: string }

const pStr = (p: PartnerLike, k: 'voen' | 'contract'): string => {
  const v = (p as Record<string, unknown>)[k]
  return v == null ? '' : String(v)
}

/** `p.cdate` in legacy; the Supabase column is `contract_date` (7639, 7666). */
const pDate = (p: PartnerLike): string => {
  const r = p as Record<string, unknown>
  const v = r.contract_date ?? r.cdate
  return v == null ? '' : String(v)
}

export interface FullExportInput {
  /** `IX.operational` — the legacy `normalMovements()`, already filtered. */
  movements: readonly MovementRow[]
  items: readonly ItemRow[]
  partners: readonly PartnerLike[]
  indexes: Pick<ItemIndexes, 'bal' | 'byItem'>
}

/**
 * «Hərəkət registri» — index.html:7603-7609.
 *
 * Sorted by DATE then by the legacy `ts` tiebreak. `created_at` is this
 * migration's `m.ts`: both are the insertion instant, and it is the only
 * stable second key available, so same-day rows keep a deterministic order
 * instead of depending on array position.
 *
 * The price chain is `m.pr || it.price || 0` (7605) — the movement's own
 * price first, the item's as fallback. «Məbləğ» is `((in + out) * pr)` as a
 * 2-dp STRING, and an empty cell when there is no price, exactly as legacy
 * writes it; `toNum` in the writer turns the string back into a number.
 */
export function movementRegistryMatrix(input: FullExportInput): unknown[][] {
  const itemBy = new Map(input.items.map((i) => [i.code, i]))
  const rows = input.movements.slice().sort(
    (a, b) => dsort(a.date, b.date)
      || (Date.parse(a.created_at ?? '') || 0) - (Date.parse(b.created_at ?? '') || 0),
  )
  const body = rows.map((m) => {
    const it = itemBy.get(m.item_code)
    const pr = num(m.price) || num(it?.price) || 0
    return [
      m.date,
      whLabel(m.warehouse),
      m.item_code,
      it?.name || '',
      it?.unit || '',
      m.type,
      m.partner || '',
      (m as { channel?: string | null }).channel || '',
      m.in_qty || '',
      m.out_qty || '',
      pr || '',
      pr ? ((num(m.in_qty) + num(m.out_qty)) * pr).toFixed(2) : '',
      (m as { contract_num?: string | null }).contract_num || '',
      m.invoice_num || '',
      (m as { by?: string | null }).by || '',
    ]
  })
  return [[...MOV_HEADER], ...body]
}

/**
 * «Anbar qalıqları» — index.html:7613-7617.
 *
 * Sorted by warehouse then item NAME, both with `localeCompare`. Rows whose
 * quantity is within 1e-9 of zero are DROPPED (7615): a fully consumed
 * position is not a balance line. `price`/`val` fall back to an empty cell
 * rather than a zero, so a priceless item does not claim a price of 0.
 */
export function balanceMatrix(input: FullExportInput): unknown[][] {
  const body = input.indexes.bal
    .slice()
    .sort((a, b) => a.w.localeCompare(b.w) || (a.name || '').localeCompare(b.name || ''))
    .filter((b) => Math.abs(b.q) >= 1e-9)
    .map((b) => [whLabel(b.w), b.c, b.name, b.unit, b.in, b.out, b.q, b.price || '', b.val || ''])
  return [[...BAL_HEADER], ...body]
}

/**
 * «Satınalmalar (Filtrasiya)» — index.html:7621-7626.
 *
 * Only `Satınalma` rows, sorted by date ALONE (no `ts` tiebreak here —
 * legacy's second key is absent at 7622, and adding one would reorder rows
 * the original leaves in array order). «Miqdar» is the INBOUND quantity only.
 */
export function purchasesMatrix(input: FullExportInput): unknown[][] {
  const itemBy = new Map(input.items.map((i) => [i.code, i]))
  const body = input.movements
    .filter((m) => m.type === 'Satınalma')
    .slice()
    .sort((a, b) => dsort(a.date, b.date))
    .map((m) => {
      const it = itemBy.get(m.item_code)
      const pr = num(m.price) || num(it?.price) || 0
      return [
        m.date, it?.name || '', m.item_code, it?.unit || '',
        m.in_qty || '', pr || '', pr ? num(m.in_qty) * pr : '',
        (m as { channel?: string | null }).channel || '',
        m.partner || '',
        (m as { contract_num?: string | null }).contract_num || '',
        m.invoice_num || '',
      ]
    })
  return [[...FIL_HEADER], ...body]
}

/**
 * «Nomenklatura» — index.html:7630-7634.
 *
 * Every item, sorted by CODE, whether or not it has stock. A missing balance
 * falls back to `{q:0, val:0}` so the row still exports; «Ümumi qalıq» is
 * therefore a real `0`, while price and value stay empty when absent.
 */
export function nomenclatureMatrix(input: FullExportInput): unknown[][] {
  const body = input.items
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((it) => {
      const bi = input.indexes.byItem.get(it.code)
      return [it.code, it.name, it.unit, it.price || '', bi?.q || 0, bi?.val || '']
    })
  return [[...NOM_HEADER], ...body]
}

/**
 * «Kontragentlər» — index.html:7638-7639.
 *
 * UNSORTED: legacy iterates `DB.partners` in load order, which is already
 * `order('name')` from the API. Imposing a sort here would be a silent
 * behaviour change on a sheet that currently mirrors the read.
 */
export function partnersMatrix(input: FullExportInput): unknown[][] {
  const body = input.partners.map(
    (p) => [p.name, pStr(p, 'voen'), pStr(p, 'contract'), pDate(p)],
  )
  return [[...KNT_HEADER], ...body]
}

/* ── The three RAW sheets — index.html:7655-7667 ────────────────────────────
   "служебные листы в точном формате базы": a verbatim database echo used to
   rebuild the source workbook. Column names are the DB's, lowercase, and the
   values are not coerced by the writer. */

export function rawItemsMatrix(input: FullExportInput): unknown[][] {
  const body = input.items.map((i) => [
    i.code, i.name, i.unit, i.price || 0,
    (i as { psrc?: string | null }).psrc || '',
  ])
  return [[...RAW_ITEMS_HEADER], ...body]
}

export function rawMovementsMatrix(input: FullExportInput): unknown[][] {
  const body = input.movements.map((m) => [
    m.date, m.warehouse, m.item_code, m.in_qty || 0, m.out_qty || 0, m.type,
    m.partner || '', (m as { channel?: string | null }).channel || '',
    (m as { contract_num?: string | null }).contract_num || '',
    m.invoice_num || '', m.price || 0, m.note || '', m.doc_num || '',
  ])
  return [[...RAW_MOVS_HEADER], ...body]
}

export function rawPartnersMatrix(input: FullExportInput): unknown[][] {
  const body = input.partners.map(
    (p) => [p.name, pStr(p, 'voen'), pStr(p, 'contract'), pDate(p)],
  )
  return [[...RAW_PARTNERS_HEADER], ...body]
}

/**
 * Column widths — index.html:7645-7649.
 *
 * Measured over the first 300 rows only (the original's own bound), minimum
 * 6, `+2` padding, capped at 55. Note this differs from `xls()`'s 400/8 —
 * two different legacy helpers, both ported as they are.
 */
export function fullExportWidths(rows: unknown[][]): { wch: number }[] {
  return (rows[0] ?? []).map((_, ci) => {
    let m = 6
    for (let ri = 0; ri < Math.min(rows.length, 300); ri++) {
      m = Math.max(m, String(rows[ri]?.[ci] ?? '').length)
    }
    return { wch: Math.min(m + 2, 55) }
  })
}

/** `'Anbar_' + today() + '.xlsx'` — index.html:7669. */
export function fullExportFileName(day: string): string {
  return 'Anbar_' + day + '.xlsx'
}

/** The refusal when the snapshot carries nothing — see `fullExportRun`. */
export const FULL_EXPORT_EMPTY = 'İxrac üçün məlumat yoxdur'

/** The library-missing refusal — index.html:7598. */
export const FULL_EXPORT_NO_XLSX = 'Excel kitabxanası yüklənmədi'

/** The success toast — index.html:7670. */
export function fullExportDoneMessage(
  fileName: string, movs: string, items: string, positions: string,
): string {
  return fileName + ' yükləndi — ' + movs + ' hərəkət, ' + items + ' mal, ' + positions + ' aktiv mövqe'
}

/** `IX.positions` — the non-zero balance rows the toast counts (7670). */
export function activePositionCount(indexes: Pick<ItemIndexes, 'bal'>): number {
  return indexes.bal.filter((b) => Math.abs(b.q) >= 1e-9).length
}
