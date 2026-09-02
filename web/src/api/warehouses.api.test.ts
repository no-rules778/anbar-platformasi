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

/* fetchWarehouseUsage makes one paginated pass over `movements` and one over
   `users`, both `.select(...).order('id').range(...)`, then matches names in
   JavaScript with REF_EQ — no SQL LIKE is involved. */
interface UsageMocks {
  movements?: { data?: unknown[]; error?: unknown }
  users?: { data?: unknown[]; error?: unknown }
}

const orderCalls: string[] = []

function mockUsageQueries({ movements = { data: [] }, users = { data: [] } }: UsageMocks) {
  orderCalls.length = 0
  vi.mocked(supabase.from).mockImplementation(((table: string) => ({
    select: () => ({
      order: (column: string) => {
        orderCalls.push(`${table}.${column}`)
        const source = table === 'users' ? users : movements
        return { range: () => Promise.resolve({ data: source.data ?? null, error: source.error ?? null }) }
      },
    }),
  })) as never)
}

const mv = (over: Record<string, unknown>) => ({ id: 1, note: null, doc_num: null, warehouse: null, partner: null, ...over })

describe('fetchWarehouseUsage — counting', () => {
  it('counts operational movements matched on either column plus assigned users', async () => {
    mockUsageQueries({
      movements: {
        data: [
          mv({ id: 1, warehouse: 'Astara' }),
          mv({ id: 2, partner: 'Astara' }),
          mv({ id: 3, warehouse: 'Harmony' }),
        ],
      },
      users: { data: [{ warehouse: 'Astara' }, { warehouse: 'Harmony' }] },
    })
    const usage = await fetchWarehouseUsage(['Astara'])
    expect(usage.get('Astara')).toEqual({ count: 3, exact: true }) // 2 movements + 1 user
  })

  it('counts a row matching on both columns only once', async () => {
    mockUsageQueries({ movements: { data: [mv({ id: 1, warehouse: 'Astara', partner: 'Astara' })] } })
    expect((await fetchWarehouseUsage(['Astara'])).get('Astara')).toEqual({ count: 1, exact: true })
  })

  it('excludes cancelled movements exactly like operationalMovements()', async () => {
    mockUsageQueries({
      movements: {
        data: [
          mv({ id: 1, warehouse: 'Astara', doc_num: 'SND-1' }),
          mv({ id: 2, warehouse: 'Astara', doc_num: 'SND-2', note: 'Ləğv: SND-1' }),
          mv({ id: 3, warehouse: 'Astara', doc_num: 'SND-3' }),
        ],
      },
    })
    expect((await fetchWarehouseUsage(['Astara'])).get('Astara')).toEqual({ count: 1, exact: true })
  })

  it('resolves several names from a single pass over the data', async () => {
    mockUsageQueries({
      movements: { data: [mv({ id: 1, warehouse: 'Astara' }), mv({ id: 2, warehouse: 'Harmony' })] },
    })
    const usage = await fetchWarehouseUsage(['Astara', 'Harmony', 'Ofis'])
    expect(usage.get('Astara')).toEqual({ count: 1, exact: true })
    expect(usage.get('Harmony')).toEqual({ count: 1, exact: true })
    expect(usage.get('Ofis')).toEqual({ count: 0, exact: true })
  })

  it('orders both queries by id so pagination is stable', async () => {
    mockUsageQueries({})
    await fetchWarehouseUsage(['Astara'])
    expect(orderCalls).toContain('movements.id')
    expect(orderCalls).toContain('users.id')
  })
})

describe('fetchWarehouseUsage — matching semantics (REF_EQ, not SQL LIKE)', () => {
  it('matches case-insensitively', async () => {
    mockUsageQueries({ movements: { data: [mv({ id: 1, warehouse: 'ASTARA' })] } })
    expect((await fetchWarehouseUsage(['astara'])).get('astara')).toEqual({ count: 1, exact: true })
  })

  it('ignores surrounding whitespace on the stored value', async () => {
    mockUsageQueries({ movements: { data: [mv({ id: 1, warehouse: '  Astara  ' })] } })
    expect((await fetchWarehouseUsage(['Astara'])).get('Astara')).toEqual({ count: 1, exact: true })
  })

  it('ignores surrounding whitespace on the requested name', async () => {
    mockUsageQueries({ movements: { data: [mv({ id: 1, warehouse: 'Astara' })] } })
    expect((await fetchWarehouseUsage([' Astara '])).get(' Astara ')).toEqual({ count: 1, exact: true })
  })

  it('treats % as a literal character, never as a wildcard', async () => {
    mockUsageQueries({ movements: { data: [mv({ id: 1, warehouse: 'Astara' }), mv({ id: 2, warehouse: 'Harmony' })] } })
    // A LIKE-based implementation would have matched every row here.
    expect((await fetchWarehouseUsage(['%'])).get('%')).toEqual({ count: 0, exact: true })
  })

  it('treats _ as a literal character, never as a single-char wildcard', async () => {
    mockUsageQueries({ movements: { data: [mv({ id: 1, warehouse: 'Anbar1' }), mv({ id: 2, warehouse: 'Anbar_1' })] } })
    expect((await fetchWarehouseUsage(['Anbar_1'])).get('Anbar_1')).toEqual({ count: 1, exact: true })
  })

  it('handles Azerbaijani casing', async () => {
    mockUsageQueries({ movements: { data: [mv({ id: 1, warehouse: 'Ələt' })] } })
    expect((await fetchWarehouseUsage(['ələt'])).get('ələt')).toEqual({ count: 1, exact: true })
  })
})

describe('fetchWarehouseUsage — fail-safe on query errors', () => {
  it('marks every name inexact, never below 1, when the movements query fails', async () => {
    mockUsageQueries({ movements: { error: { message: 'network' } }, users: { data: [] } })
    const usage = await fetchWarehouseUsage(['Astara', 'Ofis'])
    expect(usage.get('Astara')).toEqual({ count: 1, exact: false })
    expect(usage.get('Ofis')).toEqual({ count: 1, exact: false })
  })

  it('marks usage inexact when the users query fails — mirrors USERS_ERR', async () => {
    mockUsageQueries({ movements: { data: [] }, users: { error: { message: 'rls' } } })
    expect((await fetchWarehouseUsage(['Astara'])).get('Astara')).toEqual({ count: 1, exact: false })
  })

  it('keeps a real count above 1 while still flagging it inexact', async () => {
    mockUsageQueries({
      movements: { data: [mv({ id: 1, warehouse: 'Astara' }), mv({ id: 2, warehouse: 'Astara' })] },
      users: { error: { message: 'rls' } },
    })
    expect((await fetchWarehouseUsage(['Astara'])).get('Astara')).toEqual({ count: 2, exact: false })
  })
})
