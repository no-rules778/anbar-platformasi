import { supabase } from './supabase'
import type { Database } from '../types/database'

type ItemInsert = Database['public']['Tables']['items']['Insert']
type ItemUpdate = Database['public']['Tables']['items']['Update']

/* Item create/update — emit('item', 'a'|'u') (index.html:1109-1135).

   Unlike the reference directories, which go through the manage_reference()
   RPC, items are written DIRECTLY to the table. That places the whole burden
   of detecting a refusal on this module, which is why the row-count checks
   below are not optional defensiveness — they are the contract.

   THE TRAP (index.html:1127-1131, and its own comment):
     Under RLS, an UPDATE that matches no permitted row returns
     `{ data: [], error: null }` — success-shaped, with nothing written.
     Without `.select()` and an exact row-count check, the UI would close the
     dialog and toast "saved" for a write that never happened.
   The same applies to INSERT (1114). Registry R-F5. */

export interface ItemWritePayload {
  code: string
  name: string
  unit: string
  price: number
  /** Sent only when the caller may edit categories; '' means NULL. */
  category?: string
}

export interface ItemWriteResult {
  ok: boolean
  code: string | null
  error: string | null
}

const UNKNOWN = 'Naməlum xəta'

/**
 * Creates an item. Fails unless the server confirms exactly one inserted row.
 */
export async function createItem(payload: ItemWritePayload, createdBy: string): Promise<ItemWriteResult> {
  try {
    const row: ItemInsert = {
      code: payload.code,
      name: payload.name,
      unit: payload.unit || 'ədəd',
      price: payload.price || 0,
      price_source: '',
      created_by: createdBy,
    }
    if (payload.category !== undefined) row.category = payload.category || null

    const { data, error } = await supabase.from('items').insert(row).select('code')
    if (error) return { ok: false, code: null, error: error.message || UNKNOWN }
    /* A silent refusal is success-shaped — only the row count reveals it. */
    if (!data || data.length !== 1) {
      return { ok: false, code: null, error: 'Nomenklatura yaradılmadı: server əməliyyatı təsdiqləmədi' }
    }
    return { ok: true, code: data[0].code, error: null }
  } catch (err) {
    return { ok: false, code: null, error: err instanceof Error ? err.message : UNKNOWN }
  }
}

/**
 * Updates an item with a PARTIAL patch — only the keys the caller provided
 * are sent (index.html:1119-1126), so an untouched field is never
 * overwritten. With nothing to change, the original skips the request
 * entirely and reports success.
 */
export async function updateItem(patch: Partial<ItemWritePayload> & { code: string }): Promise<ItemWriteResult> {
  try {
    const upd: ItemUpdate = {}
    if (patch.name !== undefined) upd.name = patch.name
    if (patch.unit !== undefined) upd.unit = patch.unit
    if (patch.price !== undefined) upd.price = patch.price
    if (patch.category !== undefined) upd.category = patch.category || null

    if (Object.keys(upd).length === 0) return { ok: true, code: patch.code, error: null }

    const { data, error } = await supabase.from('items').update(upd).eq('code', patch.code).select('code')
    if (error) return { ok: false, code: null, error: error.message || UNKNOWN }
    /* See THE TRAP above: this is the zero-row RLS refusal. */
    if (!data || data.length !== 1) {
      return { ok: false, code: null, error: 'Nomenklatura yenilənmədi: serverdə dəyişiklik təsdiqlənmədi' }
    }
    return { ok: true, code: patch.code, error: null }
  } catch (err) {
    return { ok: false, code: null, error: err instanceof Error ? err.message : UNKNOWN }
  }
}
