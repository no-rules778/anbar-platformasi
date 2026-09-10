/* Group selection («Malları seç») — index.html:4034-4092, 4159-4173.

   ONE list serves two modes: 'wo' (group write-off) and 'mv' (multi-item
   transfer). Neither writes to Supabase — both only append draft lines; the
   real write is the main «Sənədi qeyd et» (the <<2026-08-24 fix>> comment at
   4494-4498). Any description of group write-off as a direct atomic write is
   stale.

   Availability subtracts draft lines already holding the same warehouse+item,
   so a draft plus a bulk selection cannot together exceed the balance. */

import { condBuckets, condSplitCheck, condSplitSum, condSplitZero, COND_COLS } from './condSplit'
import type { CondRecord, CondSplit } from './condSplit'

/** A draft line as the availability maths sees it. */
export interface PendingQtyLine {
  kind: string
  w: string
  c: string
  q: number
}

export interface BulkRow {
  c: string
  name: string
  unit: string
  price: number
  /** Current warehouse balance. */
  bal: number
  /** Quantity held by pending draft lines. */
  pending: number
  /** bal − pending, rounded to 4 decimals. */
  avail: number
}

export interface BalanceEntry {
  w: string
  c: string
  q: number
}

export interface BulkItem {
  code: string
  name: string
  unit: string | null
  price: number | null
}

/**
 * `bulkWriteOffRows(wh)` — index.html:4034-4052.
 *
 * Positive-balance positions in the chosen warehouse that still exist in the
 * nomenclature (an unknown code is dropped — the server would refuse it
 * anyway), less whatever the draft already holds. Sorted by name with the
 * Azerbaijani collator.
 */
export function bulkWriteOffRows(
  wh: string,
  balances: readonly BalanceEntry[],
  itemBy: ReadonlyMap<string, BulkItem>,
  lines: readonly PendingQtyLine[],
): BulkRow[] {
  const rows: BulkRow[] = []
  for (const b of balances) {
    if (b.w !== wh || !(b.q > 1e-9)) continue
    const it = itemBy.get(b.c)
    if (!it) continue
    const pending = lines
      .filter((l) => l.kind !== 'in' && l.w === wh && l.c === b.c)
      .reduce((s, l) => s + (Number(l.q) || 0), 0)
    const avail = +(b.q - pending).toFixed(4)
    if (!(avail > 1e-9)) continue
    rows.push({
      c: b.c,
      name: it.name,
      unit: it.unit ?? '',
      price: it.price ?? 0,
      bal: b.q,
      pending,
      avail,
    })
  }
  return rows.sort((a, b) => String(a.name).localeCompare(String(b.name), 'az'))
}

/**
 * `bulkWriteOffFiltered()` — index.html:4054-4060.
 * Code or name, case-insensitive. The code is compared as TEXT, so a
 * zero-padded code keeps its leading zeroes.
 */
export function bulkWriteOffFiltered(rows: readonly BulkRow[], query: string): BulkRow[] {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return [...rows]
  return rows.filter(
    (r) => r.c.toLowerCase().includes(q) || String(r.name ?? '').toLowerCase().includes(q),
  )
}

export interface BulkLot {
  allocations: { layer_id: string; qty: number }[]
  sourceAmount: number | null
  /** Distinct source-layer prices retained for the draft-lines display. */
  /** Optional for drafts persisted before M7-40 retained this display field. */
  priceVariants?: number[]
  /* H-3 — the `revision` returned by `get_stock_layers` FOR THIS ROW. It is
     the optimistic-concurrency token the server checks against the layers the
     allocation was built from, so it must travel with the allocation. The
     capability version from `stock_layers_supported()` is a different value
     entirely and is never a substitute. */
  revision: string | null
}

export interface BulkOverride {
  finalAmount: string
  reason: string
}

export interface BulkBad {
  code: string
  why: string
}

export interface BulkSummary {
  n: number
  qty: number
  amount: number
  bad: BulkBad[]
}

/**
 * `bulkWriteOffSummary()` — index.html:4062-4092.
 *
 * Counts the ready rows and lists every reason a row is NOT ready. The post
 * button is enabled only when `n > 0` and `bad` is empty, so each `why` here is
 * a real gate, not advisory text.
 */
export function bulkWriteOffSummary(args: {
  rows: readonly BulkRow[]
  sel: ReadonlyMap<string, number>
  split: ReadonlyMap<string, Partial<CondSplit>>
  lots: ReadonlyMap<string, BulkLot>
  values: ReadonlyMap<string, BulkOverride>
  condOf: (code: string) => CondRecord | null
  condPendingOf: (code: string) => Partial<Record<string, number>>
  layerActive: boolean
}): BulkSummary {
  const byCode = new Map(args.rows.map((r) => [r.c, r]))
  let n = 0
  let qty = 0
  let amount = 0
  const bad: BulkBad[] = []

  for (const [code, q] of args.sel) {
    const r = byCode.get(code)
    if (!r) { bad.push({ code, why: 'mövcud deyil' }); continue }
    if (!(q > 0)) { bad.push({ code, why: 'miqdar sıfırdır' }); continue }
    if (q > r.avail + 1e-9) { bad.push({ code, why: 'qalıqdan çoxdur' }); continue }

    /* A marked item is limited bucket by bucket: 2 rented units cannot yield a
       3-unit rented move. `sel` only knows the total, so the buckets are
       checked separately. */
    const bk = condBuckets(args.condOf(code), r.avail, args.condPendingOf(code))
    if (bk.marked) {
      const sp = args.split.get(code)
      if (!sp) { bad.push({ code, why: 'tiplərə görə bölgü göstərilməyib' }); continue }
      const v = condSplitCheck(sp, bk)
      if (!v.ok) { bad.push({ code, why: v.error ?? 'bölgü etibarsızdır' }); continue }
    }

    if (args.layerActive) {
      const lot = args.lots.get(code)
      if (!lot) { bad.push({ code, why: 'mənbə partiyası seçilməyib' }); continue }
      const aq = Array.isArray(lot.allocations)
        ? lot.allocations.reduce((s, a) => s + (Number(a.qty) || 0), 0)
        : 0
      if (Math.abs(aq - q) > 0.00005) {
        bad.push({ code, why: 'partiya cəmi miqdara bərabər deyil' }); continue
      }
      const ov = args.values.get(code)
      if (ov && ov.finalAmount !== '' && ov.finalAmount != null && !String(ov.reason ?? '').trim()) {
        bad.push({ code, why: 'məbləğ dəyişikliyinin səbəbi yoxdur' }); continue
      }
    }

    n++
    qty += q
    amount += q * (r.price || 0)
  }
  return { n, qty, amount, bad }
}

export interface SelectionPatch {
  sel: number
  split: CondSplit | null
}

/**
 * `bwSelectRow(r)` — index.html:4159-4173.
 *
 * Selecting a row takes ALL available quantity by default: one figure for an
 * unmarked item, each bucket at its own maximum for a marked one. Both
 * individual selection and «select all» call this — two separate paths would
 * let one of them skip the split and be blocked later as "bölgü göstərilməyib".
 */
export function bwSelectRow(
  row: BulkRow,
  cond: CondRecord | null,
  pending: Partial<Record<string, number>>,
): SelectionPatch {
  const bk = condBuckets(cond, row.avail, pending)
  if (!bk.marked) return { sel: row.avail, split: null }
  const sp = condSplitZero()
  sp.normal = bk.normal
  for (const cc of COND_COLS) sp[cc.k] = bk[cc.k]
  return { sel: condSplitSum(sp), split: sp }
}
