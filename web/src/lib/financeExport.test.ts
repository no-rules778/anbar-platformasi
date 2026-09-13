import { describe, expect, it } from 'vitest'
import { financeColumnWidths, financeSheets } from './financeExport'
import { buildFinanceView } from './finance'
import { buildItemIndexes } from './itemIndex'
import { buildReportAggregates } from './reportAggregates'
import type { MovementRow } from '../api/itemMovements.api'

const movement = (id: string, partner: string): MovementRow => ({ id, item_code: 'A', warehouse: 'W', date: '2026-01-01', in_qty: 1, out_qty: 0, price: 2, partner, type: 'Satınalma', invoice_num: 'I', contract_num: null, channel: 'Bank', note: null, doc_num: null, created_at: null })

describe('finance workbook', () => {
  it('builds the seven actual legacy worksheets and does not apply the screen top-12 cut to export', () => {
    const movements = Array.from({ length: 13 }, (_, i) => movement(String(i), `P${i}`))
    const items = [{ code: 'A', name: 'A', unit: 'əd', price: 2, category: null }]
    const indexes = buildItemIndexes(items, movements)
    const aggregates = buildReportAggregates(indexes.operational, items, indexes.bal)
    const view = buildFinanceView(indexes, aggregates, items)
    expect(view.supplierSpend).toHaveLength(12)
    const sheets = financeSheets(view, indexes, aggregates, items, [], [], 'Admin', '2026-09-11')
    expect(Object.keys(sheets)).toEqual(['Xülasə', 'Anbar üzrə dəyər', 'Kontragent üzrə xərc', 'Ödəniş üsulu', 'Anbar hərəkəti', 'Qiymət intizamı', 'Nəzarət və risklər'])
    expect(sheets['Kontragent üzrə xərc']).toHaveLength(14)
  })

  it('includes row 200, excludes row 201 and caps worksheet widths at 60', () => {
    const rows = Array.from({ length: 202 }, (_, i) => [i === 200 ? 'x'.repeat(20) : i === 201 ? 'y'.repeat(50) : 'short'])
    expect(financeColumnWidths(rows)).toEqual([{ wch: 22 }])
    rows[200][0] = 'x'.repeat(100)
    expect(financeColumnWidths(rows)).toEqual([{ wch: 60 }])
    expect(financeColumnWidths([['a'], ['123456789']])).toEqual([{ wch: 11 }])
  })
})
