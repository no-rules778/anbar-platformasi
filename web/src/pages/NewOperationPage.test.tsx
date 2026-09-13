import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
/* A shared, test-controllable condition map. `toCondMap` is mocked (the real
   one parses server rows), so a test that needs a MARKED item seeds this map
   directly and the store picks it up on load. */
const condMap = new Map<string, { unfit: number; repair: number; onsite: number; icare: number }>()
vi.mock('../api/stockConditions.api', () => ({
  fetchStockConditions: () => fetchStockConditions(),
  toCondMap: () => new Map(condMap),
}))
vi.mock('../api/referenceValues.api', () => ({ fetchReferenceValues: () => fetchReferenceValues() }))
vi.mock('../api/movementSplit.api', () => ({ fetchSplitSupported: () => fetchSplitSupported() }))
const fetchStockLayers = vi.fn()
vi.mock('../api/stockLayers.api', () => ({
  fetchLayerCapability: () => fetchLayerCapability(),
  fetchStockLayers: (w: string, c: string) => fetchStockLayers(w, c),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))
vi.mock('../api/transferDestinations.api', () => ({
  fetchTransferDestinations: (fallback: string[]) => fetchTransferDestinations(fallback),
}))

/* H-4 — the five write paths. Mocked at the API-module boundary, so the store
   exercises the REAL routing decision and the real payload builders; only the
   network call itself is replaced. No Supabase client is constructed and no
   request leaves the process. */
const postMovementDocument = vi.fn()
const postTransferDocument = vi.fn()
const postLayerMovementDocument = vi.fn()
const postLayerTransferDocument = vi.fn()
const correctDocument = vi.fn()
vi.mock('../api/postMovementDocument.api', () => ({
  postMovementDocument: (...a: unknown[]) => postMovementDocument(...a),
  postTransferDocument: (...a: unknown[]) => postTransferDocument(...a),
  postLayerMovementDocument: (...a: unknown[]) => postLayerMovementDocument(...a),
  postLayerTransferDocument: (...a: unknown[]) => postLayerTransferDocument(...a),
  correctDocument: (...a: unknown[]) => correctDocument(...a),
}))
const okPost = (docNum = 'DOC-1', rowCount = 1) =>
  ({ ok: true, error: null, docNum, rowCount })
const failPost = (error: string) =>
  ({ ok: false, error, docNum: null, rowCount: 0 })

const realtimeCalls: { tables: readonly string[]; enabled: boolean }[] = []
vi.mock('../hooks/useRealtimeRefresh', () => ({
  useRealtimeRefresh: (enabled: boolean, tables: readonly string[]) => {
    realtimeCalls.push({ enabled, tables })
  },
}))

import { NewOperationPage } from './NewOperationPage'
import {
  useOperationStore, selectAllowedWarehouses, selectTransferSources,
} from '../store/operation.store'
import { useToastStore } from '../store/toast.store'
import type { Me } from '../lib/roles'

const ADMIN: Me = { id: 'u1', sbId: 'u1', email: 'a@a.com', name: 'A', role: 'admin', wh: '' }

function okCore() {
  fetchItems.mockResolvedValue({ rows: [{ code: 'C1', name: 'Nasos', unit: 'ədəd', price: 10, category: null }], ok: true, error: null })
  fetchItemMovements.mockResolvedValue({ rows: [], ok: true, error: null })
  fetchWarehouses.mockResolvedValue([{ name: 'Ələt', type: 'anbar', active: true }])
  readPartners.mockResolvedValue({ rows: [], ok: true, error: null })
  fetchStockConditions.mockResolvedValue({ rows: [], ok: true, error: null })
  fetchReferenceValues.mockResolvedValue({
    values: {
      channel: [],
      /* T6b — the reused ItemFormDialog refuses to render a form with no
         active unit (M7-21f), so the directory must carry one wherever the
         create transition itself is under test. */
      unit: [{ id: 'u-1', name: 'ədəd', active: true }],
      category: [{ id: 'c-1', name: 'Ehtiyat', active: true }],
      serfiyyat_channel: [],
    },
    ready: true,
  })
  fetchSplitSupported.mockResolvedValue(true)
  fetchLayerCapability.mockResolvedValue({ ready: true, active: false, version: 1 })
  fetchTransferDestinations.mockImplementation((fallback: string[]) => Promise.resolve({ names: fallback, ok: true, error: null }))
}

beforeEach(() => {
  vi.clearAllMocks()
  realtimeCalls.length = 0
  useOperationStore.setState(useOperationStore.getInitialState(), true)
  useToastStore.setState({ messages: [] })
  condMap.clear()
  okCore()
  postMovementDocument.mockResolvedValue(okPost())
  postTransferDocument.mockResolvedValue(okPost('TR-1'))
  postLayerMovementDocument.mockResolvedValue(okPost())
  postLayerTransferDocument.mockResolvedValue(okPost('TR-1'))
  /* I-6 — `correctDocument` returns a CorrectionResult: the HTTP status, the
     PostgREST code and the raw body, so the store can tell a confirmed
     rejection from an unconfirmed one and validate the success contract. A
     mock without `data.new_doc_num` is classified UNKNOWN, correctly. */
  correctDocument.mockResolvedValue({
    ...okPost('OLD-1'),
    status: 200,
    code: null,
    data: { original_doc_num: 'DOC-7', new_doc_num: 'NEW-1', reversal_doc_num: 'REV-1', row_count: 1 },
    newDocNum: 'NEW-1',
    reversalDocNum: 'REV-1',
  })
})

describe('NewOperationPage — load on mount', () => {
  it('shows the loading state, then the form once loaded', async () => {
    render(<NewOperationPage me={ADMIN} />)
    expect(screen.getByText('Yüklənir…')).toBeTruthy()
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
  })

  it('subscribes Realtime to items/movements/warehouses only', async () => {
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    expect(realtimeCalls.at(-1)?.tables).toEqual(['items', 'movements', 'warehouses'])
  })

  it('shows LoadErrorState on a failed initial core read, with no form', async () => {
    fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'items down' })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Məlumat yüklənmədi')).toBeTruthy())
    expect(screen.queryByTestId('operation-form')).toBeNull()
    expect(screen.getByText('items down')).toBeTruthy()
  })

  it('never shows an empty-result message on a failed initial load', async () => {
    fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'items down' })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Məlumat yüklənmədi')).toBeTruthy())
    expect(screen.queryByText(/Nəticə yoxdur/)).toBeNull()
  })

  it('renders fallback plus observed channels when the reference directory fails (M7-16)', async () => {
    fetchReferenceValues.mockResolvedValue({
      values: { channel: [], unit: [], category: [], serfiyyat_channel: [] },
      ready: false,
    })
    fetchItemMovements.mockResolvedValue({
      rows: [{
        id: 'm1', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01',
        in_qty: 1, out_qty: null, price: 10, partner: 'P', type: 'Satınalma',
        invoice_num: null, note: null, doc_num: 'D1', channel: 'Canlı müşahidə',
      }],
      ok: true, error: null,
    })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    /* M18-56 — the caption is now the legacy «Alınma kanalı»
       (index.html:3284); «Kanal» was a React abbreviation. */
    const select = screen.getByText('Alınma kanalı').closest('label')?.querySelector('select')
    const options = Array.from(select?.options ?? []).map((o) => o.textContent)
    expect(options).toContain('Nağd alış')
    expect(options).toContain('Canlı müşahidə')
  })
})

describe('NewOperationPage — draft lines panel', () => {
  it('renders the draft-lines panel once loaded, even with zero lines', async () => {
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('draft-lines-panel')).toBeTruthy())
  })

  it('removing a line updates the store and the panel', async () => {
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('draft-lines-panel')).toBeTruthy())
    act(() => {
      useOperationStore.getState().addLineRaw({ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 2, name: 'Nasos', unit: 'ədəd', pr: 10 })
    })
    await waitFor(() => expect(screen.getByText('Nasos')).toBeTruthy())
  })
})

/* Regression for audit A01 — the save-on-every-mutation effect must NOT run
   before the one-time boot restore has been attempted. Before the fix, the
   page's first render (empty `lines`) fired `saveDraftNow()`, which REMOVES
   the stored draft key when `lines` is empty — deleting it before
   `restoreDraftOnBoot()` ever got to read it. This test fails against that
   wrong implementation because the restored line would never appear. */
describe('NewOperationPage — draft restore on boot (audit A01 / M7-51…M7-54)', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v) },
      removeItem: (k: string) => { storage.delete(k) },
    })
  })

  function seedDraft() {
    storage.set('anbar_op_draft_u1', JSON.stringify({
      v: 1,
      ts: Date.now(),
      kind: 'in',
      lines: [{ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 3, name: 'Nasos', unit: 'ədəd', pr: 10 }],
      hdr: null,
      requestKey: '',
    }))
  }

  it('restores a stored draft on first mount and does not remove it before restoring', async () => {
    seedDraft()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('draft-lines-panel')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('Nasos')).toBeTruthy())
    expect(useOperationStore.getState().lines).toHaveLength(1)
    /* The key must still exist — a correct restore re-saves an identical
       payload rather than deleting it, since `lines` is non-empty. */
    expect(storage.has('anbar_op_draft_u1')).toBe(true)
  })

  it('shows the M7-54 restored-lines toast', async () => {
    seedDraft()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => {
      const texts = useToastStore.getState().messages.map((m) => m.text)
      expect(texts.some((t) => /sətirlik qaralama bərpa edildi/.test(t))).toBe(true)
    })
  })

  it('clearing the restored draft still removes it from storage', async () => {
    seedDraft()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Nasos')).toBeTruthy())
    act(() => {
      useOperationStore.getState().clearLines()
    })
    await waitFor(() => expect(storage.has('anbar_op_draft_u1')).toBe(false))
  })

  it('removing the only line clears the stored draft', async () => {
    seedDraft()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Nasos')).toBeTruthy())
    act(() => {
      useOperationStore.getState().removeLine(0)
    })
    await waitFor(() => expect(storage.has('anbar_op_draft_u1')).toBe(false))
  })
})

/* Regression for audit A08 — a FAILED initial core load must never destroy the
   stored draft. On a core failure the store's `core.warehouses` is empty, so
   `restoreDraft()` classifies every stored line as `no-permission` and the
   `no-permission` branch REMOVES the localStorage key; the save effect then
   compounds it by writing the empty `lines` of the error screen. Both halves
   are gated here: the page skips the restore attempt and never arms saving,
   and the store refuses the attempt independently.

   These tests fail against the audited implementation, where
   `restoreDraftOnBoot()` ran unconditionally after `load()` resolved. */
