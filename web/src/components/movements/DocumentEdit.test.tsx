import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const fetchMovementsSnapshot = vi.fn()
vi.mock('../../api/movementsSnapshot.api', () => ({
  fetchMovementsSnapshot: () => fetchMovementsSnapshot(),
}))

const fetchDocumentEditImpact = vi.fn()
vi.mock('../../api/documentEditImpact.api', () => ({
  fetchDocumentEditImpact: (doc: string) => fetchDocumentEditImpact(doc),
}))

vi.mock('../../api/stockLayers.api', () => ({
  fetchLayerCapability: async () => ({ ready: true, active: false, version: 1 }),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))

vi.mock('../../hooks/useRealtimeRefresh', () => ({
  useRealtimeRefresh: () => {},
}))

import { MovementsPage } from '../../pages/MovementsPage'
import { ToastHost } from '../ui/Toast'
import { useMovementsStore, __resetMovementsRequestSeq } from '../../store/movements.store'
import { useAuditLogStore } from '../../store/auditLog.store'
import { useToastStore } from '../../store/toast.store'
import { useOperationStore } from '../../store/operation.store'
import { useCorrectionStore } from '../../store/correction.store'
import { EMPTY_MOVEMENT_FILTERS } from '../../lib/movementFilters'
import type { MovementRow } from '../../api/itemMovements.api'
import type { Me } from '../../lib/roles'

/* I-6 — «Sənədi redaktə et» driven through the REAL screen (`M8-33` … `M8-39`).

   Every transport is mocked. No live query, no write: `document_edit_impact`
   is read-only by contract and is mocked here regardless. */

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
  in_qty: 10, out_qty: 0, price: 2, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: 'IV-1', note: null, doc_num: 'SND-1',
  created_at: '2026-09-01T10:00:00Z',
  channel: null, contract_num: null, created_by: null, ...over,
})

const ITEMS = [{ code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null }]
const WHS = ['Ələt', 'Astara']

const ME_ID = '11111111-1111-4111-8111-111111111111'
const ME: Me = {
  id: ME_ID, sbId: ME_ID, email: 'a@example.com',
  name: 'Anar', role: 'admin', wh: 'Ələt',
}
const REHBER: Me = { ...ME, role: 'rehber' }

const impactLine = (over: Record<string, unknown> = {}) => ({
  date: '2026-09-01', warehouse: 'Ələt', code: '0000001', type: 'Satınalma',
  in_qty: 10, out_qty: 0, partner: 'Azpetrol', channel: '', contract: '',
  invoice: 'IV-1', price: 2, note: '', ...over,
})

const okImpact = (over: Record<string, unknown> = {}) => ({
  ok: true, error: null, editable: true, blocks: [],
  lines: [impactLine()], type: 'Satınalma', direction: 'in',
  exportWarning: 'İxrac xəbərdarlığı', ...over,
})

function snapshot(movements: MovementRow[]) {
  return { ok: true as const, snapshot: { movements, items: ITEMS, warehouses: WHS, valuations: [] } }
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  __resetMovementsRequestSeq()
  useMovementsStore.setState({
    rows: [], operational: [], itemBy: new Map(), warehouses: [],
    valuations: new Map(), loading: false, error: null, loaded: false,
    filters: EMPTY_MOVEMENT_FILTERS, showAll: false,
  })
  useAuditLogStore.setState({ emails: new Map() })
  useToastStore.setState({ messages: [] })
  useCorrectionStore.getState().reset()
  useOperationStore.setState({ editDoc: null, lines: [] })
})

const onEdit = vi.fn()

async function renderPage(movements: MovementRow[], me: Me = ME) {
  fetchMovementsSnapshot.mockResolvedValue(snapshot(movements))
  render(
    <>
      <MovementsPage me={me} onEditDocument={onEdit} onNewOperation={vi.fn()} />
      <ToastHost />
    </>,
  )
  await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
}

