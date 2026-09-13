import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ItemRequestView } from '../../lib/nomenclatureRequests'

/* T4 — the review dialog (M12-70…M12-81). Both RPC wrappers are mocked.

   NOTHING HERE IS SERVER EVIDENCE. The admin-only gate, the already-approved
   idempotency and the mandatory-reason rule are ALSO enforced by sql/017 and
   are proven only by a refused/allowed call (M12-78, M12-91, M12-92). */

const approveItemRequest = vi.fn()
const rejectItemRequest = vi.fn()
vi.mock('../../api/itemRequests.api', () => ({
  approveItemRequest: (i: unknown) => approveItemRequest(i),
  rejectItemRequest: (i: unknown) => rejectItemRequest(i),
}))

const show = vi.fn()
vi.mock('../../store/toast.store', () => ({ useToastStore: (sel: (s: unknown) => unknown) => sel({ show }) }))

import { RequestReviewDialog } from './RequestReviewDialog'

const ITEM = { code: '0000001', name: 'Kabel NYM 3x1.5', unit: 'metr', price: 1, category: null }

const req = (over: Partial<ItemRequestView> = {}): ItemRequestView => ({
  id: 'r1', name: 'Sement M400', unit: 'kq', category: 'Tikinti', note: '', status: 'pending',
  by: 'u1', w: 'Test Anbar', ts: Date.UTC(2026, 8, 11), decidedBy: '', decidedAt: '',
  reason: '', code: '', ...over,
})

const onDecided = vi.fn()
const onClose = vi.fn()

