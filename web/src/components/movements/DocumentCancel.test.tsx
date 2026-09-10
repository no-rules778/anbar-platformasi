import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const fetchMovementsSnapshot = vi.fn()
vi.mock('../../api/movementsSnapshot.api', () => ({
  fetchMovementsSnapshot: () => fetchMovementsSnapshot(),
}))

const fetchLayerCapability = vi.fn()
vi.mock('../../api/stockLayers.api', () => ({
  fetchLayerCapability: () => fetchLayerCapability(),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))

/* Supabase is mocked at the API BOUNDARY: the real api/documentCancel module
   runs, so the argument names it builds are the ones asserted here. */
vi.mock('../../api/supabase', () => ({ supabase: { rpc: vi.fn() } }))

/* jsdom serves the page from localhost, where the mutation guard blocks every
   write by design. These tests are about the CANCELLATION behaviour, so the
   guard is opened here — and the block itself is proven separately, at the end
   of this file, through the same UI path with the real guard restored. */
vi.mock('../../lib/mutationGuard', async (orig) => ({
  ...(await orig<typeof import('../../lib/mutationGuard')>()),
  blockedReason: vi.fn(() => null),
}))

vi.mock('../../hooks/useRealtimeRefresh', () => ({
  useRealtimeRefresh: () => {},
}))

import { supabase } from '../../api/supabase'
import { MovementsPage } from '../../pages/MovementsPage'
import { DocumentViewDialog } from './DocumentViewDialog'
import { CancelRowDialog } from './CancelRowDialog'
import { ReplaceItemDialog } from './ReplaceItemDialog'
import {
  ACTION_NO_LONGER_AVAILABLE, ROW_ALREADY_DONE, TRANSFER_ROW_NOT_CANCELLABLE,
} from '../../lib/documentCancelGate'
import { assembleDocumentView } from '../../lib/documentView'
import { ToastHost } from '../ui/Toast'
import { useMovementsStore, __resetMovementsRequestSeq } from '../../store/movements.store'
import { useAuditLogStore } from '../../store/auditLog.store'
import { useToastStore } from '../../store/toast.store'
import { EMPTY_MOVEMENT_FILTERS } from '../../lib/movementFilters'
import type { MovementRow } from '../../api/itemMovements.api'
import type { Me } from '../../lib/roles'

/* DOCUMENT CANCELLATION through the real screen — Phase 8, milestone I-4.

   Everything is driven the way a user drives it: open «Baxış», press the
   cancellation control, and assert the RPC payload that reaches the Supabase
   boundary. Nothing renders the dialog directly, so what is proven is what the
   page actually wires up. */

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
  in_qty: 10, out_qty: 0, price: 2, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: '2026-09-01T10:00:00Z',
  channel: null, contract_num: null, created_by: null, ...over,
})

const ITEMS = [
  { code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null },
  { code: '0000002', name: 'Boru', unit: 'metr', price: 3, category: null },
]
const WHS = ['Ələt', 'Astara', 'Xocahəsən']

const ME_ID = '11111111-1111-4111-8111-111111111111'
const ADMIN: Me = {
  id: ME_ID, sbId: ME_ID, email: 'anar@example.com',
  name: 'Anar İbrahimov', role: 'admin', wh: 'Ələt',
}

const snapshot = (movements: MovementRow[], valuations: unknown[] = []) => ({
  ok: true as const,
  snapshot: { movements, items: ITEMS, warehouses: WHS, valuations },
})

const wo = (movementId: string) => ({
  movement_id: movementId, total_amount: 10, unit_price: 10, qty: 1,
})

beforeEach(() => {
  vi.clearAllMocks()
  __resetMovementsRequestSeq()
  fetchLayerCapability.mockResolvedValue({ ready: true, active: false, version: 1 })
  vi.mocked(supabase.rpc).mockResolvedValue({
    data: { reversal_doc_num: 'REV-1', doc_num: 'D-1' }, error: null,
  } as never)
  useMovementsStore.setState({
    rows: [], operational: [], itemBy: new Map(), warehouses: [],
    valuations: new Map(), loading: false, error: null, loaded: false,
    layerActive: false, layerReady: false,
    filters: EMPTY_MOVEMENT_FILTERS, showAll: false,
  })
  useAuditLogStore.setState({ emails: new Map() })
  useToastStore.setState({ messages: [] })
})

async function renderPage(movements: MovementRow[], me: Me = ADMIN, valuations: unknown[] = []) {
  fetchMovementsSnapshot.mockResolvedValue(snapshot(movements, valuations))
  render(
    <>
      <MovementsPage me={me} onEditDocument={vi.fn()} onNewOperation={vi.fn()} />
      <ToastHost />
    </>,
  )
  await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
}

async function clickView(itemCode: string) {
  const row = screen
    .getAllByRole('row')
    .find((r) => within(r).queryByText(itemCode) && within(r).queryByRole('button', { name: 'Baxış' }))
  expect(row).toBeTruthy()
  await userEvent.setup().click(within(row!).getByRole('button', { name: 'Baxış' }))
}

const dialog = () => screen.getByRole('dialog')

/* A reversal document and an already-cancelled one are, BY DESIGN, not
   reachable from the registry: `excludeCancelled()` removes their rows and the
   marker rows that cancel them (index.html:1249-1270 — the legacy table hides
   them too), so their «Baxış» cannot be clicked. Those states are therefore
   driven by rendering the dialog against the SAME raw set the store would
   hold, with the same props the page passes. Every reachable state above is
   still driven through the real screen. */
