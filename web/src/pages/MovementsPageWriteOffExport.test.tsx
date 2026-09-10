import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/* I-9 — the «Silinmə hesabatı» button on «Mal hərəkəti».

   The WRITER is mocked (`xlsWriteOff`): its own suite proves the workbook
   through real bytes, and letting it run would attempt a download in jsdom.
   The ALLOCATION READ is mocked too — no live access in this task. What is
   asserted here is the wiring, the capability gate and the async safety: which
   snapshot the file is built from, and every state in which NO file is written.

   `writeOffExportRows` and `sourceRows` run for real, so the rows inspected
   below are the ones a user would actually get. */

const fetchMovementsSnapshot = vi.fn()
vi.mock('../api/movementsSnapshot.api', () => ({
  fetchMovementsSnapshot: () => fetchMovementsSnapshot(),
}))

const layerCapability = vi.fn()
vi.mock('../api/stockLayers.api', () => ({
  fetchLayerCapability: () => layerCapability(),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))

const fetchWriteoffAllocations = vi.fn()
vi.mock('../api/writeoffAllocations.api', () => ({
  fetchWriteoffAllocations: () => fetchWriteoffAllocations(),
}))

vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: () => {} }))

vi.mock('../lib/xlsWriteOff', async (orig) => ({
  ...(await orig<typeof import('../lib/xlsWriteOff')>()),
  xlsWriteOff: vi.fn(),
}))

import { MovementsPage } from './MovementsPage'
import { useMovementsStore, __resetMovementsRequestSeq } from '../store/movements.store'
import { useAuditLogStore } from '../store/auditLog.store'
import { useToastStore } from '../store/toast.store'
import { useAuthStore } from '../store/auth.store'
import { EMPTY_MOVEMENT_FILTERS } from '../lib/movementFilters'
import { xlsWriteOff } from '../lib/xlsWriteOff'
import type { WriteOffExportRow, WriteOffSourceRow } from '../lib/writeOffExport'
import type { MovementRow } from '../api/itemMovements.api'
import type { Me } from '../lib/roles'

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
  in_qty: 0, out_qty: 5, price: 2, partner: null, type: 'Silinmə',
  invoice_num: null, note: null, doc_num: 'D-1', created_at: '2026-09-01T10:00:00Z',
  channel: null, contract_num: null, created_by: null, ...over,
})

const ITEMS = [{ code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null }]
const WHS = ['Ələt', 'Astara', 'Xocahəsən']

const alloc = (over: Record<string, unknown> = {}) => ({
  writeoff_movement_id: 'm1', source_movement_id: 's1',
  source_doc_num_snapshot: 'SD-1', source_invoice_snapshot: 'INV-1',
  source_date_snapshot: '2025-12-01', qty: 4, price_status_snapshot: 'known',
  unit_price_snapshot: 25, source_amount_snapshot: 100, reversed_at: null,
  id: 'a1', created_at: '2026-01-05T00:00:00Z', ...over,
})

function snapshot(over: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    snapshot: { movements: [mv()], items: ITEMS, warehouses: WHS, valuations: [], ...over },
  }
}

const ME_ID = '11111111-1111-4111-8111-111111111111'
const ME: Me = {
  id: ME_ID, sbId: ME_ID, email: 'anar@example.com',
  name: 'Anar İbrahimov', role: 'admin', wh: 'Ələt',
}
const REHBER: Me = { ...ME, role: 'rehber' }
const ANBARDAR: Me = { ...ME, role: 'anbardar' }

