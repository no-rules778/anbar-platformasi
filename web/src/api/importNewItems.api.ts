import { supabase } from './supabase'

/* Excel/CSV import of NEW items — niImport() (index.html:6095-6121).

   Two properties of this path differ from the create dialog and must be kept:
     - the SERVER assigns codes (import_new_items, sql/…), so nothing here
       calculates a code the way nextCode() does;
     - only NEW items are created. Existing rows are never updated, and
       PRICE IS NOT IMPORTED at all — the payload carries name and unit only
       (6100, and the dialog's own note at 6126). */

export interface ImportItemInput {
  name: string
  unit: string
}

export interface ImportedItem {
  code: string
  name: string
  unit: string | null
}

export interface ImportResult {
  ok: boolean
  created: ImportedItem[]
  skipped: unknown[]
  error: string | null
}

/**
 * Calls `import_new_items`. The payload is deliberately narrow: `{name, unit}`
 * per row and nothing else — no code, no price.
 */
export async function importNewItems(rows: ImportItemInput[]): Promise<ImportResult> {
  try {
    const payload = rows.map((r) => ({ name: r.name, unit: r.unit || 'ədəd' }))
    const { data, error } = await supabase.rpc('import_new_items', { p_items: payload })
    if (error) return { ok: false, created: [], skipped: [], error: error.message || 'idxal alınmadı' }
    const res = (data ?? {}) as { created?: ImportedItem[]; skipped?: unknown[] }
    return { ok: true, created: res.created ?? [], skipped: res.skipped ?? [], error: null }
  } catch (err) {
    return {
      ok: false,
      created: [],
      skipped: [],
      error: err instanceof Error ? err.message : 'idxal alınmadı',
    }
  }
}
