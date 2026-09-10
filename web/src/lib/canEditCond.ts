import type { Me } from './roles'
import { isAdmin, isAnbardar } from './roles'

/** UI convenience gate from legacy `canEditCond()` (index.html:2148-2152). */
export function canEditCond(me: Me | null, warehouse: string, conditionsReady: boolean): boolean {
  if (!conditionsReady || !warehouse || warehouse === 'bütün anbarlar' || warehouse === '—') return false
  if (isAdmin(me)) return true
  return isAnbardar(me) && !!me?.wh && me.wh === warehouse
}
