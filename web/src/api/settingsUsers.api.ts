import { supabase } from './supabase'
import type { Database } from '../types/database'

export type SettingsUserRow = Database['public']['Tables']['users']['Row']
export type SettingsUsersResult = { ok: true; rows: SettingsUserRow[] } | { ok: false; error: string }

/** Admin-only read from index.html:1043-1054. The caller must not invoke it for non-admin roles. */
export async function fetchSettingsUsers(): Promise<SettingsUsersResult> {
  try {
    const { data, error } = await supabase.from('users').select('id,email,role,warehouse,active')
    if (error) return { ok: false, error: error.message || 'İstifadəçilər yüklənə bilmədi' }
    return { ok: true, rows: (data ?? []) as SettingsUserRow[] }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'İstifadəçilər yüklənə bilmədi' }
  }
}
