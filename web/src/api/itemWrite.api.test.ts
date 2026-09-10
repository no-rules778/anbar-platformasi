import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { createItem, updateItem } from './itemWrite.api'

beforeEach(() => vi.clearAllMocks())

/** Captures the inserted row and resolves the given terminal result. */
function mockInsert(result: { data?: unknown[] | null; error?: unknown }) {
  const seen: { row?: Record<string, unknown> } = {}
  vi.mocked(supabase.from).mockReturnValue({
    insert: (row: Record<string, unknown>) => {
      seen.row = row
      return { select: () => Promise.resolve({ data: result.data ?? null, error: result.error ?? null }) }
    },
  } as never)
  return seen
}

function mockUpdate(result: { data?: unknown[] | null; error?: unknown }) {
  const seen: { patch?: Record<string, unknown>; code?: unknown; called?: boolean } = { called: false }
  vi.mocked(supabase.from).mockReturnValue({
    update: (patch: Record<string, unknown>) => {
      seen.called = true
      seen.patch = patch
      return {
        eq: (_col: string, code: unknown) => {
          seen.code = code
          return { select: () => Promise.resolve({ data: result.data ?? null, error: result.error ?? null }) }
        },
      }
    },
  } as never)
  return seen
}

const payload = { code: '0000009', name: 'Yeni', unit: 'kq', price: 5 }

describe('createItem (M5-29)', () => {
  it('inserts and returns the confirmed code', async () => {
    const seen = mockInsert({ data: [{ code: '0000009' }] })
    const res = await createItem(payload, 'user-1')
    expect(res.ok).toBe(true)
    expect(res.code).toBe('0000009')
    expect(seen.row).toMatchObject({ code: '0000009', name: 'Yeni', unit: 'kq', price: 5, created_by: 'user-1' })
  })

  it('defaults an empty unit to ədəd, as the original does', async () => {
    const seen = mockInsert({ data: [{ code: '0000009' }] })
    await createItem({ ...payload, unit: '' }, 'u')
    expect(seen.row!.unit).toBe('ədəd')
  })

  it('sends category NULL when the caller passes an empty string', async () => {
    const seen = mockInsert({ data: [{ code: '0000009' }] })
    await createItem({ ...payload, category: '' }, 'u')
    expect(seen.row!.category).toBeNull()
  })

  it('omits category entirely when the caller may not edit it', async () => {
    const seen = mockInsert({ data: [{ code: '0000009' }] })
    await createItem(payload, 'u')
    expect('category' in seen.row!).toBe(false)
  })

  /* R-F5 — the silent refusal. An insert blocked by RLS comes back
     success-shaped with zero rows. */
  it('FAILS when the insert returns zero rows with no error (silent RLS refusal)', async () => {
    mockInsert({ data: [], error: null })
    const res = await createItem(payload, 'u')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Nomenklatura yaradılmadı: server əməliyyatı təsdiqləmədi')
  })

  it('FAILS when the insert returns null data with no error', async () => {
    mockInsert({ data: null, error: null })
    expect((await createItem(payload, 'u')).ok).toBe(false)
  })

  it('surfaces a returned error message', async () => {
    mockInsert({ error: { message: 'duplicate key' } })
    const res = await createItem(payload, 'u')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('duplicate key')
  })

  it('absorbs a rejected promise instead of throwing', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: () => ({ select: () => Promise.reject(new Error('offline')) }),
    } as never)
    const res = await createItem(payload, 'u')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('offline')
  })
})

describe('updateItem — partial patch (M5-30)', () => {
  it('sends only the keys the caller provided', async () => {
    const seen = mockUpdate({ data: [{ code: '0000001' }] })
    await updateItem({ code: '0000001', name: 'Yeni ad' })
    expect(seen.patch).toEqual({ name: 'Yeni ad' })
    expect(seen.code).toBe('0000001')
  })

  it('never sends an untouched field', async () => {
    const seen = mockUpdate({ data: [{ code: '0000001' }] })
    await updateItem({ code: '0000001', price: 12 })
    expect('name' in seen.patch!).toBe(false)
    expect('unit' in seen.patch!).toBe(false)
  })

  it('maps an empty category to NULL', async () => {
    const seen = mockUpdate({ data: [{ code: '0000001' }] })
    await updateItem({ code: '0000001', category: '' })
    expect(seen.patch).toEqual({ category: null })
  })

  it('skips the request entirely when there is nothing to change', async () => {
    const seen = mockUpdate({ data: [] })
    const res = await updateItem({ code: '0000001' })
    expect(res.ok).toBe(true)
    expect(seen.called).toBe(false)
  })
})

/* R-F5, the highest-severity guard in this phase. index.html:1127-1131 keeps
   `.select()` precisely because an RLS-blocked UPDATE reports NO error while
   updating ZERO rows. Without the row-count check the UI reports a save that
   never happened. */
describe('updateItem — silent RLS refusal (M5-31)', () => {
  it('FAILS when the update returns zero rows with no error', async () => {
    mockUpdate({ data: [], error: null })
    const res = await updateItem({ code: '0000001', name: 'X' })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Nomenklatura yenilənmədi: serverdə dəyişiklik təsdiqlənmədi')
  })

  it('FAILS when the update returns null data with no error', async () => {
    mockUpdate({ data: null, error: null })
    expect((await updateItem({ code: '0000001', name: 'X' })).ok).toBe(false)
  })

  it('requires .select() to be part of the update chain at all', async () => {
    /* If the implementation dropped .select(), this builder would throw —
       which is itself the regression this test guards against. */
    let selected = false
    vi.mocked(supabase.from).mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => { selected = true; return Promise.resolve({ data: [{ code: '1' }], error: null }) },
        }),
      }),
    } as never)
    await updateItem({ code: '1', name: 'X' })
    expect(selected).toBe(true)
  })

  it('succeeds only on exactly one confirmed row', async () => {
    mockUpdate({ data: [{ code: '0000001' }] })
    expect((await updateItem({ code: '0000001', name: 'X' })).ok).toBe(true)
  })

  it('surfaces a returned error message', async () => {
    mockUpdate({ error: { message: 'rls violation' } })
    const res = await updateItem({ code: '0000001', name: 'X' })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('rls violation')
  })

  it('absorbs a rejected promise', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: () => ({ eq: () => ({ select: () => Promise.reject(new Error('offline')) }) }),
    } as never)
    expect((await updateItem({ code: '1', name: 'X' })).error).toBe('offline')
  })
})