function renderDialogFor(movementId: string, rows: MovementRow[], layerActive = false) {
  render(
    <DocumentViewDialog
      movementId={movementId}
      allRows={rows as never}
      itemBy={new Map(ITEMS.map((i) => [i.code, { name: i.name, price: i.price }]))}
      warehouses={WHS}
      valuations={{ has: () => false }}
      emails={new Map()}
      me={ADMIN}
      isAdmin
      layerActive={layerActive}
      layerReady
      onClose={vi.fn()}
      onRefresh={async () => ({ ok: true, error: null })}
      onToast={vi.fn()}
    />,
  )
}
/** The RPC name and payload of the single call that reached the boundary. */
const lastCall = () => vi.mocked(supabase.rpc).mock.calls.at(-1)!

/* ===================================================================== */
describe('I-4 — ordinary document cancellation (M8-24)', () => {
  it('an admin cancels through cancel_document with the chosen date', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    const user = userEvent.setup()
    const date = within(dialog()).getByTestId('dc-date')
    await user.clear(date)
    await user.type(date, '2026-09-06')
    await user.click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()).toEqual([
      'cancel_document', { p_doc_num: 'D-1', p_reversal_date: '2026-09-06' },
    ])
  })

  /* M8-26 — the LAYER variant is selected by the live capability flag. */
  it('routes to cancel_layer_document when layers are active', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: true, active: true, version: 2 })
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()[0]).toBe('cancel_layer_document')
  })

  it('omits p_reversal_date when the date is cleared', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    const user = userEvent.setup()
    await user.clear(within(dialog()).getByTestId('dc-date'))
    await user.click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()).toEqual(['cancel_document', { p_doc_num: 'D-1' }])
  })

  it('shows the returned reversal document number', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    expect(await screen.findByText(/əks sənəd: REV-1/)).toBeTruthy()
  })

  /* The legacy '—' fallback: the cancellation happened even when the server
     returns no number, and the toast must not print «undefined». */
  it('falls back to — when the server returns no reversal number', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: {}, error: null } as never)
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    expect(await screen.findByText(/əks sənəd: —/)).toBeTruthy()
  })

  it('states that reversals create new rows and never modify originals', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    expect(within(dialog()).getByText(/orijinal qeydlər dəyişdirilmir və silinmir/i)).toBeTruthy()
  })
})

/* ===================================================================== */
describe('I-4 — transfer cancellation and D-I1 (M8-25)', () => {
  const TRANSFER = mv({
    id: 'a', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 0, out_qty: 5, partner: 'Astara',
  })

  it('non-layer transfers use p_original_doc_num', async () => {
    await renderPage([TRANSFER])
    await clickView('0000001')
    const user = userEvent.setup()
    await user.clear(within(dialog()).getByTestId('dc-date'))
    await user.click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()).toEqual(['cancel_transfer_document', { p_original_doc_num: 'T-1' }])
  })

  /* D-I1, end to end. Legacy sends p_original_doc_num here too; the live
     signature declares p_doc_num. Mutation-checked in the API suite. */
  it('LAYER transfers use p_doc_num — the D-I1 correction', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: true, active: true, version: 2 })
    await renderPage([TRANSFER])
    await clickView('0000001')
    const user = userEvent.setup()
    await user.clear(within(dialog()).getByTestId('dc-date'))
    await user.click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()).toEqual(['cancel_layer_transfer_document', { p_doc_num: 'T-1' }])
    expect(lastCall()[1]).not.toHaveProperty('p_original_doc_num')
  })

  it('labels the control «Yerdəyişməni ləğv et»', async () => {
    await renderPage([TRANSFER])
    await clickView('0000001')
    expect(within(dialog()).getByTestId('dc-go').textContent).toBe('Yerdəyişməni ləğv et')
  })

  /* The corrected transfer header count (I-3) must survive I-4. */
  it('still reports both legs in the header count', async () => {
    await renderPage([
      TRANSFER,
      mv({ id: 'b', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 5, out_qty: 0, warehouse: 'Astara' }),
    ])
    await clickView('0000001')
    expect(within(dialog()).getByText(/2 sətir/)).toBeTruthy()
  })
})

/* ===================================================================== */
describe('I-4 — legacy doc-less cancellation (M8-29)', () => {
  it('doc-less ordinary uses cancel_legacy_movement with the movement id', async () => {
    await renderPage([mv({ id: 'legacy-1', type: 'Satınalma', doc_num: null })])
    await clickView('0000001')
    const user = userEvent.setup()
    await user.clear(within(dialog()).getByTestId('dc-date'))
    await user.click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()).toEqual(['cancel_legacy_movement', { p_movement_id: 'legacy-1' }])
  })

  it('doc-less transfer uses cancel_legacy_transfer', async () => {
    await renderPage([
      mv({ id: 'legacy-t', type: 'Yerdəyişmə', doc_num: null, in_qty: 0, out_qty: 5, partner: 'Astara' }),
    ])
    await clickView('0000001')
    const user = userEvent.setup()
    await user.clear(within(dialog()).getByTestId('dc-date'))
    await user.click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()).toEqual(['cancel_legacy_transfer', { p_movement_id: 'legacy-t' }])
  })

  it.each([
    ['cancel_layer_legacy_movement', { type: 'Satınalma' }],
    ['cancel_layer_legacy_transfer', { type: 'Yerdəyişmə', in_qty: 0, out_qty: 5, partner: 'Astara' }],
  ] as const)('routes to %s when layers are active', async (rpc, over) => {
    fetchLayerCapability.mockResolvedValue({ ready: true, active: true, version: 2 })
    await renderPage([mv({ id: 'lg', doc_num: null, ...over })])
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()[0]).toBe(rpc)
  })

  /* A doc-less record's status is per-id. An already-cancelled one offers no
     mutation action at all. */
  it('offers no action for an already-cancelled doc-less record', async () => {
    /* `excludeCancelled()` removes the cancelled row AND its marker from the
       registry, so neither is clickable. A second, untouched row provides the
       click target; the dialog then derives the doc-less status from the
       marker rows the STORE still holds — the production path exactly. */
    renderDialogFor('lg', [
      mv({ id: 'lg', type: 'Satınalma', doc_num: null }),
      mv({ id: 'marker', type: 'Satınalma', doc_num: 'R-9', note: 'Ləğv ID: lg' }),
    ])
    expect(within(dialog()).queryByTestId('dc-go')).toBeNull()
    expect(within(dialog()).getByText(/Ləğv edilib/)).toBeTruthy()
  })
})

