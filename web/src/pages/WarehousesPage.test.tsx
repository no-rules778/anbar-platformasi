import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('../api/warehouses.api', () => ({
  fetchWarehouses: vi.fn(),
  fetchWarehouseUsage: vi.fn(),
}))

import { fetchWarehouses, fetchWarehouseUsage } from '../api/warehouses.api'
import { WarehousesPage } from './WarehousesPage'
import { useWarehousesStore } from '../store/warehouses.store'
import type { Me } from '../lib/roles'

const admin: Me = { id: '1', sbId: '1', email: 'a@x.com', name: 'Admin', role: 'admin', wh: '' }
const rehber: Me = { id: '2', sbId: '2', email: 'r@x.com', name: 'Rehber', role: 'rehber', wh: '' }
const anbardar: Me = { id: '3', sbId: '3', email: 'n@x.com', name: 'Anbardar', role: 'anbardar', wh: 'Astara' }
const legacyRole: Me = { id: '4', sbId: '4', email: 't@x.com', name: 'Techizat', role: 'techizat', wh: '' }

beforeEach(() => {
  vi.clearAllMocks()
  useWarehousesStore.setState({ rows: [], usage: new Map(), loading: false, error: null })
  vi.mocked(fetchWarehouses).mockResolvedValue([{ id: 1, name: 'Astara', type: 'anbar', active: true }])
  vi.mocked(fetchWarehouseUsage).mockResolvedValue(new Map([['Astara', { count: 2, exact: true }]]))
})

/* Soraqçalar is Admin-only in the production platform: the nav entry is hidden
   (index.html:7505), go('refs') refuses (1496) and rRefs() bounces (3009). */
describe('WarehousesPage — Admin gate', () => {
  it.each([
    ['rehber', rehber],
    ['anbardar', anbardar],
    ['legacy role mapped to rehber', legacyRole],
  ])('refuses %s and never loads any warehouse data', async (_label, me) => {
    render(<WarehousesPage me={me} />)

    expect(screen.getByText('Soraqçalar yalnız Admin üçündür.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Əlavə et +' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Redaktə et' })).toBeNull()

    // The administrative queries — including the usage counters — must not run.
    await waitFor(() => {
      expect(fetchWarehouses).not.toHaveBeenCalled()
      expect(fetchWarehouseUsage).not.toHaveBeenCalled()
    })
  })

  it('lets an Admin in and loads the directory', async () => {
    render(<WarehousesPage me={admin} />)

    await waitFor(() => expect(fetchWarehouses).toHaveBeenCalled())
    expect(screen.queryByText('Soraqçalar yalnız Admin üçündür.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Əlavə et +' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Astara')).toBeTruthy())
  })
})

describe('WarehousesPage — usage column', () => {
  it('shows the exact count when it is trustworthy', async () => {
    render(<WarehousesPage me={admin} />)
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy())
  })

  it('shows "?" instead of a number when the usage query failed', async () => {
    vi.mocked(fetchWarehouseUsage).mockResolvedValue(new Map([['Astara', { count: 1, exact: false }]]))
    render(<WarehousesPage me={admin} />)
    await waitFor(() => expect(screen.getByText('?')).toBeTruthy())
  })
})
