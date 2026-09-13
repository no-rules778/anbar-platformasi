import { beforeEach, describe, expect, it, vi } from 'vitest'

/* T4 — M13-10, M13-11, M13-12, M13-13, M13-51, M13-52, M13-90, M13-97.

   UNIT EVIDENCE ONLY. The Supabase client is mocked, so nothing here is
   server, RLS or live evidence (protocol §7): these tests pin what the CLIENT
   sends and how it normalises a reply, never what the server decides. The
   server-authoritative rows M13-91…M13-94 are not satisfied by any assertion
   in this file. */

const rpc = vi.fn()
const from = vi.fn()

vi.mock('./supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a), from: (...a: unknown[]) => from(...a) } }))

const blockedReason = vi.fn()
vi.mock('../lib/mutationGuard', () => ({ blockedReason: (...a: unknown[]) => blockedReason(...a) }))

import {
  createSerfiyyatDocument, deleteSerfiyyatDocument, editSerfiyyatDocument,
  fetchSerfiyyatSnapshot, mapDocument, mapLine, mapProject,
} from './serfiyyatDocuments.api'

/** A chainable `.select().order().range()` that resolves to one reply. */
function table(reply: { data?: unknown[]; error?: { message: string } | null }) {
  const range = vi.fn().mockResolvedValue({ data: reply.data ?? [], error: reply.error ?? null })
  const order = vi.fn(() => ({ range }))
  const select = vi.fn(() => ({ order }))
  return { select }
}

const PROJECT = { id: 'p1', name: 'Layihə A', linked_warehouse: 'Test Anbar', active: true }
const DOCUMENT = {
  id: 'd1', doc_num: 'SM-2026-000001', project_id: 'p1', kontragent: 'MMC',
  avtomobil_nomresi: '10-AA-123', alinma_kanali: 'Nağd', invoice_num: '83951',
  doc_date: '2026-09-11', note: 'qeyd', created_by: 'u1', created_at: '2026-09-11T08:00:00Z',
}
const LINE = { id: 'l1', document_id: 'd1', item_code: '0000001', qty: '2.00', price: '5.00', line_sum: '10.00' }

/** Wires the three table reads, each independently succeeding or failing. */
function wireTables(over: Partial<Record<'serfiyyat_projects' | 'serfiyyat_documents' | 'serfiyyat_lines', ReturnType<typeof table>>> = {}) {
  const tables = {
    serfiyyat_projects: over.serfiyyat_projects ?? table({ data: [PROJECT] }),
    serfiyyat_documents: over.serfiyyat_documents ?? table({ data: [DOCUMENT] }),
    serfiyyat_lines: over.serfiyyat_lines ?? table({ data: [LINE] }),
  }
  from.mockImplementation((name: string) => tables[name as keyof typeof tables])
  return tables
}

beforeEach(() => {
  vi.clearAllMocks()
  blockedReason.mockReturnValue(null)
})

describe('fetchSerfiyyatSnapshot — the reads it issues (M13-10, M13-11)', () => {
  it('reads EXACTLY the three serfiyyat_* tables and nothing else', async () => {
    wireTables()
    await fetchSerfiyyatSnapshot()
    expect(from.mock.calls.map((c) => c[0]).sort()).toEqual([
      'serfiyyat_documents', 'serfiyyat_lines', 'serfiyyat_projects',
    ])
  })

  /* M13-95 — structural isolation. No movements, balances or valuation read. */
  it.each(['movements', 'stock_layers', 'writeoff_valuations', 'items'])(
    'never reads %s (negative control for M13-95)', async (t) => {
      wireTables()
      await fetchSerfiyyatSnapshot()
      expect(from.mock.calls.map((c) => c[0])).not.toContain(t)
    })

  /* D-N2 — this is the page's OWN reader. It selects every column, unlike
     fetchSerfiyyat()'s narrow accepted set, and must not be routed through it. */
  it('selects * rather than the narrow Phase 3 column set', async () => {
    const tables = wireTables()
    await fetchSerfiyyatSnapshot()
    expect(tables.serfiyyat_projects.select).toHaveBeenCalledWith('*')
    expect(tables.serfiyyat_documents.select).toHaveBeenCalledWith('*')
    expect(tables.serfiyyat_lines.select).toHaveBeenCalledWith('*')
  })

  it('sends NO row filter of its own — RLS decides the scope (M13-11)', async () => {
    const tables = wireTables()
    await fetchSerfiyyatSnapshot()
    /* `.select()` returns only `.order`, so any `.eq`/`.filter` call would
       throw; the absence of one is what this pins. */
    expect(Object.keys(tables.serfiyyat_documents.select())).toEqual(['order'])
  })

  it('maps all three tables into the legacy view models on success', async () => {
    wireTables()
    const snap = await fetchSerfiyyatSnapshot()
    expect(snap.ok).toBe(true)
    expect(snap.projects).toEqual([{ id: 'p1', name: 'Layihə A', wh: 'Test Anbar', active: true }])
    expect(snap.documents[0]).toMatchObject({ num: 'SM-2026-000001', iv: '83951', d: '2026-09-11' })
    expect(snap.lines).toEqual([{ id: 'l1', docId: 'd1', code: '0000001', qty: 2, price: 5, sum: 10 }])
  })
})

describe('the readiness rule — ALL THREE reads must succeed (M13-10, M13-13)', () => {
  it.each([
    ['serfiyyat_projects'], ['serfiyyat_documents'], ['serfiyyat_lines'],
  ])('a %s failure ALONE yields ok:false and applies nothing', async (failing) => {
    wireTables({ [failing]: table({ error: { message: 'boom' } }) })
    const snap = await fetchSerfiyyatSnapshot()
    expect(snap.ok).toBe(false)
    expect(snap.error).toBe('boom')
    expect(snap.projects).toEqual([])
    expect(snap.documents).toEqual([])
    expect(snap.lines).toEqual([])
  })

  /* The load-bearing one: a lines failure is easy to treat as harmless
     because no line COLUMN is displayed on the form tab. It is fatal. */
  it('a serfiyyat_lines failure is FATAL, not a successful empty list', async () => {
    wireTables({ serfiyyat_lines: table({ error: { message: 'lines down' } }) })
    const snap = await fetchSerfiyyatSnapshot()
    expect(snap.ok).toBe(false)
    expect(snap.lines).toEqual([])
  })

  it('normalises a REJECTED promise into ok:false rather than throwing', async () => {
    from.mockImplementation(() => { throw new Error('network') })
    const snap = await fetchSerfiyyatSnapshot()
    expect(snap.ok).toBe(false)
    expect(snap.error).toBe('network')
  })

  it('an empty but SUCCESSFUL read is ok:true — absence is not failure', async () => {
    wireTables({
      serfiyyat_projects: table({ data: [] }),
      serfiyyat_documents: table({ data: [] }),
      serfiyyat_lines: table({ data: [] }),
    })
    const snap = await fetchSerfiyyatSnapshot()
    expect(snap.ok).toBe(true)
    expect(snap.error).toBeNull()
  })
})

describe('the row mappers — every empty value defaulted (index.html:6197-6203)', () => {
  it('defaults every nullable document column to an empty string', () => {
    expect(mapDocument({
      ...DOCUMENT, kontragent: null, avtomobil_nomresi: null, alinma_kanali: null,
      invoice_num: null, note: null, created_by: null, created_at: null,
    })).toMatchObject({ kontragent: '', avto: '', kanal: '', iv: '', note: '', by: '', ts: 0 })
  })

  it('treats a null `active` as ACTIVE, matching `r.active !== false`', () => {
    expect(mapProject({ ...PROJECT, active: null }).active).toBe(true)
    expect(mapProject({ ...PROJECT, active: false }).active).toBe(false)
  })

  it('defaults an unparseable numeric line column to 0, never NaN', () => {
    expect(mapLine({ ...LINE, qty: null, price: null, line_sum: null }))
      .toMatchObject({ qty: 0, price: 0, sum: 0 })
  })

  it('carries the STORED line_sum rather than recomputing qty*price', () => {
    expect(mapLine({ ...LINE, line_sum: '99.00' }).sum).toBe(99)
  })

  it('maps created_at to epoch ms, and an unparseable date to 0', () => {
    expect(mapDocument(DOCUMENT).ts).toBe(Date.parse('2026-09-11T08:00:00Z'))
    expect(mapDocument({ ...DOCUMENT, created_at: 'not a date' }).ts).toBe(0)
  })
})

describe('the three RPC wrappers — arguments (M13-51, M13-52)', () => {
  const input = {
    projectId: 'p1', docDate: '2026-09-11', kontragent: 'MMC', avtomobil: '10-AA-123',
    kanal: 'Nağd', invoiceNum: '83951', note: 'qeyd',
    lines: [{ code: '0000001', qty: 2, price: 5 }],
  }

  it('create sends exactly the documented parameters', async () => {
    rpc.mockResolvedValue({ data: { doc_num: 'SM-2026-000001' }, error: null })
    await createSerfiyyatDocument(input)
    expect(rpc).toHaveBeenCalledWith('create_serfiyyat_document', {
      p_project_id: 'p1', p_doc_date: '2026-09-11', p_kontragent: 'MMC',
      p_avtomobil_nomresi: '10-AA-123', p_alinma_kanali: 'Nağd', p_invoice_num: '83951',
      p_note: 'qeyd', p_lines: [{ code: '0000001', qty: 2, price: 5 }],
    })
  })

  /* M13-51 — every empty header string is sent as null, not ''. */
  it('sends each EMPTY header field as null', async () => {
    rpc.mockResolvedValue({ data: {}, error: null })
    await createSerfiyyatDocument({
      projectId: 'p1', docDate: '2026-09-11', kontragent: '', avtomobil: '',
      kanal: '', invoiceNum: '', note: '', lines: [{ code: 'c', qty: 1, price: 0 }],
    })
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_kontragent: null, p_avtomobil_nomresi: null, p_alinma_kanali: null,
      p_invoice_num: null, p_note: null,
    })
  })

  /* M13-51 — no creator, warehouse or document number: the signature accepts
     none, so sending one would be a client inventing authority. */
  it.each(['p_created_by', 'p_warehouse', 'p_doc_num', 'p_user_id'])(
    'never sends %s', async (key) => {
      rpc.mockResolvedValue({ data: {}, error: null })
      await createSerfiyyatDocument(input)
      expect(rpc.mock.calls[0][1]).not.toHaveProperty(key)
    })

  it('sends each line as exactly {code, qty, price}', async () => {
    rpc.mockResolvedValue({ data: {}, error: null })
    await createSerfiyyatDocument(input)
    const lines = (rpc.mock.calls[0][1] as { p_lines: object[] }).p_lines
    expect(Object.keys(lines[0])).toEqual(['code', 'qty', 'price'])
  })

  /* M13-52 — ONE argument object, routed by editDocId, with p_doc_id added. */
  it('edit sends the SAME object plus p_doc_id', async () => {
    rpc.mockResolvedValue({ data: {}, error: null })
    await editSerfiyyatDocument('d1', input)
    expect(rpc).toHaveBeenCalledWith('edit_serfiyyat_document', expect.objectContaining({
      p_doc_id: 'd1', p_project_id: 'p1', p_doc_date: '2026-09-11',
    }))
  })

  it('delete sends only p_doc_id', async () => {
    rpc.mockResolvedValue({ data: {}, error: null })
    await deleteSerfiyyatDocument('d1')
    expect(rpc).toHaveBeenCalledWith('delete_serfiyyat_document', { p_doc_id: 'd1' })
  })
})