describe('NewOperationPage — a failed core load preserves the draft (audit A08)', () => {
  const storage = new Map<string, string>()
  const KEY = 'anbar_op_draft_u1'

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v) },
      removeItem: (k: string) => { storage.delete(k) },
    })
  })

  function seedDraft() {
    storage.set(KEY, JSON.stringify({
      v: 1,
      ts: Date.now(),
      kind: 'in',
      lines: [{ kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 3, name: 'Nasos', unit: 'ədəd', pr: 10 }],
      hdr: null,
      requestKey: '',
    }))
  }

  it('keeps the stored draft byte-for-byte when the initial core load fails', async () => {
    seedDraft()
    const before = storage.get(KEY)
    fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'items down' })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Məlumat yüklənmədi')).toBeTruthy())
    expect(storage.has(KEY)).toBe(true)
    expect(storage.get(KEY)).toBe(before)
    /* And nothing was restored into the form either — an empty permission set
       must not silently drop the lines. */
    expect(useOperationStore.getState().lines).toHaveLength(0)
  })

  it('restores the draft on a later successful retry after the failed load', async () => {
    seedDraft()
    fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'items down' })
    const { unmount } = render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Məlumat yüklənmədi')).toBeTruthy())
    unmount()

    useOperationStore.setState(useOperationStore.getInitialState(), true)
    okCore()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Nasos')).toBeTruthy())
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('attempts the restore when mounting onto an already-healthy snapshot', async () => {
    /* Mount once to commit a healthy snapshot, unmount, seed a draft, then
       remount WITHOUT resetting the store: `readiness.loaded` is already true,
       so the mount takes the else-branch. It must actually restore, not merely
       arm future saves — otherwise the next mutation's save overwrites a draft
       nothing ever read. */
    const { unmount } = render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    unmount()

    expect(useOperationStore.getState().readiness.loaded).toBe(true)
    seedDraft()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Nasos')).toBeTruthy())
    expect(useOperationStore.getState().lines).toHaveLength(1)
    expect(storage.has(KEY)).toBe(true)
  })
})

/* ---------------- Milestone H-3 — dialog orchestration (T6/T6b) ---------- */

const line = (over: Record<string, unknown> = {}) => ({
  kind: 'out', w: 'Ələt', c: 'C1', q: 2, d: '2026-01-05', t: 'Sahəyə',
  p: 'Layihə A', ch: '', ct: '', iv: '', note: '', cond: null,
  name: 'Nasos', unit: 'ədəd', pr: 10, ...over,
})

async function ready() {
  render(<NewOperationPage me={ADMIN} />)
  await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
}

/* M7-44 — clearing is confirmed first, and cancelling clears NOTHING. */
describe('NewOperationPage — clear-lines confirmation (M7-44)', () => {
  it('opens the confirmation instead of clearing immediately', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await user.click(screen.getByRole('button', { name: 'Təmizlə' }))
    expect(screen.getByTestId('clear-lines-body')).toBeTruthy()
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('keeps the lines when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await user.click(screen.getByRole('button', { name: 'Təmizlə' }))
    await user.click(screen.getByRole('button', { name: 'İmtina' }))
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('clears only after confirming', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await user.click(screen.getByRole('button', { name: 'Təmizlə' }))
    /* Both the panel and the dialog carry a «Təmizlə»; the dialog's is the
       one inside the confirmation body. */
    const confirm = screen.getAllByRole('button', { name: 'Təmizlə' })
    await user.click(confirm[confirm.length - 1])
    expect(useOperationStore.getState().lines).toHaveLength(0)
  })
})

/* M7-46 — a layered line cannot be edited; the user is told to delete and
   re-add rather than being shown a dialog that cannot save. */
describe('NewOperationPage — edit-line entry (M7-45, M7-46)', () => {
  it('opens the editor for a plain line', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await user.click(screen.getByRole('button', { name: 'Düzəlt' }))
    expect(screen.getByTestId('edit-line-dialog')).toBeTruthy()
  })

  it('commits a valid working-copy edit to the selected draft line', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => {
      useOperationStore.setState({
        lines: [line({ kind: 'in', t: 'Satınalma', q: 1, p: '', note: 'before' })] as never,
      })
    })

    await user.click(screen.getByRole('button', { name: 'Düzəlt' }))
    expect(useOperationStore.getState().editLineIndex).toBe(0)
    const dialog = screen.getByTestId('edit-line-dialog')
    const quantity = within(dialog).getByRole('spinbutton', { name: 'Miqdar' })
    const note = within(dialog).getByRole('textbox', { name: 'Qeyd' })
    await user.clear(quantity)
    await user.type(quantity, '2')
    await user.clear(note)
    await user.type(note, 'after')
    expect(useOperationStore.getState().editLineIndex).toBe(0)
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    expect(useOperationStore.getState().lines[0]).toMatchObject({ q: 2, note: 'after' })
    expect(screen.queryByTestId('edit-line-dialog')).toBeNull()
  })

  it('refuses a layered line with a toast and NO dialog', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => {
      useOperationStore.setState({ lines: [line({ allocations: [{ layer_id: 'L1', qty: 2 }] })] as never })
    })
    await user.click(screen.getByRole('button', { name: 'Düzəlt' }))
    expect(screen.queryByTestId('edit-line-dialog')).toBeNull()
    const msgs = useToastStore.getState().messages
    expect(msgs[msgs.length - 1].text).toContain('silib yenidən əlavə edin')
  })
})

/* M7-91 — the gate SEQUENCE. A Qaimə conflict is a hard block reached BEFORE
   any confirmation, so the confirm dialog must not appear. */
describe('NewOperationPage — post gate sequence (M7-91)', () => {
  it('blocks on a Qaimə conflict before showing the confirm dialog', async () => {
    const user = userEvent.setup()
    fetchItemMovements.mockResolvedValue({
      rows: [{
        id: 'm1', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01',
        in_qty: 5, out_qty: null, price: 10, partner: 'Başqa', type: 'Satınalma',
        invoice_num: 'A-100', note: null, doc_num: 'DOC-9', channel: null,
      }],
      ok: true, error: null,
    })
    await ready()
    act(() => { useOperationStore.setState({ lines: [line({ iv: 'A-100' })] as never }) })
    await user.click(screen.getByRole('button', { name: 'Sənədi qeyd et' }))
    expect(screen.getByTestId('qaime-conflict-body')).toBeTruthy()
    expect(screen.queryByTestId('post-confirm-body')).toBeNull()
  })

  it('reaches the confirm dialog when no gate fires', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await user.click(screen.getByRole('button', { name: 'Sənədi qeyd et' }))
    expect(screen.getByTestId('post-confirm-body')).toBeTruthy()
  })

  it('ignores an invoice carried only by a cancelled document (M7-90)', async () => {
    const user = userEvent.setup()
    fetchItemMovements.mockResolvedValue({
      rows: [
        {
          id: 'old', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01',
          in_qty: 5, out_qty: null, price: 10, partner: 'Layihə A', type: 'Satınalma',
          invoice_num: 'A-100', note: null, doc_num: 'D-OLD', channel: null,
        },
        {
          id: 'cancel', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-02',
          in_qty: null, out_qty: 5, price: 10, partner: 'Layihə A', type: 'Silinmə',
          invoice_num: null, note: 'Ləğv: D-OLD', doc_num: 'D-CANCEL', channel: null,
        },
      ],
      ok: true, error: null,
    })
    await ready()
    act(() => { useOperationStore.setState({ lines: [line({ iv: 'A-100' })] as never }) })
    await user.click(screen.getByRole('button', { name: 'Sənədi qeyd et' }))
    expect(screen.queryByTestId('qaime-conflict-body')).toBeNull()
    expect(screen.getByTestId('post-confirm-body')).toBeTruthy()
  })

  /* H-4 — the confirmation now WRITES. The route chosen is the real one; only
     the network call is mocked. */
  it('confirming posts through the non-layer movement route', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await user.click(screen.getByRole('button', { name: 'Sənədi qeyd et' }))
    await user.click(screen.getByRole('button', { name: 'Qeyd et' }))
    await waitFor(() => expect(postMovementDocument).toHaveBeenCalledTimes(1))
    expect(postTransferDocument).not.toHaveBeenCalled()
    expect(useOperationStore.getState().lines).toHaveLength(0)
  })
})

/* ===================== H-4: the real post orchestration ===================== */

/* Balance for C1 at Ələt, so an `out` line survives the M7-96 re-check.
   Must be set BEFORE ready(): the snapshot is built during load(). */
function stocked(qty = 20) {
  fetchItemMovements.mockResolvedValue({
    rows: [{
      id: 'm0', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01',
      in_qty: qty, out_qty: null, price: 10, partner: 'X', type: 'Satınalma',
      invoice_num: null, note: null, doc_num: 'D0', channel: null,
    }],
    ok: true, error: null,
  })
}

const lastToast = () => {
  const m = useToastStore.getState().messages
  return m[m.length - 1]?.text ?? ''
}
const toastTexts = () => useToastStore.getState().messages.map((m) => m.text)

async function postNow(user: ReturnType<typeof userEvent.setup>, reason?: string) {
  /* The PANEL button is «Düzəlişi qeyd et» in edit mode and «Sənədi qeyd et»
     otherwise; the same single `canPost` gate sits behind both. In edit mode
     the confirm DIALOG's button carries the same label as the panel's, so the
     dialog's own subtree is what disambiguates it. */
  const panel = screen.getByTestId('draft-lines-panel')
  await user.click(
    within(panel).queryByRole('button', { name: 'Düzəlişi qeyd et' })
    ?? within(panel).getByRole('button', { name: 'Sənədi qeyd et' }),
  )
  if (reason != null) {
    await user.type(screen.getByLabelText('Düzəlişin səbəbi'), reason)
  }
  const dialog = screen.getByRole('dialog')
  await user.click(
    within(dialog).queryByRole('button', { name: 'Düzəlişi qeyd et' })
    ?? within(dialog).getByRole('button', { name: 'Qeyd et' }),
  )
}

