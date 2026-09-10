import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { supabase } from './supabase'
import { importNewItems } from './importNewItems.api'

beforeEach(() => vi.clearAllMocks())

/* M5-41 / M5-42 — niImport (index.html:6095-6121). */

describe('importNewItems', () => {
  it('calls the import_new_items RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { created: [], skipped: [] }, error: null } as never)
    await importNewItems([{ name: 'Sement', unit: 'kq' }])
    expect(supabase.rpc).toHaveBeenCalledWith('import_new_items', { p_items: [{ name: 'Sement', unit: 'kq' }] })
  })

  /* M5-42: the payload carries name and unit ONLY. No code (the server
     assigns it) and no price (this import never touches prices). */
  it('sends neither a code nor a price — the server assigns codes', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: {}, error: null } as never)
    await importNewItems([{ name: 'Sement', unit: 'kq' }])
    const arg = vi.mocked(supabase.rpc).mock.calls[0][1] as { p_items: Record<string, unknown>[] }
    expect(Object.keys(arg.p_items[0]).sort()).toEqual(['name', 'unit'])
  })

  it('defaults an empty unit to ədəd', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: {}, error: null } as never)
    await importNewItems([{ name: 'Sement', unit: '' }])
    const arg = vi.mocked(supabase.rpc).mock.calls[0][1] as { p_items: Record<string, unknown>[] }
    expect(arg.p_items[0].unit).toBe('ədəd')
  })

  it('returns the created and skipped lists from the server', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { created: [{ code: '0000009', name: 'Sement', unit: 'kq' }], skipped: ['dup'] },
      error: null,
    } as never)
    const res = await importNewItems([{ name: 'Sement', unit: 'kq' }])
    expect(res.ok).toBe(true)
    expect(res.created).toHaveLength(1)
    expect(res.created[0].code).toBe('0000009')
    expect(res.skipped).toHaveLength(1)
  })

  it('treats a response with no created/skipped keys as empty lists', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: {}, error: null } as never)
    const res = await importNewItems([{ name: 'X', unit: 'kq' }])
    expect(res.ok).toBe(true)
    expect(res.created).toEqual([])
  })

  it('surfaces a returned error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'denied' } } as never)
    const res = await importNewItems([{ name: 'X', unit: 'kq' }])
    expect(res.ok).toBe(false)
    expect(res.error).toBe('denied')
  })

  it('absorbs a rejected promise', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('offline'))
    const res = await importNewItems([{ name: 'X', unit: 'kq' }])
    expect(res.ok).toBe(false)
    expect(res.error).toBe('offline')
  })
})
