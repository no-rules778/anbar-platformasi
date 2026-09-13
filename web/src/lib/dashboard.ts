import type { MovementRow } from '../api/itemMovements.api'
import type { ItemRow } from '../api/items.api'
import type { WarehouseBalance } from './itemIndex'
import { money, nf } from './format'

/* «İdarə paneli» — rDash() (index.html:1534-1589) as PURE derivations over
   the accepted Phase 9 outputs (`buildItemIndexes().bal` = `IX.bal`,
   `.operational` = `normalMovements()`). Nothing here re-derives a balance,
   re-filters cancellations or reads anything (M11-16, M11-17).

   Two legacy asymmetries are preserved deliberately (proposal §2.3-2.6):
   - the KPIs, donut, both tables and the subtitle's movement COUNT follow the
     warehouse selector; the bar chart and the subtitle's `last` date do NOT;
   - KPI 4 values a purchase by the MOVEMENT price with item-price fallback
     (1546), while every other value on the page is item price only (1313). */

const EPS = 1e-9

/** `parseFloat(x) || 0` — the legacy loader's numeric read (936-946). */
const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

/** `dsort` — index.html:601. */
const dsort = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

export interface DashboardScope {
  /** `bal` (1541) — selector-scoped balances, or ALL by identity when `w` is ''. */
  bal: readonly WarehouseBalance[]
  /** `movs` (1542) — selector-scoped operational rows, or ALL by identity. */
  movs: readonly MovementRow[]
  /** `pos` (1543) — `bal` with `abs(q) > 1e-9`. */
  pos: readonly WarehouseBalance[]
}

/** index.html:1541-1543. `w === ''` returns the SAME arrays (no copy). */
export function scopeByWarehouse(
  bal: readonly WarehouseBalance[],
  operational: readonly MovementRow[],
  w: string,
): DashboardScope {
  const scopedBal = w ? bal.filter((b) => b.w === w) : bal
  const movs = w ? operational.filter((m) => m.warehouse === w) : operational
  return { bal: scopedBal, movs, pos: scopedBal.filter((b) => Math.abs(b.q) > EPS) }
}

export type KpiClass = '' | 'g' | 'o' | 'r' | 'v'

export interface DashboardKpi {
  label: string
  value: string
  sub: string
  cls: KpiClass
}

/** The five KPIs — index.html:1544-1556, in the legacy order. */
export function dashboardKpis(scope: DashboardScope, items: readonly ItemRow[]): DashboardKpi[] {
  /* `DB.itemBy.get(c).price` — the loader stores `parseFloat(r.price) || 0` (876). */
  const itemPrice = new Map(items.map((i) => [i.code, num(i.price)]))
  const val = scope.bal.reduce((s, b) => s + b.val, 0)
  const tin = scope.movs.reduce((s, m) => s + num(m.in_qty), 0)
  const tout = scope.movs.reduce((s, m) => s + num(m.out_qty), 0)
  /* 1546 — `(m.i || 0) * (m.pr || itemPrice || 0)`: the MOVEMENT price wins
     whenever it is truthy (a negative price is truthy and stays); only a
     falsy price (0 / null) falls back to the item price, then to 0. */
  const purch = scope.movs
    .filter((m) => m.type === 'Satınalma')
    .reduce((s, m) => s + num(m.in_qty) * (num(m.price) || itemPrice.get(m.item_code) || 0), 0)
  const noPrice = scope.pos.filter((b) => !b.price).length
  return [
    { label: 'Qalıq dəyəri', value: money(val), sub: nf(scope.pos.length) + ' aktiv mövqe', cls: 'g' },
    { label: 'Ümumi mədaxil', value: nf(tin, 2), sub: 'bütün dövr üzrə', cls: '' },
    /* 1554 — `(tin ? (tout / tin * 100).toFixed(1) : 0) + '% dövriyyə'`:
       a literal `0` (not `0.0`) when nothing came in; otherwise JS
       `toFixed(1)` with a DOT decimal, the one non-locale number on the page. */
    { label: 'Ümumi məxaric', value: nf(tout, 2), sub: (tin ? (tout / tin * 100).toFixed(1) : 0) + '% dövriyyə', cls: 'o' },
    { label: 'Satınalma məbləği', value: money(purch), sub: 'qiyməti bəlli sətirlər üzrə', cls: 'v' },
    { label: 'Qiyməti olmayan mövqe', value: nf(noPrice), sub: noPrice ? 'dəyərləndirmə natamamdır' : 'hamısı qiymətlidir', cls: noPrice ? 'r' : 'g' },
  ]
}

