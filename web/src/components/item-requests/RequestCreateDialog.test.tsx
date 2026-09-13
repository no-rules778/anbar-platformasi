import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ItemRequestView } from '../../lib/nomenclatureRequests'

/* T4 — the create dialog (M12-50…M12-62). The RPC wrapper is mocked: this is
   UNIT evidence of the dialog's own contract. The SERVER's anbardar-only gate
   is M12-91 and is proven only by a refused call, never by this file. */

const requestNewItem = vi.fn()
vi.mock('../../api/itemRequests.api', () => ({ requestNewItem: (i: unknown) => requestNewItem(i) }))

const show = vi.fn()
vi.mock('../../store/toast.store', () => ({ useToastStore: (sel: (s: unknown) => unknown) => sel({ show }) }))

import { RequestCreateDialog, canSubmit, validationState } from './RequestCreateDialog'

const ITEM = { code: '0000001', name: 'Kabel NYM 3x1.5', unit: 'metr', price: 1, category: null }

const req = (over: Partial<ItemRequestView> = {}): ItemRequestView => ({
  id: 'r1', name: 'Sement M400', unit: 'kq', category: '', note: '', status: 'pending',
  by: 'u1', w: 'W', ts: 1, decidedBy: '', decidedAt: '', reason: '', code: '', ...over,
})

const onCreated = vi.fn()
const onClose = vi.fn()

function renderDialog(over: { items?: typeof ITEM[]; requests?: ItemRequestView[] } = {}) {
  return render(
    <RequestCreateDialog
      items={over.items ?? [ITEM]}
      requests={over.requests ?? [req()]}
      units={['metr', 'kq']}
      categories={['Tikinti']}
      onCreated={onCreated}
      onClose={onClose}
    />,
  )
}

/* The live check is debounced 160 ms (M12-56). Driven with the accepted
   MovementsPage/BalancesPage idiom: `shouldAdvanceTime` keeps real time
   flowing so the submit path's promises still settle under `vi.waitFor`,
   while the debounce is stepped explicitly inside `act()`. */
