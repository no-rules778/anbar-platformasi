import { movKey, movKeyKind, movKeyLabel, movKeyText } from './movementKey'
import type { RouteMovement } from './movementRoute'

/* «Mal hərəkəti» registry filtering, sorting, option derivation and the footer
   KPI line — M8-07 … M8-12, ported from index.html:1592-1690 and 1796.

   Everything here is PURE and read-only. The row source is
   `excludeCancelled()` (lib/operationalMovements.ts, the legacy
   `normalMovements()`); these functions expect that filtering to have already
   happened, exactly as the legacy functions do — they call `normalMovements()`
   themselves, and the React caller passes its result in. */

/** The subset of a movement this screen's logic reads. */
export interface MovementFilterRow extends RouteMovement {
  id: string | number
  item_code: string
  date: string
  invoice_num: string | null
  contract_num?: string | null
  note: string | null
  /** `movements.price` — the legacy `m.pr`. First link of the KPI value chain
      (`m.pr → item.price → 0`); `RouteMovement` does not carry it. */
  price: number | null
  /** Supabase hands `created_at` back as a nullable ISO string; the legacy
      `m.ts` is already epoch ms (index.html:940). See `movementTs()`. */
  created_at: string | null
  /* The three fields below are DISPLAY-ONLY for this module: nothing here
     filters, sorts or values by them. They live on the row type because the
     «Mal hərəkəti» table renders the same row object it filters (I-2), and
     splitting it into a filter type and a render type would mean casting at
     the boundary — which is how a column silently goes missing.

     `doc_num` additionally satisfies `CancelStateMovement`, so a filtered row
     can be passed straight to `cancelledDocFor()` without a cast. */
  /** `movements.doc_num` — the SYSTEM document number. REQUIRED, not optional:
      it is always in the read's column list, and making it optional would stop
      a filtered row satisfying `CancelStateMovement`, forcing a cast at the
      call site of `cancelledDocFor()` — the one place a missing `doc_num`
      would silently read as "no document" rather than failing to compile. */
  doc_num: string | null
  /** `movements.channel` — the legacy `m.ch`. */
  channel?: string | null
  /** `movements.created_by` — the legacy `m.by`, shown as «Qeyd edən». The
      `'sistem'` fallback is display formatting and is NOT applied here. */
  created_by?: string | null
}

/** Only the name is consumed from the nomenclature index during search; the
    price is consumed by `movementKpis()`, and the unit only by the export. */
export interface MovementFilterItem {
  name?: string | null
  price?: number | null
  /** «Ölçü» — read ONLY by the Excel export (I-7, `movementExportMatrix`);
      nothing filters, sorts or values by it, and the table does not show it.
      It costs no read: `items.api.ts` already selects `unit` and the store's
      snapshot already carries it — before I-7 `derive()` simply dropped it
      while building this index. */
  unit?: string | null
}

/**
 * The FIXED eight-type list of the `#mf-t` select — index.html:1621.
 *
 * This is deliberately NOT `CANCELLABLE_TYPES`: it is longer (it includes
 * `Yerdəyişmə`) and is ordered for the filter, not for the cancellation
 * dispatcher. The two lists must not be unified.
 */
export const MOVEMENT_TYPE_FILTERS = [
  'Əvvələ qalıq',
  'Satınalma',
  'Yerdəyişmə',
  'Silinmə',
  'Sahəyə',
  'Qaytarma',
  'İcarə',
  'Satış',
] as const

/** `MF` — index.html:1592, without the DOM-only `page`/`size`. */
export interface MovementFilters {
  /** Already lowercased and trimmed by the caller, as `upd()` does (1625). */
  q: string
  /** Warehouse — the STORED name, never the display alias. */
  w: string
  /** Movement type. */
  t: string
  /** The `movKey()` value of the İstiqamət/kontragent selection. */
  p: string
  /** Inclusive date lower bound, `YYYY-MM-DD`. */
  d1: string
  /** Inclusive date upper bound, `YYYY-MM-DD`. */
  d2: string
}

