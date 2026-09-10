import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const fetchMovementsSnapshot = vi.fn()
vi.mock('../../api/movementsSnapshot.api', () => ({
  fetchMovementsSnapshot: () => fetchMovementsSnapshot(),
}))

/* The realtime hook is replaced so a refresh can be FIRED without a Supabase
   channel — the stale-data tests need to change the store under an open
   dialog, which is exactly what realtime does in production. */
let fireRealtime: (() => void) | null = null
/* I-4 added a layer-capability probe to the movements load. It is mocked here
   so this suite performs no network call of its own; `active:false` is the
   pre-layer routing these tests already assume. */
vi.mock('../../api/stockLayers.api', () => ({
  fetchLayerCapability: async () => ({ ready: true, active: false, version: 1 }),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))

vi.mock('../../hooks/useRealtimeRefresh', () => ({
  useRealtimeRefresh: (_e: boolean, _t: readonly string[], onChange: () => void) => {
    fireRealtime = onChange
  },
}))

import { MovementsPage } from '../../pages/MovementsPage'
import { DocumentViewDialog } from './DocumentViewDialog'
import { ToastHost } from '../ui/Toast'
import { useMovementsStore, __resetMovementsRequestSeq } from '../../store/movements.store'
import { useAuditLogStore } from '../../store/auditLog.store'
import { useToastStore } from '../../store/toast.store'
import { EMPTY_MOVEMENT_FILTERS } from '../../lib/movementFilters'
import { IMMUTABLE_RECORD_REFUSAL, type ValuationLookup } from '../../lib/documentView'
import type { MovementRow } from '../../api/itemMovements.api'
import type { Me } from '../../lib/roles'

/* Read-only document inspection through the real screen — M8-15 … M8-22 (I-3).

   These drive «Baxış» exactly as a user would: the dialog is never rendered
   directly, so what is asserted is what the page actually wires up. */

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
const ME: Me = {
  id: ME_ID, sbId: ME_ID, email: 'anar@example.com',
  name: 'Anar İbrahimov', role: 'admin', wh: 'Ələt',
}

function snapshot(movements: MovementRow[], valuations: unknown[] = []) {
  return {
    ok: true as const,
    snapshot: { movements, items: ITEMS, warehouses: WHS, valuations },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  fireRealtime = null
  __resetMovementsRequestSeq()
  useMovementsStore.setState({
    rows: [], operational: [], itemBy: new Map(), warehouses: [],
    valuations: new Map(), loading: false, error: null, loaded: false,
    filters: EMPTY_MOVEMENT_FILTERS, showAll: false,
  })
  useAuditLogStore.setState({ emails: new Map() })
  useToastStore.setState({ messages: [] })
})

/** Renders the screen with the given rows loaded, and opens no dialog. */
async function renderPage(movements: MovementRow[], valuations: unknown[] = []) {
  fetchMovementsSnapshot.mockResolvedValue(snapshot(movements, valuations))
  render(
    <>
      <MovementsPage me={ME} onEditDocument={vi.fn()} onNewOperation={vi.fn()} />
      <ToastHost />
    </>,
  )
  await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
}

/** Clicks the «Baxış» button of the registry row whose item code is given.

    NOTE for every fixture below: the registry's row source is
    `excludeCancelled()`, so a MARKER row (`Ləğv: …`, `Ləğv ID: …`) and the row
    it cancels are not in the table and cannot be clicked. The tests therefore
    click a row that survives and assert on what the dialog derives from the
    marker rows the STORE still holds — which is exactly the production path. */
async function clickView(itemCode: string) {
  const user = userEvent.setup()
  const row = screen
    .getAllByRole('row')
    .find((r) => within(r).queryByText(itemCode) && within(r).queryByRole('button', { name: 'Baxış' }))
  expect(row).toBeTruthy()
  await user.click(within(row!).getByRole('button', { name: 'Baxış' }))
}

const dialog = () => screen.getByRole('dialog')

/* Some states are, by design, NOT reachable from the registry table: the row
   source is `excludeCancelled()`, which removes a cancelled document's rows,
   the reversing rows and every marker row (index.html:1249-1270 — the legacy
   table hides them too). Their «Baxış» therefore cannot be clicked, and the
   status branches that describe them are exercised by rendering the dialog
   directly against the same raw set the store would hold. That is not a
   shortcut around the page: the four dispatcher branches, the refusal and the
   stale-data behaviour are all driven through the real screen above. */
function renderDialogFor(
  movementId: string,
  rows: MovementRow[],
  valuations: ValuationLookup = { has: () => false },
) {
  render(
    <DocumentViewDialog
      movementId={movementId}
      allRows={rows as never}
      itemBy={new Map(ITEMS.map((i) => [i.code, { name: i.name, price: i.price }]))}
      warehouses={WHS}
      valuations={valuations}
      emails={new Map()}
      me={ME}
      isAdmin
      layerActive={false}
      /* A KNOWN capability: this suite is about inspection, not the
         fail-closed unknown state, which is covered in DocumentCancel. */
      layerReady
      onClose={vi.fn()}
      onRefresh={async () => ({ ok: true, error: null })}
      onToast={vi.fn()}
    />,
  )
}

describe('«Baxış» is a real, enabled read-only action (M8-15)', () => {
  it('is enabled and opens the dialog', async () => {
    await renderPage([mv({ doc_num: 'D-1' })])
    const btn = screen.getByRole('button', { name: 'Baxış' })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
    await clickView('0000001')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('closes again without touching the data', async () => {
    await renderPage([mv({ doc_num: 'D-1' })])
    await clickView('0000001')
    const rowsBefore = useMovementsStore.getState().rows
    /* I-4: an admin's open document offers «İmtina» + «Əməliyyatı ləğv et»
       instead of the I-3 «Bağla». The header × closes it in either case. */
    const closeBtn = within(dialog()).getByRole('button', { name: 'Bağla' })
    await userEvent.setup().click(closeBtn)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    /* Inspection writes nothing: the store still holds the SAME array. */
    expect(useMovementsStore.getState().rows).toBe(rowsBefore)
  })
})

describe('the four dispatcher branches (M8-15)', () => {
  it('Yerdəyişmə WITH doc_num → the transfer document view', async () => {
    await renderPage([
      mv({ id: 'o', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 0, out_qty: 5, partner: 'Astara' }),
    ])
    await clickView('0000001')
    expect(within(dialog()).getByRole('heading').textContent).toBe('Yerdəyişmə sənədi · T-1')
  })

  it('Yerdəyişmə WITHOUT doc_num → the legacy transfer view', async () => {
    await renderPage([
      mv({ id: 'o', type: 'Yerdəyişmə', doc_num: null, in_qty: 0, out_qty: 5, partner: 'Astara' }),
    ])
    await clickView('0000001')
    const d = dialog()
    expect(within(d).getByRole('heading').textContent).toBe('Köhnə yerdəyişmə · 0000001')
    /* I-4: for an ADMIN this branch now offers the doc-less transfer
       cancellation (cancel_legacy_transfer) rather than the storno notice. */
    expect(within(d).getByTestId('dc-go').textContent).toBe('Yerdəyişməni ləğv et')
  })

  it('a CANCELLABLE_TYPES row WITH doc_num → the ordinary document view', async () => {
    await renderPage([mv({ type: 'Satınalma', doc_num: 'D-7' })])
    await clickView('0000001')
    expect(within(dialog()).getByRole('heading').textContent).toBe('Satınalma sənədi · D-7')
  })

  it('a CANCELLABLE_TYPES row WITHOUT doc_num → the legacy ordinary view', async () => {
    await renderPage([mv({ type: 'Satınalma', doc_num: null })])
    await clickView('0000001')
    const d = dialog()
    expect(within(d).getByRole('heading').textContent).toBe('Köhnə əməliyyat · 0000001')
    /* I-4: the doc-less ordinary cancellation (cancel_legacy_movement). */
    expect(within(d).getByTestId('dc-go').textContent).toBe('Əməliyyatı ləğv et')
  })

  /* MUTATION: an unsupported type opening a document view instead of being
     refused. Legacy shows the immutable-record toast and opens nothing. */
  it('an unsupported type is refused through the toast and opens NO dialog', async () => {
    await renderPage([mv({ type: 'Naməlum növ', doc_num: 'D-1' })])
    await clickView('0000001')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByText(IMMUTABLE_RECORD_REFUSAL)).toBeTruthy()
  })

  it('the refusal is an ERROR toast, as the legacy `toast(..., true)` is', async () => {
    await renderPage([mv({ type: 'Naməlum növ', doc_num: null })])
    await clickView('0000001')
    await waitFor(() => expect(useToastStore.getState().messages).toHaveLength(1))
    expect(useToastStore.getState().messages[0]).toMatchObject({
      text: IMMUTABLE_RECORD_REFUSAL, isError: true,
    })
  })
})

describe('ordinary document view (M8-16)', () => {
  /* MUTATION: grouping by doc_num alone, mixing another type into the
     document. The Qaytarma line must not appear in a Satınalma document. */
  it('groups only same-doc, same-type rows', async () => {
    await renderPage([
      mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'b', item_code: '0000002', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'c', item_code: '0000002', type: 'Qaytarma', doc_num: 'D-1' }),
    ])
    await clickView('0000001')
    const body = within(dialog())
    /* Two lines, not three: the Qaytarma row sharing D-1 is excluded. */
    expect(body.getAllByRole('row')).toHaveLength(3) // header + 2 lines
    expect(body.getByText('Nasos')).toBeTruthy()
    expect(body.getByText('Boru')).toBeTruthy()
    expect(body.getByText(/2 sətir/)).toBeTruthy()
  })

  /* MUTATION: stripRowLevelCancelled() not applied inside the view. */
  it('applies stripRowLevelCancelled() before rendering', async () => {
    await renderPage([
      mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'b', item_code: '0000002', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'm', item_code: '0000002', type: 'Satınalma', doc_num: 'D-1', note: 'Ləğv ID: b' }),
    ])
    await clickView('0000001')
    const body = within(dialog())
    expect(body.getByText('Nasos')).toBeTruthy()
    expect(body.queryByText('Boru')).toBeNull()
    expect(body.queryByText(/Ləğv ID: b/)).toBeNull()
    expect(body.getByText(/1 sətir/)).toBeTruthy()
  })

  /* MUTATION / R6: an empty stripped document labelled cancelled. */
  it('a document emptied by stripping is shown as partially modified, NOT cancelled', () => {
    renderDialogFor('a', [
      mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'm', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1', note: 'Ləğv ID: a' }),
    ])
    const body = within(dialog())
    expect(body.getByText('Görünən sətir yoxdur')).toBeTruthy()
    expect(body.getByText(/Sənədin özü ləğv edilməyib/)).toBeTruthy()
    expect(body.queryByText('Ləğv edilib')).toBeNull()
  })

  /* MUTATION: doc_num rendered as the Qaimə or Müqavilə value. */
  it('shows the system document number SEPARATELY from Qaimə and Müqavilə', async () => {
    await renderPage([
      mv({ id: 'a', type: 'Satınalma', doc_num: 'DOC-1', invoice_num: 'INV-1', contract_num: 'CT-1' }),
    ])
    await clickView('0000001')
    const body = within(dialog())
    expect(body.getByTestId('doc-sysnum').textContent).toBe('Sistem sənəd №: DOC-1')
    const refs = body.getByTestId('doc-refs').textContent!
    expect(refs).toContain('INV-1')
    expect(refs).toContain('CT-1')
    expect(refs).not.toContain('DOC-1')
  })

  it('docRefsLine: unique non-empty values, and no Müqavilə label when empty', async () => {
    await renderPage([
      mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1', invoice_num: 'INV-1' }),
      mv({ id: 'b', item_code: '0000002', type: 'Satınalma', doc_num: 'D-1', invoice_num: 'INV-1' }),
    ])
    await clickView('0000001')
    const body = within(dialog())
    expect(body.getAllByText('INV-1')).toHaveLength(1)
    expect(body.queryByText(/Müqavilə №:/)).toBeNull()
  })

  it('shows item, warehouse, quantity, price, amount and note', async () => {
    await renderPage([
      mv({
        id: 'a', type: 'Satınalma', doc_num: 'D-1', item_code: '0000001',
        warehouse: 'Ələt', in_qty: 4, out_qty: 0, price: 12.5, note: 'qeyd mətni',
      }),
    ])
    await clickView('0000001')
    const body = within(dialog())
    expect(body.getByText('Nasos')).toBeTruthy()
    expect(body.getByText('Mədaxil: Ələt')).toBeTruthy()
    expect(body.getByText('4,00')).toBeTruthy()
    expect(body.getByText('12,50')).toBeTruthy()
    expect(body.getByText('50,00')).toBeTruthy()
    expect(body.getByText('qeyd mətni')).toBeTruthy()
  })
})

