import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ItemCard } from './ItemCard'
import { buildItemIndexes } from '../../lib/itemIndex'
import type { ItemRow } from '../../api/items.api'
import type { MovementRow } from '../../api/itemMovements.api'
import type { Me } from '../../lib/roles'

const admin: Me = { id: 'u1', sbId: 'u1', email: 'a@x.com', name: 'Admin', role: 'admin', wh: '' }
const viewer: Me = { ...admin, role: 'baxis' }

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement M400', unit: 'kq', price: 10, category: null, ...over,
})

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Elet', date: '2026-01-01',
  in_qty: 5, out_qty: 0, price: null, partner: null, type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: null, ...over,
})

const WHS = ['Ələt', 'Astara', 'Xocahəsən']

function renderCard(
  items: ItemRow[],
  movements: MovementRow[],
  me: Me = admin,
  code = '0000001',
  warehouses: string[] = WHS,
) {
  const indexes = buildItemIndexes(items, movements)
  const onEdit = vi.fn()
  const onOperation = vi.fn()
  const view = render(
    <ItemCard
      code={code}
      items={items}
      indexes={indexes}
      me={me}
      warehouses={warehouses}
      onEdit={onEdit}
      onOperation={onOperation}
      onClose={vi.fn()}
    />,
  )
  return { ...view, onEdit, onOperation }
}

/* M5-48…M5-53 — itemCard() (index.html:1861-1891). */

describe('KPIs (M5-48)', () => {
  it('shows total balance, value and movement count', () => {
    const { container } = renderCard([item()], [mv({ in_qty: 5 })])
    const kpis = container.querySelector('.kpis') as HTMLElement
    expect(within(kpis).getByText('Ümumi qalıq')).toBeTruthy()
    expect(within(kpis).getAllByText('5,00').length).toBeGreaterThan(0)
    /* 5 × 10 = 50 */
    expect(within(kpis).getByText(/50,00/)).toBeTruthy()
    expect(within(kpis).getByText('Hərəkət sayı')).toBeTruthy()
  })

  it('marks a negative total with the red KPI class', () => {
    const { container } = renderCard([item()], [mv({ in_qty: 0, out_qty: 3 })])
    expect(container.querySelector('.kpi.r')).toBeTruthy()
  })

  it('marks a non-negative total with the green KPI class', () => {
    const { container } = renderCard([item()], [mv({ in_qty: 3 })])
    expect(container.querySelector('.kpi.g')).toBeTruthy()
  })

  it('renders a zero value as an em-dash, not 0,00 ₼', () => {
    renderCard([item({ price: null })], [mv({ in_qty: 5 })])
    expect(screen.getByText('qiymət yoxdur')).toBeTruthy()
  })
})

describe('per-warehouse balances (M5-49)', () => {
  it('lists one row per warehouse', () => {
    renderCard([item()], [
      mv({ id: 'a', warehouse: 'Elet', in_qty: 10 }),
      mv({ id: 'b', warehouse: 'Astara', in_qty: 4 }),
    ])
    const table = screen.getByText('Anbarlar üzrə qalıq').nextElementSibling as HTMLElement
    expect(within(table).getByText('Elet')).toBeTruthy()
    expect(within(table).getByText('Astara')).toBeTruthy()
  })
})

/* M5-50 — a single observation is the current price, not a history. */
describe('price history (M5-50)', () => {
  it('is HIDDEN with exactly one price observation', () => {
    renderCard([item()], [mv({ in_qty: 1, price: 12 })])
    expect(screen.queryByText('Qiymət tarixçəsi')).toBeNull()
  })

  it('appears with more than one observation', () => {
    renderCard([item()], [
      mv({ id: 'a', in_qty: 1, price: 12, date: '2026-01-01' }),
      mv({ id: 'b', in_qty: 1, price: 14, date: '2026-02-01' }),
    ])
    expect(screen.getByText('Qiymət tarixçəsi')).toBeTruthy()
  })

  it('is hidden when no movement carried a positive price', () => {
    renderCard([item()], [mv({ in_qty: 1, price: 0 }), mv({ id: 'b', in_qty: 1, price: null })])
    expect(screen.queryByText('Qiymət tarixçəsi')).toBeNull()
  })
})