beforeEach(() => {
  vi.clearAllMocks()
  __resetMovementsRequestSeq()
  useMovementsStore.setState({
    rows: [], operational: [], itemBy: new Map(), warehouses: [],
    valuations: new Map(), loading: false, error: null, loaded: false,
    layerActive: false, layerReady: false, layerFresh: false,
    filters: EMPTY_MOVEMENT_FILTERS, showAll: false,
  })
  fetchMovementsSnapshot.mockResolvedValue(snapshot())
  layerCapability.mockResolvedValue({ ready: true, active: true, version: 1 })
  fetchWriteoffAllocations.mockResolvedValue({ rows: [alloc()], ok: true, error: null })
  useAuditLogStore.setState({ emails: new Map() })
  useToastStore.setState({ messages: [] })
  useAuthStore.setState({ me: ME, status: 'ready', error: null })
})

const btn = () => screen.getByTestId('mv-export-writeoff') as HTMLButtonElement
const toasts = () => useToastStore.getState().messages.map((m) => m.text)

async function open(me: Me = ME, over: Record<string, unknown> = {}) {
  if (Object.keys(over).length) fetchMovementsSnapshot.mockResolvedValue(snapshot(over))
  render(<MovementsPage me={me} onEditDocument={vi.fn()} onNewOperation={vi.fn()} />)
  await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
}

/** Selects the «Silinmə» type filter, the button's enabling condition. */
async function selectWriteOffFilter() {
  await act(async () => { useMovementsStore.getState().setFilters({ t: 'Silinmə' }) })
}

/** The parent rows handed to the writer by the last click. */
function lastCall(): { rows: WriteOffExportRow[]; src: WriteOffSourceRow[] } {
  const call = vi.mocked(xlsWriteOff).mock.calls.at(-1)
  if (!call) throw new Error('xlsWriteOff() was not called')
  return { rows: call[0], src: call[1] }
}

describe('the button gate', () => {
  it('is DISABLED until the Silinmə type filter is selected', async () => {
    await open()
    expect(btn().disabled).toBe(true)
    await selectWriteOffFilter()
    expect(btn().disabled).toBe(false)
  })

  it('is DISABLED before a snapshot has loaded', async () => {
    let release: (v: unknown) => void = () => {}
    fetchMovementsSnapshot.mockReturnValue(new Promise((r) => { release = r }))
    render(<MovementsPage me={ME} onEditDocument={vi.fn()} onNewOperation={vi.fn()} />)
    await act(async () => { useMovementsStore.getState().setFilters({ t: 'Silinmə' }) })
    expect(btn().disabled).toBe(true)
    await act(async () => { release(snapshot()) })
  })

  it('is DISABLED for any other type filter', async () => {
    await open()
    await act(async () => { useMovementsStore.getState().setFilters({ t: 'Satınalma' }) })
    expect(btn().disabled).toBe(true)
  })

  it('keeps the legacy hint', async () => {
    await open()
    expect(btn().getAttribute('title')).toBe('Yalnız Silinmə süzgəci seçildikdə')
  })

  /* UNGATED BY ROLE, exactly like «Excel» and legacy `#mov-wo-exp`. RLS, not
     the client, decides which rows a role can export. */
  it.each([['rehber', REHBER], ['anbardar', ANBARDAR]])(
    'is available to %s, not just admin',
    async (_label, who) => {
      await open(who as Me)
      await selectWriteOffFilter()
      expect(btn().disabled).toBe(false)
    },
  )
})

describe('a successful export', () => {
  it('writes the file from the filtered Silinmə rows and toasts', async () => {
    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalledTimes(1))
    const { rows, src } = lastCall()
    expect(rows.map((r) => r.movementId)).toEqual(['m1'])
    expect(src).toHaveLength(1)
    expect(toasts()).toContain('Silinme_hesabati.xlsx yükləndi (1 sətir)')
  })

  it('exports the FULL filtered set — the row count reaches the toast', async () => {
    const many = Array.from({ length: 12 }, (_, i) => mv({ id: 'm' + i, doc_num: 'D' + i }))
    await open(ME, { movements: many })
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalled())
    expect(lastCall().rows).toHaveLength(12)
    expect(toasts()).toContain('Silinme_hesabati.xlsx yükləndi (12 sətir)')
  })

  it('writes NOTHING and toasts when the filtered set is empty', async () => {
    await open(ME, { movements: [mv({ type: 'Satınalma' })] })
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() =>
      expect(toasts()).toContain('Seçilmiş filtrlərə uyğun silinmə qeydi yoxdur'))
    expect(xlsWriteOff).not.toHaveBeenCalled()
    expect(fetchWriteoffAllocations).not.toHaveBeenCalled()
  })
})

