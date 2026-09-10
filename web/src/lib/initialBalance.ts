import { isInitialBalanceLine, INIT_BAL_PARTNERS, INIT_BAL_TYPE } from './opLineValidation'
import type { WarehouseBalance } from './itemIndex'
import type { ItemRow } from '../api/items.api'

/* «Əvvələ qalıq» reconstruction — index.html:1898-1916, 1926-1952, 1959-2048,
   and the view's filter/sort at 2240-2253.

   Read-only and pure. The legacy function walks the operational movements in
   chronological order, treats every «Əvvələ qalıq» + marker row as an opening
   layer, then follows that layer through FIFO consumption and warehouse
   transfers so the «Cari qalıq» mode can show where the original stock ended
   up. Nothing here renders, formats, pages or writes.

   Rows covered: M9-70…M9-77, M9-79, M9-79a, M9-79b, M9-84 (D-J4) and the
   opening-view sort M9-55. The table columns (M9-80…M9-83) and the four
   opening-view KPI tiles (M9-85) are presentation and are NOT here. */

/** The transfer movement type — index.html:2000, 2019. */
const TRANSFER = 'Yerdəyişmə'

/** The legacy epsilon (1974, 2035, 2244-2245). */
const EPS = 1e-9

export { INIT_BAL_PARTNERS, INIT_BAL_TYPE }

/**
 * The subset of a movement this reconstruction reads.
 *
 * A local interface rather than `MovementRow`, following the
 * `MovementFilterRow` precedent: it names exactly the columns the algorithm
 * consumes, so a caller cannot silently omit `channel` — which D-J4 makes
 * load-bearing — and fixtures stay small.
 *
 * `channel` is optional to match `MovementRow`, where it postdates several
 * consumers. An absent channel simply never carries the marker.
 */
export interface InitialBalanceMovement {
  item_code: string
  warehouse: string
  date: string | null
  in_qty: number | null
  out_qty: number | null
  partner: string | null
  /** `movements.channel` — the legacy `m.ch`. Load-bearing under D-J4. */
  channel?: string | null
  type: string
  doc_num: string | null
  /** Nullable ISO string; the legacy `m.ts` is already epoch ms. */
  created_at: string | null
}

/** One reconstructed «Əvvələ qalıq» position — the legacy `agg` value shape. */
export interface InitialBalanceRow {
  /** item code */
  c: string
  name: string
  /** warehouse */
  w: string
  unit: string
  /** Σ of the opening rows posted IN this warehouse (2007). */
  initial_qty: number
  /** What survives of the opening layers here, after FIFO and transfers (2041). */
  current_qty: number
  /** The warehouse the layer originally opened in (2035, 2043). */
  opening_warehouse?: string
  /** EARLIEST opening date (2011-2012, 2044-2048). */
  opening_date: string
  /** Last movement date, raised from `IX.bal` when that is later (2047). */
  last: string
}

/** `m.ts` — index.html:940, `new Date(r.created_at).getTime()`.
 *
 * Transcribed locally rather than imported: the copy in `movementFilters.ts`
 * is module-private, and widening that screen's public surface for an
 * unrelated consumer would couple the two — the same reasoning `dsort` carries
 * in `balanceFilters.ts`. An absent or malformed timestamp yields 0, matching
 * the legacy `(a.ts || 0)` coercion at 1997. */
function movementTs(createdAt: string | null | undefined): number {
  if (createdAt == null) return 0
  const ms = new Date(createdAt).getTime()
  return Number.isFinite(ms) ? ms : 0
}

/** NFKC + trim + lowercase — index.html:1907, `_normBase`. */
const normBase = (s: unknown): string => String(s ?? '').normalize('NFKC').trim().toLowerCase()

const num = (v: number | null | undefined): number =>
  v == null || !Number.isFinite(Number(v)) ? 0 : Number(v)

/** One FIFO lot. `origin` is what makes provenance decidable (1965-1969). */
interface Lot {
  origin: 'opening' | 'later'
  qty: number
  opening_date: string
  opening_warehouse: string
}

/** A lot fragment in flight between two transfer legs. */
interface MovedLot {
  qty: number
  opening_date: string
  opening_warehouse: string
}

const keyOf = (w: string, c: string): string => w + '|' + c

/**
 * `whFromLabel` — index.html:1935-1944.
 *
 * A transfer leg stores its counterparty as an Azerbaijani-declined label
 * («<dest> anbarına» outbound, «<src> anbarı» inbound). Strip the ` anbar…`
 * suffix in ANY declension, then resolve to the canonical `DB.whs` spelling so
 * the pairing key is stable.
 *
 * The two-step fallback is ported exactly: the stripped form is tried first,
 * then the raw normalised label (which covers a warehouse whose own name ends
 * in «anbar»), and only then the bare stripped string.
 */