export const EMPTY_MOVEMENT_FILTERS: MovementFilters = { q: '', w: '', t: '', p: '', d1: '', d2: '' }

/**
 * `searchableNote` — index.html:1657-1660.
 *
 * The item-replacement row stores the OLD code in its note
 * («Mal əvəzləndi: 0001170 → 0001260 · Səbəb: …»). That is useful to a human,
 * but if it stayed in the search field a query for «1170» would surface the row
 * whose code is 0001260 — the user searches one code and sees a different item.
 * Only that technical fragment is removed; the reason text stays searchable.
 */
export function searchableNote(note: string | null | undefined): string {
  return String(note ?? '').replace(/Mal əvəzləndi:\s*\S+\s*→\s*\S+\s*·?\s*/g, '')
}

/** The non-search part of the predicate, shared by `filterMovements()` and
    `movKeyOptions()` — the latter deliberately omits `q` and `p` (1598-1604). */
function matchesScope(m: MovementFilterRow, f: MovementFilters): boolean {
  if (f.w && m.warehouse !== f.w) return false
  if (f.t && m.type !== f.t) return false
  if (f.d1 && m.date < f.d1) return false
  if (f.d2 && m.date > f.d2) return false
  return true
}

/**
 * `movFiltered`'s predicate — index.html:1662-1674, WITHOUT the sort. Sorting
 * is `sortMovements()` so a caller can filter and sort independently.
 *
 * The haystack composition is exact and its field order is preserved: code,
 * item name, the STORED partner text, `movKeyText()`, type, invoice, contract
 * and `searchableNote()`. Both the historical partner text AND the displayed
 * route take part, so «Astara anbarına» and «Ələt → Astara» each find the same
 * row.
 *
 * `items` maps item code → the nomenclature row, mirroring `DB.itemBy`; a
 * missing code contributes an empty name rather than dropping the row.
 */
export function filterMovements(
  rows: MovementFilterRow[],
  f: MovementFilters,
  items: Map<string, MovementFilterItem>,
  warehouses: string[],
): MovementFilterRow[] {
  return rows.filter((m) => {
    if (!matchesScope(m, f)) return false
    if (f.p && movKey(m, warehouses) !== f.p) return false
    if (f.q) {
      const it = items.get(m.item_code)
      const hay = (
        m.item_code +
        ' ' +
        (it?.name || '') +
        ' ' +
        (m.partner ?? '') +
        ' ' +
        movKeyText(m, warehouses) +
        ' ' +
        m.type +
        ' ' +
        (m.invoice_num || '') +
        ' ' +
        (m.contract_num || '') +
        ' ' +
        searchableNote(m.note)
      ).toLowerCase()
      if (hay.indexOf(f.q) < 0) return false
    }
    return true
  })
}

/**
 * `m.ts` — index.html:940, `new Date(r.created_at).getTime()`.
 *
 * An absent or malformed timestamp yields `NaN` there, and the legacy sort
 * comparator writes `(b.ts || 0)`, so `NaN` is coerced to 0 — it sorts LAST
 * among equal dates rather than poisoning the comparison with `NaN`, which
 * would make the sort order implementation-defined. That coercion is ported
 * here deliberately; it is not a simplification.
 */
function movementTs(createdAt: string | null | undefined): number {
  if (createdAt == null) return 0
  const ms = new Date(createdAt).getTime()
  return Number.isFinite(ms) ? ms : 0
}

/** `dsort` — index.html:601. String comparison, NOT `localeCompare`: the dates
    are ISO `YYYY-MM-DD`, where lexicographic order is chronological order. */
const dsort = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/**
 * `movFiltered`'s ordering — index.html:1675: `date` descending, then
 * `created_at` descending. Returns a new array; the input is not mutated.
 */
export function sortMovements(rows: MovementFilterRow[]): MovementFilterRow[] {
  return rows
    .slice()
    .sort((a, b) => dsort(b.date, a.date) || movementTs(b.created_at) - movementTs(a.created_at))
}