describe('the capability gate', () => {
  /* CONFIRMED INACTIVE — legacy behaviour preserved exactly. */
  it('skips the read and writes ONE sheet when layers are confirmed OFF', async () => {
    layerCapability.mockResolvedValue({ ready: true, active: false, version: 1 })
    await open()
    await waitFor(() => expect(useMovementsStore.getState().layerReady).toBe(true))
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalled())
    expect(fetchWriteoffAllocations).not.toHaveBeenCalled()
    expect(lastCall().src).toEqual([])
    expect(toasts()).toContain('Silinme_hesabati.xlsx yükləndi (1 sətir)')
  })

  /* MUTATION: gating on `!layerActive` alone. An UNRESOLVED capability also
     reports active:false — treating it as confirmed-inactive would silently
     omit sheet 2 from a report whose source lots may well exist. */
  it('STILL READS when the capability probe FAILED (ready:false)', async () => {
    layerCapability.mockResolvedValue({ ready: false, active: false, version: 0 })
    await open()
    expect(useMovementsStore.getState().layerReady).toBe(false)
    expect(useMovementsStore.getState().layerActive).toBe(false)
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(fetchWriteoffAllocations).toHaveBeenCalledTimes(1))
    expect(lastCall().src).toHaveLength(1)
  })

  it('reads when layers are confirmed ACTIVE', async () => {
    await open()
    await waitFor(() => expect(useMovementsStore.getState().layerActive).toBe(true))
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(fetchWriteoffAllocations).toHaveBeenCalledTimes(1))
  })

  it('omits sheet 2 when the read legitimately returns no allocations', async () => {
    fetchWriteoffAllocations.mockResolvedValue({ rows: [], ok: true, error: null })
    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalled())
    expect(lastCall().src).toEqual([])
  })

  it('excludes reversed allocations from the written source rows', async () => {
    fetchWriteoffAllocations.mockResolvedValue({
      rows: [alloc(), alloc({ id: 'a2', reversed_at: '2026-02-01T00:00:00Z' })],
      ok: true, error: null,
    })
    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalled())
    expect(lastCall().src).toHaveLength(1)
  })
})

describe('a failed read is ALL-OR-NOTHING', () => {
  /* MUTATION: writing a one-sheet workbook on a failed read. It would be
     indistinguishable from the legitimate no-allocations case and would read
     as a complete report. */
  it('writes NO FILE AT ALL when the allocation read fails', async () => {
    fetchWriteoffAllocations.mockResolvedValue({ rows: [], ok: false, error: 'network' })
    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() =>
      expect(toasts()).toContain('Mənbə partiyalar oxunmadı — hesabat yaradılmadı'))
    expect(xlsWriteOff).not.toHaveBeenCalled()
  })

  it('does not leave the button stuck after a failure', async () => {
    fetchWriteoffAllocations.mockResolvedValue({ rows: [], ok: false, error: 'network' })
    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(toasts()).toHaveLength(1))

    fetchWriteoffAllocations.mockResolvedValue({ rows: [alloc()], ok: true, error: null })
    await userEvent.click(btn())
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalledTimes(1))
  })
})

