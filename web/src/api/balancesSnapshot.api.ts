import { fetchItems, type ItemRow } from './items.api'
import { fetchItemMovements, type MovementRow } from './itemMovements.api'
import { fetchWarehouses } from './warehouses.api'
import { fetchStockConditions, type StockConditionRow } from './stockConditions.api'

/* The «Anbar qalıqları» data snapshot — T3 (M9-10 … M9-18).

   READ-ONLY: four SELECTs, no RPC, no write. Modelled on
   `movementsSnapshot.api.ts`, and atomic for the same reason — the screen
   either has a complete, self-consistent picture or it keeps the previous one.

   The four reads are exactly the tables the legacy screen consumes
   (index.html:930-975): `movements`, `items`, `warehouses`, `stock_conditions`.
   No `stock_layers` read (M9-146), no capability probe, no RPC (M9-10).

   ALL FOUR READS ARE FATAL — DEVIATION D-J1 (owner-approved, M9-11). Legacy
   swallows a failed `stock_conditions` read (`try/catch`, `condsReady` set
   only inside `if (!condErr)`, 908-923) and keeps working with BLANK markers.
   That silently presents rented or unfit stock as unmarked. Phase 9 makes the
   condition read fatal instead: a failed read fails the whole snapshot, and
   the store then RETAINS the previous good snapshot whole (M9-12). This must
   never be described as parity.

   The one case where D-J1 and legacy agree (M9-13): a read that SUCCEEDS with
   ZERO rows is a valid snapshot — markers read 0, no error. A failed read is
   not representable as `conditions: []`; it is `ok: false`.

   NO CLIENT-SIDE WAREHOUSE SCOPING HAPPENS HERE (M9-17, D2 / M8-42 precedent).
   An anbardar's narrowing comes from the live RLS SELECT policies; this
   module takes no user and renders nothing. The WAREHOUSE LIST is likewise
   unscoped — legacy `#bf-w` is built from all of `DB.whs` (2214, M9-18).

   DETERMINISTIC ORDER (M9-16) is owned by the reused readers: `movements` by
   `date, created_at` (itemMovements.api), `stock_conditions` by
   `warehouse, item_code` (stockConditions.api), `items` by `code`
   (items.api). Each pages until a short page. Nothing is re-sorted here. */

export interface BalancesSnapshot {
  movements: MovementRow[]
  items: ItemRow[]
  /** Legacy `DB.whs` — `active && type === 'anbar'` only (M9-15). Never
      scoped to the signed-in user's warehouse. */
  warehouses: string[]
  /** `DB.conds` rows. A SUCCESSFUL read with no rows is legitimately empty
      (M9-13). A FAILED read is not representable here at all — it makes the
      whole snapshot `ok: false` (D-J1), so this array never stands in for
      "the table was not read". */
  conditions: StockConditionRow[]
}

export type BalancesSnapshotResult =
  | { ok: true; snapshot: BalancesSnapshot }
  | { ok: false; error: string }

interface WarehouseLike {
  name: string
  type: string | null
  active: boolean | null
}

/** `DB.whs` — index.html:933. */
function warehouseNames(rows: WarehouseLike[]): string[] {
  return rows.filter((r) => r.active && r.type === 'anbar').map((r) => r.name)
}

const FAIL_MOVEMENTS = 'Mal hərəkəti yüklənmədi'
const FAIL_ITEMS = 'Nomenklatura yüklənmədi'
const FAIL_WAREHOUSES = 'Anbar siyahısı yüklənmədi'
export const FAIL_CONDITIONS = 'Mal vəziyyəti işarələri yüklənmədi'

function message(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e) return e
  return fallback
}

/**
 * Reads everything the balance screen needs, as ONE atomic snapshot.
 *
 * Never throws. Both failure shapes of every read — a returned error result
 * and a rejected promise — end in `ok: false` (M9-14).
 */
export async function fetchBalancesSnapshot(): Promise<BalancesSnapshotResult> {
  try {
    const [movements, items, warehouses, conditions] = await Promise.all([
      fetchItemMovements(),
      fetchItems(),
      /* Throws rather than returning `{ error }` (M3-06a), so it is
         normalised here instead of rejecting the whole Promise.all. */
      fetchWarehouses().then(
        (rows) => ({ ok: true as const, rows }),
        (e: unknown) => ({ ok: false as const, error: message(e, FAIL_WAREHOUSES) }),
      ),
      /* `fetchStockConditions()` already absorbs both shapes; the rejection
         branch here is belt-and-braces so a future change to that reader
         cannot turn into a thrown Promise.all. */
      fetchStockConditions().then(
        (r) => r,
        (e: unknown) => ({ rows: [], ok: false, error: message(e, FAIL_CONDITIONS) }),
      ),
    ])

    if (!movements.ok) return { ok: false, error: movements.error ?? FAIL_MOVEMENTS }
    if (!items.ok) return { ok: false, error: items.error ?? FAIL_ITEMS }
    if (!warehouses.ok) return { ok: false, error: warehouses.error }
    /* D-J1 — fatal, including a PARTIAL read (some pages then a failure): a
       half-read marker set is exactly the silent blank the deviation exists
       to prevent. */
    if (!conditions.ok) return { ok: false, error: conditions.error ?? FAIL_CONDITIONS }

    return {
      ok: true,
      snapshot: {
        movements: movements.rows,
        items: items.rows,
        warehouses: warehouseNames(warehouses.rows),
        conditions: conditions.rows,
      },
    }
  } catch (e) {
    return { ok: false, error: message(e, 'Məlumat yüklənmədi') }
  }
}
