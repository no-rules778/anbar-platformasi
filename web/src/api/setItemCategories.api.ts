import { supabase } from './supabase'
import type { Database } from '../types/database'

/* Admin-only CSV category import — index.html:5889-5896.

   Unlike the bulk item apply (a sequential, non-atomic loop), this write is
   ATOMIC on the server: set_item_categories() applies every mapping or none.
   Only {code, category} is sent; names, prices and movements are untouched. */

export interface CategoryMapping {
  code: string
  category: string
}

export interface SetCategoriesResult {
  ok: boolean
  updated: number
  error: string | null
}

export async function setItemCategories(mappings: CategoryMapping[]): Promise<SetCategoriesResult> {
  try {
    /* The generated signature types p_mappings as Json; the mapping array is
       a valid Json value, but TypeScript needs that stated explicitly. */
    const { data, error } = await supabase.rpc('set_item_categories', {
      p_mappings: mappings as unknown as Database['public']['Functions']['set_item_categories']['Args']['p_mappings'],
    })
    if (error) return { ok: false, updated: 0, error: error.message || 'idxal alınmadı' }
    const res = (data ?? {}) as { updated?: number }
    return { ok: true, updated: res.updated ?? 0, error: null }
  } catch (err) {
    return { ok: false, updated: 0, error: err instanceof Error ? err.message : 'idxal alınmadı' }
  }
}
