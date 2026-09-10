import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchItems, type ItemRow } from './items.api'

beforeEach(() => vi.clearAllMocks())

interface Call { method: string; args: unknown[] }

/** Recording builder; `.range()` is terminal and resolves the queued page. */
function mockPages(pages: Array<{ data?: unknown[] | null; error?: unknown }>) {
  const calls: Call[] = []
  let n = 0
  const builder: Record<string, unknown> = {}
  const chain = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args })
    return builder
  }
  builder.select = chain('select')
  builder.order = chain('order')
  builder.range = (...args: unknown[]) => {
    calls.push({ method: 'range', args })
    const page = pages[Math.min(n, pages.length - 1)]
    n++
    return Promise.resolve({ data: page.data ?? null, error: page.error ?? null })
  }
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return calls
}

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null, ...over,
})

describe('fetchItems', () => {
  it('reads items ordered by code and returns the rows', async () => {
    const calls = mockPages([{ data: [item()] }])
    const res = await fetchItems()
    expect(res.ok).toBe(true)
    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].code).toBe('0000001')
    expect(calls.map((c) => c.method)).toEqual(['select', 'order', 'range'])
    expect(calls[1].args[0]).toBe('code')
  })

  it('requests only the columns the screen uses', async () => {
    const calls = mockPages([{ data: [] }])
    await fetchItems()
    const cols = String(calls[0].args[0])
    for (const c of ['code', 'name', 'unit', 'price', 'category']) expect(cols).toContain(c)
    expect(cols).not.toContain('*')
  })

  /* fetchAll() reads until a SHORT page arrives (index.html:847-862). */
  it('pages past 1000 rows and stops on the first short page', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => item({ code: String(i).padStart(7, '0') }))
    const calls = mockPages([{ data: full }, { data: [item({ code: '9999999' })] }])
    const res = await fetchItems()
    expect(res.rows).toHaveLength(1001)
    const ranges = calls.filter((c) => c.method === 'range').map((c) => c.args)
    expect(ranges).toEqual([[0, 999], [1000, 1999]])
  })

  it('stops after a single page when the first page is already short', async () => {
    const calls = mockPages([{ data: [item()] }])
    await fetchItems()
    expect(calls.filter((c) => c.method === 'range')).toHaveLength(1)
  })

  it('treats a null data page as empty rather than crashing', async () => {
    mockPages([{ data: null }])
    const res = await fetchItems()
    expect(res.ok).toBe(true)
    expect(res.rows).toEqual([])
  })

  it('keeps nullable columns null — it must not coerce them to 0 or empty', async () => {
    mockPages([{ data: [item({ unit: null, price: null })] }])
    const res = await fetchItems()
    expect(res.rows[0].unit).toBeNull()
    expect(res.rows[0].price).toBeNull()
  })

  /* Both failure shapes, per the Phase 3a audit finding. */
  it('absorbs a returned error without throwing', async () => {
    mockPages([{ error: { message: 'permission denied' } }])
    const res = await fetchItems()
    expect(res.ok).toBe(false)
    expect(res.error).toBe('permission denied')
    expect(res.rows).toEqual([])
  })

  it('absorbs a REJECTED promise (network failure) without throwing', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({ order: () => ({ range: () => Promise.reject(new Error('offline')) }) }),
    } as never)
    const res = await fetchItems()
    expect(res.ok).toBe(false)
    expect(res.error).toBe('offline')
  })

  it('absorbs a non-Error rejection', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({ order: () => ({ range: () => Promise.reject('boom') }) }),
    } as never)
    const res = await fetchItems()
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Naməlum xəta')
  })
})
