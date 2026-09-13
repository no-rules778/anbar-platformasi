import { supabase } from './supabase'

/* M18-10 — the rail counter badges.

   Legacy `counters()` (index.html:1521-1531) fills SEVEN badges from the
   global in-memory cache that `loadFromDB()` (864) populated once at sign-in:

     c-mov  nf(normalMovements().length)          derived — filtered movements
     c-bal  nf(IX.positions.length)               derived — non-zero positions
     c-nom  nf(DB.items.length)                   plain row count
     c-knt  nf(DB.partners.length)                plain row count
     c-anb  nf(DB.whs.length + DB.locs.length)    plain row count (two tables)
     c-log  the audit total                       already migrated (M4-16)
     c-ctrl derived control-issue row count       derived — computed rules

   React deliberately dropped that global cache: every page loads its own
   snapshot. That architecture is accepted Phase 1-17 behaviour and Phase 18
   does not reopen it. It does, however, decide what a badge can honestly be.

   TWO of the plain row counts are implemented, exactly the way the audit badge
   already is — `head: true`, count-only, no rows fetched, RLS applied by the
   server. They are cheap and they are what legacy displayed.

   `c-knt` is NOT fetched. Its badge belongs to a «Kontragentlər» rail entry
   that, by owner decision **D-P1 (ACCEPTED, 2026-09-12)**, is deliberately not
   created: that module's content is already migrated as the `knt` report, and
   a second surface for it would be a duplicate, not parity (ledger M18-51,
   M18-52). With no consumer, counting partners at boot would be a request
   whose result nothing can ever display.

   The THREE derived badges (c-mov, c-bal, c-ctrl) are NOT implementable this
   way. Each needs the full movement/balance dataset and the client-side rules
   that Phase 8, 9 and 15 migrated into the pages themselves. Reproducing them
   at boot would mean eagerly loading the whole platform's movement history on
   every sign-in — reintroducing the cache the migration removed, and slowing
   first paint for a number in a sidebar. Owner decision **D-P4 (ACCEPTED,
   2026-09-12)** settles this: they are intentionally omitted. A wrong number in
   a badge is worse than no badge — it is a claim about the data that nothing
   verified.

   `ok: false` degrades to the same '!' the audit badge uses, never to 0 — a
   failed count must not be displayed as "none". */

export interface NavCounts {
  /** `DB.items.length` — c-nom. */
  items: number | null
  /** `DB.whs.length + DB.locs.length` — c-anb. */
  warehouses: number | null
}

type CountTable = 'items' | 'warehouses'

async function countOf(table: CountTable, filter?: (q: CountQuery) => CountQuery): Promise<number | null> {
  try {
    const base = supabase.from(table).select('*', { count: 'exact', head: true }) as unknown as CountQuery
    const { count, error } = await (filter ? filter(base) : base)
    if (error) return null
    return count ?? 0
  } catch {
    return null
  }
}

/** The narrow slice of the query builder these count-only reads use. */
interface CountQuery extends PromiseLike<{ count: number | null; error: unknown }> {
  eq(column: string, value: unknown): CountQuery
}

/**
 * Fetches the two displayed plain-count rail badges in parallel.
 *
 * A failed leg yields `null` for that badge only; one broken count must not
 * blank the other. `warehouses` sums two READS of the one `warehouses` table
 * the way legacy does, so it is null if EITHER leg fails — a partial sum would
 * understate the total and look like a real, smaller number.
 */
export async function fetchNavCounts(): Promise<NavCounts> {
  const [items, whs, locs] = await Promise.all([
    countOf('items'),
    /* `DB.whs` — ACTIVE rows of type 'anbar' only (index.html:933). */
    countOf('warehouses', (q) => q.eq('active', true).eq('type', 'anbar')),
    /* `DB.locs` — EVERY warehouses row, active or not, both types (935).
       There is no separate `locations` table: legacy derives both lists from
       the one `warehouses` table, which is why c-anb double-counts the active
       anbar rows. That is legacy's arithmetic, reproduced rather than
       "corrected" — changing the number here would be an unrequested
       behaviour change dressed up as a bug fix. */
    countOf('warehouses'),
  ])
  return {
    items,
    warehouses: whs === null || locs === null ? null : whs + locs,
  }
}
