import { supabase } from './supabase'
import type { Database } from '../types/database'
import { excludeCancelled } from '../lib/operationalMovements'
import { refEq } from '../lib/refEq'

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
  warehouse: string | null
  partner: string | null
}

/* One paginated pass over `movements`, ordered by id so page boundaries are
   stable. The production platform loads this table in full on every login
   (fetchAll('movements'), index.html:868-874) and does all matching in
   JavaScript, so doing the same here is the faithful option — and it avoids
   pushing the comparison into a SQL `ilike`, which would neither trim the
   stored value nor treat `%`/`_` in a name as literal characters. */
async function fetchMovementRefs(): Promise<{ rows: MovementUsageRow[]; ok: boolean }> {
  const rows: MovementUsageRow[] = []
  let from = 0
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase
      .from('movements')
      .select('id,note,doc_num,warehouse,partner')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { rows, ok: false }
    const batch = (data ?? []) as MovementUsageRow[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { rows, ok: true }
}

/** The warehouse assigned to each user — the original counts these too. */
async function fetchUserWarehouses(): Promise<{ warehouses: (string | null)[]; ok: boolean }> {
  const warehouses: (string | null)[] = []
  let from = 0
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase
      .from('users')
      .select('warehouse')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { warehouses, ok: false }
    const batch = (data ?? []) as { warehouse: string | null }[]
    warehouses.push(...batch.map((u) => u.warehouse))
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { warehouses, ok: true }
}

/* Usage count behind the "İstifadə sayı" column and the name-lock/delete
   decisions. Ported from refUsage()'s warehouse branch (index.html:2977-2988):
   operational movements whose warehouse OR partner equals the name, plus the
   users assigned to it, compared with REF_EQ (index.html:2970). Cancelled
   movements are excluded exactly as operationalMovements() does
   (index.html:1249-1269).

   Fail-safe: if either source query fails, every name is reported with
   `exact: false` and a count of at least 1, so an unreadable state can never
   make a used warehouse look free — the original takes the same stance
   (`if (USERS_ERR) return 1`, index.html:2973-2976). */
export async function fetchWarehouseUsage(names: string[]): Promise<Map<string, WarehouseUsage>> {
  const [movements, staff] = await Promise.all([fetchMovementRefs(), fetchUserWarehouses()])
  const ok = movements.ok && staff.ok
  const operational = excludeCancelled(movements.rows)

  const result = new Map<string, WarehouseUsage>()
  for (const name of names) {
    const inMovements = operational.filter((m) => refEq(m.warehouse, name) || refEq(m.partner, name)).length
    const inStaff = staff.warehouses.filter((w) => refEq(w, name)).length
    const count = inMovements + inStaff
    result.set(name, ok ? { count, exact: true } : { count: Math.max(count, 1), exact: false })
  }
  return result
}
