import type { ReferenceAction } from '../api/referenceDirectory.api'

/* Localhost talks to the SAME production Supabase project as the deployed
   platform — there is no separate test database (a deliberate project
   decision). A careless click while developing therefore edits real data.

   This guard blocks the destructive reference actions when the app is served
   from localhost, unless the developer explicitly opts in with
   VITE_ALLOW_DESTRUCTIVE=true in web/.env. It is a development-only safety
   net: a deployed build (any other hostname) is unaffected, so production
   behaviour is unchanged. */

export const DESTRUCTIVE_ACTIONS: readonly ReferenceAction[] = ['delete', 'deactivate', 'activate']

export function isDestructive(action: ReferenceAction): boolean {
  return DESTRUCTIVE_ACTIONS.includes(action)
}

/** True when the page is served from a local development host. */
export function isLocalhost(hostname: string = globalThis.location?.hostname ?? ''): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]'
}

/** Explicit developer opt-in, via web/.env — off unless it is exactly 'true'. */
export function destructiveAllowed(): boolean {
  return import.meta.env.VITE_ALLOW_DESTRUCTIVE === 'true'
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
  const allowed = opts.allowed ?? destructiveAllowed()
  if (!local || !isDestructive(action) || allowed) return null
  return 'Bu əməliyyat lokal rejimdə bloklanıb: localhost CANLI Supabase bazasına qoşulub. '
    + 'İcazə vermək üçün web/.env faylında VITE_ALLOW_DESTRUCTIVE=true yazın.'
}

/** Banner text shown while running against the live database from localhost. */
export const LOCALHOST_WARNING =
  'Diqqət: bu lokal rejimdir, lakin CANLI Supabase bazasına qoşulub — bütün dəyişikliklər real məlumatlara yazılır.'