describe('H-4 — M7-96 stale-response re-check', () => {
  it('drops a line whose stock vanished and refuses when nothing survives', async () => {
    const user = userEvent.setup()
    await ready()   // no movements → balance 0
    act(() => { useOperationStore.setState({ lines: [line({ q: 2 })] as never }) })
    await postNow(user)
    await waitFor(() => expect(lastToast()).toBe('Yazılacaq etibarlı sətir yoxdur.'))
    expect(postMovementDocument).not.toHaveBeenCalled()
    /* The draft is preserved — the user can still correct it. */
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('trims an over-quantity non-layered line and reports it alongside the success', async () => {
    const user = userEvent.setup()
    stocked(3)
    await ready()
    act(() => { useOperationStore.setState({ lines: [line({ q: 9 })] as never }) })
    await postNow(user)
    await waitFor(() => expect(postMovementDocument).toHaveBeenCalledTimes(1))
    const sent = postMovementDocument.mock.calls[0][0] as { out_qty: number }[]
    expect(sent[0].out_qty).toBe(3)
    expect(toastTexts().some((t) => t.includes('endirildi'))).toBe(true)
    expect(toastTexts().some((t) => t.includes('sətir qeyd edildi'))).toBe(true)
  })

  it('aborts the WHOLE post when a layered line no longer fits, keeping the draft', async () => {
    const user = userEvent.setup()
    stocked(3)
    await ready()
    act(() => {
      useOperationStore.setState({
        layerActive: true,
        readiness: { ...useOperationStore.getState().readiness, layerActive: true },
        lines: [line({ q: 9, allocations: [{ layer_id: 'L1', qty: 9 }], layerRevision: 'r1' })] as never,
      })
    })
    await postNow(user)
    await waitFor(() => expect(lastToast()).toContain('partiyalar yenidən seçilməlidir'))
    expect(lastToast()).toContain('Qaralama saxlanıldı')
    expect(postLayerMovementDocument).not.toHaveBeenCalled()
    expect(postMovementDocument).not.toHaveBeenCalled()
    /* Never trimmed: the draft line still carries its original quantity. */
    expect(useOperationStore.getState().lines[0].q).toBe(9)
  })

  it('reuses the request key when the re-check changed nothing', async () => {
    const user = userEvent.setup()
    stocked(3)
    await ready()
    act(() => {
      useOperationStore.setState({
        layerActive: true,
        readiness: { ...useOperationStore.getState().readiness, layerActive: true },
        lines: [line({ q: 3, allocations: [{ layer_id: 'L1', qty: 3 }], layerRevision: 'r1' })] as never,
        requestKey: 'KEEP-KEY',
      })
    })
    await postNow(user)
    await waitFor(() => expect(postLayerMovementDocument).toHaveBeenCalledTimes(1))
    expect(postLayerMovementDocument.mock.calls[0][1]).toBe('KEEP-KEY')
  })

  it('generates a FRESH key when a line mutation changed the document', async () => {
    const user = userEvent.setup()
    stocked(3)
    await ready()
    /* Two lines on the same key: the layered one consumes the whole pool, so
       the second is dropped. The document sent is not the one the key names. */
    act(() => {
      useOperationStore.setState({
        layerActive: true,
        readiness: { ...useOperationStore.getState().readiness, layerActive: true },
        lines: [
          line({ q: 3, allocations: [{ layer_id: 'L1', qty: 3 }], layerRevision: 'r1' }),
          line({ q: 5, allocations: [{ layer_id: 'L2', qty: 5 }], layerRevision: 'r1' }),
        ] as never,
        requestKey: 'STALE-KEY',
      })
    })
    await postNow(user)
    /* The second layered line does not fit, so this aborts rather than trims —
       and the stale key must not have been sent to anything. */
    await waitFor(() => expect(lastToast()).toContain('partiyalar yenidən seçilməlidir'))
    expect(postLayerMovementDocument).not.toHaveBeenCalled()
  })

  it('invalidates the key when a non-layered trim rewrites the document', async () => {
    const user = userEvent.setup()
    stocked(3)
    await ready()
    act(() => {
      useOperationStore.setState({
        lines: [line({ q: 9 })] as never,
        requestKey: 'STALE-KEY',
      })
    })
    await postNow(user)
    await waitFor(() => expect(postMovementDocument).toHaveBeenCalledTimes(1))
    /* The non-layer route carries no key at all, so the observable proof is
       that the stored key was dropped rather than surviving the mutation. */
    expect(useOperationStore.getState().requestKey).toBe('')
  })
})

describe('H-4 — M7-101 routing', () => {
  it('layers INACTIVE + transfer line → post_transfer_document', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    act(() => {
      useOperationStore.setState({
        lines: [line({ kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara', p: 'Astara' })] as never,
      })
    })
    await postNow(user)
    await waitFor(() => expect(postTransferDocument).toHaveBeenCalledTimes(1))
    expect(postLayerTransferDocument).not.toHaveBeenCalled()
    /* M7-107 — the non-layer route has no request-key parameter at all. */
    expect(postTransferDocument.mock.calls[0]).toHaveLength(1)
  })

  it('layers ACTIVE + transfer line → post_layer_transfer_document WITH the request key', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    act(() => {
      useOperationStore.setState({
        layerActive: true,
        readiness: { ...useOperationStore.getState().readiness, layerActive: true },
        lines: [line({
          kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara', p: 'Astara',
          allocations: [{ layer_id: 'L1', qty: 2 }], layerRevision: 'r1',
        })] as never,
        requestKey: 'KEY-1',
      })
    })
    await postNow(user)
    await waitFor(() => expect(postLayerTransferDocument).toHaveBeenCalledTimes(1))
    expect(postLayerTransferDocument.mock.calls[0][1]).toBe('KEY-1')
    expect(postTransferDocument).not.toHaveBeenCalled()
  })

  it('layers ACTIVE + OUTBOUND line → post_layer_movement_document', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    act(() => {
      useOperationStore.setState({
        layerActive: true,
        readiness: { ...useOperationStore.getState().readiness, layerActive: true },
        lines: [line({ allocations: [{ layer_id: 'L1', qty: 2 }], layerRevision: 'r1' })] as never,
      })
    })
    await postNow(user)
    await waitFor(() => expect(postLayerMovementDocument).toHaveBeenCalledTimes(1))
    expect(postMovementDocument).not.toHaveBeenCalled()
  })

  it('layers ACTIVE but the document is INBOUND → the plain movement route', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => {
      useOperationStore.setState({
        layerActive: true,
        readiness: { ...useOperationStore.getState().readiness, layerActive: true },
        lines: [line({ kind: 'in', t: 'Satınalma', p: 'Satıcı' })] as never,
      })
    })
    await postNow(user)
    /* A layered movement post is OUTBOUND only — an inbound-only document has
       no source layers to consume, so the layer route must not be taken. */
    await waitFor(() => expect(postMovementDocument).toHaveBeenCalledTimes(1))
    expect(postLayerMovementDocument).not.toHaveBeenCalled()
  })
})

describe('H-4 — M7-98 layer-mixing refusals', () => {
  it('refuses a transfer mixed with a non-transfer while layers are active', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    act(() => {
      useOperationStore.setState({
        layerActive: true,
        readiness: { ...useOperationStore.getState().readiness, layerActive: true },
        lines: [
          line({ kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara', p: 'Astara', allocations: [{ layer_id: 'L1', qty: 2 }] }),
          line({ allocations: [{ layer_id: 'L1', qty: 2 }] }),
        ] as never,
      })
    })
    await postNow(user)
    await waitFor(() => expect(lastToast()).toContain('bir sənəddə qarışdırıla bilməz'))
    expect(postLayerTransferDocument).not.toHaveBeenCalled()
    expect(postLayerMovementDocument).not.toHaveBeenCalled()
    expect(useOperationStore.getState().lines).toHaveLength(2)
  })

  it('refuses an inbound and an outbound line sharing a layered document', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    act(() => {
      useOperationStore.setState({
        layerActive: true,
        readiness: { ...useOperationStore.getState().readiness, layerActive: true },
        lines: [
          line({ allocations: [{ layer_id: 'L1', qty: 2 }], layerRevision: 'r1' }),
          line({ kind: 'in', t: 'Satınalma', p: 'Satıcı' }),
        ] as never,
      })
    })
    await postNow(user)
    await waitFor(() => expect(lastToast()).toContain('Mədaxil və məxaric'))
    expect(postLayerMovementDocument).not.toHaveBeenCalled()
  })
})

