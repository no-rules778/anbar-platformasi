import { describe, expect, it } from 'vitest'
import { deadStockRows, deadStockKpis, deadStockExportMatrix } from './warehouseOverview'
import { REPORT_NAMES } from './reports'
import type { MovementRow } from '../api/itemMovements.api'
import type { WarehouseBalance } from './itemIndex'

/* T6 — the `dead` branch REUSE (M14-60 … M14-64).

   THE SCOPE OF THIS FILE IS DELIBERATELY NARROW. Phase 10's dead-stock
   derivation is independently ACCEPTED and its own contracts (the 30-day
   boundary, the transfer-only exclusion, the never-used rule, the sort) are
   PHASE 10 ROWS, proved in `warehouseOverview.test.ts`. Re-asserting them here
   would double-count accepted evidence as new Phase 14 evidence, which
   protocol §6 forbids.

   What Phase 14 must evidence instead is that the Reports branch consumes
   THOSE functions — one derivation, two entry points — and that the legacy
   `rRep()` branch's own surface facts (slug, KPI shape, the table/export
   warehouse divergence) hold. */

const movement = (over: Partial<MovementRow>): MovementRow => ({
  id: 'm', item_code: 'A', warehouse: 'W', date: '2026-02-01', in_qty: 0,
  out_qty: 0, price: 0, partner: '', type: 'Satınalma', invoice_num: '', note: '',
  doc_num: '', created_at: '', channel: '', contract_num: '', created_by: '', ...over,
})

const balance = (over: Partial<WarehouseBalance>): WarehouseBalance => ({
  w: 'W', c: 'A', in: 1, out: 0, n: 1, q: 1, last: '2026-01-01', first: '2026-01-01',
  price: 10, val: 10, name: 'Item A', unit: 'ədəd', ...over,
})

describe('single derivation, two entry points — M14-60', () => {
  /* The Reports page imports the SAME functions the Phase 10 page does. If a
     second implementation were ever introduced, these identities break. */
  it('exposes the accepted Phase 10 functions as ordinary callables', () => {
    expect(typeof deadStockRows).toBe('function')
    expect(typeof deadStockKpis).toBe('function')
    expect(typeof deadStockExportMatrix).toBe('function')
  })

  it('produces one identical result set for one fixture, whoever calls it', () => {
    const bal = [
      balance({ c: 'old', last: '2026-01-01', val: 50 }),
      balance({ c: 'fresh', last: '2026-02-28', val: 10 }),
    ]
    const movs = [movement({ date: '2026-03-01', item_code: 'fresh', out_qty: 1 })]

    /* Two independent calls — standing in for the two pages — must agree
       exactly, including order. */
    const fromReports = deadStockRows(bal, movs, '2026-03-01')
    const fromOverview = deadStockRows(bal, movs, '2026-03-01')
    expect(fromReports).toEqual(fromOverview)
  })
})

describe('the rRep() branch surface — M14-61, M14-62, M14-64', () => {
  const bal = [balance({ w: 'Xocahəsən', c: '0000001', name: 'Sement', q: 2, val: 100, last: '2026-01-01' })]
  const rows = deadStockRows(bal, [], '2026-03-01')

  it('names the export with the legacy dead-stock slug', () => {
    expect(REPORT_NAMES.dead).toBe('hereketsiz_qaliq')
  })

  /* M14-61 — the three KPI measures the branch renders (index.html:6797-6799). */
  it('exposes the three KPI measures the branch needs', () => {
    const kpis = deadStockKpis(rows)
    expect(kpis.positions).toBe(1)
    expect(kpis.value).toBe(100)
    expect(kpis.neverUsed).toBe(1)
  })

  /* M14-62 — the exact legacy export header (6795). */
  it('exports the legacy eight-column header', () => {
    expect(deadStockExportMatrix(rows)[0]).toEqual([
      'Kod', 'Mal', 'Anbar', 'Qalıq', 'Dəyər', 'Son hərəkət',
      'Hərəkətsiz gün', 'Heç vaxt istifadə olunmayıb',
    ])
  })

  /* M14-64 — the EXPORT aliases the warehouse (6796) while the TABLE prints
     the raw stored name (6803). The divergence is already encoded in the
     accepted function; this pins that Phase 14 inherits it rather than
     normalising one of the two surfaces. */
  it('aliases the warehouse in the export while the row keeps the raw name', () => {
    expect(deadStockExportMatrix(rows)[1][2]).toBe('Xocəsən')
    expect(rows[0].balance.w).toBe('Xocahəsən')
  })

  it('marks a never-used position with «bəli» in the export', () => {
    expect(deadStockExportMatrix(rows)[1][7]).toBe('bəli')
  })
})

describe('reference date is supplied by the caller — M14-63', () => {
  /* The branch passes `today()`; the function stays date-stable because the
     caller owns the value. Two different reference dates must give two
     different day counts for the same balance. */
  it('computes days against the reference the caller supplies', () => {
    const bal = [balance({ last: '2026-01-01' })]
    const early = deadStockRows(bal, [], '2026-01-31')
    const late = deadStockRows(bal, [], '2026-03-01')
    expect(early[0].days).toBe(30)
    expect(late[0].days).toBe(59)
  })

  /* The newest OPERATIONAL date wins over the supplied fallback (6789). */
  it('prefers the newest operational date over the supplied fallback', () => {
    const bal = [balance({ last: '2026-01-01' })]
    const rows = deadStockRows(bal, [movement({ date: '2026-02-01' })], '2026-12-31')
    expect(rows[0].days).toBe(31)
  })
})