describe('the recorder label in the dialog (M8-04 rule, reused)', () => {
  /* MUTATION: the raw `created_by` UUID rendered instead of the final legacy
     mapping (index.html:990). */
  it('never renders a raw recorder UUID', async () => {
    const OTHER = '22222222-2222-4222-8222-222222222222'
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1', created_by: OTHER })])
    await clickView('0000001')
    const d = dialog()
    expect(d.textContent).not.toContain(OTHER)
    expect(within(d).getAllByText('digər istifadəçi').length).toBeGreaterThan(0)
  })

  it('resolves an id through the already-warmed directory map', async () => {
    const OTHER = '22222222-2222-4222-8222-222222222222'
    useAuditLogStore.setState({ emails: new Map([[OTHER, 'someone@example.com']]) })
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1', created_by: OTHER })])
    await clickView('0000001')
    expect(within(dialog()).getAllByText('someone@example.com').length).toBeGreaterThan(0)
    expect(dialog().textContent).not.toContain(OTHER)
  })

  it('a null recorder reads «Excel idxalı», not «sistem»', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1', created_by: null })])
    await clickView('0000001')
    const d = dialog()
    expect(within(d).getAllByText('Excel idxalı').length).toBeGreaterThan(0)
    expect(d.textContent).not.toContain('sistem')
  })
})