describe('the three RPC wrappers — result normalisation and the guard (M13-97)', () => {
  it.each([
    ['create', () => createSerfiyyatDocument({ projectId: 'p', docDate: 'd', lines: [] })],
    ['edit', () => editSerfiyyatDocument('d1', { projectId: 'p', docDate: 'd', lines: [] })],
    ['delete', () => deleteSerfiyyatDocument('d1')],
  ])('%s returns {ok:true,data} on success', async (_n, call) => {
    rpc.mockResolvedValue({ data: { doc_num: 'SM-1' }, error: null })
    expect(await call()).toEqual({ ok: true, data: { doc_num: 'SM-1' }, error: null })
  })

  it.each([
    ['create', () => createSerfiyyatDocument({ projectId: 'p', docDate: 'd', lines: [] })],
    ['edit', () => editSerfiyyatDocument('d1', { projectId: 'p', docDate: 'd', lines: [] })],
    ['delete', () => deleteSerfiyyatDocument('d1')],
  ])('%s returns the SERVER message on a returned error, and never throws', async (_n, call) => {
    rpc.mockResolvedValue({ data: null, error: { message: 'İcazə yoxdur: ...' } })
    expect(await call()).toEqual({ ok: false, data: null, error: 'İcazə yoxdur: ...' })
  })

  it.each([
    ['create', () => createSerfiyyatDocument({ projectId: 'p', docDate: 'd', lines: [] })],
    ['edit', () => editSerfiyyatDocument('d1', { projectId: 'p', docDate: 'd', lines: [] })],
    ['delete', () => deleteSerfiyyatDocument('d1')],
  ])('%s normalises a REJECTED promise instead of throwing', async (_n, call) => {
    rpc.mockRejectedValue(new Error('network'))
    expect(await call()).toEqual({ ok: false, data: null, error: 'network' })
  })

  /* M13-97 — blockedReason() runs FIRST: the RPC is never dispatched. */
  it.each([
    ['sm.create', () => createSerfiyyatDocument({ projectId: 'p', docDate: 'd', lines: [] })],
    ['sm.edit', () => editSerfiyyatDocument('d1', { projectId: 'p', docDate: 'd', lines: [] })],
    ['sm.delete', () => deleteSerfiyyatDocument('d1')],
  ])('%s is checked by the guard BEFORE any RPC is dispatched', async (action, call) => {
    blockedReason.mockReturnValue('bloklanıb')
    const res = await call()
    expect(blockedReason).toHaveBeenCalledWith(action)
    expect(res).toEqual({ ok: false, data: null, error: 'bloklanıb' })
    expect(rpc).not.toHaveBeenCalled()
  })
})
