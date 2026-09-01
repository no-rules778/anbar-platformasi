import { supabase } from './supabase'
import type { Database } from '../types/database'

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

/* Known, user-approved deviation from the original refUsage(): counts
   movements/users rows referencing this warehouse name WITHOUT excluding
   cancelled movements (normalMovements() filtering is out of Phase 1
   scope). May run slightly higher than the original for warehouses with
   cancelled history. Used only for the "İstifadə sayı" hint and the
   used>0 name-lock decision — both degrade gracefully if the count is an
   overestimate (worst case: a warehouse that's actually free to rename
   shows as locked, which is the safe direction to be wrong in). */
export async function fetchWarehouseUsage(names: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  for (const name of names) {
    const [movWarehouse, movPartner, users] = await Promise.all([
      supabase.from('movements').select('id', { count: 'exact', head: true }).ilike('warehouse', name),
      supabase.from('movements').select('id', { count: 'exact', head: true }).ilike('partner', name),
      supabase.from('users').select('id', { count: 'exact', head: true }).ilike('warehouse', name),
    ])
    const total = (movWarehouse.count ?? 0) + (movPartner.count ?? 0) + (users.count ?? 0)
    result.set(name, total)
  }
  return result
}
