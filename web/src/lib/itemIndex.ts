import { excludeCancelled } from './operationalMovements'
import type { MovementRow } from '../api/itemMovements.api'
import type { ItemRow } from '../api/items.api'

/* The derived indexes, ported from index() (index.html:1272-1317).

   Everything here is computed from OPERATIONAL movements only — cancelled
   rows and the rows that cancel them are dropped first (1281), reusing the
   already-ported excludeCancelled(). */

/** `IX.byItem` — index.html:1273, filled at 1289 and finalised at 1313. */
export interface ItemTotals {
  in: number
  out: number
  n: number
  last: string
  /** `+(in - out).toFixed(4)` — 4-decimal rounding, displayed at 2. */
  q: number
  /** Taken from the ITEM, never from a movement (1313). */
  price: number
  /** `q × price`. */
  val: number
}

/** `IX.bal` — per warehouse × item (1285-1288). */
export interface WarehouseBalance {
  w: string
  c: string
  in: number
  out: number
  n: number
  q: number
  last: string
  first: string
  price: number
  val: number
  name: string
  unit: string
}

/** One price observation for the card's history (1283). */
export interface PriceObservation {
  /** price */
  p: number
  /** date */
  d: string
  /** counterparty (`m.p` in the original) */
  k: string
}

export interface ItemIndexes {
  byItem: Map<string, ItemTotals>
  bal: WarehouseBalance[]
  priceObs: Map<string, PriceObservation[]>
  /** The operational rows themselves — the card's movement history. */
  operational: MovementRow[]
}

const num = (v: number | null | undefined): number => (v == null || isNaN(Number(v)) ? 0 : Number(v))

/**
 * Builds byItem, bal and priceObs in a single pass, mirroring index().
 *
 * Two details are load-bearing and must not be "simplified":
 *  - `q` is `+(in - out).toFixed(4)`, NOT a raw float subtraction. Summing
 *    floats and skipping the rounding drifts from the original's displayed
 *    values (registry R-F2).
 *  - `price` comes from the item record; a movement's own price is used only
 *    for the price-history observations, never for the stock value (1313).
 */
export function buildItemIndexes(items: ItemRow[], movements: MovementRow[]): ItemIndexes {
  const operational = excludeCancelled(movements)

  const byItem = new Map<string, ItemTotals>()
  const balMap = new Map<string, WarehouseBalance>()
  const priceObs = new Map<string, PriceObservation[]>()

  for (const m of operational) {
    const inQ = num(m.in_qty)
    const outQ = num(m.out_qty)

    /* Only a positive price is an observation (1283) — a null or 0 price is
       "not recorded", not a price of zero. */
    if (m.price != null && Number(m.price) > 0) {
      const list = priceObs.get(m.item_code) ?? []
      list.push({ p: Number(m.price), d: m.date, k: m.partner ?? '' })
      priceObs.set(m.item_code, list)
    }

    const key = m.warehouse + '|' + m.item_code
    let b = balMap.get(key)
    if (!b) {
      b = {
        w: m.warehouse, c: m.item_code, in: 0, out: 0, n: 0, q: 0,
        last: '', first: '9999', price: 0, val: 0, name: '', unit: '',
      }
      balMap.set(key, b)
    }
    b.in += inQ; b.out += outQ; b.n++
    if (m.date > b.last) b.last = m.date
    if (m.date < b.first) b.first = m.date

    let bi = byItem.get(m.item_code)
    if (!bi) { bi = { in: 0, out: 0, n: 0, last: '', q: 0, price: 0, val: 0 }; byItem.set(m.item_code, bi) }
    bi.in += inQ; bi.out += outQ; bi.n++
    if (m.date > bi.last) bi.last = m.date
  }

  /* Finalisation pass — index.html:1313. */
  const itemBy = new Map(items.map((i) => [i.code, i]))
  for (const [code, bi] of byItem) {
    const it = itemBy.get(code)
    bi.q = +(bi.in - bi.out).toFixed(4)
    bi.price = it && it.price != null ? Number(it.price) : 0
    bi.val = bi.q * bi.price
  }
  for (const b of balMap.values()) {
    const it = itemBy.get(b.c)
    b.q = +(b.in - b.out).toFixed(4)
    b.price = it && it.price != null ? Number(it.price) : 0
    b.val = b.q * b.price
    b.name = it ? it.name : `(nomenklaturada yoxdur: ${b.c})`
    b.unit = it?.unit ?? ''
  }

  return { byItem, bal: Array.from(balMap.values()), priceObs, operational }
}
