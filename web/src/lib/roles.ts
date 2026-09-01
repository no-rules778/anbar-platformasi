export type Role = 'admin' | 'rehber' | 'anbardar' | 'techizat' | 'muhasib' | 'baxis' | string | null | undefined

export type EffectiveRole = 'admin' | 'rehber' | 'anbardar'

export interface Me {
  id: string
  sbId: string
  email: string
  name: string
  role: Role
  wh: string
}

export const ROLES: Record<string, { name: string }> = {
  admin: { name: 'Admin' },
  rehber: { name: 'Rəhbər' },
  anbardar: { name: 'Anbardar' },
  techizat: { name: 'Təchizatçı' },
  muhasib: { name: 'Mühasib' },
  baxis: { name: 'Müşahidəçi' },
}

/* Permission sets are keyed by EFFECTIVE role only (admin/rehber/anbardar). */
export const ROLE_PERMS: Record<EffectiveRole, string[]> = {
  admin: ['mv.add', 'mv.edit', 'mv.del', 'item.add', 'item.edit', 'partner.edit', 'loc.edit', 'price.edit', 'import', 'category.edit', 'user.manage', 'cancel'],
  rehber: [],
  anbardar: ['mv.add'],
}

/* Legacy DB role values (techizat, muhasib, baxis) are NOT deleted or
   silently promoted — treated as read-only (rehber-equivalent), mirroring
   effective_role() in sql/007_role_security_migration.sql. The server
   enforces the same mapping independently via RLS/RPCs. */
export function effectiveRole(role: Role): EffectiveRole {
  if (role === 'admin') return 'admin'
  if (role === 'anbardar') return 'anbardar'
  return 'rehber'
}

export function can(me: Me | null, action: string): boolean {
  if (!me) return false
  return ROLE_PERMS[effectiveRole(me.role)].includes(action)
}

export const isAdmin = (me: Me | null): boolean => !!me && effectiveRole(me.role) === 'admin'
export const isRehber = (me: Me | null): boolean => !!me && effectiveRole(me.role) === 'rehber'
export const isAnbardar = (me: Me | null): boolean => !!me && effectiveRole(me.role) === 'anbardar'

/* Human-readable denial message — the caller decides how to surface it
   (e.g. a toast), matching the original need()'s message text exactly.
   Ported from index.html line 638. */
export function permissionDeniedMessage(me: Me | null): string {
  const label = me && ROLES[me.role ?? ''] ? ROLES[me.role ?? ''].name : me?.role ?? ''
  return `Bu əməliyyat üçün icazəniz yoxdur (${label})`
}