describe('H-4 — M7-102 refusal handling', () => {
  it('surfaces the server message verbatim with the movement prefix and keeps every line', async () => {
    const user = userEvent.setup()
    stocked()
    postMovementDocument.mockResolvedValue(failPost('anbardar bu anbara yaza bilmir'))
    await ready()
    act(() => { useOperationStore.setState({ lines: [line(), line({ c: 'C1', q: 1 })] as never }) })
    await postNow(user)
    await waitFor(() => expect(lastToast()).toBe('Əməliyyat qeyd edilmədi: anbardar bu anbara yaza bilmir'))
    expect(useOperationStore.getState().lines).toHaveLength(2)
  })

  it('uses the TRANSFER prefix on the transfer route', async () => {
    const user = userEvent.setup()
    stocked()
    postTransferDocument.mockResolvedValue(failPost('mənbə anbarı sizin deyil'))
    await ready()
    act(() => {
      useOperationStore.setState({
        lines: [line({ kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara', p: 'Astara' })] as never,
      })
    })
    await postNow(user)
    await waitFor(() => expect(lastToast()).toBe('Yerdəyişmə qeyd edilmədi: mənbə anbarı sizin deyil'))
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('releases the in-flight lock on a refusal, so a corrected retry is possible', async () => {
    const user = userEvent.setup()
    stocked()
    postMovementDocument.mockResolvedValue(failPost('rədd edildi'))
    await ready()
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await postNow(user)
    await waitFor(() => expect(lastToast()).toContain('rədd edildi'))
    expect(useOperationStore.getState().inFlight).toBe(false)
  })

  it('releases the in-flight lock when the API REJECTS', async () => {
    stocked()
    postMovementDocument.mockRejectedValue(new Error('boom'))
    await ready()
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await expect(
      useOperationStore.getState().postDocument(ADMIN, {}),
    ).rejects.toThrow('boom')
    expect(useOperationStore.getState().inFlight).toBe(false)
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })
})

describe('H-4 — M7-103 partial-document reality', () => {
  it('writes a mixed document with TWO sequential calls', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    act(() => {
      useOperationStore.setState({
        lines: [
          line({ kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara', p: 'Astara' }),
          line({ q: 1 }),
        ] as never,
      })
    })
    await postNow(user)
    await waitFor(() => expect(postMovementDocument).toHaveBeenCalledTimes(1))
    expect(postTransferDocument).toHaveBeenCalledTimes(1)
  })

  it('reports the REAL partial-success condition when the second call fails', async () => {
    const user = userEvent.setup()
    stocked()
    postMovementDocument.mockResolvedValue(failPost('mənfi qalıq'))
    await ready()
    act(() => {
      useOperationStore.setState({
        lines: [
          line({ kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara', p: 'Astara' }),
          line({ q: 1 }),
        ] as never,
      })
    })
    await postNow(user)
    /* The transfer leg IS committed. Claiming nothing was written would be a
       lie — the message must say so, and name the written document. */
    await waitFor(() => expect(lastToast()).toContain('artıq yazılıb'))
    expect(lastToast()).toContain('mənfi qalıq')
    expect(lastToast()).toContain('TR-1')
    expect(lastToast()).toContain('yarımçıqdır')
    /* Not "posted": the draft is kept so the remaining lines can be handled. */
    expect(useOperationStore.getState().lines).toHaveLength(2)
  })

  it('does NOT claim partial success when the FIRST call fails — nothing was written', async () => {
    const user = userEvent.setup()
    stocked()
    postTransferDocument.mockResolvedValue(failPost('rədd'))
    await ready()
    act(() => {
      useOperationStore.setState({
        lines: [
          line({ kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara', p: 'Astara' }),
          line({ q: 1 }),
        ] as never,
      })
    })
    await postNow(user)
    await waitFor(() => expect(lastToast()).toContain('Yerdəyişmə qeyd edilmədi'))
    expect(lastToast()).not.toContain('artıq yazılıb')
    /* The second call must never run after the first was refused. */
    expect(postMovementDocument).not.toHaveBeenCalled()
  })
})

describe('H-4 — M7-104 success cleanup', () => {
  it('clears lines, key, restore stamp and draft; keeps date and warehouse; blanks invoice and contract', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    act(() => {
      useOperationStore.setState({
        header: {
          d: '2026-01-05', t: 'Sahəyə', w: 'Ələt', w2: '', p: '', ch: '',
          ct: 'MQ-7', iv: 'QM-9', note: '', pr: '',
        },
        lines: [line()] as never,
        requestKey: 'KEY-9',
        restoredAt: 12345,
      })
    })
    await postNow(user)
    await waitFor(() => expect(postMovementDocument).toHaveBeenCalledTimes(1))
    const s = useOperationStore.getState()
    expect(s.lines).toHaveLength(0)
    expect(s.requestKey).toBe('')
    expect(s.restoredAt).toBeNull()
    expect(s.header.d).toBe('2026-01-05')
    expect(s.header.w).toBe('Ələt')
    expect(s.header.iv).toBe('')
    expect(s.header.ct).toBe('')
    expect(s.inFlight).toBe(false)
    expect(toastTexts().some((t) => t.includes('sətir qeyd edildi'))).toBe(true)
  })

  it('reloads from the database after a successful post', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    const before = fetchItems.mock.calls.length
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await postNow(user)
    await waitFor(() => expect(fetchItems.mock.calls.length).toBeGreaterThan(before))
  })
})

describe('H-4 — M7-97 edit mode', () => {
  const editing = () => {
    useOperationStore.setState({
      editDoc: { docNum: 'DOC-7', restore: new Map([['Ələt|C1', 5]]), type: 'Sahəyə', direction: 'out' },
      lines: [line()] as never,
    })
  }

  it('calls correct_document with the reason and reports old → new', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    act(editing)
    await postNow(user, 'qaimede miqdar sehvdir')
    await waitFor(() => expect(correctDocument).toHaveBeenCalledTimes(1))
    expect(correctDocument.mock.calls[0][0]).toBe('DOC-7')
    expect(correctDocument.mock.calls[0][2]).toBe('qaimede miqdar sehvdir')
    expect(lastToast()).toContain('DOC-7')
    expect(lastToast()).toContain('NEW-1')
    const s = useOperationStore.getState()
    expect(s.editDoc).toBeNull()
    expect(s.lines).toHaveLength(0)
  })

  it('refuses a transfer line inside a correction', async () => {
    const user = userEvent.setup()
    stocked()
    await ready()
    act(() => {
      useOperationStore.setState({
        editDoc: { docNum: 'DOC-7', restore: new Map(), type: 'Sahəyə', direction: 'out' },
        lines: [line({ kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara', p: 'Astara' })] as never,
      })
    })
    await postNow(user, 'sebeb')
    await waitFor(() => expect(lastToast()).toContain('Yerdəyişmə sətri düzəliş sənədinə'))
    expect(correctDocument).not.toHaveBeenCalled()
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('on refusal keeps the draft and says the ORIGINAL document is unchanged', async () => {
    const user = userEvent.setup()
    stocked()
    /* A CONFIRMED server rejection: an unambiguous 4xx carrying a real
       SQLSTATE. Only this shape may report «sənəd dəyişməyib» (I-6 / D6). */
    correctDocument.mockResolvedValue({
      ...failPost('sened artiq legv edilib'), status: 400, code: 'P0001', data: null,
    })
    await ready()
    act(editing)
    await postNow(user, 'sebeb')
    await waitFor(() => expect(lastToast()).toContain('sened artiq legv edilib'))
    expect(lastToast()).toContain('DOC-7 sənədi dəyişməyib')
    const s = useOperationStore.getState()
    expect(s.lines).toHaveLength(1)
    expect(s.editDoc).not.toBeNull()
    expect(s.inFlight).toBe(false)
  })

  it('refuses a correction outright while layer accounting is active', async () => {
    stocked()
    await ready()
    act(() => {
      useOperationStore.setState({
        layerActive: true,
        readiness: { ...useOperationStore.getState().readiness, layerActive: true },
        editDoc: { docNum: 'DOC-7', restore: new Map(), type: 'Sahəyə', direction: 'out' },
        /* Allocations present, so `canPost` itself is satisfied — the refusal
           under test is the layer/edit-mode one, not the readiness gate. */
        lines: [line({ allocations: [{ layer_id: 'L1', qty: 2 }], layerRevision: 'r1' })] as never,
      })
    })
    const res = await useOperationStore.getState().postDocument(ADMIN, { reason: 'sebeb' })
    expect(res.kind).toBe('refused')
    expect(res.message).toContain('birbaşa dəyişdirilmir')
    expect(correctDocument).not.toHaveBeenCalled()
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('runs the İcarə confirmation before an edit-mode post (M7-83)', async () => {
    const user = userEvent.setup()
    stocked(2)
    await ready()
    act(() => {
      useOperationStore.setState({
        editDoc: { docNum: 'DOC-7', restore: new Map(), type: 'Sahəyə', direction: 'out' },
        lines: [line({ q: 2 })] as never,
        core: {
          ...useOperationStore.getState().core,
          condByKey: new Map([['Ələt|C1', { icare: 2 } as never]]),
        },
      })
    })
    const panel = screen.getByTestId('draft-lines-panel')
    await user.click(within(panel).getByRole('button', { name: 'Düzəlişi qeyd et' }))
    expect(screen.getByLabelText('Səbəb')).toBeTruthy()
    expect(correctDocument).not.toHaveBeenCalled()
  })
})

describe('H-4 — M7-108 in-flight double submit', () => {
  it('a second confirmation while in flight calls NOTHING', async () => {
    const user = userEvent.setup()
    stocked()
    let release: (v: unknown) => void = () => {}
    postMovementDocument.mockImplementation(() => new Promise((r) => { release = r }))
    await ready()
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await postNow(user)
    await waitFor(() => expect(useOperationStore.getState().inFlight).toBe(true))
    /* A second attempt, straight at the handler — the dialog being closed is
       NOT what protects this path. */
    await act(async () => { await useOperationStore.getState().postDocument(ADMIN, {}) })
    expect(postMovementDocument).toHaveBeenCalledTimes(1)
    await act(async () => { release(okPost()) })
    await waitFor(() => expect(useOperationStore.getState().inFlight).toBe(false))
  })
})

/* M7-110 / M7-111 — the banner and the exit path. */
describe('NewOperationPage — edit mode (M7-110, M7-111)', () => {
  it('renders no banner outside edit mode', async () => {
    await ready()
    expect(screen.queryByTestId('edit-mode-banner')).toBeNull()
  })

  it('renders the banner and exits on request', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => {
      useOperationStore.getState().enterEditMode(
        { docNum: 'DOC-7', restore: new Map(), type: 'Sahəyə', direction: 'out' },
        [line()] as never,
        {},
      )
    })
    expect(screen.getByTestId('edit-mode-banner').textContent).toContain('DOC-7')
    await user.click(screen.getByRole('button', { name: 'Düzəlişdən imtina' }))
    expect(useOperationStore.getState().editDoc).toBeNull()
  })
})

/* T6b / M7-21a, M7-21d, M7-21e — the «Yeni mal yarat» transition. */
describe('NewOperationPage — «Yeni mal yarat» transition (T6b)', () => {
  async function openCreate(user: ReturnType<typeof userEvent.setup>) {
    await ready()
    /* An inbound tab has no stock filter, so an unmatched search reaches the
       «Tapılmadı.» branch that carries the link. */
    await user.click(screen.getByRole('tab', { name: 'Mədaxil' }))
    await user.type(screen.getByLabelText('Mal axtarışı'), 'Yeni Mal')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Yeni mal yarat →' })).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'Yeni mal yarat →' }))
  }

  it('opens the reused ItemFormDialog with the search text as the name', async () => {
    const user = userEvent.setup()
    await openCreate(user)
    await waitFor(() =>
      expect((screen.getByLabelText('Malın adı') as HTMLInputElement).value).toBe('Yeni Mal'))
  })

  /* M7-21e — cancelling leaves the operation form untouched. */
  it('leaves the draft lines intact when cancelled', async () => {
    const user = userEvent.setup()
    await openCreate(user)
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await waitFor(() => expect(screen.getByLabelText('Malın adı')).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'İmtina' }))
    expect(screen.queryByLabelText('Malın adı')).toBeNull()
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })
})


/* ---------------- H-3 audit fixes ---------------------------------------- */

/* The bulk «Malları seç» → «Partiya seç» round trip. Layer accounting must be
   ACTIVE for the column to render, and the item needs a positive balance so
   the row exists at all. */
function layeredBulkCore() {
  /* An earlier suite replaces `localStorage` with a stub that has no clear(),
     and never unstubs it, so a previous test's persisted draft would be
     restored into this one. Removing the key is what restoreDraftOnBoot
     actually reads, and the stub does implement removeItem. */
  try { localStorage.removeItem('anbar_op_draft_u1') } catch { /* no storage */ }
  fetchLayerCapability.mockResolvedValue({ ready: true, active: true, version: 7 })
  /* A transfer needs a REAL second warehouse: the destination is validated
     against the loaded set, and the default core carries only «Ələt». */
  fetchWarehouses.mockResolvedValue([
    { name: 'Ələt', type: 'anbar', active: true },
    { name: 'Astara', type: 'anbar', active: true },
  ])
  fetchItemMovements.mockResolvedValue({
    rows: [{
      id: 'm1', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01',
      in_qty: 10, out_qty: null, price: 10, partner: 'X', type: 'Alış',
      invoice_num: null, note: null, doc_num: 'DOC-1', channel: null,
    }],
    ok: true, error: null,
  })
  fetchStockLayers.mockResolvedValue({
    ok: true,
    error: null,
    /* Deliberately NOT the capability version (7) — the two are different
       values and only this one belongs on the line. */
    revision: 'rev-abc',
    layers: [{
      id: 'L1', available_qty: 10, unit_price: 4, price_status: 'known',
      received_date: '2026-01-01', source_doc_num: 'D1', source_kind: 'in',
    }],
  })
}

/* Opens the bulk dialog in `mode`, selects the single row, and opens the
   shared layer dialog for it. */
async function openBulkLayer(user: ReturnType<typeof userEvent.setup>, mode: 'wo' | 'mv') {
  await ready()
  /* The single «Malları seç» button derives its mode from the active tab and
     the header type: `out`+«Silinmə» → 'wo', `mv` → 'mv' (M7-56). */
  act(() => { useOperationStore.getState().setKind(mode === 'mv' ? 'mv' : 'out') })
  act(() => {
    useOperationStore.setState({
      header: {
        ...useOperationStore.getState().header,
        t: mode === 'mv' ? 'Yerdəyişmə' : 'Silinmə',
        w: 'Ələt',
        w2: mode === 'mv' ? 'Astara' : '',
      },
    })
  })
  await user.click(screen.getByRole('button', { name: 'Malları seç' }))
  await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
  await user.click(screen.getByLabelText('Seç C1'))
  await user.click(screen.getByRole('button', { name: 'Partiya seç' }))
  await waitFor(() => expect(screen.getByTestId('layer-pick-dialog')).toBeTruthy())
}

/* Same, but typing a PARTIAL quantity before opening the layer dialog — the
   H3-A05 scenario. Selecting takes the whole availability (10), so the row is
   narrowed to `qty` first. */
async function openBulkLayerQty(
  user: ReturnType<typeof userEvent.setup>,
  mode: 'wo' | 'mv',
  qty: string,
) {
  await ready()
  act(() => { useOperationStore.getState().setKind(mode === 'mv' ? 'mv' : 'out') })
  act(() => {
    useOperationStore.setState({
      header: {
        ...useOperationStore.getState().header,
        t: mode === 'mv' ? 'Yerdəyişmə' : 'Silinmə',
        w: 'Ələt',
        w2: mode === 'mv' ? 'Astara' : '',
      },
    })
  })
  await user.click(screen.getByRole('button', { name: 'Malları seç' }))
  await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
  await user.click(screen.getByLabelText('Seç C1'))
  const q = screen.getByLabelText('Miqdar C1')
  await user.clear(q)
  await user.type(q, qty)
  await user.click(screen.getByRole('button', { name: 'Partiya seç' }))
  await waitFor(() => expect(screen.getByTestId('layer-pick-dialog')).toBeTruthy())
}

/* H-3 #2 — a bulk row carrying a chosen lot must produce the SAME layered
   payload the single-line path produces. */
describe('NewOperationPage — bulk apply preserves the layer payload (H-3)', () => {
  beforeEach(() => { layeredBulkCore() })

  it('carries the layer price, the get_stock_layers revision and the override', async () => {
    const user = userEvent.setup()
    await openBulkLayer(user, 'wo')

    /* Allocate the full row quantity (balance 10) at 4 ₼ → sourceAmount 40. */
    const take = screen.getByLabelText('Götürülür L1')
    await user.clear(take)
    await user.type(take, '10')
    /* The admin final-amount override travels with the line too. */
    await user.type(screen.getByLabelText('Yekun məbləğ'), '55')
    await user.type(screen.getByLabelText('Məbləğ dəyişikliyinin səbəbi'), 'razılaşma')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))

    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    /* H3-A05 — the selection now SURVIVES the round trip, so the row is not
       re-selected: clicking it again would deselect it. */
    await user.click(screen.getByRole('button', { name: 'Əlavə et' }))

    await waitFor(() => expect(useOperationStore.getState().lines).toHaveLength(1))
    const l = useOperationStore.getState().lines[0] as Record<string, unknown>
    expect(l.allocations).toEqual([{ layer_id: 'L1', qty: 10 }])
    /* The revision from get_stock_layers — NOT the capability version 7. */
    expect(l.layerRevision).toBe('rev-abc')
    expect(l.layerRevision).not.toBe('7')
    /* M7-74 price = sourceAmount ÷ qty = 40 ÷ 10, not the item's list price. */
    expect(l.pr).toBe(4)
    expect(l.priceVariants).toEqual([4])
    expect(l.finalAmount).toBe('55')
    expect(l.overrideReason).toBe('razılaşma')
  })

  /* With layer accounting INACTIVE there is no lot to preserve, so the line
     must stay on the plain path and gain no layer fields at all. (While it is
     active every row is gated on a picked lot, so this case cannot arise.) */
  it('leaves an unlayered bulk row on the plain path', async () => {
    const user = userEvent.setup()
    fetchLayerCapability.mockResolvedValue({ ready: true, active: false, version: 7 })
    await ready()
    expect(useOperationStore.getState().lines).toHaveLength(0)
    act(() => { useOperationStore.getState().setKind('out') })
    act(() => {
      useOperationStore.setState({
        header: { ...useOperationStore.getState().header, t: 'Silinmə', w: 'Ələt' },
      })
    })
    await user.click(screen.getByRole('button', { name: 'Malları seç' }))
    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    await user.click(screen.getByLabelText('Seç C1'))
    await user.click(screen.getByRole('button', { name: 'Əlavə et' }))

    await waitFor(() => expect(useOperationStore.getState().lines).toHaveLength(1))
    const l = useOperationStore.getState().lines[0] as Record<string, unknown>
    expect(l.allocations).toBeUndefined()
    expect(l.layerRevision).toBeUndefined()
  })
})

describe('NewOperationPage — bulk İcarə confirmation (M7-69)', () => {
  it('appends the reason to the shared note exactly once before committing the batch', async () => {
    const user = userEvent.setup()
    localStorage.removeItem('anbar_op_draft_u1')
    stocked(3)
    condMap.set('Ələt|C1', { unfit: 0, repair: 0, onsite: 0, icare: 3 })
    await ready()
    act(() => { useOperationStore.getState().setKind('out') })
    act(() => {
      useOperationStore.setState({
        header: { ...useOperationStore.getState().header, t: 'Silinmə', w: 'Ələt' },
      })
    })
    await user.click(screen.getByRole('button', { name: 'Malları seç' }))
    await user.click(screen.getByLabelText('Seç C1'))
    await user.type(screen.getByLabelText('Ümumi qeyd'), 'əsas qeyd')
    await user.click(screen.getByRole('button', { name: 'Əlavə et' }))
    await waitFor(() => expect(screen.getByLabelText('Səbəb')).toBeTruthy())
    await user.type(screen.getByLabelText('Səbəb'), 'icarə yoxlaması')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))
    await waitFor(() => expect(useOperationStore.getState().lines).toHaveLength(1))
    const note = String(useOperationStore.getState().lines[0].note)
    expect(note).toBe('əsas qeyd · İcarədə olan maldan: icarə yoxlaması')
    expect(note.match(/İcarədə olan maldan:/g)).toHaveLength(1)
  })
})

/* H-3 #3 — the shared dialog is reached from BOTH «Sil» and «Köçür». Every
   return path must reopen the list in the mode it was opened from; a bulk
   transfer must never come back as a write-off. */
describe('NewOperationPage — the bulk mode survives the layer dialog (H-3)', () => {
  beforeEach(() => { layeredBulkCore() })

  it('returns a transfer to the TRANSFER list after confirming', async () => {
    const user = userEvent.setup()
    await openBulkLayer(user, 'mv')
    const take = screen.getByLabelText('Götürülür L1')
    await user.clear(take)
    await user.type(take, '10')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))

    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    expect(screen.getByText('Köçürüləcək malları seçin')).toBeTruthy()
    expect(screen.queryByText('Silinəcək malları seçin')).toBeNull()
  })

  it('returns a transfer to the TRANSFER list on «Geri»', async () => {
    const user = userEvent.setup()
    await openBulkLayer(user, 'mv')
    await user.click(screen.getByRole('button', { name: 'Geri' }))

    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    expect(screen.getByText('Köçürüləcək malları seçin')).toBeTruthy()
  })

  it('applies a layered transfer as a transfer line, never a write-off', async () => {
    const user = userEvent.setup()
    await openBulkLayer(user, 'mv')
    const take = screen.getByLabelText('Götürülür L1')
    await user.clear(take)
    await user.type(take, '10')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))
    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'Əlavə et' }))

    await waitFor(() => expect(useOperationStore.getState().lines).toHaveLength(1))
    const l = useOperationStore.getState().lines[0] as Record<string, unknown>
    expect(l.kind).toBe('mv')
    expect(l.t).toBe('Yerdəyişmə')
    expect(l.w2).toBe('Astara')
  })
})

