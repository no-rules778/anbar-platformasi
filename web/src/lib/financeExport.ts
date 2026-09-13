import * as XLSX from 'xlsx'
import type { PartnerRow } from '../api/partners.api'
import type { ItemRow } from '../api/items.api'
import type { ItemIndexes } from './itemIndex'
import type { ReportAggregates } from './reportAggregates'
import type { FinanceView } from './finance'
import type { ControlGroup } from './controlIssues'
import { today } from './format'

const r2 = (x: number): number => Math.round((x || 0) * 100) / 100

export function financeSheets(
  view: FinanceView,
  indexes: ItemIndexes,
  aggregates: ReportAggregates,
  items: readonly ItemRow[],
  partners: readonly PartnerRow[],
  groups: readonly ControlGroup[],
  userName: string,
  date = today(),
): Record<string, unknown[][]> {
  const k = view.kpis
  const summary: unknown[][] = [
    ['MALİYYƏ HESABATI'], ['Hesabat tarixi', date], ['Hazırlayan', userName], [],
    ['Göstərici', 'Dəyər', 'İzah'],
    ['Qalıq dəyəri (₼)', r2(k.stockValue), 'Bütün anbarlar üzrə ehtiyatın dəyəri'],
    ['Satınalma məbləği (₼)', r2(k.spend), `${k.priced}/${k.purchaseCount} sətir qiymətli (m.pr>0)`],
    ['Qiymətlə örtülmə (%)', k.purchaseCount ? r2(k.priced / k.purchaseCount * 100) : 0, 'Qiyməti (m.pr>0) daxil edilmiş sətirlərin payı'],
    ['Sənədsiz satınalma (say)', k.noDocument, 'Qaimə və müqavilə göstərilməyib — vergi riski'],
    ['Nağd satınalma (say)', k.cashCount, 'Kanal = Nağd, əlavə nəzarət tələb edir'],
    ['Silinmə dəyəri — təxmini (₼)', r2(k.writeoffValue), `${k.writeoffCount} silinmə qeydi · cari mal qiyməti ilə təxmini`],
    ['Aktiv mövqe (say)', aggregates.positions.length, 'Qalığı olan mal mövqeləri'],
    ['Nomenklatura (say)', items.length, 'Bazadakı mal kartları'],
    ['Kontragent (say)', partners.length, 'Qeydiyyatdan keçmiş təchizatçılar'],
  ]

  const byWarehouse = new Map<string, { n: number; q: number; value: number }>()
  indexes.bal.forEach((b) => {
    if (Math.abs(b.q) < 1e-9) return
    const x = byWarehouse.get(b.w) ?? { n: 0, q: 0, value: 0 }
    x.n++; x.q += b.q; x.value += b.val || 0; byWarehouse.set(b.w, x)
  })
  const totalWarehouseValue = Array.from(byWarehouse.values()).reduce((s, x) => s + x.value, 0) || 1
  const warehouses: unknown[][] = [['Anbar', 'Mövqe sayı', 'Ümumi miqdar', 'Dəyər (₼)', 'Payı (%)']]
  Array.from(byWarehouse).sort((a, b) => b[1].value - a[1].value).forEach(([name, x]) => warehouses.push([name, x.n, r2(x.q), r2(x.value), r2(x.value / totalWarehouseValue * 100)]))

  const supplierMap = new Map<string, { n: number; documented: number; value: number }>()
  view.purchases.forEach((m) => {
    const name = m.partner || '(göstərilməyib)'; const x = supplierMap.get(name) ?? { n: 0, documented: 0, value: 0 }
    x.n++; x.value += Number(m.price) > 0 ? Number(m.in_qty) * Number(m.price) : 0
    if (m.invoice_num || m.contract_num) x.documented++; supplierMap.set(name, x)
  })
  const supplierTotal = Array.from(supplierMap.values()).reduce((s, x) => s + x.value, 0) || 1
  const suppliers: unknown[][] = [['Kontragent', 'Əməliyyat sayı', 'Məbləğ (₼)', 'Payı (%)', 'Sənədlə örtülmə (%)', 'VÖEN']]
  Array.from(supplierMap).sort((a, b) => b[1].value - a[1].value).forEach(([name, x]) => suppliers.push([name, x.n, r2(x.value), r2(x.value / supplierTotal * 100), x.n ? r2(x.documented / x.n * 100) : 0, partners.find((p) => p.name === name)?.voen || '—']))

  const methods: unknown[][] = [['Ödəniş kanalı (yalnız satınalma)', 'Əməliyyat sayı', 'Dəyər (₼)', 'Sənədlə örtülmə (%)'], ...view.paymentMethods.map((x) => [x.name, x.n, r2(x.value), x.n ? r2(x.documented / x.n * 100) : 0])]
  const flow: unknown[][] = [['Əməliyyat növü', 'Say', 'Giriş miqdarı', 'Çıxış miqdarı', 'Sənədlə örtülmə'], ...view.flow.map((x) => [x.type, x.n, r2(x.incoming), r2(x.outgoing), 'N/A'])]
  const prices: unknown[][] = [['Kod', 'Mal', 'Ölçü', 'Ən aşağı (₼)', 'Ən yüksək (₼)', 'Fərq (%)', 'Müşahidə sayı', 'Ən ucuz təchizatçı', 'Ən baha təchizatçı'], ...view.prices.map((x) => [x.code, x.name, x.unit, r2(x.min), r2(x.max), r2(x.spread * 100), x.n, x.best, x.worst])]
  const controls: unknown[][] = [['NƏZARƏT VƏ RİSKLƏR'], [], ['Problem', 'Ciddilik', 'Say', 'İzah']]
  groups.forEach((g) => controls.push([g.title, g.sev === 'high' ? 'Yüksək' : g.sev === 'med' ? 'Orta' : 'Aşağı', g.rows.length, g.why]))
  controls.push([], ['TAM SİYAHI'])
  groups.forEach((g) => { controls.push([], [`${g.title} (${g.rows.length})`], g.cols); g.rows.forEach((row) => controls.push(row)) })
  return { Xülasə: summary, 'Anbar üzrə dəyər': warehouses, 'Kontragent üzrə xərc': suppliers, 'Ödəniş üsulu': methods, 'Anbar hərəkəti': flow, 'Qiymət intizamı': prices, 'Nəzarət və risklər': controls }
}

export function financeColumnWidths(rows: readonly unknown[][]): Array<{ wch: number }> {
  const count = rows.reduce((max, row) => Math.max(max, row.length), 0)
  return Array.from({ length: count }, (_, col) => {
    let width = 8
    for (let row = 0; row < Math.min(rows.length, 201); row++) {
      width = Math.max(width, String(rows[row]?.[col] ?? '').length)
    }
    return { wch: Math.min(width + 2, 60) }
  })
}

export function downloadFinanceWorkbook(sheets: Record<string, unknown[][]>, date = today()): void {
  const wb = XLSX.utils.book_new()
  Object.entries(sheets).forEach(([name, rows]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = financeColumnWidths(rows)
    XLSX.utils.book_append_sheet(wb, ws, name)
  })
  XLSX.writeFile(wb, `Maliyye_hesabati_${date}.xlsx`)
}
