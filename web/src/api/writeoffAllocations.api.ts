import { supabase } from './supabase'

/* `stock_layer_allocations` — the source-lot rows behind `DB.woAllocs`
   (index.html:949-975), read for the «Mənbə partiyalar» sheet of the separate
   Silinmə report. Phase 8 / I-9.

   READ-ONLY. No INSERT, UPDATE, DELETE or RPC. The table is the audit record
   of which receipt lots a write-off consumed; this report only displays it.

   COLUMN PROVENANCE — the live column set was read from the TEST project
   through the Supabase SQL editor and recorded in the A8 audit
   (`docs/superpowers/audits/2026-09-07-phase8-i8-a8-allocation-metadata.md`).
   Independently corroborated here against the GENERATED `types/database.ts`
   (`stock_layer_allocations.Row`), an artefact produced outside that session:
   the 14 columns, their types and their nullability agree exactly.

     writeoff_movement_id uuid NOT NULL · source_movement_id uuid NULL
     source_doc_num_snapshot text NULL  · source_invoice_snapshot text NULL
     source_date_snapshot date NULL     · qty numeric NOT NULL
     price_status_snapshot text NOT NULL· unit_price_snapshot numeric NULL
     source_amount_snapshot numeric NULL· reversed_at timestamptz NULL
     id uuid · layer_id uuid · created_by uuid · created_at timestamptz

   `layer_id`, `created_by` are real columns deliberately left unread — nothing
   in this report displays them. `id` and `created_at` ARE read, for ordering
   only (see below), and never reach a cell.

   AN EXPLICIT COLUMN LIST, NOT `select('*')` — the same rule the movements and
   valuations reads follow (R3). A wildcard would silently widen the payload
   whenever the table gains a column, and would make the row type below a claim
   about the live schema that nothing verifies.

   `reversed_at` IS SELECTED, precisely because the live SELECT policy

     EXISTS (SELECT 1 FROM movements m WHERE m.id = …writeoff_movement_id)

   carries NO `reversed_at` condition. Reversed allocations ARE returned by the
   database; excluding them is CLIENT-side work (legacy does it at
   index.html:1775) and must never be described as an RLS guarantee.

   WHAT THIS MODULE DOES NOT PROVE: `has_table_privilege('authenticated', …)`
   is a GRANT check. It does not establish effective per-role visibility — the
   policy body defers entirely to movement RLS, which no read so far has
   exercised. Nor does anything establish that allocation rows EXIST in any
   quantity: a zero-row read is indistinguishable from a correct empty result.
   Both remain open live gates. */

/** The subset of `stock_layer_allocations` this report reads. */
export interface WriteoffAllocationRow {
  /** The parent Silinmə movement — the legacy `a.movementId`. */
  writeoff_movement_id: string
  /** Nullable live: an allocation can outlive the movement reference. */
  source_movement_id: string | null
  source_doc_num_snapshot: string | null
  source_invoice_snapshot: string | null
  source_date_snapshot: string | null
  /** NOT NULL live. */
  qty: number
  /** NOT NULL live — «Qiymət statusu». */
  price_status_snapshot: string
  /** Nullable live: an unpriced lot has no unit price, which the sheet shows
      as an EMPTY cell, not as a zero. */
  unit_price_snapshot: number | null
  source_amount_snapshot: number | null
  /** Nullable live. Non-null marks a REVERSED allocation, excluded here. */
  reversed_at: string | null
  /** Ordering only — never rendered. See the ORDER note below. */
  id: string
  /** Ordering only — never rendered. */
  created_at: string
}

export interface WriteoffAllocationsResult {
  rows: WriteoffAllocationRow[]
  ok: boolean
  error: string | null
}

const COLUMNS =
  'writeoff_movement_id, source_movement_id, source_doc_num_snapshot, ' +
  'source_invoice_snapshot, source_date_snapshot, qty, price_status_snapshot, ' +
  'unit_price_snapshot, source_amount_snapshot, reversed_at, id, created_at'

const PAGE_SIZE = 1000
const MAX_PAGES = 200

/**
 * Reads every allocation row, paging until a short page arrives.
 *
 * ORDER — `created_at` THEN `id`. The first key preserves the legacy
 * chronological sheet order (`DB.woAllocs` is loaded and kept in `created_at`
 * order, index.html:949-975), so the exported «Mənbə partiyalar» rows appear
 * in the same sequence an accountant is used to. The second key is the
 * correctness half: `created_at` alone is NOT unique, and `range()` pages
 * under a non-unique sort can overlap or skip rows, so a unique tie-breaker is
 * required for the assembled set to be complete. `id` is the primary key.
 *
 * Ordering by `writeoff_movement_id` instead would also be total, but would
 * REORDER the sheet against legacy for no gain — the grouping it would produce
 * is not part of the exported contract.
 *
 * HONEST LIMIT: a stable total order makes PAGINATION sound. It does NOT give
 * the read a transaction snapshot. Rows inserted, reversed or deleted by
 * another session BETWEEN page requests can still be missed or double-read;
 * PostgREST issues each `range()` as its own statement, and nothing here spans
 * them in one transaction. This is inherent to paged reads over a live table
 * and is not claimed to be solved.
 *
 * NEVER THROWS. Both failure shapes are absorbed — a returned `{ error }` and
 * a rejected promise — and a failure yields `ok: false` with NO partial rows.
 * Unlike the legacy `fetchAll()` (index.html:857), which `break`s on error and
 * returns what it read so far, a half-read allocation set is never handed back
 * as though it were the whole table: it would produce a «Mənbə partiyalar»
 * sheet missing real source lots, with nothing indicating the loss.
 *
 * Reaching MAX_PAGES with a FULL final page is a FAILURE, not a success: the
 * set may continue past the cap, and a possibly-incomplete result is never
 * reported as complete. A full last page that happens to be the true end is
 * refused too — the read cannot tell the two apart, and refusing is the safe
 * side of that ambiguity.
 */
export async function fetchWriteoffAllocations(): Promise<WriteoffAllocationsResult> {
  try {
    const out: WriteoffAllocationRow[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE
      const { data, error } = await supabase
        .from('stock_layer_allocations')
        .select(COLUMNS)
        .order('created_at')
        .order('id')
        .range(from, from + PAGE_SIZE - 1)
      if (error) return { rows: [], ok: false, error: error.message || 'Naməlum xəta' }
      const batch = (data ?? []) as unknown as WriteoffAllocationRow[]
      out.push(...batch)
      if (batch.length < PAGE_SIZE) return { rows: out, ok: true, error: null }
    }
    /* Every page was full: the cap was reached with no short page to prove the
       end. Refused rather than truncated silently. */
    return { rows: [], ok: false, error: 'Mənbə partiya sətirləri tam oxunmadı' }
  } catch (err) {
    return { rows: [], ok: false, error: err instanceof Error ? err.message : 'Naməlum xəta' }
  }
}
