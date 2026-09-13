import type { MovementRow } from '../api/itemMovements.api'
import type { ItemRow } from '../api/items.api'
import type { WarehouseBalance } from './itemIndex'

/* The `IX.*` aggregates «Hesabatlar» needs that `buildItemIndexes()` does not
   build — index.html:1271-1320. M14-18 … M14-26.

   WHY A SEPARATE MODULE (M14-19): `lib/itemIndex.ts` is an ACCEPTED contract
   consumed by Phases 9, 10 and 11, and the exact set it returns is part of
   that acceptance. Widening it to carry four more maps would change an
   accepted module under every one of those phases. This module takes the SAME
   operational rows and derives the rest alongside it — the Phase 11 precedent,
   where a new snapshot was added rather than an accepted one widened.

   Everything here is computed from OPERATIONAL movements only. The caller
   obtains them from `buildItemIndexes().operational`, which has already
   applied `excludeCancelled()` (M14-18); nothing here re-filters cancellations
   and nothing re-derives a balance. */

const EPS = 1e-9

/** The legacy partner-index key — `m.p || '(göstərilməyib)'` (index.html:1296). */
export const UNNAMED_PARTNER = '(göstərilməyib)'

/** `parseFloat(x) || 0` — the legacy loader's numeric read (936-946). */
const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

/** `dsort` — index.html:601. */
export const dsort = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** `IX.byPartner` — index.html:1296-1297. */
export interface PartnerTotals {
  in: number
  out: number
  n: number
  /** INCOMING value only — see `buildReportAggregates`. */
  val: number
  types: Set<string>
}

/** `IX.byType` — index.html:1298. */
export interface TypeTotals {
  in: number
  out: number
  n: number
  /** BOTH directions — deliberately unlike `PartnerTotals.val`. */
  val: number
}

/** `IX.byWh` — index.html:1294-1295, with `val` added in the finalisation pass. */
export interface WarehouseTotals {
  in: number
  out: number
  n: number
  /** Filled from BALANCE values (1311), not during the movement pass. */
  val: number
  items: Set<string>
}

/** `IX.byDate` — index.html:1299. */
export interface DateTotals {
  in: number
  out: number
  n: number
  /** INCOMING value only, like `PartnerTotals.val`. */
  val: number
}

export interface ReportAggregates {
  byPartner: Map<string, PartnerTotals>
  byType: Map<string, TypeTotals>
  byWh: Map<string, WarehouseTotals>
  byDate: Map<string, DateTotals>
  /** `IX.dates` — the byDate keys, ascending (1320). */
  dates: string[]
  /** `IX.positions` — balances with `abs(q) > 1e-9` (1319). */
  positions: WarehouseBalance[]
  /** `IX.totVal` — the sum of every balance value (1310). */
  totVal: number
}

/**
 * Builds the six aggregates in one pass over the operational rows.
 *
 * THE PRICE RULE (M14-20), index.html:1282:
 *
 *     const pr = m.pr != null && m.pr > 0 ? m.pr : (it ? it.price : 0)
 *
 * The movement price wins ONLY when it is both present and strictly positive.
 * A zero price and a NEGATIVE price both fall through to the item card price —
 * which is why this cannot be written as `m.price || itemPrice`: a negative
 * movement price is truthy and that shortcut would keep it.
 *
 * THE THREE VALUE ASYMMETRIES (M14-21, M14-22, M14-23) are load-bearing and
 * must not be "unified":
 *
 *   byPartner.val += (in) * pr           incoming only   (1297)
 *   byType.val    += (in + out) * pr     both directions (1298)
 *   byDate.val    += (in) * pr           incoming only   (1299)
 *
 * They are three separate legacy lines that happen to look like variants of
 * one another. A movement carrying both an in and an out quantity produces
 * three different contributions; a receipts-only fixture makes all three agree
 * and proves nothing.
 *
 * @param operational already cancellation-filtered rows (`IX.movs`).
 * @param items       the nomenclature, for the item-price fallback.
 * @param bal         the accepted `buildItemIndexes().bal`, for `byWh.val`,
 *                    `positions` and `totVal` — never recomputed here.
 */
export function buildReportAggregates(
  operational: readonly MovementRow[],
  items: readonly ItemRow[],
  bal: readonly WarehouseBalance[],
): ReportAggregates {
  const itemPrice = new Map(items.map((i) => [i.code, num(i.price)]))

  const byPartner = new Map<string, PartnerTotals>()
  const byType = new Map<string, TypeTotals>()
  const byWh = new Map<string, WarehouseTotals>()
  const byDate = new Map<string, DateTotals>()

  for (const m of operational) {
    const inQ = num(m.in_qty)
    const outQ = num(m.out_qty)
    /* 1282 — `m.pr != null && m.pr > 0`, else the ITEM price, else 0. */
    const pr = m.price != null && Number(m.price) > 0
      ? Number(m.price)
      : (itemPrice.get(m.item_code) ?? 0)

    /* 1294-1295 — `val` is NOT touched here; it arrives in the pass below. */
    let bw = byWh.get(m.warehouse)
    if (!bw) { bw = { in: 0, out: 0, n: 0, val: 0, items: new Set() }; byWh.set(m.warehouse, bw) }
    bw.in += inQ; bw.out += outQ; bw.n++; bw.items.add(m.item_code)

    /* 1296-1297 — key falls back to the literal, value is INCOMING only. */
    const pk = m.partner || UNNAMED_PARTNER
    let bp = byPartner.get(pk)
    if (!bp) { bp = { in: 0, out: 0, n: 0, val: 0, types: new Set() }; byPartner.set(pk, bp) }
    bp.in += inQ; bp.out += outQ; bp.n++; bp.val += inQ * pr; bp.types.add(m.type)

    /* 1298 — BOTH directions. */
    let bt = byType.get(m.type)
    if (!bt) { bt = { in: 0, out: 0, n: 0, val: 0 }; byType.set(m.type, bt) }
    bt.in += inQ; bt.out += outQ; bt.n++; bt.val += (inQ + outQ) * pr

    /* 1299 — INCOMING only. */
    let bd = byDate.get(m.date)
    if (!bd) { bd = { in: 0, out: 0, n: 0, val: 0 }; byDate.set(m.date, bd) }
    bd.in += inQ; bd.out += outQ; bd.n++; bd.val += inQ * pr
  }

  /* The finalisation pass — index.html:1306-1312. `byWh.val` accumulates
     BALANCE value, so a warehouse with movements but no surviving balance row
     legitimately ends with n > 0 and val === 0 (M14-24). */
  let totVal = 0
  for (const b of bal) {
    totVal += b.val
    const bw = byWh.get(b.w)
    if (bw) bw.val += b.val
  }

  return {
    byPartner,
    byType,
    byWh,
    byDate,
    /* 1320 — ascending ISO order by `dsort`. */
    dates: Array.from(byDate.keys()).sort(dsort),
    /* 1319 — strictly GREATER than the epsilon; exactly 1e-9 is not a
       position, and a negative beyond it is (M14-25). */
    positions: bal.filter((b) => Math.abs(b.q) > EPS),
    totVal,
  }
}