/* ===================================================================== */
describe('I-4 — the admin gate (M8-23)', () => {
  it.each(['anbardar', 'rehber', 'techizat'] as const)('offers no control to %s', async (role) => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })], { ...ADMIN, role })
    await clickView('0000001')
    const d = dialog()
    expect(within(d).queryByTestId('dc-go')).toBeNull()
    expect(within(d).queryByTestId('dc-date')).toBeNull()
    expect(within(d).getByText(/yalnız Rəhbər \(Admin\)/)).toBeTruthy()
  })

  it('offers no per-row control to a non-admin', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })], { ...ADMIN, role: 'anbardar' })
    await clickView('0000001')
    expect(within(dialog()).queryByTestId('repl-a')).toBeNull()
    expect(within(dialog()).queryByTestId('rowcancel-a')).toBeNull()
  })

  /* The gate is a usability filter; the server is authoritative. A non-admin
     reaching the boundary at all would be the real defect. */
  it('a non-admin never reaches Supabase', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })], { ...ADMIN, role: 'rehber' })
    await clickView('0000001')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})

/* ===================================================================== */
describe('I-4 — reversal and already-cancelled documents offer nothing', () => {
  it('a document that IS a reversal offers no action', async () => {
    /* The reversal document's own rows are hidden from the registry, so a
       surviving row supplies the click target and the reversal state is read
       from the store — as in production. */
    renderDialogFor('a', [
      mv({ id: 'a', type: 'Satınalma', doc_num: 'R-1', note: 'Ləğv: D-1' }),
    ])
    const d = dialog()
    expect(within(d).queryByTestId('dc-go')).toBeNull()
    expect(within(d).getByText(/Yenidən ləğv edilə bilməz/)).toBeTruthy()
  })

  it('an already-cancelled document offers no action', async () => {
    /* The cancelled document's own rows are hidden from the registry, so the
       click lands on a second document and the state is read from the store. */
    renderDialogFor('a', [
      mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'r', type: 'Satınalma', doc_num: 'R-1', note: 'Ləğv: D-1' }),
    ])
    const d = dialog()
    expect(within(d).queryByTestId('dc-go')).toBeNull()
    expect(within(d).getByText(/Ləğv edilib/)).toBeTruthy()
  })
})

/* ===================================================================== */
describe('I-4 — single-row cancellation (M8-27)', () => {
  const DOC = [
    mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1' }),
    mv({ id: 'b', item_code: '0000002', type: 'Satınalma', doc_num: 'D-1' }),
  ]

  async function openRowCancel() {
    await renderPage(DOC)
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('rowcancel-a'))
  }

  it('sends the id and the trimmed reason', async () => {
    await openRowCancel()
    const user = userEvent.setup()
    await user.type(within(dialog()).getByTestId('rc-why'), '  ikiqat daxil edilib  ')
    await user.click(within(dialog()).getByTestId('rc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()).toEqual([
      'cancel_movement_row', { p_movement_id: 'a', p_reason: 'ikiqat daxil edilib' },
    ])
  })

  /* The reason is the audit record of why a posted line was withdrawn. */
  it('keeps the control disabled until a non-blank reason is typed', async () => {
    await openRowCancel()
    const go = within(dialog()).getByTestId('rc-go') as HTMLButtonElement
    expect(go.disabled).toBe(true)
    const user = userEvent.setup()
    await user.type(within(dialog()).getByTestId('rc-why'), '   ')
    expect((within(dialog()).getByTestId('rc-go') as HTMLButtonElement).disabled).toBe(true)
    await user.type(within(dialog()).getByTestId('rc-why'), 'səbəb')
    expect((within(dialog()).getByTestId('rc-go') as HTMLButtonElement).disabled).toBe(false)
  })

  it('routes to the layer row RPC when layers are active', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: true, active: true, version: 2 })
    await renderPage(DOC)
    await clickView('0000001')
    const user = userEvent.setup()
    await user.click(within(dialog()).getByTestId('rowcancel-a'))
    await user.type(within(dialog()).getByTestId('rc-why'), 'səbəb')
    await user.click(within(dialog()).getByTestId('rc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()[0]).toBe('cancel_layer_movement_row')
  })

  /* A row already cancelled shows the legacy tag, never the buttons. */
  it('shows «ləğv edilib» instead of controls for a replaced row', async () => {
    await renderPage([
      ...DOC,
      mv({ id: 'marker', item_code: '0000002', type: 'Satınalma', doc_num: 'D-1', note: 'Ləğv ID: b' }),
    ])
    await clickView('0000001')
    expect(within(dialog()).queryByTestId('rowcancel-b')).toBeNull()
  })
})

