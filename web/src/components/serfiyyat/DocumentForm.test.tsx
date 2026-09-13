import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ItemRow } from '../../api/items.api'

/* T6 — M13-20…M13-25, M13-30…M13-36, M13-39…M13-43, M13-50…M13-54.

   UNIT/PAGE EVIDENCE ONLY (protocol §7). Every guard asserted here is a
   BROWSER AFFORDANCE: the server re-checks role, warehouse binding, project
   state, channel and every line independently, and none of those refusals
   (M13-91…M13-93) is satisfied by anything in this file. */

const createSerfiyyatDocument = vi.fn()
const editSerfiyyatDocument = vi.fn()
const show = vi.fn()

vi.mock('../../api/serfiyyatDocuments.api', () => ({
  createSerfiyyatDocument: (...a: unknown[]) => createSerfiyyatDocument(...a),
  editSerfiyyatDocument: (...a: unknown[]) => editSerfiyyatDocument(...a),
}))
vi.mock('../../store/toast.store', () => ({ useToastStore: () => show }))
vi.mock('./DocsImportPreviewDialog', () => ({
  DocsImportPreviewDialog: () => <div data-testid="mock-import-dialog" />,
}))

let state: Record<string, unknown>
vi.mock('../../store/serfiyyat.store', () => ({ useSerfiyyatStore: () => state }))

import { DocumentForm } from './DocumentForm'

const PROJECT = { id: 'p1', name: 'Layihə A', wh: 'Test Anbar', active: true }
const OTHER = { id: 'p2', name: 'Layihə B', wh: 'Başqa Anbar', active: true }
const ITEM: ItemRow = { code: '0000001', name: 'Sement M400', unit: 'kq', price: 5, category: null }
/* `price: null` is deliberate — it drives the "picked item has no price" case. */
const ITEM2: ItemRow = { code: '0000002', name: 'Qum', unit: 'ton', price: null, category: null }
const DOC = {
  id: 'd1', num: 'SM-2026-000001', projectId: 'p1', kontragent: 'MMC', avto: '10-AA-123',
  kanal: 'Nağd', iv: '83951', d: '2026-09-01', note: 'qeyd', by: 'u1', ts: 1,
}

const me = { id: 'u1', sbId: 'u1', email: 'a@x', name: 'A', role: 'anbardar', wh: 'Test Anbar' }
const admin = { ...me, role: 'admin', wh: '' }
const rehber = { ...me, role: 'rehber', wh: '' }

const addDraftLine = vi.fn()
const removeDraftLine = vi.fn()
const clearDraft = vi.fn()
const cancelEdit = vi.fn()
const load = vi.fn()

const baseState = (over: Record<string, unknown> = {}) => ({
  projects: [PROJECT, OTHER],
  documents: [DOC],
  lines: [],
  items: [ITEM, ITEM2],
  itemsByCode: new Map<string, ItemRow>([[ITEM.code, ITEM], [ITEM2.code, ITEM2]]),
  channels: [{ name: 'Nağd', active: true }, { name: 'Köhnə', active: false }],
  draft: [],
  editDocId: null,
  addDraftLine, removeDraftLine, clearDraft, cancelEdit, load,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  state = baseState()
  createSerfiyyatDocument.mockResolvedValue({ ok: true, data: { doc_num: 'SM-2026-000009' }, error: null })
  editSerfiyyatDocument.mockResolvedValue({ ok: true, data: { doc_num: 'SM-2026-000001' }, error: null })
})

/* THE FOUR GUARDS, TESTED IN ORDER (protocol §5). Each fixture reaches
   EXACTLY ONE, so no later guard is credited with an earlier guard's
   refusal. */
