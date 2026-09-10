import { supabase } from './supabase'

/* `writeoff_valuations` — the Silinmə valuation rows behind `DB.woVals`
   (index.html:950-975). M8-51 / risk R2.

   READ-ONLY. This module contains no INSERT, UPDATE, DELETE or RPC, and I-2
   adds no caller that writes. The table is the audit record of how a write-off
   was valued; the screen only displays it.

   WHY AN EXPLICIT COLUMN LIST, NOT `select('*')`:
   the same rule the movements read follows (R3). A wildcard would silently
   widen the payload whenever the table gains a column, and would make the
   React row type a claim about the live schema that nothing verifies. Adding a
   consumer means widening the list below.

   COLUMN PROVENANCE — the list is exactly the confirmed live column set,
   read from the TEST project (`alkjjbaawmsirsfvqljm`) through the Supabase SQL
   editor and recorded in the I-2 task brief:

     movement_id uuid NOT NULL · source_amount numeric NULL
     known_amount numeric NOT NULL · unknown_qty numeric NOT NULL
     final_amount numeric NULL · valuation_method text NOT NULL
     override_reason text NULL · created_by uuid NOT NULL
     created_at timestamptz NOT NULL · reversed_by_movement_id uuid NULL
     reversed_at timestamptz NULL

   Only the seven columns this screen actually consumes are selected. The four
   that are not — `created_by`, `created_at`, `reversed_by_movement_id`,
   `reversed_at` — are real columns, deliberately left unread: nothing in I-2
   displays them, and the reversal pair belongs to the cancellation milestones.

   LIVE SELECT POLICY (also confirmed read-only, same session):

     EXISTS (SELECT 1 FROM movements m WHERE m.id = writeoff_valuations.movement_id)

   So visibility follows the movement's own visibility: a row whose movement RLS
   hides is not returned here either. Nothing client-side needs to re-scope it,
   and nothing here may assume the set is complete — a missing valuation is a
   NORMAL state, which is precisely why `movementValuation()` has a fallback
   rather than an error path. */

/** The subset of `writeoff_valuations` this screen reads. */
export interface WriteoffValuationRow {
  movement_id: string
  /** Nullable in the live schema — «Mənbə məbləği». */
  source_amount: number | null
  /** NOT NULL live; typed nullable anyway, see `toValuation()`. */
  known_amount: number | null
  /** NOT NULL live — the quantity that had no known price. */
  unknown_qty: number | null
  /** Nullable live: a write-off can be valued at nothing determinable, and
      that is the state the table renders as «—» rather than as zero. */
  final_amount: number | null
  valuation_method: string
  override_reason: string | null
}

export interface WriteoffValuationsResult {
  rows: WriteoffValuationRow[]
  ok: boolean
  error: string | null
}

const COLUMNS =
  'movement_id, source_amount, known_amount, unknown_qty, final_amount, valuation_method, override_reason'

const PAGE_SIZE = 1000
const MAX_PAGES = 200

/**
 * Reads every write-off valuation row, paging until a short page arrives —
 * the same contract as `fetchItemMovements()`.
 *
 * NEVER THROWS. Both failure shapes are absorbed — a returned `{ error }` and
 * a rejected promise — and a failure yields `ok: false` with NO partial rows,
 * so a caller can never mistake a half-read page for the whole table. That
 * matters more here than elsewhere: a silently truncated valuation set would
 * make real Silinmə rows fall back to the legacy price path and display a
 * DIFFERENT amount, with nothing on screen indicating anything was missing.
 */
export async function fetchWriteoffValuations(): Promise<WriteoffValuationsResult> {
  try {
    const out: WriteoffValuationRow[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE
      /* Ordered for the same reason the movements read is (A11): without an
         ORDER BY, PostgREST may return rows in any order, so `range()` pages
         can overlap or skip and the assembled set is not guaranteed complete.
         `movement_id` is the natural key here and is NOT NULL. */
      const { data, error } = await supabase
        .from('writeoff_valuations')
        .select(COLUMNS)
        .order('movement_id')
        .range(from, from + PAGE_SIZE - 1)
      if (error) return { rows: [], ok: false, error: error.message || 'Naməlum xəta' }
      const batch = (data ?? []) as WriteoffValuationRow[]
      out.push(...batch)
      if (batch.length < PAGE_SIZE) break
    }
    return { rows: out, ok: true, error: null }
  } catch (err) {
    return { rows: [], ok: false, error: err instanceof Error ? err.message : 'Naməlum xəta' }
  }
}

/** `DB.woVals` — index.html:950-975. movement id → its valuation row. */
export function buildWriteoffValuationMap(
  rows: WriteoffValuationRow[],
): Map<string, WriteoffValuationRow> {
  return new Map(rows.map((r) => [String(r.movement_id), r]))
}