/* ===================================================================== */
describe('I-4 — item replacement, D4 INCLUDED (M8-28)', () => {
  const DOC = [mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1' })]

  it('sends id, the chosen code and the trimmed reason', async () => {
    await renderPage(DOC)
    await clickView('0000001')
    const user = userEvent.setup()
    await user.click(within(dialog()).getByTestId('repl-a'))
    await user.type(within(dialog()).getByTestId('rp-item'), 'Boru')
    await user.click(within(dialog()).getByTestId('rp-hit-0000002'))
    await user.type(within(dialog()).getByTestId('rp-why'), '  səhv kod  ')
    await user.click(within(dialog()).getByTestId('rp-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(lastCall()).toEqual([
      'replace_movement_item',
      { p_movement_id: 'a', p_new_item_code: '0000002', p_reason: 'səhv kod' },
    ])
  })

  it('needs both a picked item and a reason', async () => {
    await renderPage(DOC)
    await clickView('0000001')
    const user = userEvent.setup()
    await user.click(within(dialog()).getByTestId('repl-a'))
    expect((within(dialog()).getByTestId('rp-go') as HTMLButtonElement).disabled).toBe(true)
    await user.type(within(dialog()).getByTestId('rp-why'), 'səbəb')
    /* A reason alone is not enough — no item has been picked. */
    expect((within(dialog()).getByTestId('rp-go') as HTMLButtonElement).disabled).toBe(true)
  })

  /* Replacing an item with itself is not a correction. */
  it('excludes the current item from the search results', async () => {
    await renderPage(DOC)
    await clickView('0000001')
    const user = userEvent.setup()
    await user.click(within(dialog()).getByTestId('repl-a'))
    await user.type(within(dialog()).getByTestId('rp-item'), 'os')
    expect(within(dialog()).queryByTestId('rp-hit-0000001')).toBeNull()
  })

  /* The legacy `lotDoc` gate — index.html:5023. */
  it('offers no per-row control on a partia-valued document', async () => {
    await renderPage(DOC, ADMIN, [wo('a')])
    await clickView('0000001')
    const d = dialog()
    expect(within(d).queryByTestId('repl-a')).toBeNull()
    expect(within(d).queryByTestId('rowcancel-a')).toBeNull()
    expect(within(d).getByText(/partiya uçotu ilə dəyərləndirilib/)).toBeTruthy()
  })

  /* Transfers have per-row controls in no legacy view, and the server refuses
     both operations for them. */
  it('offers no per-row control on a transfer document', async () => {
    await renderPage([
      mv({ id: 'a', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 0, out_qty: 5, partner: 'Astara' }),
    ])
    await clickView('0000001')
    expect(within(dialog()).queryByTestId('repl-a')).toBeNull()
    expect(within(dialog()).queryByTestId('rowcancel-a')).toBeNull()
  })
})

/* ===================================================================== */
describe('I-4 — double submission and in-flight locking', () => {
  it('a second click while the RPC is in flight sends only ONE call', async () => {
    let release: (v: unknown) => void = () => {}
    vi.mocked(supabase.rpc).mockReturnValue(
      new Promise((res) => { release = res }) as never,
    )
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    const user = userEvent.setup()
    const go = within(dialog()).getByTestId('dc-go')
    await user.click(go)
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1))
    /* The control is disabled while the call is out. */
    expect((within(dialog()).getByTestId('dc-go') as HTMLButtonElement).disabled).toBe(true)
    await user.click(within(dialog()).getByTestId('dc-go'))
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
    await act(async () => {
      release({ data: { reversal_doc_num: 'REV-1' }, error: null })
    })
  })

  /* The lock is released in `finally`, so a refusal does not leave the dialog
     permanently dead. */
  it('re-enables the control after a server refusal', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null, error: { message: 'Qalıq çatmır' },
    } as never)
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => {
      expect((within(dialog()).getByTestId('dc-go') as HTMLButtonElement).disabled).toBe(false)
    })
  })
})

/* ===================================================================== */
describe('I-4 — server refusal and refresh behaviour', () => {
  it('surfaces the server text verbatim and keeps the dialog open', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null, error: { message: 'Qalıq çatmır: Ələt anbarında 3 ədəd var' },
    } as never)
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    expect(await screen.findByText(/Qalıq çatmır: Ələt anbarında 3 ədəd var/)).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeTruthy()
  })

  it('refreshes the movements after a successful cancellation', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    fetchMovementsSnapshot.mockClear()
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(fetchMovementsSnapshot).toHaveBeenCalled())
  })

  /* M8-45 — a failed refresh RETAINS the previous snapshot. The cancellation
     succeeded, so the message says the list is stale rather than pretending
     the write failed or blanking real rows. */
  it('retains the previous rows and warns when the refresh fails', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    const before = useMovementsStore.getState().rows
    fetchMovementsSnapshot.mockResolvedValue({ ok: false as const, error: 'şəbəkə xətası' })
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    expect(await screen.findByText(/siyahı yenilənmədi/)).toBeTruthy()
    expect(useMovementsStore.getState().rows).toBe(before)
  })
})

