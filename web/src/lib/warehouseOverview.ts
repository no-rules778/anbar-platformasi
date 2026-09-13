import type { MovementRow } from '../api/itemMovements.api'
import type { WarehouseRow } from '../api/warehouses.api'
import type { WarehouseBalance } from './itemIndex'
import { whLabel } from './movementRoute'

/* «Anbar və layihələr» (rAnb(), index.html:2900-2917) and the `dead` report
   branch (6788-6804) as PURE derivations over the accepted Phase 9 outputs.

   Every function takes OPERATIONAL movements — `IX.movs` / `normalMovements()`
   — never the raw rows. The caller (the store) obtains them from
   `buildItemIndexes()`, which applies `excludeCancelled()` first (M10-14);
   nothing here re-derives a balance or re-filters cancellations (M10-15). */

const EPS = 1e-9

/** The legacy partner-index key — `m.p || '(göstərilməyib)'` (index.html:1297). */
const UNNAMED_PARTNER = '(göstərilməyib)'

export interface WarehouseSummary {
  warehouse: string
  positions: number
  value: number
  movements: number
  last: string
}

export interface LocationSummary {
  id: string | number
  name: string
  kind: string
  active: boolean
  movements: number
  turnover: number
}

export interface DeadStockRow {
  balance: WarehouseBalance
  days: number
  moved: boolean
}

/** «Fiziki anbarlar» — index.html:2902-2907, one row per `DB.whs` entry in
    the configured order. `movements` and `last` come from the operational rows
    (`IX.byWh.get(w).n` and `normalMovements()`), `positions`/`value` from
    `IX.bal`. */
export function warehouseSummaries(
  warehouses: readonly string[],
  balances: readonly WarehouseBalance[],
  movements: readonly MovementRow[],
): WarehouseSummary[] {
  return warehouses.map((warehouse) => {
    const bal = balances.filter((b) => b.w === warehouse)
    const mov = movements.filter((m) => m.warehouse === warehouse)
    return {
      warehouse,
      positions: bal.filter((b) => Math.abs(b.q) > EPS).length,
      value: bal.reduce((sum, b) => sum + b.val, 0),
      movements: mov.length,
      last: mov.reduce((max, m) => m.date > max ? m.date : max, ''),
    }
  })
}

/** «Layihə və təhvil məntəqələri» — index.html:2909-2913, one row per loaded
    `DB.locs` entry INCLUDING inactive ones (D-K2). Statistics are the
    `IX.byPartner` entry for the location's exact name; that index is keyed by
    `m.p || '(göstərilməyib)'` (1297), so a movement without a partner is
    attributed to a location literally named «(göstərilməyib)» and to nothing
    else. Turnover is `in + out` QUANTITY (2912), never money. */
export function locationSummaries(
  locations: readonly WarehouseRow[],
  movements: readonly MovementRow[],
): LocationSummary[] {
  return locations.map((location) => {
    const mov = movements.filter((m) => (m.partner || UNNAMED_PARTNER) === location.name)
    return {
      id: location.id,
      name: location.name,
      kind: location.type ?? '',
      active: location.active !== false,
      movements: mov.length,
      turnover: mov.reduce((sum, m) => sum + Number(m.in_qty ?? 0) + Number(m.out_qty ?? 0), 0),
    }
  })
}

/** The `dead` branch — index.html:6789-6794.
    - source: `IX.positions` (non-zero balances, `abs(q) > 1e-9`);
    - reference: the newest operational date (`IX.dates` is built from the
      operational `byDate` keys), else `today()` supplied by the caller;
    - days: `Math.round((ref - new Date(b.last)) / 86400000)`;
    - moved: same item AND warehouse, `out > 0`, type not «Yerdəyişmə»;
    - kept when `days >= 30 || !moved`; sorted by `val` descending. */
export function deadStockRows(
  balances: readonly WarehouseBalance[],
  movements: readonly MovementRow[],
  todayValue: string,
): DeadStockRow[] {
  const dates = movements.map((m) => m.date).filter(Boolean).sort()
  const reference = dates[dates.length - 1] || todayValue
  const refTime = new Date(reference).getTime()
  return balances
    .filter((b) => Math.abs(b.q) > EPS)
    .map((balance) => {
      const days = Math.round((refTime - new Date(balance.last).getTime()) / 86_400_000)
      const moved = movements.some((m) =>
        m.item_code === balance.c
        && m.warehouse === balance.w
        && Number(m.out_qty ?? 0) > 0
        && m.type !== 'Yerdəyişmə',
      )
      return { balance, days, moved }
    })
    .filter((row) => row.days >= 30 || !row.moved)
    .sort((a, b) => b.balance.val - a.balance.val)
}

/** The three KPIs — index.html:6797-6799. */
export const deadStockKpis = (rows: readonly DeadStockRow[]) => ({
  positions: rows.length,
  value: rows.reduce((sum, row) => sum + row.balance.val, 0),
  neverUsed: rows.filter((row) => !row.moved).length,
})

/** `REP_ROWS` for `hereketsiz_qaliq` — index.html:6795-6796. Eight exact
    columns over the COMPLETE derived set (the on-screen table is cut, the
    export is not). The warehouse column is the DISPLAY alias `whLabel()`
    (6796), unlike the table cell, which prints the raw name (6803). */
export function deadStockExportMatrix(rows: readonly DeadStockRow[]): unknown[][] {
  return [
    ['Kod', 'Mal', 'Anbar', 'Qalıq', 'Dəyər', 'Son hərəkət', 'Hərəkətsiz gün', 'Heç vaxt istifadə olunmayıb'],
    ...rows.map(({ balance: b, days, moved }) => [b.c, b.name, whLabel(b.w), b.q, b.val.toFixed(2), b.last, days, moved ? '' : 'bəli']),
  ]
}
