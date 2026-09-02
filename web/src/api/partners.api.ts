import { supabase } from './supabase'
import type { Database } from '../types/database'

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