describe('the four early-return guards, in order — M13-20…M13-23', () => {
  /* GUARD 1 — editing a document that no longer exists falls THROUGH to the
     create form after clearing the edit target; it does not error. */
  it('guard 1: a vanished edit target clears the draft and falls through', () => {
    state = baseState({ editDocId: 'GONE' })
    render(<DocumentForm me={admin} />)
    expect(cancelEdit).toHaveBeenCalled()
  })

  /* GUARD 2 — reached by a rehber who is NOT editing. It must be reached
     BEFORE the project check: a rehber has no write project either, so a
     wrong guard order would show the project message instead. */
  it('guard 2: a rehber not editing sees the permission hint, not the project hint', () => {
    render(<DocumentForm me={rehber} />)
    expect(screen.getByTestId('sm-guard-perm').textContent)
      .toBe('Sənəd yaratmaq üçün icazəniz yoxdur (yalnız Admin və Anbardar).')
    expect(screen.queryByTestId('sm-guard-project')).toBeNull()
    expect(screen.queryByTestId('sm-proj')).toBeNull()
  })

  it('guard 2 is reached even when NO project exists at all (order proof)', () => {
    state = baseState({ projects: [] })
    render(<DocumentForm me={rehber} />)
    expect(screen.queryByTestId('sm-guard-perm')).toBeTruthy()
    expect(screen.queryByTestId('sm-guard-project')).toBeNull()
  })

  /* GUARD 3 — editing AND not admin. An anbardar CAN write (so guard 2 is
     passed), which is what makes this fixture reach exactly guard 3. */
  it('guard 3: a non-admin editing sees the admin-only hint', () => {
    state = baseState({ editDocId: 'd1' })
    render(<DocumentForm me={me} />)
    expect(screen.getByTestId('sm-guard-edit-admin').textContent)
      .toBe('Provedilmiş sənədi yalnız Admin düzəldə bilər.')
    expect(screen.queryByTestId('sm-guard-perm')).toBeNull()
  })

  /* GUARD 4 — an anbardar whose warehouse matches no active project. */
  it('guard 4: no allowed active project shows the project hint', () => {
    state = baseState({ projects: [OTHER] })
    render(<DocumentForm me={me} />)
    expect(screen.getByTestId('sm-guard-project').textContent)
      .toBe('Sizə bağlı aktiv layihə yoxdur. Admin Soraqçalar bölməsində layihəni sizin anbarınıza bağlamalıdır.')
    expect(screen.queryByTestId('sm-guard-perm')).toBeNull()
  })

  /* M13-23 — guard 4 is deliberately SKIPPED in edit mode, so an admin can
     edit a document whose project is not one of their own. */
  it('guard 4 is SKIPPED in edit mode: an admin edits a foreign project’s document', () => {
    state = baseState({ editDocId: 'd1', projects: [] })
    render(<DocumentForm me={admin} />)
    expect(screen.queryByTestId('sm-guard-project')).toBeNull()
    expect(screen.queryByTestId('sm-submit')).toBeTruthy()
  })

  it('no guard fires for an anbardar with a matching project (positive control)', () => {
    render(<DocumentForm me={me} />)
    for (const id of ['sm-guard-perm', 'sm-guard-edit-admin', 'sm-guard-project']) {
      expect(screen.queryByTestId(id)).toBeNull()
    }
    expect(screen.queryByTestId('sm-submit')).toBeTruthy()
  })
})

describe('header fields — M13-30, M13-31', () => {
  it('offers only the WRITE-allowed projects', () => {
    render(<DocumentForm me={me} />)
    const options = screen.getByTestId('sm-proj').querySelectorAll('option')
    expect([...options].map((o) => o.textContent)).toEqual(['Layihə A'])
  })

  it('offers the ACTIVE channels only, behind a leading empty option', () => {
    render(<DocumentForm me={me} />)
    const options = screen.getByTestId('sm-kanal').querySelectorAll('option')
    expect([...options].map((o) => o.textContent)).toEqual(['—', 'Nağd'])
  })

  it('defaults the date to today when creating', () => {
    render(<DocumentForm me={me} />)
    expect((screen.getByTestId('sm-date') as HTMLInputElement).value)
      .toBe(new Date().toISOString().slice(0, 10))
  })

  it('pre-fills every header field from the edited document', () => {
    state = baseState({ editDocId: 'd1' })
    render(<DocumentForm me={admin} />)
    expect((screen.getByTestId('sm-date') as HTMLInputElement).value).toBe('2026-09-01')
    expect((screen.getByTestId('sm-kontragent') as HTMLInputElement).value).toBe('MMC')
    expect((screen.getByTestId('sm-avto') as HTMLInputElement).value).toBe('10-AA-123')
    expect((screen.getByTestId('sm-iv') as HTMLInputElement).value).toBe('83951')
    expect((screen.getByTestId('sm-note') as HTMLInputElement).value).toBe('qeyd')
  })

  /* M13-24, M13-25 — the edit hint appears and the import card disappears. */
  it('shows the edit hint and HIDES the document-import card in edit mode', () => {
    state = baseState({ editDocId: 'd1' })
    render(<DocumentForm me={admin} />)
    expect(screen.getByTestId('sm-edit-hint').textContent).toContain('SM-2026-000001')
    expect(screen.queryByTestId('sm-doc-imp-file')).toBeNull()
  })

  it('shows the document-import card when NOT editing (negative control)', () => {
    render(<DocumentForm me={me} />)
    expect(screen.queryByTestId('sm-doc-imp-file')).toBeTruthy()
    expect(screen.queryByTestId('sm-edit-hint')).toBeNull()
  })

  it('«ləğv et» clears the edit target', () => {
    state = baseState({ editDocId: 'd1' })
    render(<DocumentForm me={admin} />)
    fireEvent.click(screen.getByTestId('sm-edit-cancel'))
    expect(cancelEdit).toHaveBeenCalled()
  })
})

