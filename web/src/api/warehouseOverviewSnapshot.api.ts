import { fetchItems, type ItemRow } from './items.api'
import { fetchItemMovements, type MovementRow } from './itemMovements.api'
import { fetchWarehouses, type WarehouseRow } from './warehouses.api'

export interface WarehouseOverviewSnapshot {
  movements: MovementRow[]
  items: ItemRow[]
  locations: WarehouseRow[]
}

export type WarehouseOverviewSnapshotResult =
  | { ok: true; snapshot: WarehouseOverviewSnapshot }
  | { ok: false; error: string }

const msg = (e: unknown, fallback: string) => e instanceof Error && e.message ? e.message : fallback

export async function fetchWarehouseOverviewSnapshot(): Promise<WarehouseOverviewSnapshotResult> {
  try {
    const [movements, items, locations] = await Promise.all([
      fetchItemMovements(),
      fetchItems(),
      fetchWarehouses().then(
        (rows) => ({ ok: true as const, rows }),
        (e: unknown) => ({ ok: false as const, error: msg(e, 'Anbar siyahısı yüklənmədi') }),
      ),
    ])
    if (!movements.ok) return { ok: false, error: movements.error ?? 'Mal hərəkəti yüklənmədi' }
    if (!items.ok) return { ok: false, error: items.error ?? 'Nomenklatura yüklənmədi' }
    if (!locations.ok) return { ok: false, error: locations.error }
    return { ok: true, snapshot: { movements: movements.rows, items: items.rows, locations: locations.rows } }
  } catch (e) {
    return { ok: false, error: msg(e, 'Məlumat yüklənmədi') }
  }
}