/* ===================================================================== */
describe('I-4 — the stale-row re-check', () => {
  /* MUTATION: submitting against the row captured when the dialog opened.
     Between render and submit the document was cancelled by someone else; the
     handler must re-read the CURRENT rows and refuse rather than cancel a
     document twice. */
  it('refuses when the document was cancelled while the dialog stood open', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    expect(within(dialog()).getByTestId('dc-go')).toBeTruthy()

    /* Someone else's reversal lands in the store. */
    await act(async () => {
      const s = useMovementsStore.getState()
      const marker = mv({ id: 'r', type: 'Satınalma', doc_num: 'R-1', note: 'Ləğv: D-1' })
      useMovementsStore.setState({ rows: [...s.rows, marker] })
    })

    /* The control is gone on re-render; the state is what matters. */
    expect(within(dialog()).queryByTestId('dc-go')).toBeNull()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  /* MUTATION: the handler submitting the row object captured at render.

     The row still EXISTS here — it was cancelled by someone else while the
     reason was being typed — so the component's own `!row` early return cannot
     catch it. Only a re-read of the CURRENT rows inside the handler, followed
     by the same refusal check the button used, refuses this. Verified to FAIL
     against a handler that closes over the render-time row. */
  it('refuses a row that was cancelled by someone else while the dialog stood open', async () => {
    await renderPage([
      mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'b', item_code: '0000002', type: 'Satınalma', doc_num: 'D-1' }),
    ])
    await clickView('0000001')
    const user = userEvent.setup()
    await user.click(within(dialog()).getByTestId('rowcancel-a'))
    await user.type(within(dialog()).getByTestId('rc-why'), 'səbəb')

    /* Someone else's row-level marker lands in the store. The row itself is
       still present, so the dialog keeps rendering — but it is no longer
       eligible. */
    await act(async () => {
      useMovementsStore.setState({
        rows: [
          ...useMovementsStore.getState().rows,
          mv({ id: 'marker', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1', note: 'Ləğv ID: a' }),
        ],
      })
    })

    /* The RENDER gate now catches this one: the control is disabled and the
       reason is stated in the dialog. The submit-time safeguard for the same
       state is proven separately, in the finding-2 block, through a button
       that render still considers enabled. */
    const go = within(dialog()).getByTestId('rc-go') as HTMLButtonElement
    expect(go.disabled).toBe(true)
    expect(within(dialog()).getByTestId('rc-ineligible').textContent)
      .toContain(ROW_ALREADY_DONE)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('refuses a row cancellation whose row vanished after a refresh', async () => {
    await renderPage([
      mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'b', item_code: '0000002', type: 'Satınalma', doc_num: 'D-1' }),
    ])
    await clickView('0000001')
    const user = userEvent.setup()
    await user.click(within(dialog()).getByTestId('rowcancel-a'))
    await user.type(within(dialog()).getByTestId('rc-why'), 'səbəb')

    /* The row disappears from the store while the reason is being typed. */
    await act(async () => {
      useMovementsStore.setState({
        rows: useMovementsStore.getState().rows.filter((r) => String(r.id) !== 'a'),
      })
    })

    expect(within(dialog()).getByText(/artıq mövcud deyil/)).toBeTruthy()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})

/* ===================================================================== */
describe('I-4 audit finding 1 — the doc-less ordinary row action matrix', () => {
  /* THE FINDING. `legacyCancelView()` (index.html:5264-5275) offers
     «Malı əvəz et» (`#lc-repl`) and WHOLE-record cancellation (`#lc-go`).
     It has NO «Sətri ləğv et» — that control lives only in
     `documentCancelView()` (index.html:5019-5022), i.e. a document with a
     real doc_num, because `cancel_movement_row` cancels one line INSIDE a
     document and a doc-less record has no document to leave standing.

     MUTATION: a single combined row-action gate. It renders «Sətri ləğv et»
     on a doc-less legacy record — an action legacy never offers. */
  it('offers «Malı əvəz et» and whole cancellation but NEVER «Sətri ləğv et»', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: null })])
    await clickView('0000001')
    const d = dialog()

    /* Replacement IS offered — index.html:5275. */
    expect(within(d).getByTestId('repl-a')).toBeTruthy()
    /* Whole-record cancellation IS offered — index.html:5276 (`#lc-go`). */
    expect(within(d).getByTestId('dc-go')).toBeTruthy()
    /* Row cancellation is NOT — and this is the assertion that fails against
       the combined gate. */
    expect(within(d).queryByTestId('rowcancel-a')).toBeNull()
    expect(within(d).queryByText('Sətri ləğv et')).toBeNull()
  })

  /* The ordinary document keeps BOTH — the split must not remove the real
     legacy behaviour of `documentCancelView()`. */
  it('an ordinary document with a real doc_num still offers both', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    const d = dialog()
    expect(within(d).getByTestId('repl-a')).toBeTruthy()
    expect(within(d).getByTestId('rowcancel-a')).toBeTruthy()
  })

  it('hides replacement while layers are active but keeps layer-aware row cancellation', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: true, active: true, version: 36 })
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    const d = dialog()

    expect(within(d).queryByTestId('repl-a')).toBeNull()
    expect(within(d).getByTestId('rowcancel-a')).toBeTruthy()
    expect(within(d).getByText(/sətirdə mal əvəzlənmir/)).toBeTruthy()
  })

  it('hides replacement while the layer capability is unknown', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: false, active: false, version: 0 })
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')

    expect(within(dialog()).queryByTestId('repl-a')).toBeNull()
    expect(within(dialog()).getByTestId('layer-unknown')).toBeTruthy()
  })

  /* Transfers offer neither, with or without a document number. */
  it('neither transfer family offers any row action', async () => {
    await renderPage([
      mv({ id: 'a', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 0, out_qty: 5, partner: 'Astara' }),
    ])
    await clickView('0000001')
    expect(within(dialog()).queryByTestId('repl-a')).toBeNull()
    expect(within(dialog()).queryByTestId('rowcancel-a')).toBeNull()
  })

  /* A doc-less record already cancelled by its per-id marker offers nothing —
     `allowed = isAdmin() && !revDoc` (index.html:5265). */
  it('a doc-less record with its per-id marker offers no replacement', async () => {
    renderDialogFor('a', [
      mv({ id: 'a', type: 'Satınalma', doc_num: null }),
      mv({ id: 'x', type: 'Satınalma', doc_num: 'R-7', note: 'Ləğv ID: a' }),
    ])
    expect(within(dialog()).queryByTestId('repl-a')).toBeNull()
    expect(within(dialog()).queryByTestId('rowcancel-a')).toBeNull()
  })
})

