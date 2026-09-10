import type { ItemRow } from '../api/items.api'
import type { WarehouseBalance } from './itemIndex'
import type { LastPurchase } from './lastPurchase'

/* Mal qrupları filtering — grpPriceRange() (index.html:2719-2726) and
   grpRows() (2728-2757).

   The screen's own header comment (2713-2715) states the contract: read and
   select only. Nothing here writes, and nothing here touches balances, prices,
   the nomenclature or movements. */

/** `CAT_UNSET` — index.html:653. The pseudo-category for an unset category. */
export const CAT_UNSET = 'Təyin edilməyib'

/** The three validation messages, verbatim from 2721-2725 (M6-17). */
export const MSG_MIN_INVALID = 'Min qiymət mənfi olmayan düzgün ədəd olmalıdır'
export const MSG_MAX_INVALID = 'Max qiymət mənfi olmayan düzgün ədəd olmalıdır'
export const MSG_MIN_GT_MAX = 'Min qiymət Max qiymətdən böyük ola bilməz'

export interface GroupFilters {
  /** Selected warehouse names; empty means no restriction (OR within). */
  whs: Set<string>
  /** Selected categories, `CAT_UNSET` included; empty means no restriction. */
  cats: Set<string>
  /** Raw input text, as the original stores it (`GRP.min`). */
  min: string
  max: string
  /** Lower-cased search text. */
  q: string
}

export const EMPTY_GROUP_FILTERS: GroupFilters = {
  whs: new Set(),
  cats: new Set(),
  min: '',
  max: '',
  q: '',
}

export type PriceRange =
  | { ok: true; min: number | null; max: number | null }
  | { ok: false; msg: string }

/**
 * `grpPriceRange()` — index.html:2719-2726 (M6-16, M6-17).
 *
 * Blank is allowed and means "no bound". Negative and non-finite are rejected.
 * Min > Max is rejected. Bounds are INCLUSIVE (applied in groupRows).
 */
export function groupPriceRange(filters: Pick<GroupFilters, 'min' | 'max'>): PriceRange {
  const min = filters.min === '' ? null : parseFloat(filters.min)
  const max = filters.max === '' ? null : parseFloat(filters.max)
  if (min !== null && (!Number.isFinite(min) || min < 0)) return { ok: false, msg: MSG_MIN_INVALID }
  if (max !== null && (!Number.isFinite(max) || max < 0)) return { ok: false, msg: MSG_MAX_INVALID }
  if (min !== null && max !== null && min > max) return { ok: false, msg: MSG_MIN_GT_MAX }
  return { ok: true, min, max }
}

/** One rendered row. Mirrors the object pushed at 2754. */
export interface GroupRow {
  code: string
  name: string
  qty: number
  unit: string
  wh: string
  cat: string
  /** Last purchase price, or null when none is recorded. NEVER items.price. */
  price: number | null
}

export type GroupRowsResult = { ok: true; rows: GroupRow[] } | { ok: false; error: string }

export interface GroupRowsInput {
  /** Per warehouse × item balances (IX.bal). */
  bal: WarehouseBalance[]
  itemBy: Map<string, ItemRow>
  lastPurchase: Map<string, LastPurchase>
  /** Warehouses this user may see — ALREADY filtered to active `anbar` rows
      and ALREADY passed through allowedWarehouses() (M6-03, M6-S5, M6-S6). */
  allowed: string[]
  filters: GroupFilters
}

/**
 * `grpRows()` — index.html:2728-2757.
 *
 * Filter semantics (the screen states them at 2780): AND between filters, OR
 * inside one filter. Min/Max bounds inclusive. An item with no last-purchase
 * price drops out as soon as EITHER bound is set — it is never treated as 0
 * (M6-19). Only strictly positive balances participate (M6-02).
 */
export function groupRows(input: GroupRowsInput): GroupRowsResult {
  const { bal, itemBy, lastPurchase, allowed, filters } = input

  const range = groupPriceRange(filters)
  if (!range.ok) return { ok: false, error: range.msg }

  const allowedSet = new Set(allowed)
  const wSel = filters.whs.size ? filters.whs : null
  const cSel = filters.cats.size ? filters.cats : null
  const { min, max } = range
  const q = filters.q

  const out: GroupRow[] = []
  for (const b of bal) {
    /* M6-02 / M6-S11 — `b.q` is already `+(in - out).toFixed(4)` from
       buildItemIndexes (the 4-decimal rounding the original applies at 1302
       BEFORE any comparison). Zero and negative balances are excluded. */
    if (!(b.q > 1e-9)) continue

    if (!allowedSet.has(b.w)) continue // M6-03: role + active-anbar scope
    if (wSel && !wSel.has(b.w)) continue // OR within the warehouse filter

    const it = itemBy.get(b.c)
    const cat = it?.category || CAT_UNSET // M6-07
    if (cSel && !cSel.has(cat)) continue // OR within the category filter

    /* M6-04 / M6-S9 — last purchase only. `items.price` is never consulted. */
    const lp = lastPurchase.get(b.c)
    const price = lp ? lp.price : null

    if (min !== null || max !== null) {
      if (price == null) continue // M6-19: priceless drops out under a bound
      if (min !== null && price < min) continue // inclusive
      if (max !== null && price > max) continue // inclusive
    }

    /* M6-S8 — the legacy unknown-item name (index.html:1307, mirrored at
       2754's `it.name || b.name`). An unknown code must never render blank. */
    const name = it?.name || `(nomenklaturada yoxdur: ${b.c})`

    if (q && `${b.c} ${name}`.toLowerCase().indexOf(q) < 0) continue // M6-20, AND

    out.push({ code: b.c, name, qty: b.q, unit: it?.unit || '', wh: b.w, cat, price })
  }

  /* M6-08 — warehouse then name, both Azerbaijani collation (2755). */
  out.sort((a, b2) => a.wh.localeCompare(b2.wh, 'az') || a.name.localeCompare(b2.name, 'az'))
  return { ok: true, rows: out }
}
