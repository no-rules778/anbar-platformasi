import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchItems = vi.fn()
const fetchItemMovements = vi.fn()
const fetchWarehouses = vi.fn()
const readPartners = vi.fn()
const fetchStockConditions = vi.fn()
const fetchReferenceValues = vi.fn()
const fetchSplitSupported = vi.fn()
const fetchLayerCapability = vi.fn()
const fetchTransferDestinations = vi.fn()

vi.mock('../api/items.api', () => ({ fetchItems: () => fetchItems() }))
vi.mock('../api/itemMovements.api', () => ({ fetchItemMovements: () => fetchItemMovements() }))
vi.mock('../api/warehouses.api', () => ({ fetchWarehouses: () => fetchWarehouses() }))
vi.mock('../api/partners.api', () => ({ readPartners: () => readPartners() }))
vi.mock('../api/stockConditions.api', () => ({
  fetchStockConditions: () => fetchStockConditions(),
  toCondMap: (rows: { w: string; c: string; unfit: number; repair: number; onsite: number; icare: number }[]) =>
    new Map(rows.map((r) => [`${r.w}|${r.c}`, { unfit: r.unfit, repair: r.repair, onsite: r.onsite, icare: r.icare }])),
}))
vi.mock('../api/referenceValues.api', () => ({ fetchReferenceValues: () => fetchReferenceValues() }))
vi.mock('../api/movementSplit.api', () => ({ fetchSplitSupported: () => fetchSplitSupported() }))
vi.mock('../api/stockLayers.api', () => ({
  fetchLayerCapability: () => fetchLayerCapability(),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))
vi.mock('../api/transferDestinations.api', () => ({
  fetchTransferDestinations: (fallback: string[]) => fetchTransferDestinations(fallback),
}))

import { useOperationStore, selectCanPost, selectPostBlockReason, selectTransferSources, selectTransferDests } from './operation.store'
import type { Me } from '../lib/roles'

const ADMIN: Me = { id: 'u1', sbId: 'u1', email: 'a@a.com', name: 'A', role: 'admin', wh: '' }
const ANBARDAR_ASTARA: Me = { id: 'u2', sbId: 'u2', email: 'b@a.com', name: 'B', role: 'anbardar', wh: 'Astara' }

function okCore() {
  fetchItems.mockResolvedValue({ rows: [{ code: 'C1', name: 'Nasos', unit: 'ədəd', price: 10, category: null }], ok: true, error: null })
  fetchItemMovements.mockResolvedValue({
    rows: [{ id: 'm1', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01', in_qty: 10, out_qty: 0, price: 10, partner: 'P', type: 'Satınalma', invoice_num: null, note: null, doc_num: 'D1', created_at: '2026-01-01T00:00:00Z' }],
    ok: true, error: null,
  })
  fetchWarehouses.mockResolvedValue([
    { name: 'Ələt', type: 'anbar', active: true },
    { name: 'Astara', type: 'anbar', active: true },
    { name: 'Harmony', type: 'anbar', active: true },
    { name: 'Ofis', type: 'anbar', active: true },
    { name: 'Sahə 1', type: 'project', active: true },
  ])
  readPartners.mockResolvedValue({ rows: [{ id: 'p1', name: 'Partner A', active: true }], ok: true, error: null })
  fetchStockConditions.mockResolvedValue({ rows: [], ok: true, error: null })
  fetchReferenceValues.mockResolvedValue({ values: { channel: [{ name: 'Nağd alış', active: true }], unit: [], category: [], serfiyyat_channel: [] }, ready: true })
  fetchSplitSupported.mockResolvedValue(true)
  fetchLayerCapability.mockResolvedValue({ ready: true, active: false, version: 1 })
  fetchTransferDestinations.mockImplementation((fallback: string[]) => Promise.resolve({ names: fallback, ok: true, error: null }))
}

function resetStore() {
  useOperationStore.setState(useOperationStore.getInitialState(), true)
}

beforeEach(() => {
  vi.clearAllMocks()
  resetStore()
  okCore()
})

describe('load — atomic core (M7-S1)', () => {
  it('commits a full snapshot when all five core reads succeed', async () => {
    const res = await useOperationStore.getState().load(ADMIN)
    expect(res).toEqual({ ok: true, error: null })
    const s = useOperationStore.getState()
    expect(s.readiness.loaded).toBe(true)
    expect(s.readiness.coreError).toBeNull()
    expect(s.core.itemBy.get('C1')?.name).toBe('Nasos')
    expect(s.core.warehouses).toEqual(expect.arrayContaining(['Ələt', 'Astara', 'Harmony', 'Ofis']))
  })

  it.each([
    ['items', () => fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'items down' })],
    ['movements', () => fetchItemMovements.mockResolvedValue({ rows: [], ok: false, error: 'movements down' })],
    ['warehouses', () => fetchWarehouses.mockRejectedValue(new Error('warehouses down'))],
    ['partners', () => readPartners.mockResolvedValue({ rows: [], ok: false, error: 'partners down' })],
    ['stock_conditions', () => fetchStockConditions.mockResolvedValue({ rows: [], ok: false, error: 'conditions down' })],
  ])('a %s core-read failure yields loaded:false and blocks canPost', async (_name, breakIt) => {
    breakIt()
    const res = await useOperationStore.getState().load(ADMIN)
    expect(res.ok).toBe(false)
    const s = useOperationStore.getState()
    expect(s.readiness.loaded).toBe(false)
    expect(selectCanPost(s, ADMIN)).toBe(false)
    expect(selectPostBlockReason(s, ADMIN)).toBe('not-loaded')
  })

  it('a PARTIAL movements page failure is treated as fatal, not a smaller dataset', async () => {
    fetchItemMovements.mockResolvedValue({ rows: [{ id: 'm1', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01', in_qty: 5, out_qty: 0, price: 10, partner: 'P', type: 'Satınalma', invoice_num: null, note: null, doc_num: 'D1', created_at: '2026-01-01T00:00:00Z' }], ok: false, error: 'truncated', partial: true })
    const res = await useOperationStore.getState().load(ADMIN)
    expect(res.ok).toBe(false)
    expect(useOperationStore.getState().readiness.loaded).toBe(false)
    // the truncated rows must never be committed into core
    expect(useOperationStore.getState().core.itemBy.size).toBe(0)
  })

  it('stock_conditions failing refuses rather than posting all-normal', async () => {
    fetchStockConditions.mockResolvedValue({ rows: [], ok: false, error: 'conditions unreachable' })
    await useOperationStore.getState().load(ADMIN)
    const s = useOperationStore.getState()
    expect(s.readiness.coreError).toBe('conditions unreachable')
    expect(selectCanPost(s, ADMIN)).toBe(false)
  })
})

describe('refresh — M7-S6, retains the previous snapshot', () => {
  it('keeps the previous core and sets the error in the footer on a failed refresh', async () => {
    await useOperationStore.getState().load(ADMIN)
    expect(useOperationStore.getState().core.itemBy.size).toBe(1)

    fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'network blip' })
    const res = await useOperationStore.getState().refresh(ADMIN)

    expect(res.error).toBe('network blip')
    const s = useOperationStore.getState()
    expect(s.readiness.loaded).toBe(true) // retained
    expect(s.readiness.coreError).toBe('network blip')
    expect(s.core.itemBy.size).toBe(1) // NOT blanked
  })

  it('draft lines survive a failed refresh', async () => {
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-02', t: 'Satınalma', q: 3 })
    fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'x' })
    await useOperationStore.getState().refresh(ADMIN)
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('draft lines survive a SUCCESSFUL refresh too (M7-119)', async () => {
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-02', t: 'Satınalma', q: 3 })
    await useOperationStore.getState().refresh(ADMIN)
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })
})

describe('optional probes degrade without blocking (M7-S4)', () => {
  it('a failed reference_values probe still loads the core and allows posting', async () => {
    fetchReferenceValues.mockResolvedValue({ values: { channel: [], unit: [], category: [], serfiyyat_channel: [] }, ready: false })
    await useOperationStore.getState().load(ADMIN)
    const s = useOperationStore.getState()
    expect(s.readiness.loaded).toBe(true)
    expect(s.refsReady).toBe(false)
  })

  it('a failed split probe leaves splitReady false but does not block a document with no split', async () => {
    fetchSplitSupported.mockResolvedValue(false)
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().addLineRaw({ kind: 'out', w: 'Ələt', c: 'C1', d: '2026-01-02', t: 'Silinmə', q: 1 })
    const s = useOperationStore.getState()
    expect(selectCanPost(s, ADMIN)).toBe(true)
  })

  it('a split-carrying line is refused when the probe failed', async () => {
    fetchSplitSupported.mockResolvedValue(false)
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().addLineRaw({ kind: 'out', w: 'Ələt', c: 'C1', d: '2026-01-02', t: 'Silinmə', q: 1, cond: { unfit: 1, normal: 0, repair: 0, onsite: 0, icare: 0 } })
    const s = useOperationStore.getState()
    expect(selectPostBlockReason(s, ADMIN)).toBe('split-unsupported')
  })

  it('a failed layer-capability probe leaves the pre-layer flow working', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: false, active: false, version: 0 })
    await useOperationStore.getState().load(ADMIN)
    expect(useOperationStore.getState().readiness.loaded).toBe(true)
    expect(useOperationStore.getState().layerActive).toBe(false)
  })

  it('a failed transfer-destinations probe falls back to the warehouse list', async () => {
    fetchTransferDestinations.mockResolvedValue({ names: ['Ələt', 'Astara', 'Harmony', 'Ofis'], ok: false, error: 'x' })
    await useOperationStore.getState().load(ADMIN)
    expect(useOperationStore.getState().transferDests).toEqual(['Ələt', 'Astara', 'Harmony', 'Ofis'])
    expect(useOperationStore.getState().transferDestsReady).toBe(false)
  })
})

