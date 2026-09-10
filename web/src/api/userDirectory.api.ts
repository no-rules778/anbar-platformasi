import { supabase } from './supabase'

export interface UserDirectoryResult {
  /** id → email. Never carries `users.name` — see the note below. */
  emails: Map<string, string>
  ok: boolean
}

/* Ported from loadAuditUsers() (index.html:1020-1035).

   `users` SELECT is RLS-restricted to the caller's own row for non-admins
   (role/warehouse are admin-only columns), so actor display goes through the
   SECURITY DEFINER get_user_directory() RPC instead, which returns ONLY
   confirmed-safe columns: id and email. It never returns `users.name` — the
   original is explicit that a fabricated display name must never be shown
   for an audit actor, and this port preserves that restriction exactly.

   Failure is reported via `ok:false`, never thrown, matching every other API
   module's contract in this app. */
export async function fetchUserDirectory(): Promise<UserDirectoryResult> {
  try {
    const { data, error } = await supabase.rpc('get_user_directory')
    if (error) return { emails: new Map(), ok: false }
    const emails = new Map<string, string>()
    for (const u of data ?? []) {
      if (u.id) emails.set(u.id, u.email || '')
    }
    return { emails, ok: true }
  } catch {
    return { emails: new Map(), ok: false }
  }
}