function renderDialog(over: {
  request?: ItemRequestView
  items?: typeof ITEM[]
  requests?: ItemRequestView[]
} = {}) {
  return render(
    <RequestReviewDialog
      request={over.request ?? req()}
      items={over.items ?? []}
      requests={over.requests ?? []}
      units={['metr', 'kq']}
      categories={['Tikinti']}
      onDecided={onDecided}
      onClose={onClose}
    />,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('header and prefill — M12-71, M12-73', () => {
  it('shows the raw warehouse and the formatted date, with no note segment when absent', () => {
    renderDialog()
    expect(screen.getByTestId('nv-head').textContent).toBe('Test Anbar · 11.09.2026')
  })

  it('appends the note only when one exists', () => {
    renderDialog({ request: req({ note: 'təcili' }) })
    expect(screen.getByTestId('nv-head').textContent).toBe('Test Anbar · 11.09.2026 · qeyd: təcili')
  })

  it('renders an em-dash for a missing warehouse', () => {
    renderDialog({ request: req({ w: '' }) })
    expect(screen.getByTestId('nv-head').textContent).toContain('— ·')
  })

  it('pre-fills the editable name and pre-selects unit and category', () => {
    renderDialog()
    expect((screen.getByTestId('nv-name') as HTMLInputElement).value).toBe('Sement M400')
    expect((screen.getByTestId('nv-unit') as HTMLSelectElement).value).toBe('kq')
    expect((screen.getByTestId('nv-cat') as HTMLSelectElement).value).toBe('Tikinti')
  })

  it('the unit empty option NAMES the server default — M12-73', () => {
    renderDialog()
    expect(within(screen.getByTestId('nv-unit')).getAllByRole('option')[0].textContent)
      .toBe('Seçilməyib (ədəd)')
  })
})

describe('similar block — M12-72', () => {
  it('with no matches at all it renders the "not found" line', () => {
    renderDialog()
    expect(screen.getByTestId('nv-sim').textContent).toBe('Oxşar mövcud mal tapılmadı.')
  })

  it('with matching ITEMS it lists them under the heading', () => {
    /* 'kabelnym' is contained in the item's 'kabelnym3x15' (>= 4 chars), so
       the containment arm fires. '3x2.5' would NOT match — the two keys
       neither are equal nor contain one another. */
    renderDialog({ request: req({ name: 'Kabel NYM' }), items: [ITEM] })
    expect(screen.getByTestId('nv-sim').textContent).toContain('Oxşar mövcud mallar')
    expect(screen.getByTestId('nv-sim').textContent).toContain('0000001')
  })

  it('items empty but REQUESTS matched still shows the heading with a «yoxdur» entry', () => {
    /* The exact legacy branch: the block is gated on (items || reqs), and the
       "yoxdur" line fires only when items is empty. */
    renderDialog({
      request: req({ name: 'Sement M400' }),
      items: [],
      requests: [req({ id: 'other', name: 'Sement M400' })],
    })
    expect(screen.getByTestId('nv-sim').textContent).toContain('Oxşar mövcud mallar')
    expect(screen.getByText('yoxdur').className).toBe('muted')
  })
})

describe('footer — M12-75', () => {
  it('renders «Rədd et», «Bağla» and «Təsdiqlə və mal yarat», with the atomicity hint', () => {
    renderDialog()
    expect(screen.getByTestId('nv-rej').textContent).toBe('Rədd et')
    expect(screen.getByTestId('nv-ok').textContent).toBe('Təsdiqlə və mal yarat')
    expect(screen.getByText(/Əməliyyat atomikdir/)).toBeTruthy()
  })
})

describe('approval — M12-76, M12-77, M12-81', () => {
  it('refuses a name shorter than 3 chars and makes NO call — M12-76 client guard', async () => {
    renderDialog()
    fireEvent.change(screen.getByTestId('nv-name'), { target: { value: 'ab' } })
    fireEvent.click(screen.getByTestId('nv-ok'))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Ad ən azı 3 simvol olmalıdır', true))
    expect(approveItemRequest).not.toHaveBeenCalled()
  })

  it('exactly 3 characters IS sent (boundary control)', async () => {
    approveItemRequest.mockResolvedValue({ ok: true, data: { code: '0000010' }, error: null })
    renderDialog()
    fireEvent.change(screen.getByTestId('nv-name'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByTestId('nv-ok'))
    await vi.waitFor(() => expect(approveItemRequest).toHaveBeenCalled())
  })

  it('sends the id and the admin corrections, then toasts the NEW code', async () => {
    approveItemRequest.mockResolvedValue({
      ok: true, data: { code: '0000010', already_approved: false, created_item: true }, error: null,
    })
    renderDialog()
    fireEvent.click(screen.getByTestId('nv-ok'))
    await vi.waitFor(() => expect(approveItemRequest).toHaveBeenCalledWith({
      requestId: 'r1', name: 'Sement M400', unit: 'kq', category: 'Tikinti',
    }))
    expect(show).toHaveBeenCalledWith('Təsdiqləndi — yeni mal kodu: 0000010')
    expect(onDecided).toHaveBeenCalled()
  })

  it('reports an IDEMPOTENT repeat with the existing code — M12-77/M12-78 client half', async () => {
    approveItemRequest.mockResolvedValue({
      ok: true, data: { code: '0000009', already_approved: true, created_item: false }, error: null,
    })
    renderDialog()
    fireEvent.click(screen.getByTestId('nv-ok'))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Sorğu artıq təsdiqlənib — kod: 0000009'))
  })

  it('a missing code prints an em-dash', async () => {
    approveItemRequest.mockResolvedValue({ ok: true, data: {}, error: null })
    renderDialog()
    fireEvent.click(screen.getByTestId('nv-ok'))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Təsdiqləndi — yeni mal kodu: —'))
  })

  it('a FAILED approval keeps the dialog open and re-enables the button — M12-81', async () => {
    approveItemRequest.mockResolvedValue({ ok: false, data: null, error: 'İcazə yoxdur' })
    renderDialog()
    fireEvent.click(screen.getByTestId('nv-ok'))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Təsdiqlənmədi: İcazə yoxdur', true))
    expect(onDecided).not.toHaveBeenCalled()
    expect(screen.getByTestId('nv-ok').hasAttribute('disabled')).toBe(false)
  })
})

describe('rejection — M12-79, M12-80, M12-81', () => {
  it('refuses an EMPTY reason and makes NO call — M12-79 client leg', async () => {
    renderDialog()
    fireEvent.click(screen.getByTestId('nv-rej'))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Rədd səbəbi tələb olunur', true))
    expect(rejectItemRequest).not.toHaveBeenCalled()
  })

  it('a whitespace-only reason is likewise refused (boundary)', async () => {
    renderDialog()
    fireEvent.change(screen.getByTestId('nv-why'), { target: { value: '   ' } })
    fireEvent.click(screen.getByTestId('nv-rej'))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Rədd səbəbi tələb olunur', true))
    expect(rejectItemRequest).not.toHaveBeenCalled()
  })

  it('sends the trimmed reason and reports success — M12-80', async () => {
    rejectItemRequest.mockResolvedValue({ ok: true, data: null, error: null })
    renderDialog()
    fireEvent.change(screen.getByTestId('nv-why'), { target: { value: '  artıq var  ' } })
    fireEvent.click(screen.getByTestId('nv-rej'))
    await vi.waitFor(() => expect(rejectItemRequest).toHaveBeenCalledWith({
      requestId: 'r1', reason: 'artıq var',
    }))
    expect(show).toHaveBeenCalledWith('Sorğu rədd edildi')
    expect(onDecided).toHaveBeenCalled()
  })

  it('a FAILED rejection keeps the dialog open — M12-81', async () => {
    rejectItemRequest.mockResolvedValue({ ok: false, data: null, error: 'Sorğu artıq qapanıb' })
    renderDialog()
    fireEvent.change(screen.getByTestId('nv-why'), { target: { value: 'səbəb' } })
    fireEvent.click(screen.getByTestId('nv-rej'))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Rədd edilmədi: Sorğu artıq qapanıb', true))
    expect(onDecided).not.toHaveBeenCalled()
    expect(screen.getByTestId('nv-rej').hasAttribute('disabled')).toBe(false)
  })
})
