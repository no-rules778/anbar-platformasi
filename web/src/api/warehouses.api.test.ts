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

/* Test rig for fetchWarehouseUsage: it issues three queries per name —
   movements.ilike('warehouse'), movements.ilike('partner') (both paginated
   row fetches) and a head-count on users.ilike('warehouse'). */
interface UsageMocks {
  movementsByWarehouse?: { data?: unknown[]; error?: unknown }
  movementsByPartner?: { data?: unknown[]; error?: unknown }
  users?: { count?: number | null; error?: unknown }
}

function mockUsageQueries({ movementsByWarehouse = { data: [] }, movementsByPartner = { data: [] }, users = { count: 0 } }: UsageMocks) {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'users') {
      return { select: () => ({ ilike: () => Promise.resolve({ count: users.count ?? null, error: users.error ?? null }) }) }
    }
    // movements: select(...).ilike(column, name).range(from, to)
    return {
      select: () => ({
        ilike: (column: string) => ({
          range: () => {
            const source = column === 'warehouse' ? movementsByWarehouse : movementsByPartner
            return Promise.resolve({ data: source.data ?? null, error: source.error ?? null })
          },
        }),
      }),
    }
  }) as never)
}

describe('fetchWarehouseUsage — counting', () => {
  it('counts operational movements from both columns plus assigned users, without double-counting a row matched twice', async () => {
    mockUsageQueries({
      movementsByWarehouse: { data: [{ id: 1, note: null, doc_num: 'D1' }, { id: 2, note: null, doc_num: 'D2' }] },
      // id 2 appears again (matched on partner as well) and must not be counted twice
      movementsByPartner: { data: [{ id: 2, note: null, doc_num: 'D2' }, { id: 3, note: null, doc_num: 'D3' }] },
      users: { count: 1 },
    })
    const usage = await fetchWarehouseUsage(['Astara'])
    expect(usage.get('Astara')).toEqual({ count: 4, exact: true }) // ids 1,2,3 + 1 user
  })

  it('excludes cancelled movements exactly like the original operationalMovements()', async () => {
    mockUsageQueries({
      movementsByWarehouse: {
        data: [
          { id: 1, note: null, doc_num: 'SND-1' },
          { id: 2, note: 'Ləğv: SND-1', doc_num: 'SND-2' }, // cancels SND-1 and itself
          { id: 3, note: null, doc_num: 'SND-3' },
        ],
      },
      users: { count: 0 },
    })
    const usage = await fetchWarehouseUsage(['Astara'])
    expect(usage.get('Astara')).toEqual({ count: 1, exact: true }) // only SND-3 survives
  })

  it('reports zero usage as exact, so an unused warehouse can be renamed or deleted', async () => {
    mockUsageQueries({ users: { count: 0 } })
    const usage = await fetchWarehouseUsage(['Bos'])
    expect(usage.get('Bos')).toEqual({ count: 0, exact: true })
  })
})

describe('fetchWarehouseUsage — fail-safe on query errors', () => {
  it('marks usage inexact and never below 1 when the warehouse-column query fails', async () => {
    mockUsageQueries({ movementsByWarehouse: { error: { message: 'network' } }, users: { count: 0 } })
    const usage = await fetchWarehouseUsage(['Astara'])
    expect(usage.get('Astara')).toEqual({ count: 1, exact: false })
  })

  it('marks usage inexact when the partner-column query fails', async () => {
    mockUsageQueries({ movementsByPartner: { error: { message: 'network' } }, users: { count: 0 } })
    expect((await fetchWarehouseUsage(['Astara'])).get('Astara')).toEqual({ count: 1, exact: false })
  })

  it('marks usage inexact when the users query fails — mirrors the original USERS_ERR fail-safe', async () => {
    mockUsageQueries({ users: { count: null, error: { message: 'rls' } } })
    expect((await fetchWarehouseUsage(['Astara'])).get('Astara')).toEqual({ count: 1, exact: false })
  })

  it('keeps the real count when it is already above 1 but still flags it inexact', async () => {
    mockUsageQueries({
      movementsByWarehouse: { data: [{ id: 1, note: null, doc_num: null }, { id: 2, note: null, doc_num: null }] },
      users: { count: null, error: { message: 'rls' } },
    })
    expect((await fetchWarehouseUsage(['Astara'])).get('Astara')).toEqual({ count: 2, exact: false })
  })
})