describe('canPost / postBlockReason — single gate (M7-S5)', () => {
  it('blocks with no-permission for a rehber', async () => {
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 1 })
    const rehber: Me = { ...ADMIN, role: 'rehber' }
    expect(selectPostBlockReason(useOperationStore.getState(), rehber)).toBe('no-permission')
  })

  it('blocks with no-lines when the document is empty', async () => {
    await useOperationStore.getState().load(ADMIN)
    expect(selectPostBlockReason(useOperationStore.getState(), ADMIN)).toBe('no-lines')
  })

  it('blocks with in-flight while a post is submitting', async () => {
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 1 })
    useOperationStore.getState().setInFlight(true)
    expect(selectPostBlockReason(useOperationStore.getState(), ADMIN)).toBe('in-flight')
  })
})

describe('D-H1 — anbardar transfer narrowing', () => {
  it('narrows an anbardar to their own warehouse as transfer source', async () => {
    await useOperationStore.getState().load(ANBARDAR_ASTARA)
    const s = useOperationStore.getState()
    expect(selectTransferSources(s, ANBARDAR_ASTARA)).toEqual(['Astara'])
  })

  it('excludes «Ofis» from an anbardar destination list', async () => {
    await useOperationStore.getState().load(ANBARDAR_ASTARA)
    const s = useOperationStore.getState()
    expect(selectTransferDests(s, ANBARDAR_ASTARA)).not.toContain('Ofis')
  })

  it('leaves admin unaffected', async () => {
    await useOperationStore.getState().load(ADMIN)
    const s = useOperationStore.getState()
    expect(selectTransferSources(s, ADMIN)).toEqual(expect.arrayContaining(['Ələt', 'Astara', 'Harmony', 'Ofis']))
    expect(selectTransferDests(s, ADMIN)).toContain('Ofis')
  })
})