describe('transfer document view (M8-17)', () => {
  /* MUTATION: both database legs rendered — one logical transfer shown twice. */
  it('renders the outbound leg only, once', async () => {
    await renderPage([
      mv({ id: 'o', item_code: '0000001', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 0, out_qty: 5, warehouse: 'Ələt', partner: 'Astara' }),
      mv({ id: 'i', item_code: '0000001', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 5, out_qty: 0, warehouse: 'Astara', partner: 'Ələt' }),
    ])
    await clickView('0000001')
    const body = within(dialog())
    expect(body.getAllByText('Nasos')).toHaveLength(1)
  })

  /* MUTATION: header count taken from the rendered preview. Legacy prints
     `nf(rows.length)` — every post-strip document leg — while the preview is
     outbound-only (index.html:5211-5217, 5238). A two-leg transfer therefore
     reads «2 sətir» even though the item appears once. */
  it('the header reports both legs while the item renders once', async () => {
    await renderPage([
      mv({ id: 'o', item_code: '0000001', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 0, out_qty: 5, warehouse: 'Ələt', partner: 'Astara' }),
      mv({ id: 'i', item_code: '0000001', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 5, out_qty: 0, warehouse: 'Astara', partner: 'Ələt' }),
    ])
    await clickView('0000001')
    const body = within(dialog())
    expect(body.getByText(/2 sətir/)).toBeTruthy()
    expect(body.queryByText(/1 sətir/)).toBeNull()
    expect(body.getAllByText('Nasos')).toHaveLength(1)
  })

  it('uses the canonical route display', async () => {
    await renderPage([
      mv({ id: 'o', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 0, out_qty: 5, warehouse: 'Ələt', partner: 'Astara' }),
      mv({ id: 'i', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 5, out_qty: 0, warehouse: 'Astara', partner: 'Ələt' }),
    ])
    await clickView('0000001')
    expect(within(dialog()).getByText('Ələt → Astara')).toBeTruthy()
  })

  it('preserves the already-cancelled branch with its reversing document', () => {
    renderDialogFor('o', [
      mv({ id: 'o', type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 0, out_qty: 5, partner: 'Astara' }),
      mv({ id: 'r', type: 'Yerdəyişmə', doc_num: 'RT-9', note: 'Ləğv (əks yerdəyişmə): T-1', in_qty: 0, out_qty: 5, partner: 'Ələt' }),
    ])
    const body = within(dialog())
    expect(body.getByText('Ləğv edilib')).toBeTruthy()
    expect(body.getByText('RT-9')).toBeTruthy()
  })

  it('preserves the reversal-document branch', () => {
    renderDialogFor('r', [
      mv({ id: 'r', type: 'Yerdəyişmə', doc_num: 'RT-9', note: 'Ləğv (əks yerdəyişmə): T-1', in_qty: 0, out_qty: 5, partner: 'Ələt' }),
    ])
    expect(within(dialog()).getByText(/əks yerdəyişmə \(ləğv\) sənədidir/)).toBeTruthy()
  })
})

