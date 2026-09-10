import { supabase } from './supabase'

export interface AuditTotalResult {
  total: number
  ok: boolean
}

/* Ported from loadAuditTotal() (index.html:1057-1067) — M4-16.

   This is a SEPARATE query from fetchAuditLog: unfiltered, count-only
   (`head: true` — no rows are fetched at all), loaded once at boot for the
   nav badge. It must never be conflated with the page's own filtered total
   (`fetchAuditLog`'s `total`), which changes with every filter. */
export async function fetchAuditTotal(): Promise<AuditTotalResult> {
  try {
    const { count, error } = await supabase.from('audit_log').select('id', { count: 'exact', head: true })
    if (error) return { total: 0, ok: false }
    return { total: count ?? 0, ok: true }
  } catch {
    return { total: 0, ok: false }
  }
}
