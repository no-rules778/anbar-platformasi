import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchWriteoffAllocations, type WriteoffAllocationRow } from './writeoffAllocations.api'

beforeEach(() => vi.clearAllMocks())

interface Call { method: string; args: unknown[] }

function mockPages(pages: Array<{ data?: unknown[] | null; error?: unknown }>) {
  const calls: Call[] = []
  const tables: unknown[] = []
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
  vi.mocked(supabase.from).mockImplementation((t: unknown) => { tables.push(t); return builder as never })
  return { calls, tables }
}

const al = (over: Partial<WriteoffAllocationRow> = {}): WriteoffAllocationRow => ({
  writeoff_movement_id: 'm1', source_movement_id: 's1',
  source_doc_num_snapshot: 'SD-1', source_invoice_snapshot: 'INV-1',
  source_date_snapshot: '2025-12-01', qty: 4, price_status_snapshot: 'known',
  unit_price_snapshot: 25, source_amount_snapshot: 100, reversed_at: null,
  id: 'a1', created_at: '2026-01-05T00:00:00Z', ...over,
})

/** A page of exactly PAGE_SIZE rows — the signal that more may follow. */
const fullPage = (): WriteoffAllocationRow[] =>
  Array.from({ length: 1000 }, (_, i) => al({ id: 'a' + i }))

/* The confirmed LIVE column set of `stock_layer_allocations`, from the A8
   metadata audit and corroborated against the generated `types/database.ts`.
   Anything outside this set does not exist on the table. */
const LIVE_COLUMNS = [
  'writeoff_movement_id', 'source_movement_id', 'source_doc_num_snapshot',
  'source_invoice_snapshot', 'source_date_snapshot', 'qty',
  'price_status_snapshot', 'unit_price_snapshot', 'source_amount_snapshot',
  'reversed_at', 'id', 'layer_id', 'created_by', 'created_at',
]

describe('the read targets the right table, column-explicitly', () => {
  it('reads stock_layer_allocations', async () => {
    const { tables } = mockPages([{ data: [] }])
    await fetchWriteoffAllocations()
    expect(tables).toEqual(['stock_layer_allocations'])
  })

  /* MUTATION: `select('*')` passes every other test here — the rows come back
     identically — so the column list needs its own guard. */
  it('never selects a wildcard', async () => {
    const { calls } = mockPages([{ data: [] }])
    await fetchWriteoffAllocations()
    const select = calls.find((c) => c.method === 'select')
    expect(String(select!.args[0])).not.toContain('*')
  })

  it('requests only columns that exist live', async () => {
    const { calls } = mockPages([{ data: [] }])
    await fetchWriteoffAllocations()
    const cols = String(calls.find((c) => c.method === 'select')!.args[0])
      .split(',').map((s) => s.trim())
    for (const c of cols) expect(LIVE_COLUMNS).toContain(c)
  })

  it('SELECTS reversed_at — the policy does not filter it, so the client must', async () => {
    const { calls } = mockPages([{ data: [] }])
    await fetchWriteoffAllocations()
    expect(String(calls.find((c) => c.method === 'select')!.args[0])).toContain('reversed_at')
  })

  it('leaves layer_id and created_by unread', async () => {
    const { calls } = mockPages([{ data: [] }])
    await fetchWriteoffAllocations()
    const cols = String(calls.find((c) => c.method === 'select')!.args[0])
    expect(cols).not.toContain('layer_id')
    expect(cols).not.toContain('created_by')
  })
})

describe('ordering', () => {
  /* MUTATION: dropping either key. `created_at` alone is not unique, so pages
     could overlap or skip; reordering by writeoff_movement_id would break the
     legacy chronological sheet order. Both keys, in this order. */
  it('orders by created_at THEN id — legacy chronology, unique tie-breaker', async () => {
    const { calls } = mockPages([{ data: [] }])
    await fetchWriteoffAllocations()
    const orders = calls.filter((c) => c.method === 'order').map((c) => c.args[0])
    expect(orders).toEqual(['created_at', 'id'])
  })

  it('does NOT reorder by the parent movement', async () => {
    const { calls } = mockPages([{ data: [] }])
    await fetchWriteoffAllocations()
    const orders = calls.filter((c) => c.method === 'order').map((c) => c.args[0])
    expect(orders).not.toContain('writeoff_movement_id')
  })
})

