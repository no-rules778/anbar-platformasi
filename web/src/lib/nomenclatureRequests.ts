import type { ItemRow } from '../api/items.api'
import { isAdmin, isAnbardar, type Me } from './roles'
import { fmtD } from './format'

/* «Nomenklatura sorğuları» pure logic — the legacy helpers rNreq() calls
   directly (index.html:2470-2483, 2512-2517, 2555-2567).

   EVERYTHING here is a BROWSER AFFORDANCE or a display rule. Not one function
   in this file is a permission: `sql/017` re-checks every rule server-side and
   is the only authority (M12-07 vs M12-91, M12-40/41 vs M12-91). A caller that
   treats `canReview()`/`canWithdraw()` as security has misread them. */

/** The legacy view model `DB.itemReqs` holds — index.html:894-901 (M12-12). */
export interface ItemRequestView {
  id: string
  name: string
  unit: string
  category: string
  note: string
  status: string
  /** `created_by` — the author's user id. */
  by: string
  /** `created_warehouse`, RAW: `whLabel()` is deliberately not applied (M12-35). */
  w: string
  /** `created_at` as epoch ms, else 0 (M12-12). */
  ts: number
  decidedBy: string
  decidedAt: string
  reason: string
  code: string
}

/* index.html:2471-2476 — the exact tag per status (M12-36). An unknown status
   has NO entry here: the caller falls back to the raw text with no tag. */
export const NREQ_STATUS_TAG: Record<string, { cls: string; text: string }> = {
  pending: { cls: 'tag t-op', text: 'Gözləyir' },
  approved: { cls: 'tag t-in', text: 'Təsdiqlənib' },
  rejected: { cls: 'tag t-rm', text: 'Rədd edilib' },
  cancelled: { cls: 'tag', text: 'Ləğv edilib' },
}

export interface StatusTag {
  /** null = unknown status: render the raw text with no tag (M12-36). */
  cls: string | null
  text: string
}

/** M12-36 — `NREQ_STATUS_TAG[status] || esc(status)` (index.html:2535). */
export function statusTag(status: string): StatusTag {
  const known = NREQ_STATUS_TAG[status]
  return known ? { cls: known.cls, text: known.text } : { cls: null, text: status }
}

/* index.html:2480-2483 (M12-53) — NFKC → trim → lower-case → strip every run
   of whitespace and the punctuation class. Mirrors the server's
   item_request_norm() (sql/017:54-57) so browser and SQL cannot drift; it is
   an EARLY WARNING only, and the server has the last word. */
export function nreqNorm(s: string | null | undefined): string {
  return String(s == null ? '' : s)
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s/.,"'`’()\-–—]+/g, '')
}

/** M12-07 — anbardar ONLY, deliberately not admin (index.html:2484). */
export const nreqCanCreate = (me: Me | null): boolean => isAnbardar(me)

export interface SimilarResult {
  /** An existing ITEM whose normalised name equals the query. */
  exact: ItemRow | null
  /** A PENDING request whose normalised name equals the query.
      Deliberately `undefined` on the short-name early return, matching
      legacy's own object shape (index.html:2557). */
  exactReq?: ItemRequestView | null
  items: ItemRow[]
  reqs: ItemRequestView[]
}

/* index.html:2555-2567 (M12-54, M12-55).

   The length rule is the load-bearing part: equality always matches, but
   CONTAINMENT needs the containing side to be >= 4 normalised chars, so a
   short word does not match everything. Each list is capped at 10.

   Only PENDING requests are candidates (2561): an approved, rejected or
   cancelled request never appears. The browser scans only what RLS already
   returned — the server's item_request_candidates() additionally sees another
   anbardar's hidden pending row, and porting it is deferred (D-M3). */
