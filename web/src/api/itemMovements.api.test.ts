import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchItemMovements, type MovementRow } from './itemMovements.api'

beforeEach(() => vi.clearAllMocks())

interface Call { method: string; args: unknown[] }

function mockPages(pages: Array<{ data?: unknown[] | null; error?: unknown }>) {
  const calls: Call[] = []
  let n = 0
  const builder: Record<string, unknown> = {}
  builder.select = (...args: unknown[]) => { calls.push({ method: 'select', args }); return builder }
  builder.order = (...args: unknown[]) => { calls.push({ method: 'order', args }); return builder }
  builder.range = (...args: unknown[]) => {
    calls.push({ method: 'range', args })
    const page = pages[Math.min(n, pages.length - 1)]
    n++
    return Promise.resolve({ data: page.data ?? null, error: page.error ?? null })
  }
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return calls
}

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Elet', date: '2026-01-01',
  in_qty: 5, out_qty: 0, price: 10, partner: 'ACME', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: null, channel: null, ...over,
})

/* A11 — the chronological order is part of the READ CONTRACT, not a
   presentation detail. fetchAll('movements', ['date', 'created_at'])
   (index.html:874) orders every page identically, which is what makes
   range() a stable window: with no ORDER BY, PostgREST may return rows in any
   order, so consecutive pages can overlap or skip rows and the set assembled
   across them is not guaranteed complete. These fail against the pre-fix
   version, which called range() with no order at all. */
describe('read ordering (A11)', () => {
  it('orders by date then created_at', async () => {
    const calls = mockPages([{ data: [] }])
    await fetchItemMovements()
    const orders = calls.filter((c) => c.method === 'order').map((c) => c.args[0])
    expect(orders).toEqual(['date', 'created_at'])
  })

  it('orders BEFORE ranging, so the page window is taken from a sorted set', async () => {
    const calls = mockPages([{ data: [] }])
    await fetchItemMovements()
    const lastOrder = calls.map((c) => c.method).lastIndexOf('order')
    const firstRange = calls.map((c) => c.method).indexOf('range')
    expect(lastOrder).toBeLessThan(firstRange)
  })

  /* The ordering must hold for EVERY page, not just the first — that is the
     whole point of a stable page boundary beyond 1000 rows. */
  it('applies the same order on every page past the 1000-row boundary', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => mv({ id: 'm' + i }))
    const calls = mockPages([{ data: full }, { data: [mv({ id: 'last' })] }])
    const res = await fetchItemMovements()
    expect(res.rows).toHaveLength(1001)

    const ranges = calls.filter((c) => c.method === 'range')
    expect(ranges).toHaveLength(2)
    /* Two pages read → two ordered pairs, one per request. */
    const orders = calls.filter((c) => c.method === 'order').map((c) => c.args[0])
    expect(orders).toEqual(['date', 'created_at', 'date', 'created_at'])
  })
})

describe('fetchItemMovements', () => {
  it('returns the rows on success', async () => {
    mockPages([{ data: [mv()] }])
    const res = await fetchItemMovements()
    expect(res.ok).toBe(true)
    expect(res.rows).toHaveLength(1)
  })

  /* Q1 option (c): a restricted column list, never select('*'). */
  it('requests exactly the columns the indexes consume, not a wildcard', async () => {
    const calls = mockPages([{ data: [] }])
    await fetchItemMovements()
    const cols = String(calls[0].args[0])
    expect(cols).not.toContain('*')
    for (const c of [
      'id', 'item_code', 'warehouse', 'date', 'in_qty', 'out_qty',
      'price', 'partner', 'type', 'invoice_num', 'note', 'doc_num',
      // M6-39 (Phase 6 Q1) — the last-purchase tiebreak needs created_at.
      'created_at',
      // Phase 7 H-2 audit A04 — the reference-directory fallback needs channel.
      'channel',
      // Phase 8 I-1 (M8-52) — «Mal hərəkəti» shows and searches both of these.
      'contract_num', 'created_by',
    ]) expect(cols).toContain(c)
  })

  /* M8-52 (Phase 8, I-1). «Mal hərəkəti» displays «Müqavilə №» and «Qeyd edən»
     and searches the contract number, so both columns must be SELECTED — the
     documented correct move, as opposed to falling back to select('*').

     There is no `by` column: index.html:943 maps `by: r.created_by || 'sistem'`,
     so `created_by` is the real column and `by` only the legacy in-memory name.
     Confirmed by types/database.ts (movements.Row) and DB_SCHEMA.md. */
  it('selects contract_num and created_by, and no `by` column (M8-52)', async () => {
    const calls = mockPages([{ data: [] }])
    await fetchItemMovements()
    const cols = String(calls[0].args[0])
      .split(',')
      .map((c) => c.trim())
    expect(cols).toContain('contract_num')
    expect(cols).toContain('created_by')
    expect(cols).not.toContain('by')
  })

  it('carries contract_num and created_by through to the returned rows (M8-52)', async () => {
    mockPages([{ data: [mv({ id: 'm1', contract_num: 'MQ-88', created_by: 'anar' })] }])
    const res = await fetchItemMovements()
    expect(res.rows[0].contract_num).toBe('MQ-88')
    expect(res.rows[0].created_by).toBe('anar')
  })

  /* Audit A04 — the store's observedChannels fallback reads this field
     directly; it must survive the round trip like every other column. */
  it('carries channel through to the returned rows', async () => {
    mockPages([{ data: [mv({ id: 'm1', channel: 'Nağd alış' })] }])
    const res = await fetchItemMovements()
    expect(res.rows[0].channel).toBe('Nağd alış')
  })

  /* M6-39 — the column was already used in the ORDER BY before Phase 6 but was
     not selected, so no client-side comparison could read it. */
  it('selects created_at, not merely orders by it', async () => {
    const calls = mockPages([{ data: [] }])
    await fetchItemMovements()
    expect(String(calls[0].args[0])).toContain('created_at')
  })

  it('carries created_at through to the returned rows', async () => {
    mockPages([{ data: [mv({ id: 'm1', created_at: '2026-01-01T10:00:00Z' })] }])
    const res = await fetchItemMovements()
    expect(res.rows[0].created_at).toBe('2026-01-01T10:00:00Z')
  })

  it('pages past 1000 rows and stops on the first short page', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => mv({ id: 'm' + i }))
    const calls = mockPages([{ data: full }, { data: [mv({ id: 'last' })] }])
    const res = await fetchItemMovements()
    expect(res.rows).toHaveLength(1001)
    expect(calls.filter((c) => c.method === 'range').map((c) => c.args)).toEqual([[0, 999], [1000, 1999]])
  })

  it('keeps nullable quantity columns null rather than coercing to 0', async () => {
    mockPages([{ data: [mv({ in_qty: null, out_qty: null, price: null })] }])
    const res = await fetchItemMovements()
    expect(res.rows[0].in_qty).toBeNull()
    expect(res.rows[0].price).toBeNull()
  })

  it('absorbs a returned error', async () => {
    mockPages([{ error: { message: 'rls' } }])
    const res = await fetchItemMovements()
    expect(res.ok).toBe(false)
    expect(res.error).toBe('rls')
  })

  it('absorbs a rejected promise', async () => {
    const chain: Record<string, unknown> = {
      order: () => chain,
      range: () => Promise.reject(new Error('offline')),
    }
    vi.mocked(supabase.from).mockReturnValue({ select: () => chain } as never)
    const res = await fetchItemMovements()
    expect(res.ok).toBe(false)
    expect(res.error).toBe('offline')
  })
})
