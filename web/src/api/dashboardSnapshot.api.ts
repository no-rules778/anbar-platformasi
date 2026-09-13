import { fetchItems, type ItemRow } from './items.api'
import { fetchItemMovements, type MovementRow } from './itemMovements.api'
import { fetchWarehouses, type WarehouseRow } from './warehouses.api'
import { fetchPartners, type PartnerRow } from './partners.api'

/* The «İdarə paneli» snapshot — M11-10 / M11-11.

   READ-ONLY: four SELECTs, no RPC, no write. Exactly the tables rDash()
   consumes through DB/IX (index.html:867-871): `movements`, `items`,
   `warehouses` and `partners` — the last one ONLY because controlIssues()'s
   VÖEN rule reads `DB.partners` (7003-7004). No `stock_conditions`,
   `stock_layers`, valuation table or capability probe.

   This is a NEW snapshot rather than a widening of the Phase 10 one: that
   snapshot's exact three-read set is a LIVE VERIFIED contract (M10-10) and
   must not change under it.

   Atomic like every accepted snapshot since Phase 8: any reader's error or
   rejection fails the whole generation and nothing partial is returned. The
   legacy loader instead toasts per failed table and renders whatever loaded
   (855) — an accepted deviation, not parity.

   NO CLIENT-SIDE WAREHOUSE SCOPING (M11-18): rows are whatever RLS returns;
   the warehouse list is the unscoped catalogue. */

export interface DashboardSnapshot {
  movements: MovementRow[]
  items: ItemRow[]
  /** Every `warehouses` row — `DB.locs` (935); the page derives `DB.whs`. */
  locations: WarehouseRow[]
  partners: PartnerRow[]
}

export type DashboardSnapshotResult =
  | { ok: true; snapshot: DashboardSnapshot }
  | { ok: false; error: string }

const FAIL_MOVEMENTS = 'Mal hərəkəti yüklənmədi'
const FAIL_ITEMS = 'Nomenklatura yüklənmədi'
const FAIL_WAREHOUSES = 'Anbar siyahısı yüklənmədi'
const FAIL_PARTNERS = 'Kontragentlər yüklənmədi'

const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshotResult> {
  try {
    const [movements, items, locations, partners] = await Promise.all([
      fetchItemMovements(),
      fetchItems(),
      /* Both throw rather than returning `{ error }`; normalised here so a
         rejection cannot escape `Promise.all`. */
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
    return { ok: true, snapshot: { movements: movements.rows, items: items.rows, locations: locations.rows, partners: partners.rows } }
  } catch (e) {
    return { ok: false, error: msg(e, 'Məlumat yüklənmədi') }
  }
}
