import type { ItemRow } from '../api/items.api'
import type { ItemTotals } from './itemIndex'

/* Nomenclature list filtering — rNom (index.html:2413-2436). */

/** The `#nf-o` segments (2419). Exactly one is active at a time. */
export type ItemOnlyFilter = '' | 'nop' | 'nomv' | 'dup'

export interface ItemListFilters {
  /** Lowercased search text; matches `name + ' ' + code`. */
  q: string
  only: ItemOnlyFilter
}

export const EMPTY_ITEM_FILTERS: ItemListFilters = { q: '', only: '' }

/* The DUPLICATE-NAME normaliser — index.html:2422.
   Lowercase, then collapse whitespace and `/ . , " ' -`.

   This is DELIBERATELY not shared with either of the platform's other two
   normalisers, and must not be "unified" with them:
     - REF_EQ (lib/refEq.ts) compares reference-directory labels;
     - NORM (bulk item import, index.html:5638) additionally strips backtick,
       curly apostrophe, en/em dash and parentheses.
   Each one decides a different question, and sharing one silently changes
   which rows group together (registry R-F4). */
export function dupNormalise(name: string): string {
  return name.toLowerCase().replace(/[\s/.,"'-]+/g, '')
}

/**
 * Codes belonging to a group of two or more items whose names normalise
 * identically — index.html:2422-2426. Every member of such a group is
 * flagged, not just the later duplicates.
 */
export function duplicateCodes(items: ItemRow[]): Set<string> {
  const groups = new Map<string, string[]>()
  for (const i of items) {
    const k = dupNormalise(i.name)
    const list = groups.get(k) ?? []
    list.push(i.code)
    groups.set(k, list)
  }
  const out = new Set<string>()
  for (const codes of groups.values()) {
    if (codes.length > 1) for (const c of codes) out.add(c)
  }
  return out
}

/**
 * Applies the search box and the active segment — index.html:2428-2435.
 *
 * `nop` uses a FALSY price test, so both a null price and a price of 0 count
 * as "no price". `nomv` tests absence from the movement index, so an item
 * whose movements were all cancelled qualifies (it never entered byItem).
 */
export function filterItems(
  items: ItemRow[],
  filters: ItemListFilters,
  byItem: Map<string, ItemTotals>,
): ItemRow[] {
  const dupSet = filters.only === 'dup' ? duplicateCodes(items) : null
  const q = filters.q
  return items.filter((i) => {
    if (q && (i.name + ' ' + i.code).toLowerCase().indexOf(q) < 0) return false
    if (filters.only === 'nop' && i.price) return false
    if (filters.only === 'nomv' && byItem.has(i.code)) return false
    if (filters.only === 'dup' && !dupSet!.has(i.code)) return false
    return true
  })
}
