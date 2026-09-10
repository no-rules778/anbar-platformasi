import { fetchItems, type ItemRow } from './items.api'
import { fetchItemMovements, type MovementRow } from './itemMovements.api'
import { fetchWarehouses } from './warehouses.api'
import { fetchWriteoffValuations, type WriteoffValuationRow } from './writeoffValuations.api'

/* The «Mal hərəkəti» data snapshot — I-2.

   READ-ONLY: four SELECTs, no RPC, no write. Modelled on
   `itemGroupsSnapshot.api.ts`, and atomic for the same reason — the screen
   either has a complete, self-consistent picture or it keeps the previous one.

   NO CLIENT-SIDE WAREHOUSE SCOPING HAPPENS HERE (D2, M8-42). The legacy screen
   reads every movement it can see and filters only on the user's own `MF.w`
   choice; `movFiltered()` (index.html:1662-1674) has no anbardar branch, unlike
   `sourceWarehouses()`/`allowedWarehouses()` which the operation form uses.

   What limits an anbardar's rows is the LIVE RLS SELECT policy on `movements`,
   confirmed read-only on the TEST project (`alkjjbaawmsirsfvqljm`):

     is_admin() OR is_rehber() OR (is_anbardar() AND warehouse = current_user_warehouse())

   So the server returns the scoped set and the client renders what it is given.
   To be precise about the division of responsibility: THE CLIENT DOES NOT SCOPE
   ROWS. Adding a client-side anbardar filter here would be an unapproved
   behaviour change, and could hide rows the policy intentionally returns.

   The WAREHOUSE LIST is a different question and is deliberately also unscoped:
   the legacy `#mf-w` select is built from all of `DB.whs` (1619). */

export interface MovementsSnapshot {
  movements: MovementRow[]
  items: ItemRow[]
  /** Legacy `DB.whs` — active `anbar` rows only, for route resolution and the
      warehouse filter. Never scoped to the signed-in user's warehouse. */
  warehouses: string[]
  /** `DB.woVals` rows. A SUCCESSFUL read that returns no rows is legitimately
      empty — every Silinmə then uses the legacy per-row price fallback, which
      is what the original does before SQL 036. A FAILED read is not
      representable here at all: it makes the whole snapshot `ok: false`, so
      this array is never a stand-in for "the table was not read". */
  valuations: WriteoffValuationRow[]
}

export type MovementsSnapshotResult =
  | { ok: true; snapshot: MovementsSnapshot }
  | { ok: false; error: string }

interface WarehouseLike {
  name: string
  type: string | null
  active: boolean | null
}

/** `DB.whs` — index.html:933. Locations and deactivated rows are not
    warehouses; see `itemGroupsSnapshot.api.ts` for the full reasoning. */
function warehouseNames(rows: WarehouseLike[]): string[] {
  return rows.filter((r) => r.active && r.type === 'anbar').map((r) => r.name)
}

const FAIL_MOVEMENTS = 'Mal hərəkəti yüklənmədi'
const FAIL_ITEMS = 'Nomenklatura yüklənmədi'
const FAIL_WAREHOUSES = 'Anbar siyahısı yüklənmədi'
const FAIL_VALUATIONS = 'Silinmə dəyərləri yüklənmədi'

function message(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e) return e
  return fallback
}

/**
 * Reads everything the registry needs.
 *
 * ALL FOUR READS ARE FATAL. Without movements there is no registry; without
 * items every row loses its name and its KPI price fallback; without
 * warehouses no transfer route resolves, so «İstiqamət» would silently
 * degrade to raw partner text and the grouped filter would lose its route
 * group entirely.
 *
 * `writeoff_valuations` is fatal too, and this is the I-2 audit correction.
 * Treating its failure as a degraded success returned `ok: true` carrying an
 * EMPTY valuation array, and the store cannot tell that from a real empty
 * result — so it replaced a good valuation map with an empty one and every
 * existing Silinmə row silently switched to a different fallback amount after
 * a single transient network blip. That breaks the atomic-snapshot contract
 * and M8-45 (a failed refresh must retain the PREVIOUS snapshot, whole).
 *
 * The distinction that matters is preserved, just relocated: a SUCCESSFUL
 * read returning zero rows is still a valid snapshot and still uses the
 * legacy per-row fallback. Only a failed or rejected read is an error.
 *
 * Never throws.
 */
export async function fetchMovementsSnapshot(): Promise<MovementsSnapshotResult> {
  try {
    const [movements, items, warehouses, valuations] = await Promise.all([
      fetchItemMovements(),
      fetchItems(),
      /* Throws rather than returning `{ error }` (M3-06a), so it is
         normalised here instead of rejecting the whole Promise.all. */
      fetchWarehouses().then(
        (rows) => ({ ok: true as const, rows }),
        (e: unknown) => ({ ok: false as const, error: message(e, FAIL_WAREHOUSES) }),
      ),
      /* Normalised like `fetchWarehouses()` above so a REJECTION is an error
         result rather than a thrown Promise.all — both failure shapes must
         reach the `!valuations.ok` check below, not just the returned one. */
      fetchWriteoffValuations().then(
        (r) => r,
        (e: unknown) => ({ ok: false as const, rows: [], error: message(e, FAIL_VALUATIONS) }),
      ),
    ])

    if (!movements.ok) return { ok: false, error: movements.error ?? FAIL_MOVEMENTS }
    if (!items.ok) return { ok: false, error: items.error ?? FAIL_ITEMS }
    if (!warehouses.ok) return { ok: false, error: warehouses.error }
    if (!valuations.ok) return { ok: false, error: valuations.error ?? FAIL_VALUATIONS }

    return {
      ok: true,
      snapshot: {
        movements: movements.rows,
        items: items.rows,
        warehouses: warehouseNames(warehouses.rows),
        valuations: valuations.rows,
      },
    }
  } catch (e) {
    return { ok: false, error: message(e, 'Məlumat yüklənmədi') }
  }
}