describe('pagination', () => {
  it('stops at the first short page', async () => {
    const { calls } = mockPages([{ data: [al()] }])
    const res = await fetchWriteoffAllocations()
    expect(res.ok).toBe(true)
    expect(res.rows).toHaveLength(1)
    expect(calls.filter((c) => c.method === 'range')).toHaveLength(1)
  })

  it('pages through a full page into a short one, in order', async () => {
    const { calls } = mockPages([
      { data: fullPage() },
      { data: [al({ id: 'last' })] },
    ])
    const res = await fetchWriteoffAllocations()
    expect(res.ok).toBe(true)
    expect(res.rows).toHaveLength(1001)
    expect(res.rows[1000].id).toBe('last')
    const ranges = calls.filter((c) => c.method === 'range').map((c) => c.args)
    expect(ranges).toEqual([[0, 999], [1000, 1999]])
  })

  it('treats an empty first page as a successful empty result', async () => {
    const res = await (async () => { mockPages([{ data: [] }]); return fetchWriteoffAllocations() })()
    expect(res).toEqual({ rows: [], ok: true, error: null })
  })

  it('absorbs a null data page as empty rather than throwing', async () => {
    mockPages([{ data: null }])
    const res = await fetchWriteoffAllocations()
    expect(res.ok).toBe(true)
    expect(res.rows).toEqual([])
  })
})

describe('failure is ALL-OR-NOTHING — never a partial read', () => {
  it('returns ok:false with ZERO rows when page 1 errors', async () => {
    mockPages([{ error: { message: 'boom' } }])
    const res = await fetchWriteoffAllocations()
    expect(res).toEqual({ rows: [], ok: false, error: 'boom' })
  })

  /* MUTATION: returning the rows read so far — the legacy fetchAll() `break`.
     A half-read allocation set presented as complete would silently drop real
     source lots from the sheet. */
  it('discards ALREADY-READ rows when a LATER page errors', async () => {
    mockPages([
      { data: fullPage() },
      { error: { message: 'network' } },
    ])
    const res = await fetchWriteoffAllocations()
    expect(res.ok).toBe(false)
    expect(res.rows).toEqual([])
    expect(res.error).toBe('network')
  })

  it('names an unnamed error rather than reporting an empty message', async () => {
    mockPages([{ error: {} }])
    const res = await fetchWriteoffAllocations()
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Naməlum xəta')
  })

  it('absorbs a REJECTED promise instead of throwing at the caller', async () => {
    const builder: Record<string, unknown> = {}
    builder.select = () => builder
    builder.order = () => builder
    builder.range = () => Promise.reject(new Error('offline'))
    vi.mocked(supabase.from).mockImplementation(() => builder as never)
    const res = await fetchWriteoffAllocations()
    expect(res).toEqual({ rows: [], ok: false, error: 'offline' })
  })

  /* MUTATION: returning ok:true at the cap. A set that may continue past
     MAX_PAGES must never be reported as complete. */
  it('FAILS when MAX_PAGES is reached with a full final page', async () => {
    const { calls } = mockPages([{ data: fullPage() }]) // every page is full
    const res = await fetchWriteoffAllocations()
    expect(res.ok).toBe(false)
    expect(res.rows).toEqual([])
    expect(res.error).toBe('Mənbə partiya sətirləri tam oxunmadı')
    expect(calls.filter((c) => c.method === 'range')).toHaveLength(200)
  })
})

describe('the module is read-only', () => {
  it('exposes no write operation', async () => {
    const mod = await import('./writeoffAllocations.api')
    expect(Object.keys(mod)).toEqual(['fetchWriteoffAllocations'])
  })
})