async function openDocument(itemCode = '0000001') {
  const user = userEvent.setup()
  const row = screen.getAllByRole('row')
    .find((r) => within(r).queryByText(itemCode) && within(r).queryByRole('button', { name: 'Baxış' }))
  await user.click(within(row!).getByRole('button', { name: 'Baxış' }))
  return user
}

const editButton = () => screen.queryByTestId('dc-edit')

/** The topmost dialog. Opening the edit flow stacks a second `role="dialog"`
    over the document view, so an unscoped query is ambiguous. */
const topDialog = () => {
  const all = screen.getAllByRole('dialog')
  return all[all.length - 1]
}

describe('the entry button — the gate decides whether it exists at all', () => {
  it('is offered to an admin on an open ordinary document', async () => {
    await renderPage([mv()])
    await openDocument()
    expect(editButton()).toBeTruthy()
  })

  it('is NOT offered to a rehber', async () => {
    await renderPage([mv()], REHBER)
    await openDocument()
    expect(editButton()).toBe(null)
  })

  it('is NOT offered on a doc-less legacy record', async () => {
    await renderPage([mv({ doc_num: null })])
    await openDocument()
    expect(editButton()).toBe(null)
  })

  it('is NOT offered on an already-cancelled document', async () => {
    /* A cancelled document is removed from the registry by
       `excludeCancelled()`, so its «Baxış» cannot be clicked at all — the
       button is unreachable by construction, which is the strongest form of
       "not offered". Asserted as the registry state the gate then sees; the
       gate's own branch is pinned directly in `documentEdit.test.ts`. */
    await renderPage([
      mv(),
      mv({ id: 'm2', doc_num: 'SND-R', note: 'Ləğv: SND-1', in_qty: 0, out_qty: 10 }),
    ])
    const clickable = screen.queryAllByRole('row')
      .filter((r) => within(r).queryByRole('button', { name: 'Baxış' }))
    expect(clickable).toHaveLength(0)
    expect(editButton()).toBe(null)
  })

  it('is NOT offered while layer accounting is ACTIVE (M8-38)', async () => {
    await renderPage([mv()])
    useMovementsStore.setState({ layerActive: true })
    await openDocument()
    expect(editButton()).toBe(null)
  })

  it('is NOT offered while the layer capability is UNKNOWN', async () => {
    await renderPage([mv()])
    useMovementsStore.setState({ layerReady: false, layerActive: false })
    await openDocument()
    expect(editButton()).toBe(null)
  })

  it('is NOT offered while ANOTHER document is in edit mode (M8-39)', async () => {
    useOperationStore.setState({
      editDoc: { docNum: 'SND-OTHER', restore: new Map(), type: 'Satınalma', direction: 'in' },
    })
    await renderPage([mv()])
    await openDocument()
    expect(editButton()).toBe(null)
  })

  it('NO impact call is made while the button is absent', async () => {
    await renderPage([mv()], REHBER)
    await openDocument()
    expect(fetchDocumentEditImpact).not.toHaveBeenCalled()
  })
})

