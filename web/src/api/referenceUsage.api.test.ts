import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchReferenceUsage } from './referenceUsage.api'
import { usageKey } from '../types/referenceDirectory'

beforeEach(() => vi.clearAllMocks())

interface Mocks {
  movements?: { data?: unknown[]; error?: unknown }
  users?: { data?: unknown[]; error?: unknown }
}

const orderCalls: string[] = []

function mockQueries({ movements = { data: [] }, users = { data: [] } }: Mocks) {
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
const wh = (name: string) => ({ kind: 'warehouse' as const, name })
const pt = (name: string) => ({ kind: 'partner' as const, name })
const get = (m: Map<string, unknown>, kind: string, name: string) => m.get(usageKey(kind, name))

/* refUsage counts different things per kind (index.html:2977-2988). */
describe('fetchReferenceUsage — per-kind counting', () => {
  it('counts a warehouse from movements.warehouse OR movements.partner, plus assigned users', async () => {
    mockQueries({
      movements: {
        data: [mv({ id: 1, warehouse: 'Astara' }), mv({ id: 2, partner: 'Astara' }), mv({ id: 3, warehouse: 'Ofis' })],
      },
      users: { data: [{ warehouse: 'Astara' }] },
    })
    const usage = await fetchReferenceUsage([wh('Astara')])
    expect(get(usage, 'warehouse', 'Astara')).toEqual({ count: 3, exact: true })
  })

  it('counts a partner from movements.partner only — never from movements.warehouse', async () => {
    mockQueries({
      movements: {
        data: [mv({ id: 1, partner: 'Bakcell' }), mv({ id: 2, warehouse: 'Bakcell' })],
      },
    })
    const usage = await fetchReferenceUsage([pt('Bakcell')])
    expect(get(usage, 'partner', 'Bakcell')).toEqual({ count: 1, exact: true })
  })

  it('does not count users towards a partner even when a user warehouse shares the name', async () => {
    mockQueries({ movements: { data: [] }, users: { data: [{ warehouse: 'Astara' }] } })
    const usage = await fetchReferenceUsage([pt('Astara'), wh('Astara')])
    expect(get(usage, 'partner', 'Astara')).toEqual({ count: 0, exact: true })
    expect(get(usage, 'warehouse', 'Astara')).toEqual({ count: 1, exact: true })
  })

  it('keys usage by kind, so a warehouse and a partner sharing a name do not collide', async () => {
    mockQueries({ movements: { data: [mv({ id: 1, warehouse: 'Eyni' }), mv({ id: 2, partner: 'Eyni' })] } })
    const usage = await fetchReferenceUsage([wh('Eyni'), pt('Eyni')])
    expect(get(usage, 'warehouse', 'Eyni')).toEqual({ count: 2, exact: true })
    expect(get(usage, 'partner', 'Eyni')).toEqual({ count: 1, exact: true })
  })

  it('excludes cancelled movements for both kinds', async () => {
    mockQueries({
      movements: {
        data: [
          mv({ id: 1, partner: 'Bakcell', doc_num: 'SND-1' }),
          mv({ id: 2, partner: 'Bakcell', doc_num: 'SND-2', note: 'Ləğv: SND-1' }),
          mv({ id: 3, partner: 'Bakcell', doc_num: 'SND-3' }),
        ],
      },
    })
    expect(get(await fetchReferenceUsage([pt('Bakcell')]), 'partner', 'Bakcell')).toEqual({ count: 1, exact: true })
  })

  it('matches with REF_EQ semantics: case, outer whitespace, literal % and _', async () => {
    mockQueries({ movements: { data: [mv({ id: 1, partner: '  BAKCELL ' }), mv({ id: 2, partner: 'Anbar_1' })] } })
    const usage = await fetchReferenceUsage([pt('bakcell'), pt('%'), pt('Anbar_1')])
    expect(get(usage, 'partner', 'bakcell')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'partner', '%')).toEqual({ count: 0, exact: true })
    expect(get(usage, 'partner', 'Anbar_1')).toEqual({ count: 1, exact: true })
  })

  it('reads both tables in one pass, ordered by id', async () => {
    mockQueries({})
    await fetchReferenceUsage([wh('Astara'), pt('Bakcell')])
    expect(orderCalls.filter((c) => c === 'movements.id')).toHaveLength(1)
    expect(orderCalls.filter((c) => c === 'users.id')).toHaveLength(1)
  })

  it('skips the users query entirely when only partners are requested', async () => {
    mockQueries({})
    await fetchReferenceUsage([pt('Bakcell')])
    expect(orderCalls).not.toContain('users.id')
  })
})

describe('fetchReferenceUsage — fail-safe', () => {
  it('marks every kind inexact, never below 1, when the movements read fails', async () => {
    mockQueries({ movements: { error: { message: 'network' } } })
    const usage = await fetchReferenceUsage([wh('Astara'), pt('Bakcell')])
    expect(get(usage, 'warehouse', 'Astara')).toEqual({ count: 1, exact: false })
    expect(get(usage, 'partner', 'Bakcell')).toEqual({ count: 1, exact: false })
  })

  it('a failed users read makes warehouses inexact but leaves partners exact', async () => {
    mockQueries({ movements: { data: [mv({ id: 1, partner: 'Bakcell' })] }, users: { error: { message: 'rls' } } })
    const usage = await fetchReferenceUsage([wh('Astara'), pt('Bakcell')])
    expect(get(usage, 'warehouse', 'Astara')).toEqual({ count: 1, exact: false })
    expect(get(usage, 'partner', 'Bakcell')).toEqual({ count: 1, exact: true })
  })
})