describe('already-cancelled and reversal status, ordinary family (M8-21, M8-22)', () => {
  it('shows the reversing document number', () => {
    renderDialogFor('a', [
      mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'r', type: 'Satınalma', doc_num: 'R-9', note: 'Ləğv: D-1' }),
    ])
    const body = within(dialog())
    expect(body.getByText('Ləğv edilib')).toBeTruthy()
    expect(body.getByText('R-9')).toBeTruthy()
  })

  it('keeps the legacy — fallback when the marker row has no doc_num', () => {
    renderDialogFor('a', [
      mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' }),
      mv({ id: 'r', type: 'Satınalma', doc_num: null, note: 'Ləğv: D-1' }),
    ])
    const body = within(dialog())
    expect(body.getByText('Ləğv edilib')).toBeTruthy()
    expect(body.getByText('—', { selector: '.code' })).toBeTruthy()
  })

  it('a reversal document refuses re-cancellation in words', () => {
    renderDialogFor('r', [mv({ id: 'r', type: 'Satınalma', doc_num: 'R-9', note: 'Ləğv: D-1' })])
    expect(within(dialog()).getByText(/ləğv \(əks yazı\) sənədidir/)).toBeTruthy()
  })

  it('a doc-less legacy row shows its per-id cancellation status', () => {
    renderDialogFor('a', [
      mv({ id: 'a', type: 'Satınalma', doc_num: null }),
      mv({ id: 'r', type: 'Satınalma', doc_num: 'R-3', note: 'Ləğv ID: a' }),
    ])
    const body = within(dialog())
    expect(body.getByText('Ləğv edilib')).toBeTruthy()
    expect(body.getByText('R-3')).toBeTruthy()
  })
})

