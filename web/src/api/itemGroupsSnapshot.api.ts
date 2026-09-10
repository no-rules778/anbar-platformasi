import { fetchItems, type ItemRow } from './items.api'
import { fetchItemMovements, type MovementRow } from './itemMovements.api'
import { fetchWarehouses } from './warehouses.api'
import { fetchReferenceValues } from './referenceValues.api'
import { ITEM_CATEGORIES } from '../lib/referenceFallbacks'

/* The Mal qrupları data snapshot.

   WHY THIS EXISTS RATHER THAN REUSING useNomenclatureStore.load()
   (registry M6-S2, M6-S3, M6-S4, R-G9):

     * `load()` returns `void`. There is no success value to test, so an export
       triggered after it cannot know whether the refresh actually worked.
     * `load()` treats a failed MOVEMENTS read as non-fatal — correct for
       Nomenklatura, which still renders its list without balances. It is wrong
       here: every row of this screen IS a balance, and the last-purchase price
       comes from the same movements. A silent movements failure would render
       "no positive balances" and, worse, let the user export that emptiness as
       though it were the truth.

   So this loader is ATOMIC and EXPLICIT: it either returns a complete,
   consistent snapshot (`ok: true`) or it returns `ok: false` with the real
   error and NO partial data. The caller keeps its previous state on failure
   (index.html:2833-2841 — «Məlumat yenilənmədi — ixrac dayandırıldı»).

   Both failure shapes are absorbed — a returned `{ error }` AND a rejected
   promise. That is the M3-06a lesson: fetchWarehouses() throws rather than
   returning an error object, and an unhandled rejection here would blank the
   whole screen. */

export interface ItemGroupsSnapshot {
  items: ItemRow[]
  movements: MovementRow[]
  /** Warehouse NAMES, already filtered to the legacy `DB.whs` definition. */
  warehouses: string[]
  /** Active item-category labels for the filter panel. */
  categories: string[]
  /** False means `categories` holds the built-in fallback, not the directory's
      own contents. A ready-but-empty directory stays empty (A14 / M6-S15). */
  refsReady: boolean
}

export type ItemGroupsSnapshotResult =
  | { ok: true; snapshot: ItemGroupsSnapshot }
  | { ok: false; error: string }

/** A warehouse row as the legacy loader classifies it (index.html:933). */
interface WarehouseLike {
  name: string
  type: string | null
  active: boolean | null
}

/**
 * `DB.whs` — index.html:933 (M6-S5, R-G10).
 *
 * `(warehouses.data || []).filter(r => r.active && r.type === 'anbar')`
 *
 * The same table also holds LOCATIONS, which the legacy code keeps separately
 * as `DB.locs` (935) and never offers as a warehouse. `fetchWarehouses()`
 * returns every row, so this filter is what keeps a location — or a
 * deactivated warehouse — out of the filter panel and out of the export.
 */
export function warehouseNames(rows: WarehouseLike[]): string[] {
  return rows.filter((r) => r.active && r.type === 'anbar').map((r) => r.name)
}

const FAIL_ITEMS = 'Nomenklatura yüklənmədi'
const FAIL_MOVEMENTS = 'Mal hərəkəti yüklənmədi'
const FAIL_WAREHOUSES = 'Anbar siyahısı yüklənmədi'

function message(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e) return e
  return fallback
}

/**
 * Reads everything the screen needs, atomically.
 *
 * Fatal (M6-S4): items, movements, warehouses. Without any of the three the
 * balances, prices or scoping would be wrong rather than merely incomplete.
 *
 * Not fatal: the reference directory. A failed read falls back to the built-in
 * category list exactly as categoryOptions() does (index.html:695), while a
 * successfully loaded but empty ACTIVE list stays empty — an Admin who hid
 * every category must not have them reappear (M6-S15).
 */
export async function fetchItemGroupsSnapshot(): Promise<ItemGroupsSnapshotResult> {
  try {
    const [items, movements, refs, warehouses] = await Promise.all([
      fetchItems(),
      fetchItemMovements(),
      fetchReferenceValues(),
      /* Throws instead of returning `{ error }`, so it is normalised here
         rather than being allowed to reject the whole Promise.all. */
      fetchWarehouses().then(
        (rows) => ({ ok: true as const, rows }),
        (e: unknown) => ({ ok: false as const, error: message(e, FAIL_WAREHOUSES) }),
      ),
    ])

    if (!items.ok) return { ok: false, error: items.error ?? FAIL_ITEMS }
    if (!movements.ok) return { ok: false, error: movements.error ?? FAIL_MOVEMENTS }
    if (!warehouses.ok) return { ok: false, error: warehouses.error }

    return {
      ok: true,
      snapshot: {
        items: items.rows,
        movements: movements.rows,
        warehouses: warehouseNames(warehouses.rows),
        categories: refs.ready
          ? refs.values.category.filter((r) => r.active).map((r) => r.name)
          : ITEM_CATEGORIES.slice(),
        refsReady: refs.ready,
      },
    }
  } catch (e) {
    /* Nothing above should reject, but a rejection must still produce a clean
       failure rather than an unhandled promise — the export path depends on
       this returning, not throwing. */
    return { ok: false, error: message(e, 'Məlumat yüklənmədi') }
  }
}