export function nreqSimilar(
  name: string | null | undefined,
  items: readonly ItemRow[],
  requests: readonly ItemRequestView[],
): SimilarResult {
  const n = nreqNorm(name)
  /* Legacy returns this exact shape — with NO `exactReq` key (2557). */
  if (n.length < 2) return { exact: null, items: [], reqs: [] }

  const hit = (candidateName: string): boolean => {
    const k = nreqNorm(candidateName)
    return k === n || (n.length >= 4 && k.includes(n)) || (k.length >= 4 && n.includes(k))
  }

  const matchedItems = items.filter((i) => hit(i.name)).slice(0, 10)
  const matchedReqs = requests.filter((r) => r.status === 'pending' && hit(r.name)).slice(0, 10)

  return {
    exact: matchedItems.find((i) => nreqNorm(i.name) === n) ?? null,
    exactReq: matchedReqs.find((r) => nreqNorm(r.name) === n) ?? null,
    items: matchedItems,
    reqs: matchedReqs,
  }
}

export interface RequestFilters {
  /** '' = «Hamısı», the ONLY route to a cancelled row (M12-21). */
  status: string
  /** Already trimmed and lower-cased by the caller (index.html:2495). */
  q: string
}

/** `NREQ` — index.html:2470 (M12-17, M12-20). */
export const DEFAULT_FILTERS: RequestFilters = { q: '', status: 'pending' }

/* index.html:2512-2517 (M12-22…M12-25).

   The search haystack is `name + unit + category + code` — the note and the
   warehouse are deliberately NOT searchable (M12-23). The two filters AND
   together and neither resets the other; there is no paging on this screen. */
export function filterRequests(
  rows: readonly ItemRequestView[],
  { status, q }: RequestFilters,
): ItemRequestView[] {
  return rows.filter((r) => {
    if (status && r.status !== status) return false
    if (q) {
      const hay = (r.name + ' ' + (r.unit || '') + ' ' + (r.category || '') + ' ' + (r.code || '')).toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

/* index.html:2531 (M12-31) — `fmtD(new Date(r.ts).toISOString().slice(0,10))`.

   A `ts` of 0 therefore renders the EPOCH date 01.01.1970, not an em-dash.
   That is legacy behaviour the port reproduces deliberately (proposal §7); a
   "sensible" implementation returning '—' would be a silent deviation. */
export function requestDateLabel(ts: number): string {
  return fmtD(new Date(ts).toISOString().slice(0, 10))
}

/* index.html:2524-2526 (M12-40) — «Nəzərdən keçir».

   AFFORDANCE ONLY. The server gate is approve_item_request /
   reject_item_request requiring an ACTIVE admin (sql/017:317-319, 413-415),
   proven separately by refusal in M12-91. */
export function canReview(me: Me | null, row: ItemRequestView): boolean {
  return isAdmin(me) && row.status === 'pending'
}

/* index.html:2527-2529 (M12-41, M12-43) — «Geri götür».

   AFFORDANCE ONLY; the server gate is cancel_item_request's admin-or-author
   rule (sql/017:465-467). The author comparison is defence in depth: RLS
   normally prevents an anbardar from seeing another anbardar's row at all
   (policy 124-129), so this is not the operative filter. */
export function canWithdraw(me: Me | null, row: ItemRequestView): boolean {
  if (row.status !== 'pending') return false
  return isAdmin(me) || (isAnbardar(me) && !!me && row.by === me.id)
}

/* index.html:2504-2510 (M12-06) — exactly three variants, admin first. */
export const SUBTITLE_ADMIN =
  'Anbardarların təklifləri. Təsdiq zamanı mal yaranır və 7 rəqəmli kod verilir; rədd üçün səbəb məcburidir.'
export const SUBTITLE_ANBARDAR =
  'Yeni mal təklif edin. Təsdiqə qədər mal nomenklaturada yaranmır və kod almır — yalnız Admin təsdiqləyə bilər.'
export const SUBTITLE_READONLY = 'Yalnız oxu. Sorğuları Admin təsdiqləyir və ya rədd edir.'

export function requestsSubtitle(me: Me | null): string {
  if (isAdmin(me)) return SUBTITLE_ADMIN
  return isAnbardar(me) ? SUBTITLE_ANBARDAR : SUBTITLE_READONLY
}

/** M12-38 — the empty text depends on the ACTIVE filter (index.html:2539). */
export function emptyText(status: string): string {
  return status === 'pending' ? 'Gözləyən sorğu yoxdur.' : 'Sorğu tapılmadı.'
}
