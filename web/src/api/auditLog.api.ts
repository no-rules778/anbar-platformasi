import { supabase } from './supabase'
import type { Json } from '../types/database'

export const AUDIT_PAGE_SIZE = 50

export interface AuditRow {
  ts: string | null
  user_id: string | null
  table_name: string | null
  action: string | null
  record_id: string | null
  old_values: Json | null
  new_values: Json | null
  reason: string | null
}

export interface AuditFilters {
  /** `table_name` — one of AUDIT_TABLE_LABEL's keys, or '' for every table. */
  table: string
  /** `action` — INSERT/UPDATE/DELETE, or '' for every action. */
  action: string
  /** `user_id` — an id, `'__null'` for a null actor, or '' for every actor. */
  actor: string
  /** ISO date (yyyy-mm-dd), or '' — inclusive lower bound. */
  d1: string
  /** ISO date (yyyy-mm-dd), or '' — inclusive upper bound. */
  d2: string
  page: number
}

export const EMPTY_FILTERS: AuditFilters = { table: '', action: '', actor: '', d1: '', d2: '', page: 0 }

export type AuditErrorKind = 'permission' | 'load'

export interface AuditFetchResult {
  rows: AuditRow[]
  total: number
  error: string | null
  errorKind: AuditErrorKind | null
}

/* logRows' permission classifier (index.html:7145): distinguishes an RLS/auth
   refusal from any other load failure, so the page can say «İcazə yoxdur»
   instead of a generic «Yükləmə xətası». */
function classifyError(message: string): AuditErrorKind {
  return /permission|denied|rls|401|403/i.test(message) ? 'permission' : 'load'
}

/* Ported from auditFetch() (index.html:7120-7133). Every filter becomes a
   PostgREST clause — never a client-side array filter — so `count: 'exact'`
   always describes exactly the rows the page shows (design intent stated at
   7056-7060). Page size is fixed at 50, sort is `ts` descending.

   Date boundaries are preserved EXACTLY as the original constructs them:
   `d1 + 'T00:00:00'` / `d2 + 'T23:59:59'`, string concatenation against `ts`,
   with whatever timezone behaviour that implies. This is deliberate — Q5,
   approved 2026-09-02: correcting it is a separate product decision, not part
   of this migration.

   Failure is reported, never thrown — matching every other API module in this
   app (see referenceValues.api.ts's fetchReferenceValues for the same
   contract), so a rejected promise cannot escape into the store's rendering
   path and blank the page. */
export async function fetchAuditLog(filters: AuditFilters): Promise<AuditFetchResult> {
  try {
    let q = supabase.from('audit_log').select('*', { count: 'exact' })
    if (filters.table) q = q.eq('table_name', filters.table)
    if (filters.action) q = q.eq('action', filters.action)
    if (filters.actor === '__null') q = q.is('user_id', null)
    else if (filters.actor) q = q.eq('user_id', filters.actor)
    if (filters.d1) q = q.gte('ts', filters.d1 + 'T00:00:00')
    if (filters.d2) q = q.lte('ts', filters.d2 + 'T23:59:59')
    q = q.order('ts', { ascending: false }).range(
      filters.page * AUDIT_PAGE_SIZE,
      filters.page * AUDIT_PAGE_SIZE + AUDIT_PAGE_SIZE - 1,
    )

    const { data, error, count } = await q
    if (error) {
      const message = error.message || 'Naməlum xəta'
      return { rows: [], total: 0, error: message, errorKind: classifyError(message) }
    }
    return { rows: (data ?? []) as AuditRow[], total: count ?? 0, error: null, errorKind: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Şəbəkə xətası'
    return { rows: [], total: 0, error: message, errorKind: classifyError(message) }
  }
}