const type = async (value: string) => {
  fireEvent.change(screen.getByTestId('nq-name'), { target: { value } })
  await act(async () => { vi.advanceTimersByTime(200) })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('validationState — M12-56 precedence, M12-57 empty', () => {
  const items = [ITEM]
  const reqs = [req()]

  it('an EMPTY name produces NO message at all — M12-57', () => {
    expect(validationState('', items, reqs)).toEqual({ kind: 'none' })
    expect(validationState('   ', items, reqs)).toEqual({ kind: 'none' })
  })

  it('1-2 characters is the tooShort state — distinct from empty', () => {
    expect(validationState('a', items, reqs).kind).toBe('tooShort')
    expect(validationState('ab', items, reqs).kind).toBe('tooShort')
  })

  it('exactly 3 characters is NOT tooShort (boundary)', () => {
    expect(validationState('abc', items, reqs).kind).not.toBe('tooShort')
  })

  it('an exact ITEM match outranks everything below it', () => {
    const s = validationState('kabel nym 3x1.5', items, reqs)
    expect(s.kind).toBe('exactItem')
  })

  it('an exact PENDING REQUEST match outranks the similar list', () => {
    expect(validationState('Sement M400', [], reqs).kind).toBe('exactRequest')
  })

  it('a merely similar name yields the non-blocking similar state', () => {
    /* 'kabelnym' (8 chars) is CONTAINED in the item's 'kabelnym3x15', so the
       >= 4 containment arm fires without the keys being equal. '3x2.5' would
       NOT match: 'kabelnym3x25' neither contains nor is contained by
       'kabelnym3x15'. */
    expect(validationState('Kabel NYM', items, []).kind).toBe('similar')
  })
})

describe('canSubmit — M12-58', () => {
  it('needs 3 characters; exactly 3 is allowed (boundary)', () => {
    expect(canSubmit({ kind: 'none' }, 'ab')).toBe(false)
    expect(canSubmit({ kind: 'none' }, 'abc')).toBe(true)
  })

  it('a SIMILAR name leaves submission ENABLED — the whole point of the distinction', () => {
    expect(canSubmit({ kind: 'similar', items: [ITEM], reqs: [] }, 'Kabel NYM 3x2.5')).toBe(true)
  })

  it('an exact item or pending request BLOCKS submission (negative controls)', () => {
    expect(canSubmit({ kind: 'exactItem', item: ITEM }, 'Kabel NYM 3x1.5')).toBe(false)
    expect(canSubmit({ kind: 'exactRequest' }, 'Sement M400')).toBe(false)
  })
})

describe('dialog rendering — M12-51, M12-52', () => {
  it('renders the title and the fixed explanatory block', () => {
    renderDialog()
    expect(screen.getByRole('dialog', { name: 'Yeni nomenklatura sorğusu' })).toBeTruthy()
    expect(screen.getByText(/Bu, mal yaratmır/)).toBeTruthy()
  })

  it('builds both selects from the shared options with a leading «Seçilməyib»', () => {
    renderDialog()
    const units = within(screen.getByTestId('nq-unit')).getAllByRole('option')
    expect(units[0].textContent).toBe('Seçilməyib')
    expect(units.map((o) => o.textContent)).toEqual(['Seçilməyib', 'metr', 'kq'])
    expect(within(screen.getByTestId('nq-cat')).getAllByRole('option')[0].textContent).toBe('Seçilməyib')
  })

  it('the submit button starts disabled on an empty name', () => {
    renderDialog()
    expect(screen.getByTestId('nq-go').hasAttribute('disabled')).toBe(true)
  })
})

describe('live validation drives the message and the button — M12-56, M12-58', () => {
  it('shows the too-short message and keeps the button disabled', async () => {
    renderDialog()
    await type('ab')
    expect(screen.getByTestId('nq-sim').textContent).toContain('Ad ən azı 3 simvol olmalıdır.')
    expect(screen.getByTestId('nq-go').hasAttribute('disabled')).toBe(true)
  })

  it('blocks on an exact item match, naming the item and its code', async () => {
    renderDialog()
    await type('Kabel NYM 3x1.5')
    expect(screen.getByTestId('nq-sim').textContent).toContain('Bu mal nomenklaturada artıq var')
    expect(screen.getByTestId('nq-sim').textContent).toContain('0000001')
    expect(screen.getByTestId('nq-go').hasAttribute('disabled')).toBe(true)
  })

  it('blocks on an exact pending-request match', async () => {
    renderDialog({ items: [] })
    await type('Sement M400')
    expect(screen.getByTestId('nq-sim').textContent).toContain('Bu ad üzrə gözləyən sorğu artıq var')
    expect(screen.getByTestId('nq-go').hasAttribute('disabled')).toBe(true)
  })

  it('a SIMILAR name warns but leaves the button ENABLED — the negative control', async () => {
    renderDialog({ requests: [] })
    /* Contained in the item's key, so similar but not equal. */
    await type('Kabel NYM')
    expect(screen.getByTestId('nq-sim').textContent).toContain('Oxşar adlar tapıldı')
    expect(screen.getByTestId('nq-sim').textContent).toContain('qərarı Admin verir')
    expect(screen.getByTestId('nq-go').hasAttribute('disabled')).toBe(false)
  })
})

describe('submit — M12-59, M12-61, M12-62', () => {
  it('sends exactly the four parameters and reports success', async () => {
    requestNewItem.mockResolvedValue({ ok: true, data: { id: 'r9' }, error: null })
    renderDialog({ items: [], requests: [] })
    await type('Boru d20')
    fireEvent.change(screen.getByTestId('nq-unit'), { target: { value: 'metr' } })
    fireEvent.change(screen.getByTestId('nq-note'), { target: { value: 'təcili' } })
    fireEvent.click(screen.getByTestId('nq-go'))
    await vi.waitFor(() => expect(requestNewItem).toHaveBeenCalled())
    expect(requestNewItem).toHaveBeenCalledWith({
      name: 'Boru d20', unit: 'metr', category: '', note: 'təcili',
    })
    expect(onCreated).toHaveBeenCalled()
    expect(show).toHaveBeenCalledWith('Sorğu göndərildi — Admin təsdiqini gözləyir')
  })

  it('a FAILED submit keeps the dialog open with the input intact — M12-62', async () => {
    requestNewItem.mockResolvedValue({ ok: false, data: null, error: 'İcazə yoxdur' })
    renderDialog({ items: [], requests: [] })
    await type('Boru d20')
    fireEvent.click(screen.getByTestId('nq-go'))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Sorğu göndərilmədi: İcazə yoxdur', true))
    /* Not closed, input preserved, button usable again. */
    expect(onCreated).not.toHaveBeenCalled()
    expect((screen.getByTestId('nq-name') as HTMLInputElement).value).toBe('Boru d20')
    expect(screen.getByTestId('nq-go').hasAttribute('disabled')).toBe(false)
  })
})