describe('the item search — M13-32, M13-33, M13-34', () => {
  const type = (value: string) => {
    fireEvent.change(screen.getByTestId('sm-item'), { target: { value } })
    act(() => { vi.advanceTimersByTime(200) })
  }

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('stays hidden below 2 characters and opens at 2 (boundary)', () => {
    render(<DocumentForm me={me} />)
    type('s')
    expect(screen.queryByTestId('sm-item-res')).toBeNull()
    type('se')
    expect(screen.queryByTestId('sm-item-res')).toBeTruthy()
  })

  it('is debounced: the panel does not open before the delay elapses', () => {
    render(<DocumentForm me={me} />)
    fireEvent.change(screen.getByTestId('sm-item'), { target: { value: 'sement' } })
    expect(screen.queryByTestId('sm-item-res')).toBeNull()
    act(() => { vi.advanceTimersByTime(200) })
    expect(screen.queryByTestId('sm-item-res')).toBeTruthy()
  })

  it('matches by code as well as by name', () => {
    render(<DocumentForm me={me} />)
    type('00000')
    expect(screen.queryByTestId('sm-hit-0000001')).toBeTruthy()
    expect(screen.queryByTestId('sm-hit-0000002')).toBeTruthy()
  })

  it('shows «Tapılmadı» when nothing matches', () => {
    render(<DocumentForm me={me} />)
    type('zzzz')
    expect(screen.getByTestId('sm-item-res').textContent).toBe('Tapılmadı')
  })

  /* M13-33 — the price is filled ONLY when empty. */
  it('a pick fills the item NAME and the price when the price is empty', () => {
    render(<DocumentForm me={me} />)
    type('sement')
    fireEvent.mouseDown(screen.getByTestId('sm-hit-0000001'))
    expect((screen.getByTestId('sm-item') as HTMLInputElement).value).toBe('Sement M400')
    expect((screen.getByTestId('sm-price') as HTMLInputElement).value).toBe('5')
  })

  it('a pick NEVER overwrites a price the user already typed (negative control)', () => {
    render(<DocumentForm me={me} />)
    fireEvent.change(screen.getByTestId('sm-price'), { target: { value: '42' } })
    type('sement')
    fireEvent.mouseDown(screen.getByTestId('sm-hit-0000001'))
    expect((screen.getByTestId('sm-price') as HTMLInputElement).value).toBe('42')
  })

  it('leaves the price empty when the picked item has none', () => {
    render(<DocumentForm me={me} />)
    type('qum')
    fireEvent.mouseDown(screen.getByTestId('sm-hit-0000002'))
    expect((screen.getByTestId('sm-price') as HTMLInputElement).value).toBe('')
  })
})