describe('request key — invalidation (M7-106)', () => {
  it('a fresh key is generated lazily and reused until invalidated', () => {
    const k1 = useOperationStore.getState().ensureRequestKey()
    const k2 = useOperationStore.getState().ensureRequestKey()
    expect(k1).toBe(k2)
    expect(k1).toBeTruthy()
  })

  it('tab switch invalidates the key', () => {
    useOperationStore.getState().ensureRequestKey()
    useOperationStore.getState().setKind('out')
    expect(useOperationStore.getState().requestKey).toBe('')
  })

  it('a header field edit invalidates the key', () => {
    useOperationStore.getState().ensureRequestKey()
    useOperationStore.getState().setHeaderField({ note: 'x' })
    expect(useOperationStore.getState().requestKey).toBe('')
  })

  it('adding a line invalidates the key', () => {
    useOperationStore.getState().ensureRequestKey()
    useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 1 })
    expect(useOperationStore.getState().requestKey).toBe('')
  })

  it('removing a line invalidates the key', () => {
    useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 1 })
    useOperationStore.getState().ensureRequestKey()
    useOperationStore.getState().removeLine(0)
    expect(useOperationStore.getState().requestKey).toBe('')
  })

  it('saving an edited line invalidates the key', () => {
    useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 1 })
    useOperationStore.getState().ensureRequestKey()
    useOperationStore.getState().openEditLine(0)
    useOperationStore.getState().saveEditLine({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 2 })
    expect(useOperationStore.getState().requestKey).toBe('')
  })
})

describe('tab switch header capture (M7-05)', () => {
  it('does NOT restore the other tab header after switching and back', () => {
    useOperationStore.getState().setHeaderField({ w: 'Ələt' })
    useOperationStore.getState().setKind('out')
    useOperationStore.getState().setHeaderField({ w: 'Astara' })
    useOperationStore.getState().setKind('in')
    expect(useOperationStore.getState().header.w).toBe('Ələt')
    useOperationStore.getState().setKind('out')
    expect(useOperationStore.getState().header.w).toBe('Astara')
  })
})

