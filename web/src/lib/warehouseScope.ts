import type { Me } from './roles'
import { isAnbardar } from './roles'

/* Astara/Harmony share a source group; every other warehouse is its own
   group. Mirrors source_group_warehouses() in
   sql/007_role_security_migration.sql. */
export function sourceGroupWarehouses(wh: string): string[] {
  if (wh === 'Astara' || wh === 'Harmony') return ['Astara', 'Harmony']
  return wh ? [wh] : []
}

/* Non-transfer operations (e.g. Silinmə) — an anbardar only sees their own
   assigned warehouse, not the source group. */
export function allowedWarehouses(me: Me | null, whs: string[]): string[] {
  if (isAnbardar(me) && me?.wh) return whs.filter((w) => w === me.wh)
  return whs.slice()
}

/* Transfer (Yerdəyişmə) source options — an anbardar sees every warehouse
   in their source group. */
export function sourceWarehouses(me: Me | null, whs: string[]): string[] {
  if (isAnbardar(me) && me?.wh) {
    const group = sourceGroupWarehouses(me.wh)
    return whs.filter((w) => group.includes(w))
  }
  return whs.slice()
}