export function warehouseFromLabel(label: string | null | undefined, whs: string[]): string {
  const raw = normBase(label)
  const stripped = raw.replace(/\s+anbar\S*$/u, '').trim()
  const hit =
    whs.find((w) => normBase(w) === stripped) ?? whs.find((w) => normBase(w) === raw)
  return hit ?? String(label ?? '').replace(/\s+anbar\S*$/iu, '').trim()
}

/**
 * `transferKey` — index.html:1945-1952.
 *
 * A documented transfer pairs on its document number. Older Excel-imported
 * transfers carry no document, so their two legs pair on date + item + source
 * + destination — which is why the direction decides which side is the row's
 * own warehouse and which is recovered from the label.
 */
function transferKey(m: InitialBalanceMovement, direction: 'in' | 'out', whs: string[]): string {
  if (m.doc_num) return 'doc|' + String(m.doc_num) + '|' + m.item_code
  const counterparty = warehouseFromLabel(m.partner, whs)
  const from = direction === 'out' ? m.warehouse : counterparty
  const to = direction === 'out' ? counterparty : m.warehouse
  return 'legacy|' + String(m.date ?? '') + '|' + m.item_code + '|' + from + '|' + to
}

/**
 * Is this movement a historical opening-balance row?
 *
 * **D-J4 (owner-approved, 2026-09-10).** Legacy is asymmetric: the WRITE guard
 * `isInitialBalanceLine()` (1926-1928) accepts the marker in partner **or**
 * channel, while the READ at 2001 accepts **partner only** — so a channel-only
 * historical row is refused at write for a non-admin yet never reconstructed in
 * this view. Phase 9 widens the read to match the write.
 *
 * This is NOT byte-identical legacy behaviour; it is the approved correction of
 * a legacy read-side omission. It is implemented by delegating to the very same
 * exported predicate the write path uses, so the two definitions cannot drift.
 * The TYPE half stays strict (NFKC+trim+lowercase, no ğ/q folding); only the
 * marker half tolerates ğ/q.
 */
export function isOpeningMovement(m: InitialBalanceMovement): boolean {
  return isInitialBalanceLine(m.type, m.partner, m.channel ?? '')
}

/**
 * `getInitialBalanceRows()` — index.html:1959-2048.
 *
 * @param movements OPERATIONAL movements only. The caller applies
 *   `excludeCancelled()` first, exactly as the legacy `normalMovements()` does.
 * @param items catalogue rows, the legacy `DB.itemBy`.
 * @param bal `IX.bal`, used only to raise `last` (2047).
 * @param whs canonical warehouse names, the legacy `DB.whs`.
 */