describe('the impact check — failure, refusal and malformed responses', () => {
  it('shows a server refusal VERBATIM and does not navigate', async () => {
    fetchDocumentEditImpact.mockResolvedValue({
      ok: false, error: 'İcazə yoxdur: sənədi yalnız Admin redaktə edə bilər',
      editable: false, blocks: [], lines: [], type: '', direction: '', exportWarning: '',
    })
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    const err = await screen.findByTestId('edit-error')
    expect(err.textContent).toContain('İcazə yoxdur: sənədi yalnız Admin redaktə edə bilər')
    expect(err.textContent).toContain('Təsir yoxlaması alınmadı')
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('renders every block reason when the document is NOT editable (M8-34)', async () => {
    fetchDocumentEditImpact.mockResolvedValue(okImpact({
      editable: false,
      blocks: [
        { code: 'later_movement', message: 'Sonrakı hərəkət var' },
        { code: 'replaced_row', message: 'Sətir əvəzlənib' },
      ],
      lines: [],
    }))
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    const table = await screen.findByTestId('edit-blocks')
    expect(table.textContent).toContain('Sonrakı hərəkət var')
    expect(table.textContent).toContain('Sətir əvəzlənib')
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('a MALFORMED line set is an error — no block table, no navigation', async () => {
    fetchDocumentEditImpact.mockResolvedValue(okImpact({
      lines: [impactLine(), impactLine({ warehouse: '' })],
    }))
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    expect(await screen.findByTestId('edit-error')).toBeTruthy()
    expect(screen.queryByTestId('edit-blocks')).toBe(null)
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('a malformed response does NOT touch an existing draft', async () => {
    const draft = [{ kind: 'in', w: 'Ələt', c: '0000001', d: '2026-09-02', t: 'Satınalma', q: 4 }]
    useOperationStore.setState({ lines: draft as never })
    fetchDocumentEditImpact.mockResolvedValue(okImpact({ direction: 'sideways' }))
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    await screen.findByTestId('edit-error')
    expect(useOperationStore.getState().lines).toEqual(draft)
    expect(useOperationStore.getState().editDoc).toBe(null)
  })

  it('an editable document with NO lines is refused', async () => {
    fetchDocumentEditImpact.mockResolvedValue(okImpact({ lines: [] }))
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    const err = await screen.findByTestId('edit-error')
    expect(err.textContent).toContain('redaktə ediləcək sətir yoxdur')
  })
})

describe('the async race — the world can change across the await', () => {
  it('a document cancelled DURING the impact call cannot complete the edit', async () => {
    let release: ((v: unknown) => void) | null = null
    fetchDocumentEditImpact.mockReturnValue(new Promise((r) => { release = r }))
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    await screen.findByTestId('edit-loading')

    /* Someone else cancels the document while the read is in flight. The
       registry drops the row, so the document view reports the record as gone
       and the edit dialog goes with it — the response, when it lands, has
       nothing to act on. */
    useMovementsStore.setState({
      rows: [
        mv(),
        mv({ id: 'm2', doc_num: 'SND-R', note: 'Ləğv: SND-1', in_qty: 0, out_qty: 10 }),
      ] as never,
    })
    release!(okImpact())

    await waitFor(() => expect(screen.queryByTestId('de-go')).toBe(null))
    expect(onEdit).not.toHaveBeenCalled()
    expect(useOperationStore.getState().editDoc).toBe(null)
    expect(useOperationStore.getState().lines).toEqual([])
  })

  it('a SECOND document entering edit mode mid-flight refuses the response', async () => {
    let release: ((v: unknown) => void) | null = null
    fetchDocumentEditImpact.mockReturnValue(new Promise((r) => { release = r }))
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    await screen.findByTestId('edit-loading')

    /* CHECK 2 — the gate is re-read when the response arrives, so a change
       that does NOT remove the row is still caught. */
    useOperationStore.setState({
      editDoc: { docNum: 'SND-OTHER', restore: new Map(), type: 'x', direction: 'in' },
    })
    release!(okImpact())

    const err = await screen.findByTestId('edit-error')
    expect(err.textContent).toContain('SND-OTHER')
    expect(screen.queryByTestId('de-go')).toBe(null)
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('a response arriving after CLOSE changes nothing', async () => {
    let release: ((v: unknown) => void) | null = null
    fetchDocumentEditImpact.mockReturnValue(new Promise((r) => { release = r }))
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    await screen.findByTestId('edit-loading')

    /* The footer button, not the header «×» — both carry the same label. */
    await user.click(within(topDialog()).getAllByRole('button', { name: 'Bağla' })[1])
    /* The edit dialog is gone; its in-flight response must not resurrect it. */
    expect(screen.queryByTestId('edit-loading')).toBe(null)
    release!(okImpact())

    await waitFor(() => expect(screen.queryByTestId('de-go')).toBe(null))
    expect(screen.queryByTestId('edit-error')).toBe(null)
    expect(onEdit).not.toHaveBeenCalled()
    expect(useOperationStore.getState().editDoc).toBe(null)
    expect(useOperationStore.getState().lines).toEqual([])
  })
})

describe('the confirmation — nothing is written, and cancel preserves the draft', () => {
  it('states that the database is unchanged and shows the export warning', async () => {
    fetchDocumentEditImpact.mockResolvedValue(okImpact())
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    await screen.findByTestId('de-go')
    const body = topDialog().textContent ?? ''
    expect(body).toContain('Bazada heç nə dəyişməyəcək')
    expect(body).toContain('İxrac xəbərdarlığı')
  })

  it('falls back to the legacy export sentence when the server sends none', async () => {
    fetchDocumentEditImpact.mockResolvedValue(okImpact({ exportWarning: '' }))
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    await screen.findByTestId('de-go')
    expect(topDialog().textContent).toContain('Excel ixracı sistemdə qeyd edilmir')
  })

  it('WARNS before replacing an existing draft', async () => {
    useOperationStore.setState({
      lines: [{ kind: 'in', w: 'Ələt', c: '0000001', d: '2026-09-02', t: 'Satınalma', q: 4 }] as never,
    })
    fetchDocumentEditImpact.mockResolvedValue(okImpact())
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    const warn = await screen.findByTestId('edit-draft-warning')
    expect(warn.textContent).toContain('ƏVƏZ OLUNACAQ')
  })

  it('shows NO draft warning when the form is empty', async () => {
    fetchDocumentEditImpact.mockResolvedValue(okImpact())
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    await screen.findByTestId('de-go')
    expect(screen.queryByTestId('edit-draft-warning')).toBe(null)
  })

  it('CANCELLING preserves the draft and changes nothing', async () => {
    const draft = [{ kind: 'in', w: 'Ələt', c: '0000001', d: '2026-09-02', t: 'Satınalma', q: 4 }]
    useOperationStore.setState({ lines: draft as never })
    fetchDocumentEditImpact.mockResolvedValue(okImpact())
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    await screen.findByTestId('de-go')

    await user.click(within(topDialog()).getByRole('button', { name: 'İmtina' }))
    expect(useOperationStore.getState().lines).toEqual(draft)
    expect(useOperationStore.getState().editDoc).toBe(null)
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('confirming hands the mapped document to the navigation callback (M8-36, M8-37)', async () => {
    fetchDocumentEditImpact.mockResolvedValue(okImpact({
      direction: 'out',
      lines: [impactLine({ in_qty: 0, out_qty: 6, note: 'qeyd · Əvəz edir: SND-OLD' })],
    }))
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    await user.click(await screen.findByTestId('de-go'))

    expect(onEdit).toHaveBeenCalledTimes(1)
    const [mapped, docNum, type] = onEdit.mock.calls[0]
    expect(docNum).toBe('SND-1')
    expect(type).toBe('Satınalma')
    expect(mapped.kind).toBe('out')
    expect(mapped.lines[0]).toMatchObject({ q: 6, note: 'qeyd', name: 'Nasos' })
    expect(mapped.restore.get('Ələt|0000001')).toBe(6)
  })

  it('a gate that closed while the modal stood open refuses at confirmation', async () => {
    fetchDocumentEditImpact.mockResolvedValue(okImpact())
    await renderPage([mv()])
    const user = await openDocument()
    await user.click(editButton()!)
    const go = await screen.findByTestId('de-go')

    /* Another document enters edit mode while this confirmation is open. */
    useOperationStore.setState({
      editDoc: { docNum: 'SND-OTHER', restore: new Map(), type: 'x', direction: 'in' },
    })
    await user.click(go)

    expect(onEdit).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(useToastStore.getState().messages.some((m) => m.text.includes('SND-OTHER'))).toBe(true)
    })
  })
})