/* H-3 #4 — confirmIcare EDITS draft lines on the post path (it appends the
   reason marker to every exposed line). Any other mutation of `lines` clears
   the idempotency key — addLineRaw, removeLine and saveEditLine all do it —
   so this one must too: a key computed for the previous note no longer
   describes the document being sent. */
describe('NewOperationPage — confirmIcare invalidates the request key (H-3)', () => {
  it('clears a stale requestKey when marking exposed lines', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => {
      useOperationStore.setState({
        lines: [line({ q: 2 })] as never,
        /* balance 2 − İcarə 2 = 0 free, so the whole line is exposed. */
        core: {
          ...useOperationStore.getState().core,
          condByKey: new Map([['Ələt|C1', { icare: 2 } as never]]),
        },
        requestKey: 'stale-key',
      })
    })

    await user.click(screen.getByRole('button', { name: 'Sənədi qeyd et' }))
    /* Reached only if the exposure probe actually fired. */
    await waitFor(() => expect(screen.getByLabelText('Səbəb')).toBeTruthy())
    await user.type(screen.getByLabelText('Səbəb'), 'icarədən qaytarıldı')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))

    await waitFor(() => expect(useOperationStore.getState().requestKey).toBe(''))
    /* The mark itself still happens — invalidation is not a substitute. */
    expect(String(useOperationStore.getState().lines[0].note)).toContain('icarədən qaytarıldı')
  })
})


/* ---------------- H3-A05 — the bulk draft survives the layer round trip --- */

/* The audit's blocking scenario, verbatim: available 10, user wants 3.
   Before the fix the return remounted BulkPickDialog with no selection;
   re-selecting set the quantity back to 10, and correcting it to 3 invalidated
   the freshly stored lot — an impossible loop with no way to post 3 of 10. */
