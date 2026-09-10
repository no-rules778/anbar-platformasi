import { condKey } from './condSplit'
import type { CondKey, CondRecord } from './condSplit'
import type { WarehouseBalance } from './itemIndex'
import type { ItemRow } from '../api/items.api'

/* Balance-table row construction — index.html:2280-2324.

   The screen's three source shapes (M9-30, M9-31, M9-33), the no-movement
   catalogue rows (M9-34, M9-35) and the display-only condition markers
   (M9-41…M9-43, M9-45).

   Filters, sorts and KPI aggregates (M9-51…M9-64) are NOT here yet — they are
   the next slice and read these rows as their input. */

/** The synthetic warehouse label used by `__sum` (index.html:2285). */
export const ALL_WAREHOUSES = 'bütün anbarlar'

/** The placeholder warehouse of a no-movement row in ayrı mode (2300). */
export const NO_WAREHOUSE = '—'

/** `BF.w` — '' is «Anbarlar üzrə ayrı», `__sum` is «Ümumi», else a warehouse. */
export type BalanceMode = string

/**
 * One rendered balance row.
 *
 * Deliberately NOT `WarehouseBalance`. The legacy `__sum` and no-movement rows
 * are built as fresh object literals that carry no `first` key at all
 * (2285, 2300), so a row type demanding `first` would misdescribe two of the
 * three shapes. `first` is therefore optional and present only on rows that
 * came straight from `IX.bal`.
 */
export interface BalanceRow {
  w: string
  c: string
  name: string
  unit: string
  price: number
  in: number
  out: number
  n: number
  q: number
  val: number
  last: string
  /** Only on rows sourced directly from `IX.bal` (the ayrı/named shapes). */
  first?: string
  /** `1` on a catalogue row that has no movement at all (2300). */
  nomv?: 1
  /* Display-only markers, attached at 2313-2323. Never feed q/val (M9-41). */
  cUnfit: number
  cRepair: number
  cOnsite: number
  cIcare: number
}

/** Marker field per condition key — legacy `CONDF` (index.html:2325). */
export const CONDF: Record<CondKey, 'cUnfit' | 'cRepair' | 'cOnsite' | 'cIcare'> = {
  unfit: 'cUnfit',
  repair: 'cRepair',
  onsite: 'cOnsite',
  icare: 'cIcare',
}

const num = (v: number | null | undefined): number =>
  v == null || !Number.isFinite(Number(v)) ? 0 : Number(v)

/**
 * Builds the row set for a mode, mirroring index.html:2280-2324 exactly.
 *
 * Three details are load-bearing and must not be "simplified":
 *  - In `__sum`, `q` and `val` are recomputed AFTER the in/out sums (2289),
 *    never summed from the per-warehouse rows. Summing `val` instead drifts,
 *    because each source `val` was itself rounded through its own `q` (M9-31).
 *  - `q` is `+(in - out).toFixed(4)`, the same 4-decimal rule as `index()`.
 *  - `__sum` copies `name`/`unit`/`price` from the FIRST `IX.bal` row seen for
 *    that code (2285) rather than re-reading the catalogue.
 *
 * `bal` is never mutated: both branches build new objects or copy (2293).
 */
export function buildBalanceRows(
  bal: WarehouseBalance[],
  items: ItemRow[],
  conds: Map<string, CondRecord>,
  mode: BalanceMode,
): BalanceRow[] {
  const src: BalanceRow[] = []

  if (mode === '__sum') {
    /* Re-aggregate by code (2281-2289). */
    const m = new Map<string, BalanceRow>()
    for (const b of bal) {
      let x = m.get(b.c)
      if (!x) {
        x = {
          w: ALL_WAREHOUSES, c: b.c, name: b.name, unit: b.unit, price: b.price,
          in: 0, out: 0, n: 0, q: 0, val: 0, last: '',
          cUnfit: 0, cRepair: 0, cOnsite: 0, cIcare: 0,
        }
        m.set(b.c, x)
      }
      x.in += b.in
      x.out += b.out
      x.n += b.n
      if (b.last > x.last) x.last = b.last
    }
    for (const x of m.values()) {
      x.q = +(x.in - x.out).toFixed(4)
      x.val = x.q * (x.price || 0)
      src.push(x)
    }
  } else if (mode) {
    /* A named warehouse filters IX.bal by w (2290-2291). */
    for (const b of bal) {
      if (b.w === mode) src.push(toRow(b))
    }
  } else {
    /* Default «Anbarlar üzrə ayrı» — one row per warehouse × item (2293). */
    for (const b of bal) src.push(toRow(b))
  }

  /* Catalogue items with no movement at all (2296-2302). Appended ONLY in the
     ayrı and __sum modes — a specific warehouse never gets them, because a row
     with no movement has no warehouse to belong to (M9-35). */
  if (!mode || mode === '__sum') {
    const seen = new Set(src.map((b) => b.c))
    for (const i of items) {
      if (seen.has(i.code)) continue
      src.push({
        w: mode === '__sum' ? ALL_WAREHOUSES : NO_WAREHOUSE,
        c: i.code, name: i.name, unit: i.unit || '', price: i.price || 0,
        in: 0, out: 0, q: 0, val: 0, last: '', n: 0, nomv: 1,
        cUnfit: 0, cRepair: 0, cOnsite: 0, cIcare: 0,
      })
    }
  }

  attachConditions(src, conds, mode)
  return src
}

/** `IX.bal` row → display row, preserving `first` (which only this shape has). */
function toRow(b: WarehouseBalance): BalanceRow {
  return {
    w: b.w, c: b.c, name: b.name, unit: b.unit, price: b.price,
    in: b.in, out: b.out, n: b.n, q: b.q, val: b.val,
    last: b.last, first: b.first,
    cUnfit: 0, cRepair: 0, cOnsite: 0, cIcare: 0,
  }
}

/**
 * Attaches the display-only markers (index.html:2303-2324).
 *
 * Purely presentational: it never touches the already-computed `q` and `val`
 * (M9-41), and markers may legitimately exceed the balance (M9-45) — nothing
 * here clamps them. In `__sum` the markers are summed across warehouses by
 * code (M9-43); otherwise they come from `condOf(w, c)` (M9-42).
 */
function attachConditions(
  src: BalanceRow[],
  conds: Map<string, CondRecord>,
  mode: BalanceMode,
): void {
  if (mode === '__sum') {
    const byCode = new Map<string, CondRecord>()
    for (const [key, cd] of conds) {
      /* The map is keyed `w|c`; the code is everything after the first '|',
         because a warehouse name cannot contain one but a code must not be
         truncated if it ever did. */
      const c = key.slice(key.indexOf('|') + 1)
      let x = byCode.get(c)
      if (!x) { x = { unfit: 0, repair: 0, onsite: 0, icare: 0 }; byCode.set(c, x) }
      x.unfit += num(cd.unfit)
      x.repair += num(cd.repair)
      x.onsite += num(cd.onsite)
      x.icare += num(cd.icare)
    }
    for (const b of src) {
      const x = byCode.get(b.c)
      b.cUnfit = x ? x.unfit : 0
      b.cRepair = x ? x.repair : 0
      b.cOnsite = x ? x.onsite : 0
      b.cIcare = x ? x.icare : 0
    }
    return
  }
  for (const b of src) {
    const cd = conds.get(condKey(b.w, b.c)) ?? null
    b.cUnfit = cd ? num(cd.unfit) : 0
    b.cRepair = cd ? num(cd.repair) : 0
    b.cOnsite = cd ? num(cd.onsite) : 0
    b.cIcare = cd ? num(cd.icare) : 0
  }
}
