import { routeOrPartner, transferRoute, type RouteMovement } from './movementRoute'

/* The ONE semantic key behind «İstiqamət / kontragent» — M8-54,
   ported from index.html:1456-1491 (`movKey`, `movKeyKind`, `movKeyLabel`,
   `movKeyText`).

   `movements.partner` historically carries TWO different meanings: a real
   counterparty/project, and the technical direction of a transfer. That is why
   the filter list used to show one warehouse under three spellings
   («Astara anbar», «Astara anbarı», «Astara anbarına») as three distinct
   values.

   `movKey()` collapses that into one key, and the SAME key is used everywhere:
   the option list, the filter itself, the search text and the screen export —
   so screen, filter, search and Excel all describe a row identically.

   The prefixes exist to remove collisions: a counterparty whose text happens to
   look like a route never lands on the same value as a route.

     route:<source → destination>  — a transfer with BOTH sides recognised
     raw:<partner>                 — a transfer with a side unrecognised; kept
                                     DELIBERATELY separate, because merging
                                     these under «—» would invisibly mix
                                     different routes (e.g. RLS hides `Ofis`
                                     from an anbardar)
     partner:<partner>             — every other type: counterparty, project,
                                     responsible person, «Anbar qalığı» —
                                     unchanged

   NOTHING is written: not to Supabase, not to historical rows, not to
   `partner`/`channel`. This is a derived display/filter value only. */

/** `movKey` — index.html:1476-1483. */
export function movKey(m: RouteMovement | null | undefined, warehouses: string[]): string {
  if (!m) return 'partner:'
  if (m.type !== 'Yerdəyişmə') return 'partner:' + (m.partner || '')
  const r = transferRoute(m, warehouses)
  /* A half-resolved route such as «Ələt → —» is NOT merged — the row keeps its
     own stored text under the `raw:` bucket instead. */
  if (r && r.indexOf('—') < 0) return 'route:' + r
  return 'raw:' + (m.partner || '')
}

/** `movKeyKind` — index.html:1484. The empty string when there is no `:`. */
export function movKeyKind(k: string | null | undefined): string {
  const s = String(k ?? '')
  const i = s.indexOf(':')
  return i < 0 ? '' : s.slice(0, i)
}

/** `movKeyLabel` — index.html:1485. The whole value when there is no `:`. */
export function movKeyLabel(k: string | null | undefined): string {
  const s = String(k ?? '')
  const i = s.indexOf(':')
  return i < 0 ? s : s.slice(i + 1)
}

/**
 * `movKeyText` — index.html:1487-1490. The text shown in the filter and the
 * export, identical to the screen cell: the route label for a resolved
 * transfer, otherwise `routeOrPartner()`.
 */
export function movKeyText(m: RouteMovement, warehouses: string[]): string {
  const k = movKey(m, warehouses)
  return movKeyKind(k) === 'route' ? movKeyLabel(k) : routeOrPartner(m, warehouses)
}
