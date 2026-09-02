import type { ReferenceAction } from '../api/referenceDirectory.api'

/* Localhost talks to the SAME production Supabase project as the deployed
   platform — there is no separate test database (a deliberate project
   decision). Every write made while developing is therefore a real production
   write, including `create` and `update`: a test partner left behind is a real
   row in a real directory that every user sees.

   This guard blocks ALL reference writes when the app is served from
   localhost, unless the developer explicitly opts in with
   VITE_ALLOW_LOCAL_WRITES=true in web/.env. It is a development-only safety
   net: a deployed build (any other hostname) is unaffected, so production
   behaviour is unchanged. */

export const WRITE_ACTIONS: readonly ReferenceAction[] =
  ['create', 'update', 'delete', 'deactivate', 'activate']

/** Every reference action mutates the live directory; none is read-only. */
export function isWrite(action: ReferenceAction): boolean {
  return WRITE_ACTIONS.includes(action)
}

/** True when the page is served from a local development host. */
export function isLocalhost(hostname: string = globalThis.location?.hostname ?? ''): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]'
}

/** Explicit developer opt-in, via web/.env — off unless it is exactly 'true'. */
export function localWritesAllowed(): boolean {
  return import.meta.env.VITE_ALLOW_LOCAL_WRITES === 'true'
}

/**
 * Decides whether an action may run.
 * Returns null when allowed, or the message to show when it is blocked.
 */
export function blockedReason(
  action: ReferenceAction,
  opts: { local?: boolean; allowed?: boolean } = {},
): string | null {
  const local = opts.local ?? isLocalhost()
  const allowed = opts.allowed ?? localWritesAllowed()
  if (!local || !isWrite(action) || allowed) return null
  return 'Bu əməliyyat lokal rejimdə bloklanıb: localhost CANLI Supabase bazasına qoşulub. '
    + 'İcazə vermək üçün web/.env faylında VITE_ALLOW_LOCAL_WRITES=true yazın.'
}

/** Banner text shown while running against the live database from localhost. */
export const LOCALHOST_WARNING =
  'Diqqət: bu lokal rejimdir, lakin CANLI Supabase bazasına qoşulub — burada edilən hər dəyişiklik real məlumatlara yazılır.'

/** Second banner line: whether writes are currently open in this local session. */
export function localWriteStatusText(allowed: boolean): string {
  return allowed
    ? 'Yazma əməliyyatları (yaratma, redaktə, gizlətmə, aktivləşdirmə, silmə) bu rejimdə AÇIQDIR (VITE_ALLOW_LOCAL_WRITES=true).'
    : 'Bütün yazma əməliyyatları bloklanıb: yaratma, redaktə, gizlətmə, aktivləşdirmə və silmə. Açmaq üçün web/.env → VITE_ALLOW_LOCAL_WRITES=true.'
}
