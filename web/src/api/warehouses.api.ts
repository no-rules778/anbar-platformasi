import { supabase } from './supabase'
import type { Database } from '../types/database'
import { excludeCancelled } from '../lib/operationalMovements'

export type WarehouseRow = Database['public']['Tables']['warehouses']['Row']

const PAGE_SIZE = 1000

export async function fetchWarehouses(): Promise<WarehouseRow[]> {
  const out: WarehouseRow[] = []
  let from = 0
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase.from('warehouses').select('*').range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const batch = data ?? []
    out.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return out
}

export interface WarehouseUsage {
  /** Operational (non-cancelled) references, same definition as the original refUsage(). */
  count: number
  /** False when at least one source query failed. The count is then NOT
      trustworthy and callers MUST treat the warehouse as in use — mirroring
      the original's USERS_ERR fail-safe (`refStaffCount()` returns 1, and
      refOpen() shows a red warning: index.html:2973-2976, 3096-3100). */
  exact: boolean
}

interface MovementUsageRow {
  id: string | number
  note: string | null
  doc_num: string | null
}

/** Paginated fetch of the movement rows referencing `name` in one column. */
async function fetchMovementRowsBy(
  column: 'warehouse' | 'partner',
  name: string,
): Promise<{ rows: MovementUsageRow[]; ok: boolean }> {
  const rows: MovementUsageRow[] = []
  let from = 0
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase
      .from('movements')
      .select('id,note,doc_num')
      .ilike(column, name)
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { rows, ok: false }
    const batch = (data ?? []) as MovementUsageRow[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { rows, ok: true }
}

/* Usage count behind the "İstifadə sayı" column and the name-lock/delete
   decisions. Ported from refUsage()'s warehouse branch (index.html:2977-2988):
   operational movements where warehouse OR partner matches the name, plus the
   users assigned to it. Cancelled movements are excluded exactly as
   operationalMovements() does (index.html:1249-1269).

   Fail-safe: any failed source query yields `exact: false` and a count of at
   least 1, so an unreadable state can never make a used warehouse look free —
   the original takes the same stance (`if (USERS_ERR) return 1`). */
export async function fetchWarehouseUsage(names: string[]): Promise<Map<string, WarehouseUsage>> {
  const result = new Map<string, WarehouseUsage>()
  for (const name of names) {
    const [byWarehouse, byPartner, staff] = await Promise.all([
      fetchMovementRowsBy('warehouse', name),
      fetchMovementRowsBy('partner', name),
      supabase.from('users').select('id', { count: 'exact', head: true }).ilike('warehouse', name),
    ])

    const ok = byWarehouse.ok && byPartner.ok && !staff.error
    // Deduplicate: a row matching on both columns must not be counted twice.
    const byId = new Map<string, MovementUsageRow>()
    for (const row of [...byWarehouse.rows, ...byPartner.rows]) byId.set(String(row.id), row)
    const operational = excludeCancelled([...byId.values()])
    const count = operational.length + (staff.count ?? 0)

    result.set(name, ok ? { count, exact: true } : { count: Math.max(count, 1), exact: false })
  }
  return result
}
