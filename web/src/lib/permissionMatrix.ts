import { ROLES, ROLE_PERMS, effectiveRole, type EffectiveRole } from './roles'

/* The «Hüquq matrisi» table — index.html:7173-7175.

   The ten displayed rows are a LITERAL list in the renderer, deliberately
   separate from `ROLE_PERMS`: the permission sets carry twelve keys, but the
   table shows only these ten, in this order. `loc.edit` and `category.edit`
   exist in `ROLE_PERMS.admin` and are NOT displayed. Do not "complete" this
   list from the permission sets — that would add two rows legacy never shows.

   Columns are `Object.keys(ROLES)` — all six role keys including the three
   legacy ones, which `effectiveRole()` maps to rehber and which therefore
   render as all-`yox` columns. */

export interface PermissionRow {
  /** The permission key, e.g. `mv.add`. */
  key: string
  /** The Azerbaijani label shown in the first column. */
  label: string
}

/** The ten rows of index.html:7174, verbatim and in order. */
export const PERMISSION_ROWS: readonly PermissionRow[] = [
  { key: 'mv.add', label: 'Əməliyyat qeyd etmək' },
  { key: 'mv.edit', label: 'Qeydə düzəliş' },
  { key: 'mv.del', label: 'Qeydi ləğv etmək' },
  { key: 'item.add', label: 'Yeni mal' },
  { key: 'item.edit', label: 'Mal düzəlişi' },
  { key: 'partner.edit', label: 'Kontragent idarəsi' },
  { key: 'price.edit', label: 'Qiymət dəyişmək' },
  { key: 'import', label: 'Toplu idxal' },
  { key: 'user.manage', label: 'İstifadəçi idarəsi' },
  { key: 'cancel', label: 'Əməliyyat ləğvi' },
] as const

/** The column order — `Object.keys(ROLES)` (index.html:7173). */
export const PERMISSION_COLUMNS: readonly string[] = Object.keys(ROLES)

/** `(ROLE_PERMS[effectiveRole(r)] || []).includes(k)` — index.html:7175. */
export function hasPermission(role: string, key: string): boolean {
  const perms: string[] = ROLE_PERMS[effectiveRole(role) as EffectiveRole] ?? []
  return perms.includes(key)
}
