import { supabase } from './supabase'
import type { ReadResult } from '../lib/opReadiness'
import type { CondRecord } from '../lib/condSplit'

/* `stock_conditions` — index.html:908-923 (SQL 025).

   A CORE read for Phase 7, unlike the original which treats it as optional.
   Rationale, in full, in lib/opReadiness.ts: with this map empty every bucket
   reads 0, `marked` is false, the split UI never renders and the whole quantity
   posts as `normal`, silently moving rented or unfit stock as if it were free
   (M7-S3). On the balance screen the same failure only blanks a column; here it
   changes what is written.

   RLS filters the rows: an anbardar sees only their own warehouse.
   `icare_qty` is column 031 — absent on an older server, read as 0, which is
   the original's behaviour too (917). */

export interface StockConditionRow extends CondRecord {
  w: string
  c: string
  note: string
}

const PAGE_SIZE = 1000
const MAX_PAGES = 200

const num = (v: unknown): number => {
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

/**
 * Reads every stock-condition row.
 *
 * Never throws. Absorbs BOTH failure shapes — a returned `{error}` and a
 * rejected promise (the Phase 3a rule) — and reports a failure part-way through
 * paging as `ok:false, partial:true`. The rows gathered before that point are
 * returned for diagnostics only; the readiness matrix refuses to commit them
 * (M7-S2).
 */
export async function fetchStockConditions(): Promise<ReadResult<StockConditionRow>> {
  const out: StockConditionRow[] = []
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE
      /* A02 — the ORDER is part of the read contract, not presentation.
         Without an ORDER BY, PostgREST may return rows in any order, so
         `range()` page boundaries can overlap or skip and the set assembled
         across pages is not guaranteed complete. On this write surface a
         skipped condition row is not a cosmetic gap: the item would read as
         UNMARKED, the split UI would not render, and the whole quantity would
         post as `normal` — the same silent wrong write that M7-S3 exists to
         prevent, except reached while every request succeeds.

         `(warehouse, item_code)` is the table's PRIMARY KEY
         (`stock_conditions_pkey`, confirmed in the live schema capture), so it
         is unique and total — a stable window. The same rule the Phase 5 audit
         (A11) applied to `fetchItemMovements`. */
      const { data, error } = await supabase
        .from('stock_conditions')
        .select('*')
        .order('warehouse')
        .order('item_code')
        .range(from, from + PAGE_SIZE - 1)
      if (error) {
        return {
          rows: out,
          ok: false,
          error: error.message || 'Naməlum xəta',
          partial: out.length > 0,
        }
      }
      const batch = (data ?? []) as Record<string, unknown>[]
      for (const r of batch) {
        out.push({
          w: String(r.warehouse ?? ''),
          c: String(r.item_code ?? ''),
          unfit: num(r.unfit_qty),
          repair: num(r.repair_qty),
          onsite: num(r.onsite_qty),
          icare: num(r.icare_qty),
          note: String(r.note ?? ''),
        })
      }
      if (batch.length < PAGE_SIZE) break
    }
    return { rows: out, ok: true, error: null }
  } catch (err) {
    return {
      rows: out,
      ok: false,
      error: err instanceof Error ? err.message : 'Naməlum xəta',
      partial: out.length > 0,
    }
  }
}

/** Builds the `warehouse|code` lookup the split maths consumes. */
export function toCondMap(rows: readonly StockConditionRow[]): Map<string, CondRecord> {
  return new Map(
    rows.map((r) => [
      `${r.w}|${r.c}`,
      { unfit: r.unfit, repair: r.repair, onsite: r.onsite, icare: r.icare },
    ]),
  )
}