describe('adding a draft line — M13-35, M13-36', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const pick = () => {
    fireEvent.change(screen.getByTestId('sm-item'), { target: { value: 'sement' } })
    act(() => { vi.advanceTimersByTime(200) })
    fireEvent.mouseDown(screen.getByTestId('sm-hit-0000001'))
  }

  /* GUARD ORDER — no item reaches the FIRST guard even with a bad quantity. */
  it('refuses with «Mal seçilməyib» when no item is selected', () => {
    render(<DocumentForm me={me} />)
    fireEvent.change(screen.getByTestId('sm-qty'), { target: { value: '-5' } })
    fireEvent.click(screen.getByTestId('sm-add-line'))
    expect(screen.getByTestId('sm-err').textContent).toBe('Mal seçilməyib')
    expect(addDraftLine).not.toHaveBeenCalled()
  })

  it.each([['0'], ['-1'], ['']])(
    'refuses quantity %j with «Miqdar müsbət olmalıdır» — the SECOND guard', (qty) => {
      render(<DocumentForm me={me} />)
      pick()
      fireEvent.change(screen.getByTestId('sm-qty'), { target: { value: qty } })
      fireEvent.click(screen.getByTestId('sm-add-line'))
      expect(screen.getByTestId('sm-err').textContent).toBe('Miqdar müsbət olmalıdır')
      expect(addDraftLine).not.toHaveBeenCalled()
    })

  it('adds the line and RESETS all three inputs on success', () => {
    render(<DocumentForm me={me} />)
    pick()
    fireEvent.change(screen.getByTestId('sm-qty'), { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('sm-add-line'))
    expect(addDraftLine).toHaveBeenCalledWith({ code: '0000001', qty: 3, price: 5 })
    expect((screen.getByTestId('sm-item') as HTMLInputElement).value).toBe('')
    expect((screen.getByTestId('sm-qty') as HTMLInputElement).value).toBe('')
    expect((screen.getByTestId('sm-price') as HTMLInputElement).value).toBe('')
    expect(screen.getByTestId('sm-err').textContent).toBe('')
  })

  it('defaults an empty price to 0', () => {
    render(<DocumentForm me={me} />)
    fireEvent.change(screen.getByTestId('sm-item'), { target: { value: 'qum' } })
    act(() => { vi.advanceTimersByTime(200) })
    fireEvent.mouseDown(screen.getByTestId('sm-hit-0000002'))
    fireEvent.change(screen.getByTestId('sm-qty'), { target: { value: '2' } })
    fireEvent.click(screen.getByTestId('sm-add-line'))
    expect(addDraftLine).toHaveBeenCalledWith({ code: '0000002', qty: 2, price: 0 })
  })
})

describe('the draft lines table — M13-39…M13-43', () => {
  it('renders the TWO-LINE hint when empty, not an empty table', () => {
    render(<DocumentForm me={me} />)
    const box = screen.getByTestId('sm-lines-tbl')
    expect(box.textContent).toContain('Hələ sətir əlavə edilməyib.')
    expect(box.textContent).toContain('Soldan mal seçib')
    expect(box.querySelector('table')).toBeNull()
  })

  it('renders exactly the seven columns', () => {
    state = baseState({ draft: [{ code: '0000001', qty: 2, price: 5 }] })
    render(<DocumentForm me={me} />)
    const headers = screen.getByTestId('sm-lines-tbl').querySelectorAll('th')
    expect([...headers].map((h) => h.textContent))
      .toEqual(['Mal', 'Kod', 'Ölçü', 'Miqdar', 'Qiymət', 'Cəm', ''])
  })

  it('falls back to the raw code and an empty unit for an unknown item', () => {
    state = baseState({ draft: [{ code: '9999999', qty: 1, price: 1 }] })
    render(<DocumentForm me={me} />)
    const cells = screen.getByTestId('sm-lines-tbl').querySelectorAll('tbody td')
    expect(cells[0].textContent).toBe('9999999')
    expect(cells[2].textContent).toBe('')
  })

  it('removes THAT row by index', () => {
    state = baseState({
      draft: [{ code: '0000001', qty: 1, price: 1 }, { code: '0000002', qty: 2, price: 2 }],
    })
    render(<DocumentForm me={me} />)
    fireEvent.click(screen.getByTestId('sm-del-1'))
    expect(removeDraftLine).toHaveBeenCalledWith(1)
  })

  /* M13-42 — money() renders EXACTLY 0 as an em-dash, not `0,00 ₼`. */
  it('renders a grand total of exactly 0 as an em-dash (boundary)', () => {
    state = baseState({ draft: [{ code: '0000001', qty: 5, price: 0 }] })
    render(<DocumentForm me={me} />)
    expect(screen.getByTestId('sm-total').textContent).toBe('—')
  })

  it('renders a non-zero grand total as money', () => {
    state = baseState({ draft: [{ code: '0000001', qty: 2, price: 5 }] })
    render(<DocumentForm me={me} />)
    expect(screen.getByTestId('sm-total').textContent).toContain('₼')
  })
})

