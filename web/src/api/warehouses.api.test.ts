import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchWarehouses, fetchWarehouseUsage } from './warehouses.api'

beforeEach(() => vi.clearAllMocks())

describe('fetchWarehouses', () => {
  it('returns all rows from a single page', async () => {
    const range = vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Elet', type: 'anbar', active: true }], error: null })
    const select = vi.fn().mockReturnValue({ range })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)
    const rows = await fetchWarehouses()
    expect(rows).toHaveLength(1)
    expect(supabase.from).toHaveBeenCalledWith('warehouses')
  })
  it('throws on error', async () => {
    const range = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const select = vi.fn().mockReturnValue({ range })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)
    await expect(fetchWarehouses()).rejects.toBeTruthy()
  })
})

describe('fetchWarehouseUsage', () => {
  it('sums movements(warehouse) + movements(partner) + users(warehouse) counts per name', async () => {
    const ilike = vi.fn().mockResolvedValue({ count: 2, error: null })
    const select = vi.fn().mockReturnValue({ ilike })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)
    const usage = await fetchWarehouseUsage(['Astara'])
    expect(usage.get('Astara')).toBe(6) // 2 + 2 + 2
  })
})