describe('async safety', () => {
  /** A read that resolves only when released, so a race can be staged. */
  function deferredRead() {
    let release: (v: unknown) => void = () => {}
    fetchWriteoffAllocations.mockReturnValue(new Promise((r) => { release = r }))
    return { release: () => release({ rows: [alloc()], ok: true, error: null }) }
  }

  it('IGNORES a second click while a read is in flight', async () => {
    const d = deferredRead()
    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await userEvent.click(btn())
    await userEvent.click(btn())
    expect(fetchWriteoffAllocations).toHaveBeenCalledTimes(1)
    await act(async () => { d.release() })
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalledTimes(1))
  })

  /* MUTATION: reading `all`/`valuations` from the store AFTER the await. The
     parents were captured from the OLD snapshot; combining them with a newly
     refreshed one produces a file belonging to neither. */
  it('ABORTS when the snapshot is replaced mid-read', async () => {
    const d = deferredRead()
    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())

    /* A realtime refresh lands while the allocation read is in flight. */
    await act(async () => {
      useMovementsStore.setState({
        rows: [{ ...mv({ id: 'mNEW' }) }] as never,
        valuations: new Map(),
      })
    })
    await act(async () => { d.release() })

    await waitFor(() =>
      expect(toasts()).toContain('Məlumat yeniləndi — hesabatı yenidən yaradın'))
    expect(xlsWriteOff).not.toHaveBeenCalled()
  })

  it('ABORTS when the signed-in session changes mid-read', async () => {
    const d = deferredRead()
    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())

    await act(async () => {
      useAuthStore.setState({ me: { ...ME, sbId: 'someone-else' } })
    })
    await act(async () => { d.release() })

    await waitFor(() =>
      expect(toasts()).toContain('Sessiya dəyişdi — hesabatı yenidən yaradın'))
    expect(xlsWriteOff).not.toHaveBeenCalled()
  })

  it('writes NOTHING when the page unmounts mid-read', async () => {
    const d = deferredRead()
    const { unmount } = render(
      <MovementsPage me={ME} onEditDocument={vi.fn()} onNewOperation={vi.fn()} />,
    )
    await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
    await selectWriteOffFilter()
    await userEvent.click(btn())
    unmount()
    await act(async () => { d.release() })
    expect(xlsWriteOff).not.toHaveBeenCalled()
  })

  it('allows a NEW export after an aborted one', async () => {
    const d = deferredRead()
    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await act(async () => {
      useMovementsStore.setState({ rows: [{ ...mv() }] as never })
    })
    await act(async () => { d.release() })
    await waitFor(() => expect(toasts()).toHaveLength(1))

    fetchWriteoffAllocations.mockResolvedValue({ rows: [alloc()], ok: true, error: null })
    await userEvent.click(btn())
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalledTimes(1))
  })
})

describe('no alarming diagnostics for ordinary filtering', () => {
  /* A parent outside the exported filter is the NORMAL result of filtering.
     It must not produce a warning toast. */
  it('toasts only the success message when allocations fall outside the filter', async () => {
    fetchWriteoffAllocations.mockResolvedValue({
      rows: [alloc(), alloc({ id: 'a2', writeoff_movement_id: 'not-exported' })],
      ok: true, error: null,
    })
    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalled())
    expect(toasts()).toEqual(['Silinme_hesabati.xlsx yükləndi (1 sətir)'])
    expect(useToastStore.getState().messages.every((m) => !m.isError)).toBe(true)
    expect(lastCall().src).toHaveLength(1)
  })
})

