import type { MovementRow } from '../api/itemMovements.api'
import type { ItemRow } from '../api/items.api'
import type { ItemIndexes } from './itemIndex'
import type { ReportAggregates } from './reportAggregates'

const num = (v: number | null | undefined): number => v == null || isNaN(Number(v)) ? 0 : Number(v)

export interface FinanceKpis {
  stockValue: number
  spend: number
  priced: number
  purchaseCount: number
  noDocument: number
  cashCount: number
  writeoffValue: number
  writeoffCount: number
}

export interface SupplierSpend { name: string; value: number }
export interface PaymentMethod { name: string; n: number; value: number; documented: number }
export interface InventoryFlow { type: string; n: number; incoming: number; outgoing: number }
export interface PriceDiscipline {
  code: string
  name: string
  unit: string
  min: number
  max: number
  spread: number
  n: number
  best: string
  worst: string
}

export interface FinanceView {
  purchases: MovementRow[]
  kpis: FinanceKpis
  supplierSpend: SupplierSpend[]
  paymentMethods: PaymentMethod[]
  flow: InventoryFlow[]
  prices: PriceDiscipline[]
}

/** Pure port of rFin() (index.html:6932-6993). */
export function buildFinanceView(
  indexes: ItemIndexes,
  aggregates: ReportAggregates,
  items: readonly ItemRow[],
): FinanceView {
  const movements = indexes.operational
  const purchases = movements.filter((m) => m.type === 'Satınalma' && num(m.in_qty) > 0)
  const spend = purchases.reduce((s, m) => s + (num(m.price) > 0 ? num(m.in_qty) * num(m.price) : 0), 0)
  const priced = purchases.filter((m) => num(m.price) > 0).length
  const noDocument = purchases.filter((m) => !m.invoice_num && !m.contract_num).length
  const cashCount = purchases.filter((m) => (m.channel || '').indexOf('Nağd') === 0).length
  const itemPrice = new Map(items.map((i) => [i.code, num(i.price)]))
  const writeoffs = movements.filter((m) => m.type === 'Silinmə')
  const writeoffValue = writeoffs.reduce((s, m) => s + num(m.out_qty) * (itemPrice.get(m.item_code) ?? 0), 0)

  const supplier = new Map<string, number>()
  for (const m of purchases) {
    const key = m.partner || '(göstərilməyib)'
    supplier.set(key, (supplier.get(key) ?? 0) + (num(m.price) > 0 ? num(m.in_qty) * num(m.price) : 0))
  }
  const supplierSpend = Array.from(supplier, ([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value).slice(0, 12)

  const methods = new Map<string, PaymentMethod>()
  for (const m of purchases) {
    const name = m.channel?.trim() || '(kanal göstərilməyib)'
    const row = methods.get(name) ?? { name, n: 0, value: 0, documented: 0 }
    row.n++
    row.value += num(m.price) > 0 ? num(m.in_qty) * num(m.price) : 0
    if (m.invoice_num || m.contract_num) row.documented++
    methods.set(name, row)
  }

  const flows = new Map<string, InventoryFlow>()
  for (const m of movements) {
    if (m.type === 'Satınalma') continue
    const type = m.type || '(növ göstərilməyib)'
    const row = flows.get(type) ?? { type, n: 0, incoming: 0, outgoing: 0 }
    row.n++; row.incoming += num(m.in_qty); row.outgoing += num(m.out_qty)
    flows.set(type, row)
  }

  const itemBy = new Map(items.map((i) => [i.code, i]))
  const prices: PriceDiscipline[] = []
  for (const [code, observations] of indexes.priceObs) {
    if (observations.length < 2) continue
    const values = observations.map((o) => o.p)
    const min = Math.min(...values), max = Math.max(...values)
    if (max - min < 0.005) continue
    const item = itemBy.get(code)
    prices.push({
      code, name: item?.name || code, unit: item?.unit || '', min, max,
      spread: (max - min) / min, n: observations.length,
      best: observations.find((o) => o.p === min)?.k || '—',
      worst: observations.find((o) => o.p === max)?.k || '—',
    })
  }
  prices.sort((a, b) => b.spread - a.spread)

  return {
    purchases,
    kpis: { stockValue: aggregates.totVal, spend, priced, purchaseCount: purchases.length, noDocument, cashCount, writeoffValue, writeoffCount: writeoffs.length },
    supplierSpend,
    paymentMethods: Array.from(methods.values()).sort((a, b) => b.value - a.value),
    flow: Array.from(flows.values()).sort((a, b) => b.n - a.n),
    prices,
  }
}
