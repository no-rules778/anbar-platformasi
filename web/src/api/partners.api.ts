import { supabase } from './supabase'
import type { Database } from '../types/database'
import type { ReadResult } from '../lib/opReadiness'

export type PartnerRow = Database['public']['Tables']['partners']['Row']

const PAGE_SIZE = 1000

/* Same paginated read the production platform performs with
   fetchAll('partners', ['name']) (index.html:869-874), ordered so page
   boundaries are stable. RLS lets any authenticated role read the table
   (`partners_select`: current_user_role() IS NOT NULL); every write goes
   through manage_reference. */
export async function fetchPartners(): Promise<PartnerRow[]> {
  const out: PartnerRow[] = []
  let from = 0
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('name')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const batch = data ?? []
    out.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return out
}

/* ---------- Phase 7 core-read contract ----------

   `fetchPartners()` above THROWS and, on a mid-pagination failure, loses the
   rows already gathered. Phase 7 needs the result shape every core read uses:
   never throw, absorb both failure shapes, and report a partial page failure as
   a FAILURE rather than a short list (M7-S2) — otherwise a truncated partner
   list would silently narrow the counterparty options on a write screen.

   The original export is left exactly as it is: Phase 2/3 depend on it. */
export async function readPartners(): Promise<ReadResult<PartnerRow>> {
  const out: PartnerRow[] = []
  try {
    for (let page = 0; page < 200; page++) {
      const from = page * PAGE_SIZE
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('name')
        .range(from, from + PAGE_SIZE - 1)
      if (error) {
        return {
          rows: out,
          ok: false,
          error: error.message || 'Naməlum xəta',
          partial: out.length > 0,
        }
      }
      const batch = data ?? []
      out.push(...batch)
      if (batch.length < PAGE_SIZE) break
    }
    return { rows: out, ok: true, error: null }
  } catch (err) {
    return {
      rows: out,
      ok: false,
      error: err instanceof Error ? err.message : 'Naməlum xəta',
      partial: out.length > 0,
    }
  }
}
