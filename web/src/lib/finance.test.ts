import { describe, expect, it } from 'vitest'
import { buildFinanceView } from './finance'
import type { MovementRow } from '../api/itemMovements.api'
import type { ItemIndexes } from './itemIndex'
import type { ReportAggregates } from './reportAggregates'

const mov = (x: Partial<MovementRow>): MovementRow => ({ id: 'x', item_code: 'A', warehouse: 'W', date: '2026-01-01', in_qty: 0, out_qty: 0, price: null, partner: null, type: '', invoice_num: null, contract_num: null, note: null, doc_num: null, created_at: null, ...x })
const aggregates: ReportAggregates = { byPartner: new Map(), byType: new Map(), byWh: new Map(), byDate: new Map(), dates: [], positions: [], totVal: 99 }

describe('buildFinanceView', () => {
  it('uses movement prices for purchase spend but current item price for writeoff estimate', () => {
    const operational = [
      mov({ id: 'p1', type: 'Satınalma', in_qty: 2, price: 5, channel: 'Nağd kart', partner: 'P' }),
      mov({ id: 'p2', type: 'Satınalma', in_qty: 3, price: 0, partner: 'P', invoice_num: 'I' }),
      mov({ id: 'w', type: 'Silinmə', out_qty: 4, price: 100 }),
    ]
    const indexes: ItemIndexes = { operational, bal: [], byItem: new Map(), priceObs: new Map() }
    const view = buildFinanceView(indexes, aggregates, [{ code: 'A', name: 'A', unit: 'əd', price: 7, category: null }])
    expect(view.kpis).toMatchObject({ stockValue: 99, spend: 10, priced: 1, purchaseCount: 2, noDocument: 1, cashCount: 1, writeoffValue: 28 })
    expect(view.supplierSpend).toEqual([{ name: 'P', value: 10 }])
  })

  it('keeps payment fallback, non-purchase flow and price-discipline threshold/sort', () => {
    const operational = [mov({ type: 'Satınalma', in_qty: 1, price: 2, channel: '  ', invoice_num: 'I' }), mov({ id: 'o', type: 'Sahəyə', out_qty: 3 })]
    const indexes: ItemIndexes = { operational, bal: [], byItem: new Map(), priceObs: new Map([
      ['A', [{ p: 2, d: '2026-01-01', k: 'cheap' }, { p: 3, d: '2026-01-02', k: 'dear' }]],
      ['B', [{ p: 1, d: '', k: '' }, { p: 1.004, d: '', k: '' }]],
    ]) }
    const view = buildFinanceView(indexes, aggregates, [{ code: 'A', name: 'Alpha', unit: 'kg', price: 7, category: null }])
    expect(view.paymentMethods[0]).toMatchObject({ name: '(kanal göstərilməyib)', documented: 1 })
    expect(view.flow).toEqual([{ type: 'Sahəyə', n: 1, incoming: 0, outgoing: 3 }])
    expect(view.prices).toHaveLength(1)
    expect(view.prices[0]).toMatchObject({ code: 'A', min: 2, max: 3, best: 'cheap', worst: 'dear' })
  })
})