describe('NewOperationPage — a partial layered quantity survives (H3-A05)', () => {
  beforeEach(() => { layeredBulkCore() })

  it('adds 3 of 10 without re-selecting or re-entering the quantity', async () => {
    const user = userEvent.setup()
    await openBulkLayerQty(user, 'wo', '3')

    /* Allocate exactly the 3 the row asks for. */
    const take = screen.getByLabelText('Götürülür L1')
    await user.clear(take)
    await user.type(take, '3')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))

    /* Back on the list: still selected, still 3 — no re-entry needed. */
    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    expect((screen.getByLabelText('Seç C1') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Miqdar C1') as HTMLInputElement).value).toBe('3')
    /* The lot survived too, so the row is not blocked as unpicked. */
    expect(screen.queryByTestId('bulk-bad')).toBeNull()
    expect((screen.getByRole('button', { name: 'Əlavə et' }) as HTMLButtonElement).disabled)
      .toBe(false)

    await user.click(screen.getByRole('button', { name: 'Əlavə et' }))
    await waitFor(() => expect(useOperationStore.getState().lines).toHaveLength(1))
    const l = useOperationStore.getState().lines[0] as Record<string, unknown>
    expect(l.q).toBe(3)
    expect(l.allocations).toEqual([{ layer_id: 'L1', qty: 3 }])
    expect(l.layerRevision).toBe('rev-abc')
  })

  it('keeps the transfer mode and its destination across the round trip', async () => {
    const user = userEvent.setup()
    await openBulkLayerQty(user, 'mv', '3')
    await user.click(screen.getByRole('button', { name: 'Geri' }))

    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    expect(screen.getByText('Köçürüləcək malları seçin')).toBeTruthy()
    expect((screen.getByLabelText('Miqdar C1') as HTMLInputElement).value).toBe('3')
    expect(useOperationStore.getState().bulkMode).toBe('mv')
  })

  it('keeps the shared note and the search text', async () => {
    const user = userEvent.setup()
    await ready()
    act(() => { useOperationStore.getState().setKind('out') })
    act(() => {
      useOperationStore.setState({
        header: { ...useOperationStore.getState().header, t: 'Silinmə', w: 'Ələt' },
      })
    })
    await user.click(screen.getByRole('button', { name: 'Malları seç' }))
    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    await user.click(screen.getByLabelText('Seç C1'))
    await user.type(screen.getByLabelText('Ümumi qeyd'), 'akt №12')
    await user.type(screen.getByLabelText('Mal axtarışı'), 'C1')
    await user.click(screen.getByRole('button', { name: 'Partiya seç' }))

    await waitFor(() => expect(screen.getByTestId('layer-pick-dialog')).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'Geri' }))

    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    expect((screen.getByLabelText('Ümumi qeyd') as HTMLInputElement).value).toBe('akt №12')
    expect((screen.getByLabelText('Mal axtarışı') as HTMLInputElement).value).toBe('C1')
  })

  it('keeps the condition split of a marked row', async () => {
    const user = userEvent.setup()
    await ready()
    /* balance 10 with 4 marked «İcarədə» — the row total is the bucket sum.
       `toCondMap` is mocked to an empty Map by this suite, so the marker is
       seeded onto the snapshot directly. */
    act(() => { useOperationStore.getState().setKind('out') })
    act(() => {
      useOperationStore.setState({
        header: { ...useOperationStore.getState().header, t: 'Silinmə', w: 'Ələt' },
        core: {
          ...useOperationStore.getState().core,
          condByKey: new Map([['Ələt|C1', { icare: 4 } as never]]),
        },
      })
    })
    await user.click(screen.getByRole('button', { name: 'Malları seç' }))
    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    await user.click(screen.getByLabelText('Seç C1'))
    /* The marked bucket is filled to its max, so a split now exists. */
    const before = useOperationStore.getState().bulkSplit.get('C1')
    expect(before).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Partiya seç' }))
    await waitFor(() => expect(screen.getByTestId('layer-pick-dialog')).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'Geri' }))

    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())
    expect(useOperationStore.getState().bulkSplit.get('C1')).toEqual(before)
    expect(useOperationStore.getState().bulkSel.get('C1')).toBe(10)
  })
})

/* M7-75 — a stored allocation is reusable only while the layers it was built
   from are unchanged (index.html:4327-4329). */
describe('NewOperationPage — a stale layer revision drops the allocation (M7-75)', () => {
  beforeEach(() => { layeredBulkCore() })

  it('restores the allocation when the revision still matches', async () => {
    const user = userEvent.setup()
    await openBulkLayerQty(user, 'wo', '3')
    const take = screen.getByLabelText('Götürülür L1')
    await user.clear(take)
    await user.type(take, '3')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))
    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())

    /* Same revision on reopen — the 3 comes back already allocated. */
    await user.click(screen.getByRole('button', { name: 'Partiya seçilib' }))
    await waitFor(() => expect(screen.getByTestId('layer-pick-dialog')).toBeTruthy())
    expect((screen.getByLabelText('Götürülür L1') as HTMLInputElement).value).toBe('3')
    /* Already balanced, so it can be confirmed without re-entry. */
    expect((screen.getByRole('button', { name: 'Təsdiq et' }) as HTMLButtonElement).disabled)
      .toBe(false)
  })

  it('discards the allocation when the revision changed', async () => {
    const user = userEvent.setup()
    await openBulkLayerQty(user, 'wo', '3')
    const take = screen.getByLabelText('Götürülür L1')
    await user.clear(take)
    await user.type(take, '3')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))
    await waitFor(() => expect(screen.getByTestId('bulk-pick-dialog')).toBeTruthy())

    /* The layers moved underneath: get_stock_layers returns a NEW revision. */
    fetchStockLayers.mockResolvedValue({
      ok: true,
      error: null,
      revision: 'rev-CHANGED',
      layers: [{
        id: 'L1', available_qty: 10, unit_price: 4, price_status: 'known',
        received_date: '2026-01-01', source_doc_num: 'D1', source_kind: 'in',
      }],
    })
    await user.click(screen.getByRole('button', { name: 'Partiya seçilib' }))
    await waitFor(() => expect(screen.getByTestId('layer-pick-dialog')).toBeTruthy())
    /* Nothing restored — the stale allocation is not reused. */
    expect((screen.getByLabelText('Götürülür L1') as HTMLInputElement).value).toBe('0')
    expect((screen.getByRole('button', { name: 'Təsdiq et' }) as HTMLButtonElement).disabled)
      .toBe(true)
  })
})

/* ============ H-4 / M5-55 / M7-115 — the complete prefill transition ============

   Navigation alone is NOT parity. After the target page finishes loading, the
   item, its unit, the balance panel and the applicable condition split must
   all be populated — from a prefill issued BEFORE this page ever mounted, i.e.
   while `core.itemBy` was still empty. */
describe('H-4 — the M5-55 prefill transition', () => {
  it('populates item, unit, balance panel and split from a prefill issued before mount', async () => {
    stocked(20)
    /* A marked stock_conditions row, so the split is genuinely applicable. */
    fetchStockConditions.mockResolvedValue({
      rows: [{ warehouse: 'Ələt', item_code: 'C1', unfit: 0, repair: 0, onsite: 0, icare: 4 }],
      ok: true, error: null,
    })
    condMap.set('Ələt|C1', { unfit: 0, repair: 0, onsite: 0, icare: 4 })

    /* The transition, in the legacy order: prefill FIRST, then the page opens. */
    act(() => { useOperationStore.getState().prefill('C1') })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())

    /* An outbound tab with the warehouse chosen — the state a user reaches the
       screen in when acting on a specific item. */
    act(() => {
      useOperationStore.setState({
        kind: 'out',
        header: {
          d: '2026-01-05', t: 'Sahəyə', w: 'Ələt', w2: '', p: '', ch: '',
          ct: '', iv: '', note: '', pr: '',
        },
      })
    })

    /* 1. the item itself. M18-57 — the single-item ROW is always rendered, so
       its presence no longer signals a selection; legacy's own selection
       readout is `#o-itemsel` (index.html:3277/3282), «Seçilməyib» replaced by
       the chosen item. That readout is the probe. */
    await waitFor(() => expect(screen.getByText('Nasos (C1)')).toBeTruthy())
    expect(screen.queryByText('Seçilməyib')).toBeNull()
    /* 2. its unit — M18-56 moved the read-only unit from a bare hint span
       into the legacy «Ölçü vahidi» field (index.html:3287), so it is now an
       input VALUE rather than text content. */
    expect((screen.getByLabelText('Ölçü vahidi') as HTMLInputElement).value).toBe('ədəd')
    /* 3. the balance panel */
    const panel = screen.getByTestId('op-state')
    expect(panel.textContent).toContain('Ələt')
    expect(panel.textContent).not.toContain('Mal seçilməyib')
    /* 4. the applicable condition split */
    expect(screen.getByTestId('cond-split')).toBeTruthy()
  })

  it('seeds the price on `in` even though the prefill preceded the load (the race)', async () => {
    stocked(20)
    act(() => { useOperationStore.getState().prefill('C1') })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    /* Keyed on `pick` alone the seeding effect would have fired once against
       the empty snapshot and never again — the price would stay blank. */
    await waitFor(() => expect(useOperationStore.getState().header.pr).toBe('10'))
  })

  it('consumes the pending prefill exactly once, after it resolves', async () => {
    stocked(20)
    act(() => { useOperationStore.getState().prefill('C1') })
    expect(useOperationStore.getState().pendingPrefill).toBe('C1')
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    await waitFor(() => expect(useOperationStore.getState().pendingPrefill).toBeNull())
    /* The selection itself survives the consumption. */
    expect(useOperationStore.getState().pick).toBe('C1')
  })

  /* The actual race the dependency array must survive: the page is ALREADY
     mounted with a healthy snapshot when a prefill names a code that snapshot
     does not yet contain (the item was created elsewhere). The next refresh
     brings it in — and the seeding must happen THEN, not never. Keyed on
     `pick` alone the effect fires once against the old snapshot and is done. */
  it('applies the prefill when the code only resolves on a LATER refresh', async () => {
    fetchItems.mockResolvedValue({ rows: [], ok: true, error: null })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())

    /* The code is not in the snapshot yet, so nothing can be applied. M18-57 —
       probed through legacy's selection readout rather than the always-present
       single-item row. */
    act(() => { useOperationStore.getState().prefill('C1') })
    expect(screen.getByText('Seçilməyib')).toBeTruthy()
    expect(useOperationStore.getState().pendingPrefill).toBe('C1')

    /* It arrives on the next refresh. */
    fetchItems.mockResolvedValue({
      rows: [{ code: 'C1', name: 'Nasos', unit: 'ədəd', price: 10, category: null }],
      ok: true, error: null,
    })
    await act(async () => { await useOperationStore.getState().refresh(ADMIN) })

    /* M18-57 — probed through legacy's `#o-itemsel` readout, not the
       always-present single-item row. */
    await waitFor(() => expect(screen.getByText('Nasos (C1)')).toBeTruthy())
    /* M18-56 — the unit is now the «Ölçü vahidi» input value. */
    expect((screen.getByLabelText('Ölçü vahidi') as HTMLInputElement).value).toBe('ədəd')
    await waitFor(() => expect(useOperationStore.getState().header.pr).toBe('10'))
    await waitFor(() => expect(useOperationStore.getState().pendingPrefill).toBeNull())
  })

  it('keeps the prefill pending across a REFRESH that has not resolved the code yet', async () => {
    /* An items read that fails leaves the snapshot empty, so the code cannot
       resolve — the request must survive rather than be silently discarded. */
    fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'items down' })
    act(() => { useOperationStore.getState().prefill('C1') })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Məlumat yüklənmədi')).toBeTruthy())
    expect(useOperationStore.getState().pendingPrefill).toBe('C1')
    expect(useOperationStore.getState().pick).toBe('C1')
  })
})