export interface BarDatum {
  /** The RAW warehouse name — `barChart()` prints `d.k` as is (1373), no alias. */
  k: string
  v: number
  sub?: string
  color?: string
}

/** «Anbarlar üzrə dəyər və mövqe sayı» — index.html:1558-1561. Takes EVERY
    configured warehouse and the UNscoped `IX.bal`: the selector does not
    apply here. */
export function warehouseValueBars(warehouses: readonly string[], bal: readonly WarehouseBalance[]): BarDatum[] {
  return warehouses
    .map((x) => {
      const b = bal.filter((y) => y.w === x)
      return {
        k: x,
        v: Math.round(b.reduce((s, y) => s + y.val, 0)),
        sub: nf(b.filter((y) => Math.abs(y.q) > EPS).length) + ' mövqe',
      }
    })
    .sort((a, b) => b.v - a.v)
}

/** index.html:1565 — the fixed palette; anything else falls to the grey. */
export const TYPE_COLORS: Readonly<Record<string, string>> = {
  'Satınalma': '#0E7C6B',
  'Əvvələ qalıq': '#1F4E6B',
  'Yerdəyişmə': '#5B4B9E',
  'Silinmə': '#A9231C',
  'Sahəyə': '#B06A11',
  'Qaytarma': '#71838F',
  'İcarə': '#7A5C29',
}
export const TYPE_COLOR_FALLBACK = '#71838F'

export interface DonutDatum {
  k: string
  v: number
  color: string
}

/** «Əməliyyat növləri» — index.html:1566: distinct types of the SCOPED rows,
    counted, coloured, sorted by count descending. */
export function movementTypeCounts(movs: readonly MovementRow[]): DonutDatum[] {
  return Array.from(new Set(movs.map((m) => m.type)))
    .map((t) => ({ k: t, v: movs.filter((m) => m.type === t).length, color: TYPE_COLORS[t] || TYPE_COLOR_FALLBACK }))
    .sort((a, b) => b.v - a.v)
}

/** «Dəyərə görə ilk 10 mövqe» — index.html:1570. */
export function topPositions(pos: readonly WarehouseBalance[]): WarehouseBalance[] {
  return pos.slice().sort((a, b) => b.val - a.val).slice(0, 10)
}

/** `m.ts` — `new Date(r.created_at).getTime()` (944), read back as
    `(x.ts || 0)` (1576), so a missing or invalid timestamp sorts as 0. */
const ts = (m: MovementRow): number => {
  const t = new Date(m.created_at ?? '').getTime()
  return t || 0
}

/** «Son əməliyyatlar» — index.html:1576: `created_at` DESC, then date DESC,
    first 10. */
export function recentMovements(movs: readonly MovementRow[]): MovementRow[] {
  return movs.slice().sort((a, b) => ts(b) - ts(a) || dsort(b.date, a.date)).slice(0, 10)
}

/** `#dash-sub` — index.html:1548-1550. `last` is the newest OPERATIONAL date
    over ALL warehouses (`IX.dates`, 1320), raw ISO, `—` when none; the
    count is the SCOPED set; `w` prints raw (no `whLabel`). */
export function dashboardSubtitle(w: string, allOperational: readonly MovementRow[], scopeMovs: readonly MovementRow[]): string {
  const dates = allOperational.map((m) => m.date).filter(Boolean).sort(dsort)
  const last = dates[dates.length - 1] || '—'
  return (w || 'Bütün anbarlar') + ' · son əməliyyat tarixi ' + last + ' · ' + nf(scopeMovs.length) + ' hərəkət qeydi'
}
