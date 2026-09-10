import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { supabase } from './supabase'
import { fetchReferenceValues } from './referenceValues.api'

beforeEach(() => vi.clearAllMocks())

const row = (kind: string, name: string, over: Record<string, unknown> = {}) => ({
  id: `id-${name}`,
  kind,
  name,
  active: true,
  ...over,
})

function mockRpc(data: unknown[] | null, error: unknown = null) {
  vi.mocked(supabase.rpc).mockResolvedValue({ data, error } as never)
}

describe('fetchReferenceValues — one call, four kinds', () => {
  it('calls get_reference_values exactly once and splits every kind out of that one response', async () => {
    mockRpc([
      row('purchase_channel', 'Nağd'),
      row('unit', 'ədəd'),
      row('item_category', 'Kanselyariya'),
      row('serfiyyat_channel', 'SM kanalı'),
    ])

    const { values, ready } = await fetchReferenceValues()

    expect(supabase.rpc).toHaveBeenCalledTimes(1)
    expect(supabase.rpc).toHaveBeenCalledWith('get_reference_values')
    expect(ready).toBe(true)
    expect(values.channel.map((v) => v.name)).toEqual(['Nağd'])
    expect(values.unit.map((v) => v.name)).toEqual(['ədəd'])
    expect(values.category.map((v) => v.name)).toEqual(['Kanselyariya'])
  })

  it('parses serfiyyat_channel from the shared response even though Phase 3a does not surface it', () => {
    /* M3-06: the rows are fetched here unconditionally; the availability gate
       lives downstream (M3-02a). Dropping them here would force a second RPC
       call in Phase 3b. */
    mockRpc([row('serfiyyat_channel', 'SM kanalı'), row('unit', 'kq')])

    return fetchReferenceValues().then(({ values }) => {
      expect(values.serfiyyat_channel.map((v) => v.name)).toEqual(['SM kanalı'])
      expect(values.unit.map((v) => v.name)).toEqual(['kq'])
    })
  })

  it('maps stored kind names to UI kind names', async () => {
    mockRpc([row('purchase_channel', 'A'), row('item_category', 'B')])
    const { values } = await fetchReferenceValues()
    /* `purchase_channel` and `item_category` are the stored values; the UI calls
       them `channel` and `category` (index.html:999-1001). */
    expect(values.channel).toHaveLength(1)
    expect(values.category).toHaveLength(1)
  })

  it('ignores a stored kind the client does not know', async () => {
    mockRpc([row('unit', 'ədəd'), row('something_new', 'X')])
    const { values, ready } = await fetchReferenceValues()
    expect(ready).toBe(true)
    expect(values.unit).toHaveLength(1)
    expect(Object.values(values).flat()).toHaveLength(1)
  })

  it('keeps inactive rows — an admin manages hidden values from this screen', async () => {
    mockRpc([row('unit', 'köhnə', { active: false })])
    const { values } = await fetchReferenceValues()
    expect(values.unit).toEqual([{ id: 'id-köhnə', name: 'köhnə', active: false }])
  })

  it('treats a null active as active, like the original', async () => {
    /* index.html:998 — `active: x.active !== false`. */
    mockRpc([row('unit', 'ədəd', { active: null })])
    const { values } = await fetchReferenceValues()
    expect(values.unit[0].active).toBe(true)
  })

  it('stringifies the id so it can be handed to manage_reference as p_id', async () => {
    mockRpc([row('unit', 'ədəd', { id: 42 })])
    const { values } = await fetchReferenceValues()
    expect(values.unit[0].id).toBe('42')
  })
})

describe('fetchReferenceValues — failure is readiness, not an exception', () => {
  it('reports ready:false with empty lists when the RPC errors, and does not reject', async () => {
    /* index.html:1004 warns and carries on: a missing SQL 011 must not break
       the whole screen, only make these kinds unavailable. */
    mockRpc(null, { message: 'function does not exist' })

    const result = await fetchReferenceValues()

    expect(result.ready).toBe(false)
    expect(result.values).toEqual({ channel: [], unit: [], category: [], serfiyyat_channel: [] })
  })

  it('treats a null payload as ready with no rows', async () => {
    mockRpc(null)
    const { values, ready } = await fetchReferenceValues()
    expect(ready).toBe(true)
    expect(values.unit).toEqual([])
  })

  it('reports ready:false when the RPC promise REJECTS, and does not propagate the rejection', async () => {
    /* The second failure shape, and the one that matters most: PostgREST
       returns `{ error }` for a SQL problem, but a network/fetch failure
       rejects. The original's try/catch (index.html:996-1004) covers both.
       An escaping rejection would break the whole page via the store's
       Promise.all. */
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('Failed to fetch'))

    const result = await fetchReferenceValues()

    expect(result.ready).toBe(false)
    expect(result.values).toEqual({ channel: [], unit: [], category: [], serfiyyat_channel: [] })
  })

  it('swallows a non-Error rejection too', async () => {
    /* A rejected fetch is not guaranteed to carry an Error instance. */
    vi.mocked(supabase.rpc).mockRejectedValue('offline')
    await expect(fetchReferenceValues()).resolves.toEqual({
      values: { channel: [], unit: [], category: [], serfiyyat_channel: [] },
      ready: false,
    })
  })
})