export function buildInitialBalanceRows(
  movements: InitialBalanceMovement[],
  items: ItemRow[],
  bal: WarehouseBalance[],
  whs: string[],
): InitialBalanceRow[] {
  const agg = new Map<string, InitialBalanceRow>()
  const lots = new Map<string, Lot[]>()
  const pendingTransfers = new Map<string, MovedLot[]>()
  const itemBy = new Map(items.map((i) => [i.code, i]))

  const addLot = (
    w: string,
    c: string,
    origin: Lot['origin'],
    qty: number,
    meta: Partial<MovedLot> = {},
  ): void => {
    /* `if (!(qty > 0)) return` — rejects 0, negatives and NaN in one
       expression (1961). A negated form is required: `qty <= 0` lets NaN in. */
    if (!(qty > 0)) return
    const key = keyOf(w, c)
    const q = lots.get(key) ?? []
    q.push({
      origin,
      qty,
      opening_date: meta.opening_date ?? '',
      opening_warehouse: meta.opening_warehouse ?? '',
    })
    lots.set(key, q)
  }

  /** FIFO consumption — 1966-1975. Only `opening` lots count toward provenance. */
  const consume = (w: string, c: string, qty: number): { opening: number; openingLots: MovedLot[] } => {
    let rest = Math.max(0, qty)
    let opening = 0
    const openingLots: MovedLot[] = []
    const key = keyOf(w, c)
    const q = lots.get(key) ?? []
    for (const lot of q) {
      if (!(rest > 0)) break
      const take = Math.min(lot.qty, rest)
      lot.qty -= take
      rest -= take
      if (lot.origin === 'opening') {
        opening += take
        openingLots.push({
          qty: take,
          opening_date: lot.opening_date,
          opening_warehouse: lot.opening_warehouse,
        })
      }
    }
    /* Exhausted lots are dropped with a STRICT `> 1e-9` (1974). */
    lots.set(key, q.filter((lot) => lot.qty > EPS))
    return { opening, openingLots }
  }

  const putPending = (key: string, moved: MovedLot[]): void => {
    if (!moved.length) return
    const q = pendingTransfers.get(key) ?? []
    q.push(...moved)
    pendingTransfers.set(key, q)
  }

  /** 1980-1990. Note the loop guard is `rest > 1e-9`, not `rest > 0`. */
  const takePending = (key: string, qty: number): { opening: number; lots: MovedLot[] } => {
    let rest = Math.max(0, qty)
    let opening = 0
    const q = pendingTransfers.get(key) ?? []
    const out: MovedLot[] = []
    while (rest > EPS && q.length) {
      const lot = q[0]
      const take = Math.min(rest, lot.qty)
      lot.qty -= take
      rest -= take
      opening += take
      out.push({ qty: take, opening_date: lot.opening_date, opening_warehouse: lot.opening_warehouse })
      if (lot.qty <= EPS) q.shift()
    }
    pendingTransfers.set(key, q)
    return { opening, lots: out }
  }

  /* Ordering — 1992-1998 (M9-71): date ascending, then a transfer's OUT leg
     before other rows of the same date, then `ts`. The OUT-before-IN rule is
     what lets a same-day transfer find its pending lots. */
  const movs = movements.slice().sort((a, b) => {
    const d = String(a.date ?? '').localeCompare(String(b.date ?? ''))
    if (d) return d
    const ao = a.type === TRANSFER && num(a.out_qty) > 0 ? 0 : 1
    const bo = b.type === TRANSFER && num(b.out_qty) > 0 ? 0 : 1
    return ao - bo || (movementTs(a.created_at) - movementTs(b.created_at))
  })

  for (const m of movs) {
    const key = keyOf(m.warehouse, m.item_code)
    const it = itemBy.get(m.item_code)
    const date = m.date ?? ''

    if (isOpeningMovement(m)) {
      const qty = num(m.in_qty) - num(m.out_qty)
      addLot(m.warehouse, m.item_code, 'opening', qty, {
        opening_date: date,
        opening_warehouse: m.warehouse,
      })
      let r = agg.get(key)
      if (!r) {
        r = {
          c: m.item_code,
          name: it?.name || '(nomenklaturada yoxdur: ' + m.item_code + ')',
          w: m.warehouse,
          unit: it?.unit ?? '',
          initial_qty: 0,
          current_qty: 0,
          opening_date: date,
          last: date,
        }
        /* The legacy literal (2004-2006) also carries `in: 0, out: 0`. They are
           dead there — nothing in the reconstruction, the view or the export
           ever reads them — so they are deliberately not part of the row type. */
        agg.set(key, r)
      }
      r.initial_qty += qty
      /* 2011-2012. The legacy assigns `m.d` on the empty branch even when it is
         itself empty, so an undated opening row leaves the field empty. */
      if (!r.opening_date || (date && date < r.opening_date)) r.opening_date = date
      if (date > r.last) r.last = date
      continue
    }

    const transfer = m.type === TRANSFER
    if (num(m.out_qty) > 0) {
      const consumed = consume(m.warehouse, m.item_code, num(m.out_qty))
      if (transfer) putPending(transferKey(m, 'out', whs), consumed.openingLots)
    }
    if (num(m.in_qty) > 0) {
      const moved = transfer
        ? takePending(transferKey(m, 'in', whs), num(m.in_qty))
        : { opening: 0, lots: [] as MovedLot[] }
      for (const lot of moved.lots) addLot(m.warehouse, m.item_code, 'opening', lot.qty, lot)
      addLot(m.warehouse, m.item_code, 'later', num(m.in_qty) - moved.opening)
    }
  }

  /* 2026-2037 (M9-73). A transfer does not create a new initial balance: it
     moves the original layer to another warehouse, which must appear in «Cari
     qalıq» WITHOUT duplicating «İlkin miqdar» — hence `initial_qty: 0`. */
  for (const [key, q] of lots) {
    const openingLots = q.filter((lot) => lot.origin === 'opening')
    if (!openingLots.length || agg.has(key)) continue
    const idx = key.indexOf('|')
    const w = key.slice(0, idx)
    const c = key.slice(idx + 1)
    const it = itemBy.get(c)
    const dates = openingLots.map((lot) => lot.opening_date).filter(Boolean).sort()
    const origins = openingLots.map((lot) => lot.opening_warehouse).filter(Boolean)
    agg.set(key, {
      c,
      name: it?.name || '(nomenklaturada yoxdur: ' + c + ')',
      w,
      unit: it?.unit ?? '',
      initial_qty: 0,
      current_qty: 0,
      opening_date: dates[0] ?? '',
      opening_warehouse: origins[0] ?? '',
      last: '',
    })
  }

  /* 2039-2048. `current_qty` is what survives of the OPENING lots only. */
  const rows = Array.from(agg.values())
  for (const r of rows) {
    const q = lots.get(keyOf(r.w, r.c)) ?? []
    const openingLots = q.filter((lot) => lot.origin === 'opening')
    r.current_qty = openingLots.reduce((s, lot) => s + lot.qty, 0)
    if (!r.opening_warehouse && openingLots.length) {
      r.opening_warehouse = openingLots[0].opening_warehouse || ''
    }
    if (
      openingLots.length &&
      (!r.opening_date || openingLots.some((lot) => lot.opening_date && lot.opening_date < r.opening_date))
    ) {
      r.opening_date =
        openingLots.map((lot) => lot.opening_date).filter(Boolean).sort()[0] ?? r.opening_date
    }
    /* M9-76 — `last` is RAISED from the current balance, never lowered. */
    const b = bal.find((x) => x.w === r.w && x.c === r.c)
    if (b && b.last > r.last) r.last = b.last
  }
  return rows
}