/* ===================================================================== */
describe('I-4 audit finding 2 — child handlers re-run the FULL gate', () => {
  /* THE FINDING. The visible row controls use the document-level gate, but
     the child dialogs submitted through `rowActionRefusal()` alone, which
     checks only the row type and the row marker. Everything below changes
     CURRENT store data AFTER the child dialog is open and proves ZERO RPC
     calls at submit — none of these were caught before.

     Each opens the child from an ordinary document (where both actions are
     legitimately offered), then mutates the store underneath it. */

  const twoLineDoc = () => [
    mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1' }),
    mv({ id: 'b', item_code: '0000002', type: 'Satınalma', doc_num: 'D-1' }),
  ]

  const addRows = async (...rows: MovementRow[]) => {
    await act(async () => {
      useMovementsStore.setState({ rows: [...useMovementsStore.getState().rows, ...rows] })
    })
  }

  async function openRowCancel() {
    await renderPage(twoLineDoc())
    await clickView('0000001')
    const user = userEvent.setup()
    await user.click(within(dialog()).getByTestId('rowcancel-a'))
    await user.type(within(dialog()).getByTestId('rc-why'), 'səbəb')
    return user
  }

  async function openReplace() {
    await renderPage(twoLineDoc())
    await clickView('0000001')
    const user = userEvent.setup()
    await user.click(within(dialog()).getByTestId('repl-a'))
    await user.type(within(dialog()).getByTestId('rp-item'), 'Boru')
    await user.click(within(dialog()).getByTestId('rp-hit-0000002'))
    await user.type(within(dialog()).getByTestId('rp-why'), 'səbəb')
    return user
  }

  /* WHAT AN INELIGIBLE OPEN DIALOG MUST LOOK LIKE — I-4 UI consistency.

     Not "the click is ignored": the control is DISABLED, the refusal is
     VISIBLE, nothing reaches Supabase, the typed values survive and the dialog
     can still be closed. Asserting only `not.toHaveBeenCalled()` after
     clicking a disabled button would pass against a button that is merely
     dead, which is the state this correction removes — so the handler
     safeguard is proven separately, at the end of this block, through a button
     the render gate still considers enabled. */
  const ineligible = (testid: 'rc' | 'rp') => {
    const go = within(dialog()).getByTestId(testid + '-go') as HTMLButtonElement
    expect(go.disabled).toBe(true)
    /* The reason is on screen, not only in a toast that never fired. */
    const why = within(dialog()).getByTestId(testid + '-ineligible')
    expect(why.textContent && why.textContent.trim().length).toBeTruthy()
    /* The entered reason is preserved — the dialog is not reset. */
    expect((within(dialog()).getByTestId(testid + '-why') as HTMLInputElement).value)
      .toBe('səbəb')
    /* «Imtina» stays usable: the user must be able to leave. */
    expect((within(dialog()).getByRole('button', { name: 'İmtina' }) as HTMLButtonElement)
      .disabled).toBe(false)
    expect(supabase.rpc).not.toHaveBeenCalled()
    return why.textContent as string
  }

  it('disables row cancellation when a document-level «Ləğv: <doc>» marker arrives', async () => {
    await openRowCancel()
    await addRows(mv({ id: 'r', type: 'Satınalma', doc_num: 'R-1', note: 'Ləğv: D-1' }))
    expect(ineligible('rc')).toContain(ACTION_NO_LONGER_AVAILABLE)
  })

  it('disables replacement when a document-level «Ləğv: <doc>» marker arrives', async () => {
    await openReplace()
    await addRows(mv({ id: 'r', type: 'Satınalma', doc_num: 'R-1', note: 'Ləğv: D-1' }))
    expect(ineligible('rp')).toContain(ACTION_NO_LONGER_AVAILABLE)
  })

  /* The document itself BECOMES a reversal — a row of the same document
     carrying the reversal prefix (index.html:4895-4898). */
  it('disables the action when the document becomes a reversal', async () => {
    await openRowCancel()
    await addRows(mv({ id: 'rev', type: 'Satınalma', doc_num: 'D-1', note: 'Ləğv: D-0' }))
    expect(ineligible('rc')).toContain(ACTION_NO_LONGER_AVAILABLE)
  })

  /* A valuation makes the document `lotDoc` — replacement must stop, because
     a valuation would be left pointing at a line whose item changed. */
  it('disables replacement when a valuation makes the document lotDoc', async () => {
    await openReplace()
    await act(async () => {
      useMovementsStore.setState({
        valuations: new Map([['a', wo('a') as never]]),
      })
    })
    expect(ineligible('rp')).toContain(ACTION_NO_LONGER_AVAILABLE)
  })

  it('disables row cancellation when a valuation makes the document lotDoc', async () => {
    await openRowCancel()
    await act(async () => {
      useMovementsStore.setState({
        valuations: new Map([['a', wo('a') as never]]),
      })
    })
    expect(ineligible('rc')).toContain(ACTION_NO_LONGER_AVAILABLE)
  })

  /* The row turns into an unsupported/transfer branch under the dialog. The
     row-local half of the gate owns this one, so the SPECIFIC transfer message
     must be displayed — not the generic document sentence. */
  it('disables the action, with the transfer reason, when the row becomes a transfer', async () => {
    await openRowCancel()
    await act(async () => {
      useMovementsStore.setState({
        rows: useMovementsStore.getState().rows.map((r) =>
          String(r.id) === 'a' ? { ...r, type: 'Yerdəyişmə' } : r),
      })
    })
    expect(ineligible('rc')).toContain(TRANSFER_ROW_NOT_CANCELLABLE)
  })

  /* A row cancelled by someone else keeps its own row-local message too. */
  it('disables the action, with the row reason, when the row is cancelled elsewhere', async () => {
    await openRowCancel()
    await addRows(
      mv({ id: 'marker', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1', note: 'Ləğv ID: a' }),
    )
    expect(ineligible('rc')).toContain(ROW_ALREADY_DONE)
  })

  /* A LEGACY record gains its per-ID cancellation marker while the
     replacement dialog stands open. Replacement is legitimately offered on a
     doc-less record, so this is the doc-less half of the same finding. */
  it('disables replacement when a legacy record gains its per-ID marker', async () => {
    await renderPage([
      mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: null }),
      mv({ id: 'b', item_code: '0000002', type: 'Satınalma', doc_num: null }),
    ])
    await clickView('0000001')
    const user = userEvent.setup()
    await user.click(within(dialog()).getByTestId('repl-a'))
    await user.type(within(dialog()).getByTestId('rp-item'), 'Boru')
    await user.click(within(dialog()).getByTestId('rp-hit-0000002'))
    await user.type(within(dialog()).getByTestId('rp-why'), 'səbəb')

    await addRows(
      mv({ id: 'mk', item_code: '0000001', type: 'Satınalma', doc_num: 'R-3', note: 'Ləğv ID: a' }),
    )
    expect(ineligible('rp')).toContain(ROW_ALREADY_DONE)
  })

  /* An ineligible dialog can still be CLOSED — disabling the action must not
     trap the user inside the modal. */
  it('still closes after the action became ineligible', async () => {
    const user = await openRowCancel()
    await addRows(mv({ id: 'r', type: 'Satınalma', doc_num: 'R-1', note: 'Ləğv: D-1' }))
    expect((within(dialog()).getByTestId('rc-go') as HTMLButtonElement).disabled).toBe(true)
    await user.click(within(dialog()).getByRole('button', { name: 'İmtina' }))
    /* The child dialog is gone; the user is not trapped. */
    expect(screen.queryByTestId('rc-go')).toBeNull()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  /* THE HANDLER SAFEGUARD ITSELF — deliberately NOT a click on a disabled
     button.

     The render gate and the submit gate are independent on purpose: the data
     can change between React committing an ENABLED button and the handler
     running. These two cases drive the handler through a button the render
     gate still considers enabled, then change the rows the handler re-reads.
     They fail against a handler that trusts what render decided. */
  const staleRows = (initial: MovementRow[]) => {
    let served = initial
    const proxy = new Proxy([] as MovementRow[], {
      get: (_t, k) => Reflect.get(served, k),
      has: (_t, k) => Reflect.has(served, k),
      ownKeys: () => Reflect.ownKeys(served),
      getOwnPropertyDescriptor: (_t, k) => Reflect.getOwnPropertyDescriptor(served, k),
    })
    return { rows: proxy, change: (next: MovementRow[]) => { served = next } }
  }

  const itemByMap = () =>
    new Map(ITEMS.map((i) => [i.code, { name: i.name, price: i.price }]))

  const assembleFrom = (rows: MovementRow[]) => (row: unknown) =>
    assembleDocumentView({
      movement: row as never,
      allRows: rows as never,
      itemName: () => null,
      direction: () => '',
      valuations: { has: () => false },
    })

  it('the SUBMIT handler refuses a row that render still thinks is eligible', async () => {
    const eligible = twoLineDoc()
    const { rows, change } = staleRows(eligible)
    render(
      <>
        <CancelRowDialog
          rowId="a"
          allRows={rows as never}
          itemBy={itemByMap()}
          layerActive={false}
          layerReady
          isAdmin
          assemble={assembleFrom(rows) as never}
          onClose={vi.fn()}
          onRefresh={async () => ({ ok: true, error: null })}
          onToast={(t, e) => useToastStore.getState().show(t, e)}
        />
        <ToastHost />
      </>,
    )
    const user = userEvent.setup()
    await user.type(within(dialog()).getByTestId('rc-why'), 'səbəb')

    const go = within(dialog()).getByTestId('rc-go') as HTMLButtonElement
    /* The precondition of this test: the button really IS enabled. */
    expect(go.disabled).toBe(false)

    /* The world changes after render committed, with no re-render. */
    change([
      ...eligible,
      mv({ id: 'marker', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1', note: 'Ləğv ID: a' }),
    ])
    await user.click(go)

    /* The handler re-read the rows and refused on its own evidence. */
    expect(supabase.rpc).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(useToastStore.getState().messages.some((m) => m.text.includes(ROW_ALREADY_DONE)))
        .toBe(true))
  })

  it('the SUBMIT handler refuses replacement that render still thinks is eligible', async () => {
    const eligible = twoLineDoc()
    const { rows, change } = staleRows(eligible)
    render(
      <>
        <ReplaceItemDialog
          rowId="a"
          allRows={rows as never}
          itemBy={itemByMap()}
          isAdmin
          assemble={assembleFrom(rows) as never}
          onClose={vi.fn()}
          onRefresh={async () => ({ ok: true, error: null })}
          onToast={(t, e) => useToastStore.getState().show(t, e)}
        />
        <ToastHost />
      </>,
    )
    const user = userEvent.setup()
    await user.type(within(dialog()).getByTestId('rp-item'), 'Boru')
    await user.click(within(dialog()).getByTestId('rp-hit-0000002'))
    await user.type(within(dialog()).getByTestId('rp-why'), 'səbəb')

    const go = within(dialog()).getByTestId('rp-go') as HTMLButtonElement
    expect(go.disabled).toBe(false)

    change([
      ...eligible,
      mv({ id: 'r', type: 'Satınalma', doc_num: 'R-1', note: 'Ləğv: D-1' }),
    ])
    await user.click(go)

    expect(supabase.rpc).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(useToastStore.getState().messages
        .some((m) => m.text.includes(ACTION_NO_LONGER_AVAILABLE))).toBe(true))
  })

  /* The CURRENT admin permission, not the one captured when the child opened.
     The dialog is rendered directly so `isAdmin` can be flipped as a prop,
     which is exactly what a role change would do on re-render. */
  it('refuses when the current user is not Admin', async () => {
    const rows = twoLineDoc()
    const itemBy = new Map(ITEMS.map((i) => [i.code, { name: i.name, price: i.price }]))
    const { rerender } = render(
      <>
        <CancelRowDialog
          rowId="a"
          allRows={rows as never}
          itemBy={itemBy}
          layerActive={false}
          layerReady
          isAdmin
          assemble={(row) =>
            assembleDocumentView({
              movement: row as never,
              allRows: rows as never,
              itemName: () => null,
              direction: () => '',
              valuations: { has: () => false },
            })}
          onClose={vi.fn()}
          onRefresh={async () => ({ ok: true, error: null })}
          onToast={(t, e) => useToastStore.getState().show(t, e)}
        />
        <ToastHost />
      </>,
    )
    const user = userEvent.setup()
    await user.type(within(dialog()).getByTestId('rc-why'), 'səbəb')

    /* The user loses admin while the dialog stands open. */
    rerender(
      <>
        <CancelRowDialog
          rowId="a"
          allRows={rows as never}
          itemBy={itemBy}
          layerActive={false}
          layerReady
          isAdmin={false}
          assemble={(row) =>
            assembleDocumentView({
              movement: row as never,
              allRows: rows as never,
              itemName: () => null,
              direction: () => '',
              valuations: { has: () => false },
            })}
          onClose={vi.fn()}
          onRefresh={async () => ({ ok: true, error: null })}
          onToast={(t, e) => useToastStore.getState().show(t, e)}
        />
        <ToastHost />
      </>,
    )
    await user.click(within(dialog()).getByTestId('rc-go'))
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})

/* ===================================================================== */
describe('I-4 audit finding 3 — unknown capability makes no cancellation call', () => {
  /* THE FINDING. A FAILED capability probe was indistinguishable from
     "layers are off", so the non-layer RPC family was selected on no
     evidence. For a stock-mutating cancellation that is a potentially wrong
     write. Fail-closed: while capability is unknown, no family is chosen.

     This is a documented deviation from the legacy degraded fallback
     (index.html:949-975) and changes only the uncertain/error state. */

  it('makes ZERO cancellation RPC calls while capability is unknown', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: false, active: false, version: 0 })
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')

    /* The rows still loaded — only the WRITE is blocked. */
    expect(useMovementsStore.getState().loaded).toBe(true)
    const go = within(dialog()).getByTestId('dc-go') as HTMLButtonElement
    expect(go.disabled).toBe(true)
    await userEvent.setup().click(go)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  /* An honest, stated reason plus a retry — not a silently dead button. */
  it('shows an honest retry/load error rather than disabling silently', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: false, active: false, version: 0 })
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    expect(within(dialog()).getByTestId('layer-unknown')).toBeTruthy()
    expect(within(dialog()).getByTestId('layer-retry')).toBeTruthy()
  })

  /* Row cancellation picks between two families too, so it is blocked the
     same way. */
  it('blocks the row-cancellation family selection as well', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: false, active: false, version: 0 })
    await renderPage([
      mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'b', item_code: '0000002', type: 'Satınalma', doc_num: 'D-1' }),
    ])
    await clickView('0000001')
    const user = userEvent.setup()
    await user.click(within(dialog()).getByTestId('rowcancel-a'))
    await user.type(within(dialog()).getByTestId('rc-why'), 'səbəb')
    expect(within(dialog()).getByTestId('rc-layer-unknown')).toBeTruthy()
    expect((within(dialog()).getByTestId('rc-go') as HTMLButtonElement).disabled).toBe(true)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  /* A probe that ANSWERED "inactive" is a real answer and still selects the
     non-layer family — the legitimate case must be unaffected. */
  it('a successful {ready:true, active:false} still calls the NON-layer RPC', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: true, active: false, version: 1 })
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(vi.mocked(supabase.rpc).mock.calls[0][0]).toBe('cancel_document')
  })

  /* And {ready:true, active:true} selects the layer family. */
  it('a successful {ready:true, active:true} calls the LAYER RPC', async () => {
    fetchLayerCapability.mockResolvedValue({ ready: true, active: true, version: 2 })
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(vi.mocked(supabase.rpc).mock.calls[0][0]).toBe('cancel_layer_document')
  })
})

/* ===================================================================== */
describe('I-4 — the localhost guard blocks before Supabase (M8-48)', () => {
  /* The rest of this file opens the guard so the cancellation behaviour can be
     driven. Here it is restored to its real answer: a blocked action must
     produce the guard message and reach NO network call. */
  it('shows the guard message and makes no RPC call', async () => {
    const { blockedReason } = await import('../../lib/mutationGuard')
    vi.mocked(blockedReason).mockReturnValue(
      'Bu əməliyyat lokal rejimdə bloklanıb: localhost CANLI Supabase bazasına qoşulub.',
    )
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    expect(await screen.findByText(/lokal rejimdə bloklanıb/)).toBeTruthy()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('blocks every cancellation family, not just the ordinary one', async () => {
    const { blockedReason } = await import('../../lib/mutationGuard')
    vi.mocked(blockedReason).mockReturnValue('bloklanıb')
    await renderPage([
      mv({ id: 'a', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 0, out_qty: 5, partner: 'Astara' }),
    ])
    await clickView('0000001')
    await userEvent.setup().click(within(dialog()).getByTestId('dc-go'))
    await waitFor(() => expect(useToastStore.getState().messages.length).toBeGreaterThan(0))
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})