describe('movement history (M5-51)', () => {
  it('sorts newest first', () => {
    renderCard([item()], [
      mv({ id: 'a', date: '2026-01-01', in_qty: 1 }),
      mv({ id: 'b', date: '2026-03-05', in_qty: 2 }),
    ])
    const head = screen.getByText('Hərəkət tarixçəsi')
    const table = head.nextElementSibling as HTMLElement
    const firstRow = within(table).getAllByRole('row')[1]
    expect(firstRow.textContent).toContain('05.03.2026')
  })

  it('excludes cancelled movements', () => {
    renderCard([item()], [
      mv({ id: 'a', in_qty: 10, doc_num: 'D-1', date: '2026-01-01' }),
      mv({ id: 'b', out_qty: 10, doc_num: 'D-2', note: 'Ləğv: D-1', date: '2026-01-02' }),
    ])
    expect(screen.getByText('Hərəkət sayı')).toBeTruthy()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('names an unknown code explicitly', () => {
    renderCard([], [], admin, '9999999')
    expect(screen.getByText('(nomenklaturada yoxdur)')).toBeTruthy()
  })
})

describe('actions (M5-53, M5-55)', () => {
  it('offers «Malı redaktə et» to a user with item.edit', async () => {
    const user = userEvent.setup()
    const { onEdit } = renderCard([item()], [mv()])
    await user.click(screen.getByRole('button', { name: 'Malı redaktə et' }))
    expect(onEdit).toHaveBeenCalledWith('0000001')
  })

  it('hides «Malı redaktə et» without item.edit', () => {
    renderCard([item()], [mv()], viewer)
    expect(screen.queryByRole('button', { name: 'Malı redaktə et' })).toBeNull()
  })

  /* M5-55 — LIVE as of H-4. The button is enabled, carries no leftover
     "not migrated yet" tooltip, and hands the code to the caller, which
     prefills it and navigates (index.html:3452). */
  it('renders «Bu mal üzrə əməliyyat» ENABLED with no deferral tooltip', () => {
    renderCard([item()], [mv()])
    const btn = screen.getByRole('button', { name: 'Bu mal üzrə əməliyyat' }) as HTMLButtonElement
    expect(btn).toBeTruthy()
    expect(btn.disabled).toBe(false)
    expect(btn.title || '').not.toContain('sonrakı mərhələdə')
  })

  it('calls onOperation with the card item code', async () => {
    const { onOperation } = renderCard([item()], [mv()])
    await userEvent.click(screen.getByRole('button', { name: 'Bu mal üzrə əməliyyat' }))
    expect(onOperation).toHaveBeenCalledWith('0000001')
  })

  it('stays enabled for every role — M7-02, the transition is not a permission gate', async () => {
    const { onOperation } = renderCard([item()], [mv()], viewer)
    const btn = screen.getByRole('button', { name: 'Bu mal üzrə əməliyyat' }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    await userEvent.click(btn)
    expect(onOperation).toHaveBeenCalledWith('0000001')
  })
})

/* A12 — the card rendered raw `m.warehouse` and `m.partner` strings where the
   original passes them through whLabel() and routeOrPartner()
   (index.html:1880, 1885). A transfer therefore showed the counterparty's
   name in the direction column instead of the route, and the Xocahəsən alias
   was missing throughout. */
describe('A12 — warehouse labels and the transfer route', () => {
  it('applies the display alias in the movement history', () => {
    renderCard([item()], [mv({ warehouse: 'Xocahəsən' })])
    expect(screen.getAllByText('Xocəsən').length).toBeGreaterThan(0)
    /* The stored key must never be shown in its place. */
    expect(screen.queryByText('Xocahəsən')).toBeNull()
  })

  it('applies the display alias in the per-warehouse balance table', () => {
    const { container } = renderCard([item()], [mv({ warehouse: 'Xocahəsən', in_qty: 5 })])
    const rows = container.querySelectorAll('tbody tr')
    expect(Array.from(rows).some((r) => r.textContent?.includes('Xocəsən'))).toBe(true)
  })

  it('renders own → other for an outgoing transfer', () => {
    renderCard([item()], [mv({
      type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına',
      in_qty: 0, out_qty: 3,
    })])
    expect(screen.getByText('Ələt → Astara')).toBeTruthy()
  })

  it('renders other → own for an incoming transfer', () => {
    renderCard([item()], [mv({
      type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara',
      in_qty: 3, out_qty: 0,
    })])
    expect(screen.getByText('Astara → Ələt')).toBeTruthy()
  })

  it('renders an unresolvable route side as an em dash', () => {
    renderCard([item()], [mv({
      type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Naməlum yer',
      in_qty: 0, out_qty: 3,
    })])
    expect(screen.getByText('Ələt → —')).toBeTruthy()
  })

  it('keeps the stored partner text for a non-transfer row', () => {
    renderCard([item()], [mv({ type: 'Satınalma', partner: 'ACME MMC' })])
    expect(screen.getByText('ACME MMC')).toBeTruthy()
  })

  /* The original renders «—» for a missing partner, not an empty cell. */
  it('renders an em dash when a movement has no partner at all', () => {
    const { container } = renderCard([item()], [mv({ type: 'Satınalma', partner: null })])
    const cells = container.querySelectorAll('tbody tr td')
    expect(Array.from(cells).some((c) => c.textContent === '—')).toBe(true)
  })

  /* Degraded mode: a failed warehouse read leaves the list empty, and every
     row then keeps its stored text rather than losing the column. */
  it('falls back to the stored text when no warehouses are loaded', () => {
    renderCard([item()], [mv({
      type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara',
      in_qty: 0, out_qty: 3,
    })], admin, '0000001', [])
    expect(screen.getByText('Astara')).toBeTruthy()
  })
})