/* ---------- The «Əvvələ qalıq» view — index.html:2240-2253 ---------- */

/** `BF.initMode` — «İlkin miqdar» (default) or «Cari qalıq» (2244-2245). */
export type InitialBalanceMode = 'initial' | 'current'

/** The quantity column each mode reads (2249). */
export const modeQtyColumn = (mode: InitialBalanceMode): 'initial_qty' | 'current_qty' =>
  mode === 'current' ? 'current_qty' : 'initial_qty'

/** The active mode's label (2250) — also the quantity column header (M9-78). */
export const modeLabel = (mode: InitialBalanceMode): string =>
  mode === 'current' ? 'Cari qalıq' : 'İlkin miqdar'

export interface InitialBalanceFilter {
  /** Already lower-cased by the caller, exactly as `BF.q` is (2219). */
  q: string
  /** `BF.w`. `__sum` is treated as "no warehouse filter" (M9-79). */
  w: string
  mode: InitialBalanceMode
}

/**
 * The opening view's filter — 2240-2246.
 *
 * Guard order is load-bearing and ported exactly: search, THEN warehouse, THEN
 * the mode threshold (M9-79b).
 *
 * `__sum` does NOT merge warehouses in this view; it becomes `wSel = ''`, i.e.
 * no warehouse filter at all (M9-79). The current view's nomenclature/
 * no-movement augmentation does not apply here (M9-79a) — this set contains
 * only reconstructed opening positions.
 */
export function filterInitialBalanceRows(
  rows: InitialBalanceRow[],
  f: InitialBalanceFilter,
): InitialBalanceRow[] {
  const wSel = f.w && f.w !== '__sum' ? f.w : ''
  const col = modeQtyColumn(f.mode)
  return rows.filter((b) => {
    if (f.q && (b.name + ' ' + b.c).toLowerCase().indexOf(f.q) < 0) return false
    if (wSel && b.w !== wSel) return false
    /* Strictly greater than the epsilon, in BOTH modes (2244-2245). */
    if (!(b[col] > EPS)) return false
    return true
  })
}

/** `dsort` — index.html:601. See the note in `balanceFilters.ts`. */
const dsort = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/**
 * The opening view's sort — 2251-2253 (M9-55).
 *
 * Two differences from the current view's sort table, both load-bearing:
 *  - `val` and `q` BOTH sort by the ACTIVE quantity column — there is no value
 *    figure in this view at all;
 *  - the fallback for an unrecognised key is `name`, NOT `val`.
 *
 * Sorts a copy; the legacy sorts its own private filtered array in place.
 */
export function sortInitialBalanceRows(
  rows: InitialBalanceRow[],
  sort: string,
  mode: InitialBalanceMode,
): InitialBalanceRow[] {
  const col = modeQtyColumn(mode)
  const cmp: Record<string, (a: InitialBalanceRow, b: InitialBalanceRow) => number> = {
    val: (a, b) => b[col] - a[col],
    q: (a, b) => b[col] - a[col],
    name: (a, b) => a.name.localeCompare(b.name, 'az'),
    last: (a, b) => dsort(b.last, a.last),
  }
  return rows.slice().sort(cmp[sort] || cmp.name)
}