/** The footer KPI line's four numbers — index.html:1796, 1826-1828. */
export interface MovementKpis {
  /** Row count of the FILTERED set, before the 3000-row soft cap. */
  count: number
  /** Σ `in_qty`. */
  totalIn: number
  /** Σ `out_qty`. */
  totalOut: number
  /** Σ `in_qty × (price → item price → 0)`. Outbound rows contribute nothing. */
  inboundValue: number
}

/**
 * `movementKpis` — index.html:1796.
 *
 * The value fallback chain is the movement's own price, then the nomenclature
 * price, then 0 — the same chain the table cell uses for non-`Silinmə` rows.
 * Only the INBOUND quantity is valued; this is «mədaxil dəyəri», not turnover.
 *
 * The KPIs are computed over the FULL filtered set, never over the capped
 * slice — the legacy code passes `all`, not `rows`.
 */
export function movementKpis(
  rows: MovementFilterRow[],
  items: Map<string, MovementFilterItem>,
): MovementKpis {
  let totalIn = 0
  let totalOut = 0
  let inboundValue = 0
  for (const m of rows) {
    const inQty = m.in_qty || 0
    totalIn += inQty
    totalOut += m.out_qty || 0
    inboundValue += inQty * (m.price || items.get(m.item_code)?.price || 0)
  }
  return { count: rows.length, totalIn, totalOut, inboundValue }
}

/** One `<option>`: the `movKey()` value and its visible label. */
export type MovKeyOption = readonly [key: string, label: string]

/** The three `<optgroup>`s of `#mf-p` — index.html:1650-1652. */
export interface MovKeyOptions {
  /** «Yerdəyişmə marşrutları» */
  routes: MovKeyOption[]
  /** «Kontragentlər / layihələr» */
  partners: MovKeyOption[]
  /** «Tanınmayan / köhnə idxal» */
  raws: MovKeyOption[]
}

/**
 * `movKeyOptions` — index.html:1597-1619.
 *
 * The list is built from the rows matching the CURRENT warehouse/type/date
 * filters but deliberately NOT `MF.p` itself: choosing a warehouse hides routes
 * and counterparties that do not belong to it (requirement 5), while the
 * İstiqamət selection must not narrow the list it lives in.
 *
 * A key whose label is empty is skipped, so `partner:` (an empty partner) never
 * becomes a blank option. The first label seen for a key wins, and each group
 * is sorted by label with the Azerbaijani collation.
 */
export function movKeyOptions(
  rows: MovementFilterRow[],
  f: MovementFilters,
  warehouses: string[],
): MovKeyOptions {
  const routes = new Map<string, string>()
  const partners = new Map<string, string>()
  const raws = new Map<string, string>()

  for (const m of rows) {
    if (!matchesScope(m, f)) continue
    const k = movKey(m, warehouses)
    const kind = movKeyKind(k)
    const label = movKeyLabel(k)
    if (!label) continue
    const bucket = kind === 'route' ? routes : kind === 'raw' ? raws : partners
    if (!bucket.has(k)) bucket.set(k, label)
  }

  const byLabel = (m: Map<string, string>): MovKeyOption[] =>
    Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], 'az'))

  return { routes: byLabel(routes), partners: byLabel(partners), raws: byLabel(raws) }
}

/**
 * The reset half of `rebuildMovPartnerOptions` — index.html:1653-1655.
 *
 * When the current İstiqamət selection is no longer among the rebuilt options —
 * because the warehouse, type, date range or the loaded data changed — it falls
 * back to «all» rather than leaving the user with an empty result they cannot
 * explain. An empty selection is already valid and is returned unchanged.
 */
export function resolveMovKeySelection(current: string, options: MovKeyOptions): string {
  if (!current) return ''
  const present = (list: MovKeyOption[]): boolean => list.some(([k]) => k === current)
  return present(options.routes) || present(options.partners) || present(options.raws)
    ? current
    : ''
}
