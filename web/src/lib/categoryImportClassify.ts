import type { ItemRow } from '../api/items.api'
import { extractCategoryRows, parseCsvText } from './csv'

/* Category-import classification — catImpPreview() (index.html:5809-5857).

   Lifted out of the dialog so the whole-file error gate is a pure, directly
   testable contract rather than something only reachable through the DOM.
   The dialog renders these buckets; it does not decide them. */

/** `CAT_UNSET` — the informational, non-writing bucket (index.html:5586). */
export const CAT_UNSET = 'Təyin edilməyib'

/* The original's three buckets (5828-5834). `unset` is NOT an error: it is
   reported for manual review and simply never written, so it does not block
   the file the way an error does. */
export type CategoryBucket = 'ok' | 'unset' | 'err'

export interface CategoryPreviewRow {
  code: string
  cat: string
  name: string
  bucket: CategoryBucket
  reason: string
}

/**
 * Classifies every body row of the pasted/uploaded CSV.
 *
 * The ORDER of the tests is part of the contract (5824-5834): the seven-digit
 * format is checked BEFORE the directory lookup, so a malformed code reports
 * «Kod 7 rəqəm olmalıdır» rather than «Bazada yoxdur». A blank code reaches
 * here (csv.ts keeps it) and fails that first test.
 */
export function classifyCategoryRows(
  source: string,
  items: ItemRow[],
  categories: string[],
): CategoryPreviewRow[] {
  const itemBy = new Map(items.map((i) => [i.code, i]))
  const allowed = new Set([...categories, CAT_UNSET])
  const seen = new Map<string, number>()

  return extractCategoryRows(parseCsvText(source)).map((r, ix) => {
    const code = r.code
    const cat = r.category
    const name = itemBy.get(code)?.name ?? ''
    let bucket: CategoryBucket = 'ok'
    let reason = ''

    if (!/^\d{7}$/.test(code)) { bucket = 'err'; reason = 'Kod 7 rəqəm olmalıdır' }
    else if (!itemBy.has(code)) { bucket = 'err'; reason = 'Bazada yoxdur' }
    else if (!cat) { bucket = 'err'; reason = 'Kateqoriya boşdur' }
    else if (!allowed.has(cat)) { bucket = 'err'; reason = 'Yanlış kateqoriya' }
    else if (seen.has(code)) {
      bucket = 'err'
      reason = 'Təkrar kod (sətir ' + ((seen.get(code) as number) + 1) + ')'
    } else {
      seen.set(code, ix)
      bucket = cat === CAT_UNSET ? 'unset' : 'ok'
    }
    return { code, cat, name, bucket, reason }
  })
}

/**
 * The whole-file gate — catImpCount()/catImpApply() (index.html:5862-5884).
 *
 * ANY error row blocks the ENTIRE apply, however many valid rows sit beside
 * it. The original enforces this TWICE: once on the button's disabled state
 * and again inside the handler, because it explicitly does not trust button
 * state alone against DOM tampering. Returning the decision from one place
 * lets both barriers share it.
 */
export function categoryImportBlocked(rows: CategoryPreviewRow[]): boolean {
  return rows.some((r) => r.bucket === 'err')
}