describe('submit — M13-50…M13-54', () => {
  const draft = [{ code: '0000001', qty: 2, price: 5 }]

  it('refuses in a FIXED order: date before lines', async () => {
    state = baseState({ draft: [] })
    render(<DocumentForm me={me} />)
    fireEvent.change(screen.getByTestId('sm-date'), { target: { value: '' } })
    await act(async () => { fireEvent.click(screen.getByTestId('sm-submit')) })
    expect(screen.getByTestId('sm-err').textContent).toBe('Tarix seçilməyib')
    expect(createSerfiyyatDocument).not.toHaveBeenCalled()
  })

  it('refuses an empty draft with its own message', async () => {
    state = baseState({ draft: [] })
    render(<DocumentForm me={me} />)
    await act(async () => { fireEvent.click(screen.getByTestId('sm-submit')) })
    expect(screen.getByTestId('sm-err').textContent).toBe('Ən azı bir material sətri lazımdır')
    expect(createSerfiyyatDocument).not.toHaveBeenCalled()
  })

  it('calls CREATE with the header and lines when not editing', async () => {
    state = baseState({ draft })
    render(<DocumentForm me={me} />)
    fireEvent.change(screen.getByTestId('sm-kontragent'), { target: { value: 'MMC' } })
    await act(async () => { fireEvent.click(screen.getByTestId('sm-submit')) })
    expect(createSerfiyyatDocument).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'p1', kontragent: 'MMC', lines: draft,
    }))
    expect(editSerfiyyatDocument).not.toHaveBeenCalled()
  })

  /* M13-52 — ONE submit path, routed by editDocId. */
  it('calls EDIT with the document id when editing', async () => {
    state = baseState({ draft, editDocId: 'd1' })
    render(<DocumentForm me={admin} />)
    await act(async () => { fireEvent.click(screen.getByTestId('sm-submit')) })
    expect(editSerfiyyatDocument).toHaveBeenCalledWith('d1', expect.objectContaining({ lines: draft }))
    expect(createSerfiyyatDocument).not.toHaveBeenCalled()
  })

  it('toasts, reloads and clears every header and line-editor field on success', async () => {
    state = baseState({ draft })
    render(<DocumentForm me={me} />)
    fireEvent.change(screen.getByTestId('sm-kontragent'), { target: { value: 'MMC' } })
    fireEvent.change(screen.getByTestId('sm-avto'), { target: { value: '10-AA-123' } })
    fireEvent.change(screen.getByTestId('sm-iv'), { target: { value: 'INV-1' } })
    fireEvent.change(screen.getByTestId('sm-note'), { target: { value: 'qeyd' } })
    fireEvent.change(screen.getByTestId('sm-item'), { target: { value: 'Sement' } })
    fireEvent.change(screen.getByTestId('sm-qty'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('sm-price'), { target: { value: '5' } })
    await act(async () => { fireEvent.click(screen.getByTestId('sm-submit')) })
    expect(show).toHaveBeenCalledWith('Sənəd yaradıldı: SM-2026-000009')
    expect(clearDraft).toHaveBeenCalled()
    expect(load).toHaveBeenCalled()
    for (const id of ['sm-kontragent', 'sm-avto', 'sm-iv', 'sm-note', 'sm-item', 'sm-qty', 'sm-price']) {
      expect((screen.getByTestId(id) as HTMLInputElement).value).toBe('')
    }
  })

  it('uses the «düzəldildi» wording on a successful edit', async () => {
    state = baseState({ draft, editDocId: 'd1' })
    render(<DocumentForm me={admin} />)
    await act(async () => { fireEvent.click(screen.getByTestId('sm-submit')) })
    expect(show).toHaveBeenCalledWith('Sənəd düzəldildi: SM-2026-000001')
  })

  /* M13-54 — THE DRAFT IS KEPT on failure: a refused submit loses no work. */
  it('keeps the draft and does NOT reload when the server refuses', async () => {
    createSerfiyyatDocument.mockResolvedValue({ ok: false, data: null, error: 'İcazə yoxdur: ...' })
    state = baseState({ draft })
    render(<DocumentForm me={me} />)
    fireEvent.change(screen.getByTestId('sm-kontragent'), { target: { value: 'MMC' } })
    await act(async () => { fireEvent.click(screen.getByTestId('sm-submit')) })

    expect(show).toHaveBeenCalledWith('Xəta: İcazə yoxdur: ...', true)
    expect(clearDraft).not.toHaveBeenCalled()
    expect(load).not.toHaveBeenCalled()
    /* The typed header value survives too. */
    expect((screen.getByTestId('sm-kontragent') as HTMLInputElement).value).toBe('MMC')
  })
})
