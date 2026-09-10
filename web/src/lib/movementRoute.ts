/* Warehouse display names and the transfer route — A12.

   index.html:584-593 (WH_DISPLAY/whLabel) and 1430-1454
   (normWhName/resolveWh/transferRoute/routeOrPartner). */

/**
 * `WH_DISPLAY` — index.html:592. A DISPLAY-ONLY alias.
 *
 * The stored value never changes. The original's comment is emphatic about
 * why: the name is the KEY in `warehouses.name`, `movements.warehouse`,
 * `users.warehouse` and in the text comparisons inside the SQL functions
 * (sql/007, sql/027), so a `<select>`'s option value must stay the real name
 * and only the visible text passes through here.
 */
export const WH_DISPLAY: Record<string, string> = { 'Xocahəsən': 'Xocəsən' }

/** `whLabel` — index.html:593. */
export function whLabel(n: string | null | undefined): string {
  if (n == null) return ''
  return WH_DISPLAY[n] ?? n
}

/**
 * `normWhName` — index.html:1430-1433.
 *
 * Lower-cases, canonicalises the dotless `ı` to `i` (which also collapses the
 * capital `I` difference), then strips the display-only suffixes
 * «anbar / anbarı / anbarına». The same canonicalisation is applied to both
 * sides of every comparison, and no configured warehouse name contains `ı`,
 * so the match is not disturbed.
 */
export function normWhName(s: string | null | undefined): string {
  const t = String(s ?? '').trim().toLowerCase().replace(/ı/g, 'i')
  return t.replace(/\s*(anbarina|anbari|anbar)$/, '').trim()
}

/** `resolveWh` — index.html:1434-1438. Exact match against the configured
    list only; an unrecognised side is never guessed at. */
export function resolveWh(raw: string | null | undefined, warehouses: string[]): string | null {
  const norm = normWhName(raw)
  if (!norm) return null
  return warehouses.find((w) => normWhName(w) === norm) ?? null
}

export interface RouteMovement {
  type: string
  warehouse: string | null
  partner: string | null
  in_qty: number | null
  out_qty: number | null
}

/**
 * `transferRoute` — index.html:1440-1452. «Source → destination» for a
 * Yerdəyişmə row; null for every other type, which leaves the caller's
 * existing text in place.
 *
 * The direction comes from the quantities: an outgoing row leaves this
 * warehouse for the other one, an incoming row arrives from it. A row with
 * neither, or with neither side recognised, yields null rather than a
 * half-invented route. A side that alone fails to resolve renders as «—».
 *
 * Display only: the original recomputes it on every render, never stores it
 * and never compares it against a database value — which is why the DISPLAY
 * name is used here.
 */
export function transferRoute(m: RouteMovement, warehouses: string[]): string | null {
  if (m.type !== 'Yerdəyişmə') return null
  const own = resolveWh(m.warehouse, warehouses)
  const other = resolveWh(m.partner, warehouses)

  let from: string | null
  let to: string | null
  if ((m.out_qty ?? 0) > 0) { from = own; to = other }
  else if ((m.in_qty ?? 0) > 0) { from = other; to = own }
  else return null

  if (!from && !to) return null
  return whLabel(from ?? '—') + ' → ' + whLabel(to ?? '—')
}

/**
 * `routeOrPartner` — index.html:1454. The route for a transfer, the stored
 * partner/project text for everything else, and an em dash when there is no
 * partner at all.
 */
export function routeOrPartner(m: RouteMovement, warehouses: string[]): string {
  return transferRoute(m, warehouses) || (m.partner || '—')
}