describe('in-flight lock', () => {
  it('blocks post while a submission is in flight', async () => {
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 1 })
    expect(selectCanPost(useOperationStore.getState(), ADMIN)).toBe(true)
    useOperationStore.getState().setInFlight(true)
    expect(selectCanPost(useOperationStore.getState(), ADMIN)).toBe(false)
    useOperationStore.getState().setInFlight(false)
    expect(selectCanPost(useOperationStore.getState(), ADMIN)).toBe(true)
  })
})

describe('draft persistence — per-user, TTL, permission re-filter (M7-51…M7-54)', () => {
  const storage = new Map<string, string>()
  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v) },
      removeItem: (k: string) => { storage.delete(k) },
    })
  })

  it('saves a draft under a per-user key', async () => {
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 1 })
    useOperationStore.getState().saveDraftNow(ADMIN)
    expect(storage.has('anbar_op_draft_u1')).toBe(true)
    expect(storage.has('anbar_op_draft_u2')).toBe(false)
  })

  it('restores a saved draft on boot, permission-filtered to the anbardar warehouse', async () => {
    await useOperationStore.getState().load(ANBARDAR_ASTARA)
    useOperationStore.getState().addLineRaw({ kind: 'out', w: 'Astara', c: 'C1', d: '2026-01-01', t: 'Silinmə', q: 1 })
    useOperationStore.getState().addLineRaw({ kind: 'out', w: 'Ofis', c: 'C1', d: '2026-01-01', t: 'Silinmə', q: 1 })
    useOperationStore.getState().saveDraftNow(ANBARDAR_ASTARA)
    useOperationStore.getState().clearLines()

    const res = useOperationStore.getState().restoreDraftOnBoot(ANBARDAR_ASTARA)
    expect(res.restored).toBe(true)
    expect(res.dropped).toBe(1) // the Ofis line is dropped — not in allowed ∪ transferSources
    expect(useOperationStore.getState().lines).toHaveLength(1)
    expect(useOperationStore.getState().lines[0]?.w).toBe('Astara')
  })

  it('does NOT save a draft in edit mode (M7-52)', async () => {
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().enterEditMode(
      { docNum: 'D1', restore: new Map(), type: 'Silinmə', direction: 'out' },
      [{ kind: 'out', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Silinmə', q: 1 }],
      { w: 'Ələt' },
    )
    useOperationStore.getState().saveDraftNow(ADMIN)
    expect(storage.has('anbar_op_draft_u1')).toBe(false)
  })

  it('clears any stored draft when entering edit mode and saving (edit mode never drafts)', async () => {
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 1 })
    useOperationStore.getState().saveDraftNow(ADMIN)
    expect(storage.has('anbar_op_draft_u1')).toBe(true)

    useOperationStore.getState().enterEditMode(
      { docNum: 'D1', restore: new Map(), type: 'Silinmə', direction: 'out' },
      [{ kind: 'out', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Silinmə', q: 1 }],
      { w: 'Ələt' },
    )
    useOperationStore.getState().saveDraftNow(ADMIN)
    expect(storage.has('anbar_op_draft_u1')).toBe(false)
  })
})