describe('the ordinary export is untouched', () => {
  it('leaves the «Excel» button working and independent', async () => {
    await open()
    expect((screen.getByTestId('mv-export') as HTMLButtonElement).disabled).toBe(false)
    await selectWriteOffFilter()
    expect((screen.getByTestId('mv-export') as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('a CACHED capability is not fresh evidence (I-9 audit)', () => {
  /* The store deliberately RETAINS `layerReady`/`layerActive` when a later
     probe fails — losing a probe is not evidence the capability changed, and
     flipping the cancellation write family on a lost probe would be worse.
     That retention is correct and is not changed here.

     The export, though, uses the same pair to decide whether to SKIP the
     allocation read outright. A capability confirmed inactive at boot and
     merely REMEMBERED across a later successful refresh whose probe failed
     would omit «Mənbə partiyalar» on evidence nothing reconfirmed — and the
     resulting one-sheet file is indistinguishable from a genuine
     no-source-lots report.

     These tests drive the REAL store transitions through `load()`; they never
     assign the capability flags by hand, so a fix that merely renamed a flag
     would not satisfy them. */

  /** Boot confirmed-inactive, then refresh successfully with a FAILED probe. */
  async function staleConfirmedInactive() {
    layerCapability.mockResolvedValue({ ready: true, active: false, version: 1 })
    await open()
    await waitFor(() => expect(useMovementsStore.getState().layerFresh).toBe(true))

    /* A real refresh: the snapshot succeeds, the probe does not. */
    layerCapability.mockResolvedValue({ ready: false, active: false, version: 0 })
    fetchMovementsSnapshot.mockResolvedValue(
      snapshot({ movements: [mv({ id: 'm1', doc_num: 'D-2' })] }),
    )
    await act(async () => { await useMovementsStore.getState().load() })

    const st = useMovementsStore.getState()
    /* Preconditions — this is the retained-but-stale state, not a cold probe
       failure and not a failed load. */
    expect(st.layerReady).toBe(true)
    expect(st.layerActive).toBe(false)
    expect(st.layerFresh).toBe(false)
    expect(st.loaded).toBe(true)
  }

  /* THE MUTATION: `layerReady && !layerActive` without the freshness term.
     That gate reads the retained pair as "confirmed inactive" and skips the
     read — the silent omission this finding is about. */
  it('READS the allocations instead of trusting a retained confirmed-inactive capability', async () => {
    await staleConfirmedInactive()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(fetchWriteoffAllocations).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalled())
    /* Sheet 2 is present — it would have been silently absent before. */
    expect(lastCall().src).toHaveLength(1)
  })

  /* FAIL SAFELY when freshness cannot be established: if the read that would
     settle the question also fails, NO file is written. A one-sheet workbook
     here would carry the same false "no source lots" meaning. */
  it('writes NO FILE when the stale-capability read also fails', async () => {
    fetchWriteoffAllocations.mockResolvedValue({ rows: [], ok: false, error: 'network' })
    await staleConfirmedInactive()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() =>
      expect(toasts()).toContain('Mənbə partiyalar oxunmadı — hesabat yaradılmadı'))
    expect(xlsWriteOff).not.toHaveBeenCalled()
  })

  /* GENUINELY confirmed-inactive behaviour is PRESERVED: a FRESH
     {ready:true, active:false} still skips the read and writes one sheet,
     exactly as legacy does. The fix must not turn every export into a read. */
  it('still skips the read when the confirmation is FRESH', async () => {
    layerCapability.mockResolvedValue({ ready: true, active: false, version: 1 })
    await open()
    /* A second successful load whose probe ALSO answers keeps it fresh. */
    await act(async () => { await useMovementsStore.getState().load() })
    expect(useMovementsStore.getState().layerFresh).toBe(true)

    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalled())
    expect(fetchWriteoffAllocations).not.toHaveBeenCalled()
    expect(lastCall().src).toEqual([])
  })

  /* Cancellation routing keeps its intentionally retained capability: the
     export-scoped fix must not have moved that decision. */
  it('leaves the RETAINED cancellation capability intact', async () => {
    await staleConfirmedInactive()
    const st = useMovementsStore.getState()
    expect(st.layerReady).toBe(true)
    expect(st.layerActive).toBe(false)
  })
})

describe('a refresh in progress blocks the report (I-9 audit)', () => {
  /* `canExportWriteOff` checked `loaded` and the type filter only, and the
     post-await guard compares snapshot IDENTITIES. A refresh that has started
     but not settled changes neither: `loaded` stays true and `rows`/
     `valuations` still hold their previous objects. So the report could be
     built and downloaded from a snapshot the store was in the act of
     replacing, with nothing on screen indicating it.

     Both races below start a REAL `load()` and leave it unresolved. */

  /** Starts a real store load that will not settle until released. */
  function pendingRefresh() {
    let release: (v: unknown) => void = () => {}
    fetchMovementsSnapshot.mockReturnValue(new Promise((r) => { release = r }))
    return {
      start: () => { void useMovementsStore.getState().load() },
      release: async () => { await act(async () => { release(snapshot()) }) },
    }
  }

  it('DISABLES the button while a refresh is running', async () => {
    await open()
    await selectWriteOffFilter()
    expect(btn().disabled).toBe(false)

    const r = pendingRefresh()
    await act(async () => { r.start() })
    expect(useMovementsStore.getState().loading).toBe(true)
    /* `loaded` is still true — the old gate would have left this enabled. */
    expect(useMovementsStore.getState().loaded).toBe(true)
    expect(btn().disabled).toBe(true)

    await r.release()
    expect(btn().disabled).toBe(false)
  })

  /* THE MUTATION: relying on the disabled attribute alone. The handler is
     reachable while a refresh is running — one can begin between the render
     that enabled the button and the click that fires it — so it rechecks. */
  it('REFUSES when a refresh is already running at click time', async () => {
    await open()
    await selectWriteOffFilter()

    /* The refresh begins WITHOUT letting React re-render, so the button in the
       DOM is still the enabled one the user was looking at. This is the real
       gap: the disabled attribute always lags the store by a render. */
    const r = pendingRefresh()
    r.start()
    expect(useMovementsStore.getState().loading).toBe(true)
    expect(btn().disabled).toBe(false)
    await act(async () => { btn().click() })

    expect(fetchWriteoffAllocations).not.toHaveBeenCalled()
    expect(xlsWriteOff).not.toHaveBeenCalled()
    expect(toasts()).toContain('Məlumat yenilənir — hesabatı yenidən yaradın')
    await r.release()
  })

  /* THE OTHER MUTATION: the post-await identity check alone. A refresh that
     STARTS during the allocation read has not replaced the objects yet, so
     `rows`/`valuations` still compare equal and the file would be written. */
  it('REFUSES when a refresh STARTS during the allocation read', async () => {
    let releaseRead: (v: unknown) => void = () => {}
    fetchWriteoffAllocations.mockReturnValue(new Promise((r) => { releaseRead = r }))

    await open()
    await selectWriteOffFilter()
    await userEvent.click(btn())
    await waitFor(() => expect(fetchWriteoffAllocations).toHaveBeenCalledTimes(1))

    /* A real refresh begins mid-read and does NOT settle: identities unchanged. */
    const r = pendingRefresh()
    await act(async () => { r.start() })
    const st = useMovementsStore.getState()
    expect(st.loading).toBe(true)
    expect(st.rows.length).toBe(1)

    await act(async () => { releaseRead({ rows: [alloc()], ok: true, error: null }) })

    expect(xlsWriteOff).not.toHaveBeenCalled()
    expect(toasts()).toContain('Məlumat yenilənir — hesabatı yenidən yaradın')
    await r.release()
  })

  it('allows the report again once the refresh settles', async () => {
    await open()
    await selectWriteOffFilter()
    const r = pendingRefresh()
    r.start()
    await act(async () => { btn().click() })
    await waitFor(() => expect(toasts()).toHaveLength(1))

    await r.release()
    await userEvent.click(btn())
    await waitFor(() => expect(xlsWriteOff).toHaveBeenCalledTimes(1))
  })

  /* The ordinary Excel export is UNCHANGED — it is synchronous and issues no
     second read, so an in-flight refresh is not a window for it. */
  it('leaves the ordinary Excel export enabled during a refresh', async () => {
    await open()
    await selectWriteOffFilter()
    const r = pendingRefresh()
    await act(async () => { r.start() })
    expect((screen.getByTestId('mv-export') as HTMLButtonElement).disabled).toBe(false)
    await r.release()
  })
})
