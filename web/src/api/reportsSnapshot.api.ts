import { fetchItems, type ItemRow } from './items.api'
import { fetchItemMovements, type MovementRow } from './itemMovements.api'
import { fetchWarehouses, type WarehouseRow } from './warehouses.api'
import { fetchPartners, type PartnerRow } from './partners.api'

/* The «Hesabatlar» snapshot — M14-10 … M14-16.

   READ-ONLY: four SELECTs, no RPC, no write. Exactly the tables rRep()
   consumes through DB/IX (index.html:867-871): `movements`, `items`,
   `warehouses` and `partners` — the last ONLY because the `knt` branch reads
   VÖEN and contract from the partner directory (6746, 6750).

   This is a NEW snapshot rather than a widening of the Phase 11 dashboard
   snapshot (M14-11): that snapshot's exact read set is an accepted contract
   and must not change under Phase 14, even though the two happen to read the
   same four tables today. The Phase 11 precedent is explicit about this.

   NO write-off valuation read. The `qaime` branch values a «Silinmə» row
   through `movementValuation()`, which takes a valuation MAP — and legacy's
   own `rRep()` path has no `DB.woVals` dependency beyond what the boot loader
   already holds. The map is supplied empty here, so every Silinmə falls to the
   documented legacy per-row fallback; adding a fifth read would be a behaviour
   change, not parity, and belongs to a separate decision.

   Atomic like every accepted snapshot since Phase 8: any reader's error or
   rejection fails the whole generation and nothing partial is returned. The
   legacy loader instead toasts per failed table and renders whatever loaded
   (855) — an accepted deviation, not parity.

   NO CLIENT-SIDE WAREHOUSE SCOPING (M14-15): rows are whatever RLS returns;
   the warehouse list is the unscoped catalogue. */

export interface ReportsSnapshot {
  movements: MovementRow[]
  items: ItemRow[]
  /** Every `warehouses` row — `DB.locs` (935); the page derives `DB.whs`. */
  locations: WarehouseRow[]
  partners: PartnerRow[]
}

export type ReportsSnapshotResult =
  | { ok: true; snapshot: ReportsSnapshot }
  | { ok: false; error: string }

const FAIL_MOVEMENTS = 'Mal hərəkəti yüklənmədi'
const FAIL_ITEMS = 'Nomenklatura yüklənmədi'
const FAIL_WAREHOUSES = 'Anbar siyahısı yüklənmədi'
const FAIL_PARTNERS = 'Kontragentlər yüklənmədi'

const msg = (e: unknown, fallback: string): string =>
  (e instanceof Error && e.message ? e.message : fallback)

/**
 * Reads everything the reports page needs, as ONE atomic snapshot.
 *
 * Never throws. Both failure shapes of every read — a returned error result
 * and a rejected promise — end in `ok: false` (M14-12). A read that SUCCEEDS
 * with zero rows is a VALID snapshot (M14-13): an empty database renders
 * empty reports, never an error surface.
 */
export async function fetchReportsSnapshot(): Promise<ReportsSnapshotResult> {
  try {
    const [movements, items, locations, partners] = await Promise.all([
      fetchItemMovements(),
      fetchItems(),
      /* Both throw rather than returning `{ error }` (M3-06a), so they are
         normalised here instead of rejecting the whole Promise.all. */
      fetchWarehouses().then(
        (rows) => ({ ok: true as const, rows }),
        (e: unknown) => ({ ok: false as const, error: msg(e, FAIL_WAREHOUSES) }),
      ),
      fetchPartners().then(
        (rows) => ({ ok: true as const, rows }),
        (e: unknown) => ({ ok: false as const, error: msg(e, FAIL_PARTNERS) }),
      ),
    ])

    if (!movements.ok) return { ok: false, error: movements.error ?? FAIL_MOVEMENTS }
    if (!items.ok) return { ok: false, error: items.error ?? FAIL_ITEMS }
    if (!locations.ok) return { ok: false, error: locations.error }
    if (!partners.ok) return { ok: false, error: partners.error }

    return {
      ok: true,
      snapshot: {
        movements: movements.rows,
        items: items.rows,
        locations: locations.rows,
        partners: partners.rows,
      },
    }
  } catch (e) {
    return { ok: false, error: msg(e, 'Məlumat yüklənmədi') }
  }
}