describe('edit mode (M7-109, M7-111)', () => {
  it('enterEditMode switches tab, loads lines and header, and clears the draft stamp', async () => {
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().enterEditMode(
      { docNum: 'D1', restore: new Map([['Ələt|C1', 3]]), type: 'Silinmə', direction: 'out' },
      [{ kind: 'out', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Silinmə', q: 3 }],
      { w: 'Ələt' },
    )
    const s = useOperationStore.getState()
    expect(s.kind).toBe('out')
    expect(s.editDoc?.docNum).toBe('D1')
    expect(s.lines).toHaveLength(1)
    expect(s.restoredAt).toBeNull()
  })

  it('exitEditMode clears edit state, lines and request key', async () => {
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().enterEditMode(
      { docNum: 'D1', restore: new Map(), type: 'Silinmə', direction: 'out' },
      [{ kind: 'out', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Silinmə', q: 1 }],
      { w: 'Ələt' },
    )
    useOperationStore.getState().exitEditMode()
    const s = useOperationStore.getState()
    expect(s.editDoc).toBeNull()
    expect(s.lines).toHaveLength(0)
  })
})

describe('prefill (M5-55 / M7-115)', () => {
  it('sets the pending pick independently of any mounted component', () => {
    useOperationStore.getState().prefill('C1')
    expect(useOperationStore.getState().pick).toBe('C1')
  })
})

/* Regression for audit A04 — the reference-directory fallback derives its
   observed-channel union from `movements.channel` (legacy `m.ch`), NOT from
   the movement's operation TYPE. A straight `m.type` read would surface
   values like "Satınalma" and silently omit any real historical channel that
   is not itself also a type name. */
describe('observedChannels fallback (audit A04)', () => {
  it('derives observed channels from the channel field, not the movement type', async () => {
    fetchItemMovements.mockResolvedValue({
      rows: [
        { id: 'm1', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01', in_qty: 10, out_qty: 0, price: 10, partner: 'P', type: 'Satınalma', invoice_num: null, note: null, doc_num: 'D1', created_at: null, channel: 'Nağd alış' },
        { id: 'm2', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-02', in_qty: 5, out_qty: 0, price: 10, partner: 'P', type: 'Satınalma', invoice_num: null, note: null, doc_num: 'D2', created_at: null, channel: 'Köçürmə' },
      ],
      ok: true, error: null,
    })
    await useOperationStore.getState().load(ADMIN)
    const observed = useOperationStore.getState().observedChannels
    expect(observed).toEqual(expect.arrayContaining(['Nağd alış', 'Köçürmə']))
    expect(observed).not.toContain('Satınalma')
  })

  it('excludes channels from cancelled movements', async () => {
    fetchItemMovements.mockResolvedValue({
      rows: [
        { id: 'm1', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01', in_qty: 10, out_qty: 0, price: 10, partner: 'P', type: 'Satınalma', invoice_num: null, note: 'Ləğv: D9', doc_num: 'D1', created_at: null, channel: 'Nağd alış' },
        { id: 'm9', item_code: 'C1', warehouse: 'Ələt', date: '2025-12-01', in_qty: 10, out_qty: 0, price: 10, partner: 'P', type: 'Satınalma', invoice_num: null, note: null, doc_num: 'D9', created_at: null, channel: 'Nağd alış' },
        { id: 'm2', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-02', in_qty: 5, out_qty: 0, price: 10, partner: 'P', type: 'Satınalma', invoice_num: null, note: null, doc_num: 'D2', created_at: null, channel: 'Köçürmə' },
      ],
      ok: true, error: null,
    })
    await useOperationStore.getState().load(ADMIN)
    expect(useOperationStore.getState().observedChannels).toEqual(['Köçürmə'])
  })
})

/* Regression for audit A08 — `restoreDraftOnBoot()` must refuse to run against
   a missing or failed core snapshot. Without a healthy snapshot the permission
   union is empty, `restoreDraft()` returns `no-permission`, and the removal
   branch would delete the user's stored draft over a transient read failure. */
describe('operation.store — restoreDraftOnBoot refuses an unhealthy snapshot (audit A08)', () => {
  const storage = new Map<string, string>()
  const KEY = 'anbar_op_draft_u1'
  const ME_ADMIN: Me = { id: 'u1', sbId: 'u1', email: 'a@a.com', name: 'A', role: 'admin', wh: '' }

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v) },
      removeItem: (k: string) => { storage.delete(k) },
    })
    useOperationStore.setState(useOperationStore.getInitialState(), true)
    storage.set(KEY, JSON.stringify({
      v: 1,
      ts: Date.now(),
      kind: 'in',
      lines: [{ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 3 }],
      hdr: null,
      requestKey: '',
    }))
  })

  it('skips and preserves the draft when no snapshot has loaded at all', () => {
    const res = useOperationStore.getState().restoreDraftOnBoot(ME_ADMIN)
    expect(res).toEqual({ restored: false, dropped: 0, ts: null, skipped: true })
    expect(storage.has(KEY)).toBe(true)
    expect(useOperationStore.getState().lines).toHaveLength(0)
  })

  it('skips and preserves the draft when the core read failed', () => {
    useOperationStore.setState({
      readiness: {
        loaded: false, coreError: 'items down', failedCore: 'items',
        splitReady: false, layerActive: false, refsReady: false, transferDestsReady: false,
      },
    })
    const res = useOperationStore.getState().restoreDraftOnBoot(ME_ADMIN)
    expect(res.skipped).toBe(true)
    expect(storage.has(KEY)).toBe(true)
  })

  it('restores normally once a healthy snapshot exists', () => {
    useOperationStore.setState({
      readiness: {
        loaded: true, coreError: null, failedCore: null,
        splitReady: true, layerActive: false, refsReady: true, transferDestsReady: true,
      },
      core: { ...useOperationStore.getState().core, warehouses: ['Ələt'] },
    })
    const res = useOperationStore.getState().restoreDraftOnBoot(ME_ADMIN)
    expect(res.restored).toBe(true)
    expect(res.skipped).toBe(false)
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })
})