describe('lotDoc is derived over the whole document (M8-16)', () => {
  const wo = (id: string) => ({
    movement_id: id, source_amount: 10, known_amount: 10,
    unknown_qty: 0, final_amount: 10, valuation_method: 'fifo', override_reason: null,
  })

  /* MUTATION: lotDoc checked on the CLICKED ROW only — a lot-valued document
     looks unvalued whenever the clicked line carries no valuation. */
  it('is detected from another line of the document, not only the clicked one', async () => {
    await renderPage(
      [
        mv({ id: 'a', item_code: '0000001', type: 'Silinmə', doc_num: 'D-1', in_qty: 0, out_qty: 1 }),
        mv({ id: 'b', item_code: '0000002', type: 'Silinmə', doc_num: 'D-1', in_qty: 0, out_qty: 1 }),
      ],
      [wo('b')],
    )
    await clickView('0000001')
    expect(within(dialog()).getByText(/partiya uçotu ilə dəyərləndirilib/)).toBeTruthy()
  })

  it('is absent when no line of the document is lot-valued', async () => {
    await renderPage(
      [
        mv({ id: 'a', item_code: '0000001', type: 'Silinmə', doc_num: 'D-1', in_qty: 0, out_qty: 1 }),
        mv({ id: 'z', item_code: '0000002', type: 'Silinmə', doc_num: 'D-9', in_qty: 0, out_qty: 1 }),
      ],
      [wo('z')],
    )
    await clickView('0000001')
    expect(within(dialog()).queryByText(/partiya uçotu ilə dəyərləndirilib/)).toBeNull()
  })

  /* I-4: `lotDoc` now GATES the per-row controls (`canReplaceRows`,
     index.html:5023). An unvalued document offers them; a lot-valued one does
     not — verified in the I-4 suite. */
  it('offers the replacement control when the document is not lot-valued', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })])
    await clickView('0000001')
    expect(within(dialog()).getByTestId('repl-a')).toBeTruthy()
  })
})