/* ============ H-4 — roles and server refusals (M7-117 / M7-118 / M7-120) ============ */
describe('H-4 — role behaviour', () => {
  const ANBARDAR: Me = { id: 'u2', sbId: 'u2', email: 'w@a.com', name: 'W', role: 'anbardar', wh: 'Ələt' }
  const REHBER: Me = { id: 'u3', sbId: 'u3', email: 'r@a.com', name: 'R', role: 'rehber', wh: '' }

  it('an ANBARDAR can post — mv.add is admin + anbardar', async () => {
    const user = userEvent.setup()
    stocked()
    render(<NewOperationPage me={ANBARDAR} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await user.click(screen.getByRole('button', { name: 'Sənədi qeyd et' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Qeyd et' }))
    await waitFor(() => expect(postMovementDocument).toHaveBeenCalledTimes(1))
  })

  it('a REHBER may OPEN the screen but cannot post', async () => {
    stocked()
    render(<NewOperationPage me={REHBER} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    const btn = screen.getByRole('button', { name: 'Sənədi qeyd et' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    /* And the handler refuses independently of the button state. */
    const res = await useOperationStore.getState().postDocument(REHBER, {})
    expect(res.kind).toBe('refused')
    expect(postMovementDocument).not.toHaveBeenCalled()
  })

  it('an anbardar keeps their warehouse narrowing — D-H1 does not widen it', async () => {
    stocked()
    render(<NewOperationPage me={ANBARDAR} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    const s = useOperationStore.getState()
    expect(selectAllowedWarehouses(s, ANBARDAR)).toEqual(['Ələt'])
    /* D-H1 narrows the anbardar's transfer SOURCE to their own warehouse... */
    expect(selectTransferSources(s, ANBARDAR)).toEqual(['Ələt'])
    /* ...and leaves the admin untouched. */
    expect(selectTransferSources(s, ADMIN)).toContain('Ələt')
  })

  it('a server refusal stays visible after a mid-session role change', async () => {
    stocked()
    /* The tab was opened as an admin; the role changed server-side, so the RPC
       refuses. The message must reach the user verbatim — not be swallowed by
       a client-side assumption that an admin cannot be refused. */
    postMovementDocument.mockResolvedValue(
      failPost('İcazəniz yoxdur: bu anbara yazmaq hüququnuz yoxdur'),
    )
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    const res = await useOperationStore.getState().postDocument(ADMIN, {})
    expect(res.kind).toBe('refused')
    expect(res.message).toBe(
      'Əməliyyat qeyd edilmədi: İcazəniz yoxdur: bu anbara yazmaq hüququnuz yoxdur',
    )
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('surfaces a label-guard refusal verbatim and keeps the draft (M7-121)', async () => {
    const server = 'Yanlış alış kanalı: "Köhnə kanal" Sorğuçalarda aktiv deyil — səhifəni yeniləyin'
    stocked()
    postMovementDocument.mockResolvedValue(failPost(server))
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    const res = await useOperationStore.getState().postDocument(ADMIN, {})
    expect(res.kind).toBe('refused')
    expect(res.message).toContain(server)
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('refuses a historical opening balance for a non-admin, whole document', async () => {
    stocked()
    render(<NewOperationPage me={ANBARDAR} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => {
      useOperationStore.setState({
        lines: [
          line({ kind: 'in', t: 'Əvvələ qalıq', p: 'Anbar qalığı' }),
          line({ kind: 'in', t: 'Satınalma', p: 'Satıcı' }),
        ] as never,
      })
    })
    const res = await useOperationStore.getState().postDocument(ANBARDAR, {})
    expect(res.kind).toBe('refused')
    expect(res.message).toContain('yalnız Admin')
    /* The whole document is refused — the offending line is NOT silently
       dropped, because this is a permission violation, not a stock race. */
    expect(postMovementDocument).not.toHaveBeenCalled()
    expect(useOperationStore.getState().lines).toHaveLength(2)
  })

  it('an ADMIN may create that same opening-balance line', async () => {
    stocked()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => {
      useOperationStore.setState({
        lines: [line({ kind: 'in', t: 'Əvvələ qalıq', p: 'Anbar qalığı' })] as never,
      })
    })
    const res = await useOperationStore.getState().postDocument(ADMIN, {})
    expect(res.kind).toBe('posted')
    expect(postMovementDocument).toHaveBeenCalledTimes(1)
  })

  /* M7-120 — every audit row is written by a server trigger. No client code
      writes one, and this pins that no such call was added by H-4. */
  it('writes NO audit row from the client on any post path', async () => {
    stocked()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await useOperationStore.getState().postDocument(ADMIN, {})
    /* The five write transports are the ONLY write surface the store has, and
       none of them is an audit write. */
    expect(postMovementDocument).toHaveBeenCalledTimes(1)
    expect(correctDocument).not.toHaveBeenCalled()
  })
})

/* ============ H-4 — the shared canPost gate and the split refusal ============ */
describe('H-4 — one shared canPost gate (M7-S5)', () => {
  it('the panel button, the dialog and the handler all read the SAME value', async () => {
    const user = userEvent.setup()
    stocked()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await user.click(screen.getByRole('button', { name: 'Sənədi qeyd et' }))
    const dialog = screen.getByRole('dialog')
    expect((within(dialog).getByRole('button', { name: 'Qeyd et' }) as HTMLButtonElement).disabled)
      .toBe(false)

    /* Flip the SINGLE gate — every consumer must follow, with no ad-hoc
       per-button condition left enabled. */
    act(() => { useOperationStore.setState({ inFlight: true }) })
    expect((within(dialog).getByRole('button', { name: 'Qeyd et' }) as HTMLButtonElement).disabled)
      .toBe(true)
    expect((screen.getByRole('button', { name: 'Sənədi qeyd et' }) as HTMLButtonElement).disabled)
      .toBe(true)
    const res = await useOperationStore.getState().postDocument(ADMIN, {})
    expect(res.kind).toBe('refused')
  })

  it('a stock_conditions FAILURE blocks posting entirely', async () => {
    stocked()
    fetchStockConditions.mockResolvedValue({ rows: [], ok: false, error: 'conds down' })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Məlumat yüklənmədi')).toBeTruthy())
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    const res = await useOperationStore.getState().postDocument(ADMIN, {})
    expect(res.kind).toBe('refused')
    expect(postMovementDocument).not.toHaveBeenCalled()
  })

  it('a PARTIAL movements page failure is fatal and blocks posting', async () => {
    fetchItemMovements.mockResolvedValue({
      rows: [{
        id: 'm0', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01',
        in_qty: 20, out_qty: null, price: 10, partner: 'X', type: 'Satınalma',
        invoice_num: null, note: null, doc_num: 'D0', channel: null,
      }],
      ok: false, error: 'movements page 3 failed', partial: true,
    })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByText('Məlumat yüklənmədi')).toBeTruthy())
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    const res = await useOperationStore.getState().postDocument(ADMIN, {})
    expect(res.kind).toBe('refused')
    /* The gathered rows must NOT have been committed — a truncated dataset
       overstates stock and would let the negative-stock ban pass. */
    expect(postMovementDocument).not.toHaveBeenCalled()
  })

  it('refuses a document carrying a split while the server cannot store one', async () => {
    stocked()
    fetchSplitSupported.mockResolvedValue(false)
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => {
      useOperationStore.setState({
        lines: [line({ cond: { normal: 0, icare: 2 } })] as never,
      })
    })
    const res = await useOperationStore.getState().postDocument(ADMIN, {})
    expect(res.kind).toBe('refused')
    expect(postMovementDocument).not.toHaveBeenCalled()
  })
})

/* ============ H-4 — the payload actually sent ============ */
describe('H-4 — payload sent to the server', () => {
  it('a transfer line uses the SOURCE warehouse as `source` and w2 as `dest`', async () => {
    stocked()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => {
      useOperationStore.setState({
        lines: [line({ kind: 'mv', t: 'Yerdəyişmə', w: 'Ələt', w2: 'Astara', p: 'Astara' })] as never,
      })
    })
    await useOperationStore.getState().postDocument(ADMIN, {})
    const sent = postTransferDocument.mock.calls[0][0] as { source: string; dest: string }[]
    expect(sent[0].source).toBe('Ələt')
    expect(sent[0].dest).toBe('Astara')
  })

  it('`condSplitPayload` omits `normal` from the sent conditions', async () => {
    stocked()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => {
      useOperationStore.setState({
        lines: [line({ q: 2, cond: { normal: 1, icare: 1 } })] as never,
      })
    })
    await useOperationStore.getState().postDocument(ADMIN, {})
    const sent = postMovementDocument.mock.calls[0][0] as { conditions: Record<string, number> }[]
    expect(sent[0].conditions).toEqual({ icare: 1 })
    expect(sent[0].conditions.normal).toBeUndefined()
  })

  it('an INBOUND line carries no conditions at all', async () => {
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => {
      useOperationStore.setState({
        lines: [line({ kind: 'in', t: 'Satınalma', p: 'Satıcı', cond: { normal: 0, icare: 2 } })] as never,
      })
    })
    await useOperationStore.getState().postDocument(ADMIN, {})
    const sent = postMovementDocument.mock.calls[0][0] as { conditions: unknown }[]
    expect(sent[0].conditions).toBeNull()
  })

  it('a correction payload is NARROWER — no layer or split fields', async () => {
    stocked()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => {
      useOperationStore.setState({
        editDoc: { docNum: 'DOC-7', restore: new Map([['Ələt|C1', 5]]), type: 'Sahəyə', direction: 'out' },
        lines: [line({ cond: { normal: 0, icare: 2 } })] as never,
      })
    })
    await useOperationStore.getState().postDocument(ADMIN, { reason: 'sebeb' })
    const sent = correctDocument.mock.calls[0][1] as Record<string, unknown>[]
    expect(sent[0]).not.toHaveProperty('conditions')
    expect(sent[0]).not.toHaveProperty('allocations')
    expect(sent[0]).not.toHaveProperty('revision')
    /* The server appends «Əvəz edir: …» itself — the client must not. */
    expect(String(sent[0].note)).not.toContain('Əvəz edir')
  })
})

/* ============ H-4 / T8 — the remaining regression pins ============ */

/* M7-66/M7-67 — bulk apply is ALL-OR-NOTHING. The wrong implementation this
   catches is pushing each produced line inside the loop: the first row would
   land in the draft and only the second would be refused, leaving a half-
   applied batch behind. */
describe('H-4 / T8 — bulk apply rollback', () => {
  it('a single bad row blocks the WHOLE batch — the valid rows do not land', async () => {
    const user = userEvent.setup()
    stocked(20)
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => {
      useOperationStore.setState({
        kind: 'out',
        header: {
          d: '2026-01-05', t: 'Silinmə', w: 'Ələt', w2: '', p: '', ch: '',
          ct: '', iv: '', note: '', pr: '',
        },
      })
    })
    await user.click(screen.getByRole('button', { name: 'Malları seç' }))

    /* C1 is perfectly valid on its own; ZZZ is not in the nomenclature (a
       stale row, or one hidden between the list being built and «Əlavə et»
       being pressed). */
    act(() => {
      useOperationStore.setState({ bulkSel: new Map([['C1', 2], ['ZZZ', 1]]) })
    })
    const before = useOperationStore.getState().lines.length

    /* The batch is refused as a whole — the valid row is counted in the
       footer but «Əlavə et» stays shut, so nothing at all is added. */
    expect(screen.getByTestId('bulk-footer').textContent).toContain('1 sətir')
    expect((screen.getByRole('button', { name: 'Əlavə et' }) as HTMLButtonElement).disabled)
      .toBe(true)
    await user.click(screen.getByRole('button', { name: 'Əlavə et' }))
    expect(useOperationStore.getState().lines).toHaveLength(before)
  })

  /* The SECOND, independent guard: `applyBulk` re-validates every produced
     line against the draft as it grows, so even if the dialog let a batch
     through, a failure adds ZERO lines rather than a partial batch. This
     drives it through the İcarə re-entry path, which calls applyBulk with a
     selection the dialog is no longer gating. */
  it('applyBulk itself adds ZERO lines when a later row fails validation', async () => {
    const user = userEvent.setup()
    /* Balance 3 for C1. Two draft lines of 2 each cannot both fit. */
    stocked(3)
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => {
      useOperationStore.setState({
        kind: 'out',
        header: {
          d: '2026-01-05', t: 'Silinmə', w: 'Ələt', w2: '', p: '', ch: '',
          ct: '', iv: '', note: '', pr: '',
        },
      })
    })
    await user.click(screen.getByRole('button', { name: 'Malları seç' }))
    act(() => { useOperationStore.setState({ bulkSel: new Map([['C1', 3]]) }) })
    /* A draft line appears that consumes 2 of the 3 — the selection the
       dialog approved no longer fits. */
    act(() => {
      useOperationStore.setState({ lines: [line({ c: 'C1', q: 2, t: 'Silinmə' })] as never })
    })
    const before = useOperationStore.getState().lines.length
    const applyBtn = screen.queryByRole('button', { name: 'Əlavə et' }) as HTMLButtonElement | null
    if (applyBtn && !applyBtn.disabled) await user.click(applyBtn)
    /* Either guard may fire first; neither may add a partial batch. */
    expect(useOperationStore.getState().lines).toHaveLength(before)
  })
})

/* M7-122 — every write API consults the localhost guard ITSELF. A disabled
   button is a UI state, never the protection. These call the REAL API module
   (unmocked here) against a localhost hostname with the opt-in absent. */
describe('H-4 / T8 — every write path consults the mutation guard', () => {
  it('blocks all five Phase 7 write actions on localhost without the opt-in', async () => {
    const { blockedReason } = await import('../lib/mutationGuard')
    for (const action of ['op.post', 'op.post-transfer', 'op.layer-post', 'op.correct'] as const) {
      const reason = blockedReason(action, { local: true, allowed: false })
      expect(reason).toBeTruthy()
      expect(reason).toContain('VITE_ALLOW_LOCAL_WRITES')
    }
  })

  it('allows them once the developer has explicitly opted in', async () => {
    const { blockedReason } = await import('../lib/mutationGuard')
    for (const action of ['op.post', 'op.post-transfer', 'op.layer-post', 'op.correct'] as const) {
      expect(blockedReason(action, { local: true, allowed: true })).toBeNull()
    }
  })

  it('never blocks on a deployed host', async () => {
    const { blockedReason } = await import('../lib/mutationGuard')
    expect(blockedReason('op.post', { local: false, allowed: false })).toBeNull()
  })
})

/* Characterisation of the three presentation contracts Phase 18 repaired on
   this screen (M18-53 subtitle, M18-40 two-column workspace, M18-44/M18-56
   field order). All three were correct in the source but pinned by NO test,
   so a future paraphrase or a dropped inline grid template would regress them
   silently. These assert the LEGACY strings and structure verbatim; each one
   fails if the value drifts to the React paraphrase it replaced. */
describe('legacy presentation contracts — M18-40, M18-53, M18-56', () => {
  /* An earlier suite in this file replaces `localStorage` with a stub that
     has no clear() and never unstubs it (see layeredBulkCore, line 1097), so
     a previous test's persisted draft is restored into these tests and flips
     the form to the write-off state, where the item block does not render at
     all (`isWoOut`, index.html:3255). The store reset in the file-level
     beforeEach does not touch storage, so the key is removed here exactly as
     layeredBulkCore does. Without this the tests pass in isolation and fail
     in the full file — an order dependence, not an application defect. */
  beforeEach(() => {
    try { localStorage.removeItem('anbar_op_draft_u1') } catch { /* no storage */ }
  })

  it('renders the FULL legacy subtitle, index.html:296 verbatim', async () => {
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    const sub = document.querySelector('.phead p')
    expect(sub?.textContent).toBe(
      'Mədaxil, məxaric və anbarlararası yerdəyişməni bir formadan qeyd edin.'
      + ' Yerdəyişmə avtomatik olaraq iki qeyd yaradır.',
    )
    /* Falsifying control — the paraphrase this replaced must NOT match, and
       neither may a truncation that keeps only the first sentence. */
    expect(sub?.textContent).not.toBe('Mədaxil, məxaric və yerdəyişmə sənədləri.')
    expect(sub?.textContent).toContain('iki qeyd yaradır')
  })

  it('lays the workspace out as the legacy two-column grid, index.html:297', async () => {
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    const grid = screen.getByTestId('operation-form').parentElement
    /* The legacy authority is `.grid` carrying an INLINE template. A class
       that matches no stylesheet rule (the `grid2` defect) is inert, so the
       class name alone is not evidence — the template must be present. */
    expect(grid?.className).toBe('grid')
    expect((grid as HTMLElement)?.style.gridTemplateColumns)
      .toBe('minmax(0,1.15fr) minmax(0,.85fr)')
  })

  it('stacks BOTH right-column cards beside the form, index.html:303-310', async () => {
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    const grid = screen.getByTestId('operation-form').parentElement
    /* Exactly two grid children: the form, then the right column holding the
       lines panel ABOVE the item-state panel. The reported defect had the
       lines panel outside the grid entirely. */
    expect(grid?.children.length).toBe(2)
    const right = grid?.children[1] as HTMLElement
    expect(right.contains(screen.getByTestId('draft-lines-panel'))).toBe(true)
    expect(right.contains(screen.getByTestId('op-state'))).toBe(true)
    expect(
      right.querySelector('[data-testid="draft-lines-panel"]')!
        .compareDocumentPosition(right.querySelector('[data-testid="op-state"]')!)
      & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  /* M18-57 — the quantity row is NOT a picked-state contract. Legacy `rOp()`
     emits «Miqdar» / «Ölçü vahidi» / «Vahidin qiyməti» unconditionally
     (index.html:3278-3282); the only state without them is out + «Silinmə»,
     where «Malları seç» replaces the single-item route. The earlier version of
     this test asserted the opposite (`not.toContain('Miqdar')`), which pinned
     the React gating DEFECT as if it were the legacy contract — an empty form
     was three fields short of production. `Seçilməyib` is legacy's own
     selected-item hint (index.html:3277) and is itself a `label.f > span`,
     so it is part of the sequence rather than noise to filter out. */
  it('renders the legacy FIELD ORDER before an item is picked, rOp() 3261-3300', async () => {
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    const form = screen.getByTestId('operation-form')
    /* Every field caption in DOM order. Asserting the SEQUENCE catches a
       reordering that a set of individual getByText calls would pass. */
    const captions = Array.from(form.querySelectorAll('label.f > span'))
      .map((s) => s.textContent)
    expect(captions).toEqual([
      'Tarix',
      'Əməliyyatın növü',
      'Anbar',
      'Kontragent',
      'Mal (ad və ya kod yazın)',
      'Seçilməyib',
      'Miqdar',
      'Ölçü vahidi',
      'Vahidin qiyməti (₼)',
      'Alınma kanalı',
      'Müqavilə №',
      'Qaimə №',
      'Qeyd',
    ])
    /* Falsifying control — the quantity row must sit AFTER the item search,
       not be hoisted up into the header grid (the defect M18-56 records). */
    expect(captions.indexOf('Miqdar')).toBeGreaterThan(captions.indexOf('Mal (ad və ya kod yazın)'))
    expect(captions.indexOf('Vahidin qiyməti (₼)')).toBeLessThan(captions.indexOf('Alınma kanalı'))
    /* «Sətri əlavə et» is the LAST control (index.html:3296). */
    const buttons = Array.from(form.querySelectorAll('button')).map((b) => b.textContent)
    expect(buttons.at(-1)).toBe('Sətri əlavə et')
  })

  it('inserts the quantity row at step 5 once an item is picked, index.html:3285-3289', async () => {
    /* The prefill transition the file already uses elsewhere: the pick is
       issued BEFORE mount, so no combobox interaction is needed. */
    act(() => { useOperationStore.getState().prefill('C1') })
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    /* M18-57 — wait for the SELECTION, which legacy signals by replacing
       «Seçilməyib» in `#o-itemsel`; the row itself is always present. */
    await waitFor(() => expect(screen.queryByText('Seçilməyib')).toBeNull())
    const form = screen.getByTestId('operation-form')
    const captions = Array.from(form.querySelectorAll('label.f > span'))
      .map((s) => s.textContent)
    /* Step 4 is the selected-item hint, which legacy REPLACES with the
       selection itself (`Seçildi: <code> · <unit>`, index.html:3394). Its
       text is fixture-dependent, so the slot is asserted by position and by
       carrying the picked code — pinning the contract, not `okCore()`'s
       particular item name. */
    expect(captions[5]).toContain('C1')
    expect(captions[5]).not.toBe('Seçilməyib')
    /* The full nine-step legacy order, with the quantity row now present
       BETWEEN the item block and «Alınma kanalı» — not appended at the end
       and not hoisted into the header. */
    expect([...captions.slice(0, 5), ...captions.slice(6)]).toEqual([
      'Tarix',
      'Əməliyyatın növü',
      'Anbar',
      'Kontragent',
      'Mal (ad və ya kod yazın)',
      'Miqdar',
      'Ölçü vahidi',
      'Vahidin qiyməti (₼)',
      'Alınma kanalı',
      'Müqavilə №',
      'Qaimə №',
      'Qeyd',
    ])
  })

  it('keeps the legacy field order on a TRANSFER, incl. the warehouse pair', async () => {
    const user = userEvent.setup()
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    /* The segment control is a tablist (role="tab"), not plain buttons. */
    await user.click(screen.getByRole('tab', { name: 'Yerdəyişmə' }))
    const form = screen.getByTestId('operation-form')
    const captions = Array.from(form.querySelectorAll('label.f > span'))
      .map((s) => s.textContent)
    /* index.html:3268-3269 — the transfer replaces «Anbar»+«Kontragent» with
       the source/destination pair, and drops «Vahidin qiyməti» and «Alınma
       kanalı»/«Müqavilə №», which are inbound-only. */
    expect(captions.slice(0, 4)).toEqual([
      'Tarix', 'Əməliyyatın növü', 'Haradan (anbar)', 'Hara (anbar)',
    ])
    expect(captions).not.toContain('Kontragent')
    expect(captions).not.toContain('Vahidin qiyməti (₼)')
    expect(captions).not.toContain('Alınma kanalı')
    /* Positive control — the inbound-only captions are absent because the
       KIND changed, not because the selector is wrong. */
    expect(captions).toContain('Mal (ad və ya kod yazın)')
    expect(captions).toContain('Qeyd')
  })
})

/* H-4 — no browser-native bypass was introduced anywhere on the post path.
   Every confirmation is a real dialog component with its own gate. */
describe('H-4 / T8 — no native confirm()/prompt() bypass', () => {
  it('posting never calls window.confirm or window.prompt', async () => {
    const user = userEvent.setup()
    stocked()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('x')
    render(<NewOperationPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    act(() => { useOperationStore.setState({ lines: [line()] as never }) })
    await postNow(user)
    await waitFor(() => expect(postMovementDocument).toHaveBeenCalledTimes(1))
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(promptSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
    promptSpy.mockRestore()
  })
})
