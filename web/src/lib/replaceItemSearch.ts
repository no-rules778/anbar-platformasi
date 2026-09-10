import type { MovementFilterItem } from './movementFilters'

/* The replacement item picker's search — index.html:4977-4980, milestone I-4.

   Pure, so the exclusion rule and the result cap can be tested without a DOM.

   The legacy query is:

     DB.items.filter(i => i.code !== m.c &&
       (i.name.toLowerCase().indexOf(q) >= 0 || i.code.indexOf(q) >= 0)).slice(0, 12)

   Three details are preserved exactly:

   1. THE CURRENT ITEM IS EXCLUDED. Replacing an item with itself is not a
      correction; the server would write a counter line and an identical new
      line, leaving the document changed but the stock untouched.
   2. THE NAME MATCH IS CASE-INSENSITIVE, THE CODE MATCH IS NOT. Codes are
      digit strings, so lowercasing them changes nothing — but the asymmetry is
      kept rather than "tidied" so results cannot differ from the original.
   3. TWELVE RESULTS, and the minimum query length of two characters
      (index.html:4976) which stops a one-letter query listing the nomenclature.
*/

export interface ReplaceItemCandidate {
  code: string
  name: string
}

/** The legacy minimum query length — index.html:4976. */
export const MIN_QUERY_LENGTH = 2

/** The legacy result cap — index.html:4980. */
export const MAX_RESULTS = 12

/**
 * Candidate items for the replacement picker.
 *
 * `itemBy` is the movements store's nomenclature index, so the picker adds no
 * read of its own. A query shorter than `MIN_QUERY_LENGTH` yields nothing,
 * exactly as legacy hides the result list rather than searching.
 */
export function searchReplacementItems(
  query: string,
  itemBy: Map<string, MovementFilterItem>,
  currentCode: string,
): ReplaceItemCandidate[] {
  const q = query.trim().toLowerCase()
  if (q.length < MIN_QUERY_LENGTH) return []
  const out: ReplaceItemCandidate[] = []
  for (const [code, item] of itemBy) {
    if (code === currentCode) continue
    const name = item.name ?? ''
    if (name.toLowerCase().includes(q) || code.includes(q)) {
      out.push({ code, name })
      if (out.length >= MAX_RESULTS) break
    }
  }
  return out
}
