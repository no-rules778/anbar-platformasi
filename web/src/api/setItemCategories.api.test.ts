import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { supabase } from './supabase'
import { setItemCategories } from './setItemCategories.api'

beforeEach(() => vi.clearAllMocks())

/* M5-46 — index.html:5889-5896. Atomic, all-or-none, on the server. */

describe('setItemCategories', () => {
  it('calls the set_item_categories RPC with the mappings', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { updated: 2 }, error: null } as never)
    const mappings = [{ code: '0000001', category: 'Filtrlər' }]
    await setItemCategories(mappings)
    expect(supabase.rpc).toHaveBeenCalledWith('set_item_categories', { p_mappings: mappings })
  })

  it('sends ONLY code and category — never a name, price or unit', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { updated: 1 }, error: null } as never)
    await setItemCategories([{ code: '0000001', category: 'Filtrlər' }])
    const arg = vi.mocked(supabase.rpc).mock.calls[0][1] as { p_mappings: Record<string, unknown>[] }
    expect(Object.keys(arg.p_mappings[0]).sort()).toEqual(['category', 'code'])
  })

  it('preserves leading zeros in the codes it sends', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { updated: 1 }, error: null } as never)
    await setItemCategories([{ code: '0000001', category: 'X' }])
    const arg = vi.mocked(supabase.rpc).mock.calls[0][1] as { p_mappings: { code: string }[] }
    expect(arg.p_mappings[0].code).toBe('0000001')
  })

  it('returns the updated count', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { updated: 7 }, error: null } as never)
    const res = await setItemCategories([])
    expect(res.ok).toBe(true)
    expect(res.updated).toBe(7)
  })

  it('treats a missing updated key as 0', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: {}, error: null } as never)
    expect((await setItemCategories([])).updated).toBe(0)
  })

  it('surfaces a returned error and reports zero updates', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'only admin' } } as never)
    const res = await setItemCategories([{ code: '1', category: 'X' }])
    expect(res.ok).toBe(false)
    expect(res.updated).toBe(0)
    expect(res.error).toBe('only admin')
  })

  it('absorbs a rejected promise', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('offline'))
    expect((await setItemCategories([])).error).toBe('offline')
  })
})