describe('stale-data safety: the ID is the state, never a copied movement', () => {
  /* MUTATION: the page copying the clicked movement into state. After a
     refresh changes the row, the dialog would keep showing the old values. */
  it('re-renders from the CURRENT rows after a realtime refresh', async () => {
    await renderPage([mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1', invoice_num: 'INV-OLD' })])
    await clickView('0000001')
    expect(within(dialog()).getByText('INV-OLD')).toBeTruthy()

    fetchMovementsSnapshot.mockResolvedValue(
      snapshot([mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1', invoice_num: 'INV-NEW' })]),
    )
    await act(async () => { fireRealtime!() })

    await waitFor(() => expect(within(dialog()).getByText('INV-NEW')).toBeTruthy())
    expect(within(dialog()).queryByText('INV-OLD')).toBeNull()
  })

  /* MUTATION: a removed row still rendered from the copy taken at click time. */
  it('shows an honest unavailable state when the refresh removes the row', async () => {
    await renderPage([
      mv({ id: 'a', item_code: '0000001', type: 'Satınalma', doc_num: 'D-1', invoice_num: 'INV-OLD' }),
      mv({ id: 'keep', item_code: '0000002', type: 'Satınalma', doc_num: 'D-2' }),
    ])
    await clickView('0000001')
    expect(within(dialog()).getByText('INV-OLD')).toBeTruthy()

    fetchMovementsSnapshot.mockResolvedValue(
      snapshot([mv({ id: 'keep', item_code: '0000002', type: 'Satınalma', doc_num: 'D-2' })]),
    )
    await act(async () => { fireRealtime!() })

    await waitFor(() =>
      expect(within(dialog()).getByText('Qeyd artıq mövcud deyil')).toBeTruthy(),
    )
    expect(within(dialog()).queryByText('INV-OLD')).toBeNull()
    /* Closing from the unavailable state still works. The header × shares the
       «Bağla» accessible name, so the FOOTER button is selected explicitly. */
    await userEvent.setup().click(
      within(dialog()).getAllByRole('button', { name: 'Bağla' }).find((b) => b.textContent === 'Bağla')!,
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  /* A failed refresh keeps the snapshot (M8-45), so the dialog keeps showing
     the retained data — which is the CURRENT store content, not a copy. */
  it('keeps rendering the retained snapshot when a refresh fails', async () => {
    await renderPage([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1', invoice_num: 'INV-OLD' })])
    await clickView('0000001')
    fetchMovementsSnapshot.mockResolvedValue({ ok: false as const, error: 'şəbəkə xətası' })
    await act(async () => { fireRealtime!() })
    expect(within(dialog()).getByText('INV-OLD')).toBeTruthy()
  })
})

describe('strict I-4 boundaries', () => {
  const CASES: [string, Partial<MovementRow>][] = [
    ['ordinary document', { type: 'Satınalma', doc_num: 'D-1' }],
    ['legacy ordinary', { type: 'Satınalma', doc_num: null }],
    ['transfer document', { type: 'Yerdəyişmə', doc_num: 'T-1', in_qty: 0, out_qty: 5, partner: 'Astara' }],
    ['legacy transfer', { type: 'Yerdəyişmə', doc_num: null, in_qty: 0, out_qty: 5, partner: 'Astara' }],
  ]

  /* I-4 ships cancellation and no BATCH control: «Qrup üzrə ləğv» is driven
     from the page header, never from inside this dialog, so no group-cancel
     button may appear in any branch.

     UPDATED BY I-6: «Sənədi redaktə et» is no longer absent everywhere — it
     is now offered on an OPEN ORDINARY document for an admin, which is
     exactly the first `CASES` entry. Its presence there is asserted in
     `DocumentEdit.test.tsx`; here the remaining branches are pinned, because
     a transfer, a doc-less record and a legacy transfer must STILL never
     offer it. */
  it.each(CASES)('%s offers no batch control', async (_name, over) => {
    await renderPage([mv({ id: 'a', ...over })])
    await clickView('0000001')
    const d = dialog()
    for (const label of [/qrup/i, /düzəliş/i]) {
      expect(within(d).queryByRole('button', { name: label })).toBeNull()
    }
  })

  it.each(CASES.filter(([name]) => name !== 'ordinary document'))(
    '%s offers no edit control — the correction flow is ordinary-documents only',
    async (_name, over) => {
      await renderPage([mv({ id: 'a', ...over })])
      await clickView('0000001')
      expect(within(dialog()).queryByTestId('dc-edit')).toBeNull()
    },
  )

  it('a non-admin sees exactly the same read-only dialog', async () => {
    fetchMovementsSnapshot.mockResolvedValue(snapshot([mv({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })]))
    render(<MovementsPage me={{ ...ME, role: 'anbardar' }} onEditDocument={vi.fn()} onNewOperation={vi.fn()} />)
    await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
    await clickView('0000001')
    const buttons = within(dialog())
      .getAllByRole('button')
      .map((b) => (b.textContent || '').trim())
      .filter((t) => t && t !== '×')
    expect(buttons).toEqual(['Bağla'])
  })
})
