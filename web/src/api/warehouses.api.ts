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
