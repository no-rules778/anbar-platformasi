import { supabase } from './supabase'

/* Nomenclature rows — `items` (index.html fetchAll('items', ['code']), 930).

   Every column except `code`/`name` is nullable in the generated schema, so
   the row type keeps them nullable and the UI decides how to render an
   absent value. Do not coerce nulls here: `price` null and `price` 0 render
   differently downstream (M5-12). */
export interface ItemRow {
  code: string
  name: string
  unit: string | null
  price: number | null
  category: string | null
}

export interface ItemsResult {
  rows: ItemRow[]
  ok: boolean
  error: string | null
}

/* PostgREST caps a response at 1000 rows, so the original reads in pages
   until a short page arrives (fetchAll, index.html:847-862). The guard of 200
   iterations is the original's too — it bounds a pathological loop rather
   than expressing a real limit. */
const PAGE_SIZE = 1000
const MAX_PAGES = 200

/**
 * Reads every item, ordered by `code`, exactly as the original does.
 *
 * Never throws. Both failure shapes are absorbed — a returned `{ error }` and
 * a rejected promise (network/fetch) — because the Phase 3a audit found that
 * handling only the first lets a rejection escape into the caller's
 * `Promise.all` and blank the whole page.
 */
export async function fetchItems(): Promise<ItemsResult> {
  try {
    const out: ItemRow[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE
      const { data, error } = await supabase
        .from('items')
        .select('code, name, unit, price, category')
        .order('code')
        .range(from, from + PAGE_SIZE - 1)
      if (error) return { rows: [], ok: false, error: error.message || 'Naməlum xəta' }
      const batch = (data ?? []) as ItemRow[]
      out.push(...batch)
      if (batch.length < PAGE_SIZE) break
    }
    return { rows: out, ok: true, error: null }
  } catch (err) {
    return { rows: [], ok: false, error: err instanceof Error ? err.message : 'Naməlum xəta' }
  }
}
