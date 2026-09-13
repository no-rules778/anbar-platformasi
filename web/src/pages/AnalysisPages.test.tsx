import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { MovementRow } from '../api/itemMovements.api'
import { buildItemIndexes } from '../lib/itemIndex'
import { buildReportAggregates } from '../lib/reportAggregates'

const load = vi.fn(async () => {})
const item = { code: 'A', name: 'Alpha', unit: 'KG', price: 7, category: null }
const movement = (x: Partial<MovementRow>): MovementRow => ({ id: 'm', item_code: 'A', warehouse: 'W', date: '2026-09-11', in_qty: 0, out_qty: 0, price: null, partner: null, type: '', invoice_num: null, contract_num: null, note: null, doc_num: null, created_at: null, ...x })
const movements = [
  movement({ id: 'p1', type: 'Satınalma', in_qty: 2, price: 5, partner: 'Vendor', channel: 'Nağd', invoice_num: 'Q1' }),
  movement({ id: 'p2', type: 'Satınalma', in_qty: 1, price: 8, partner: 'Vendor', channel: 'Bank' }),
  movement({ id: 'o', type: 'Silinmə', out_qty: 4 }),
]
const indexes = buildItemIndexes([item], movements)
const base = {
  movements, items: [item], locations: [{ id: 1, name: 'W', type: 'anbar', active: true, created_at: null }],
  partners: [{ id: 1, name: 'Vendor', voen: '1', contract: null, contract_date: null }],
  indexes, aggregates: buildReportAggregates(indexes.operational, [item], indexes.bal),
  loading: false, loaded: true, error: null as string | null, load,
}
let state = { ...base }

vi.mock('../store/analysis.store', () => ({ useAnalysisStore: () => state }))
vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }))
vi.mock('../store/auditLog.store', () => ({ useAuditLogStore: (sel: (s: { emails: Map<string, string> }) => unknown) => sel({ emails: new Map() }) }))
vi.mock('../store/toast.store', () => ({ useToastStore: (sel: (s: { show: ReturnType<typeof vi.fn> }) => unknown) => sel({ show: vi.fn() }) }))

import { FinancePage } from './FinancePage'
import { ControlsPage } from './ControlsPage'

const me = { id: 'a', sbId: 'a', email: 'a@x', name: 'Admin', role: 'admin', wh: '' }

beforeEach(() => { state = { ...base }; vi.clearAllMocks() })

describe('FinancePage', () => {
  it('renders the legacy shell, six KPIs and the three detail tables', () => {
    render(<FinancePage me={me} />)
    expect(screen.getByRole('heading', { name: 'Maliyyə göstəriciləri' })).toBeTruthy()
    expect(document.querySelectorAll('.kpi')).toHaveLength(6)
    expect(screen.getByText('Satınalma xərcinin kontragentlər üzrə bölgüsü')).toBeTruthy()
    expect(screen.getByText('Ödəniş üsulu və sənədləşmə')).toBeTruthy()
    expect(screen.getByText('Anbar hərəkəti (ödənişsiz əməliyyatlar)')).toBeTruthy()
    expect(screen.getByText('Qiymət intizamı — eyni malın müxtəlif qiymətləri')).toBeTruthy()
    expect(screen.getAllByText('100%')).toHaveLength(2)
  })

  it('retains the page and shows a refresh marker after a failed refresh', () => {
    state = { ...base, error: '503' }
    render(<FinancePage me={me} />)
    expect(screen.getByText('Yenilənmədi')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Maliyyə göstəriciləri' })).toBeTruthy()
  })
})

describe('ControlsPage', () => {
  it('renders KPI totals and the findings returned by the shared accepted controlIssues derivation', () => {
    render(<ControlsPage me={me} />)
    expect(screen.getByRole('heading', { name: 'Nəzarət və risklər' })).toBeTruthy()
    expect(document.querySelectorAll('.kpi')).toHaveLength(4)
    expect(screen.getByText('Mənfi qalıq')).toBeTruthy()
    const card = screen.getByText('Mənfi qalıq').closest('.card') as HTMLElement
    expect(within(card).getByText('yüksək risk')).toBeTruthy()
    expect(card.querySelector('tbody td.num')?.textContent).toBe('-1,00')
  })

  it('shows a first-load error without presenting derived cards', () => {
    state = { ...base, loaded: false, error: 'offline' }
    render(<ControlsPage me={me} />)
    expect(screen.getByText('Yükləmə xətası')).toBeTruthy()
    expect(screen.queryByText('Mənfi qalıq')).toBeNull()
  })
})
