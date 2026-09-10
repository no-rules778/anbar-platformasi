import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/importNewItems.api', () => ({ importNewItems: vi.fn() }))
vi.mock('../../lib/mutationGuard', async (orig) => ({
  ...(await orig<typeof import('../../lib/mutationGuard')>()),
  blockedReason: vi.fn(() => null),
}))

import { importNewItems } from '../../api/importNewItems.api'
import { blockedReason } from '../../lib/mutationGuard'
import { ImportItemsDialog } from './ImportItemsDialog'
import { useToastStore } from '../../store/toast.store'
import type { ItemRow } from '../../api/items.api'

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement M400', unit: 'kq', price: 10, category: null, ...over,
})

const lastToast = () => {
  const m = useToastStore.getState().messages
  return m[m.length - 1]
}

beforeEach(() => {
  vi.clearAllMocks()
  useToastStore.setState({ messages: [] })
  vi.mocked(importNewItems).mockResolvedValue({ ok: true, created: [], skipped: [], error: null })
})

function renderDialog(items: ItemRow[] = []) {
  const onDone = vi.fn()
  render(<ImportItemsDialog items={items} onDone={onDone} onClose={vi.fn()} />)
  return { onDone }
}

/* fireEvent.change rather than userEvent.paste: identical resulting state,
   without simulating each keystroke, which kept these tests inside the
   default timeout when the suite runs in parallel. */
async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
  fireEvent.change(screen.getByLabelText('Sətirlər'), { target: { value: text } })
  await user.click(screen.getByRole('button', { name: 'Yoxla' }))
}

describe('preview (M5-40)', () => {
  it('reads a pasted list with a header row', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Malın adı\tÖlçü vahidi\nSement M400\tkq')
    expect(screen.getByText('Sement M400')).toBeTruthy()
    /* The header row is skipped, leaving exactly one data row marked new. */
    expect(screen.getByText('Yeni mal')).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })

  it('reads a headerless list positionally', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Boru qara\tkq')
    expect(screen.getByText('Boru qara')).toBeTruthy()
  })

  it('shows a PREDICTED code and says so — the server assigns the real one', async () => {
    const user = userEvent.setup()
    renderDialog([item({ code: '0000041' })])
    await paste(user, 'Yeni mal adı\tkq')
    expect(screen.getByText('Kod (proqnoz)')).toBeTruthy()
    expect(screen.getByText('0000042')).toBeTruthy()
  })

  it('flags an exact existing name as already present', async () => {
    const user = userEvent.setup()
    renderDialog([item()])
    await paste(user, 'Sement M400\tkq')
    expect(screen.getByText('bazada var')).toBeTruthy()
  })

  it('rejects a name shorter than three characters', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'ab\tkq')
    expect(screen.getByText('səhv')).toBeTruthy()
  })
})

/* M5-41 / M5-42 — only new items, no price, server-assigned codes. */
describe('apply', () => {
  it('sends only name and unit — never a code or price', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Yeni mal adı\tkq')
    await user.click(screen.getByRole('button', { name: /^Yeni malları yarat/ }))
    await waitFor(() => expect(importNewItems).toHaveBeenCalled())
    const sent = vi.mocked(importNewItems).mock.calls[0][0]
    expect(Object.keys(sent[0]).sort()).toEqual(['name', 'unit'])
  })

  it('never sends a row that exactly matches an existing item', async () => {
    const user = userEvent.setup()
    renderDialog([item()])
    await paste(user, 'Sement M400\tkq')
    expect((screen.getByRole('button', { name: /^Yeni malları yarat/ }) as HTMLButtonElement).disabled)
      .toBe(true)
  })

  it('reports created and skipped counts', async () => {
    const user = userEvent.setup()
    vi.mocked(importNewItems).mockResolvedValue({
      ok: true,
      created: [{ code: '0000002', name: 'Yeni mal adı', unit: 'kq' }],
      skipped: ['x'],
      error: null,
    })
    const { onDone } = renderDialog()
    await paste(user, 'Yeni mal adı\tkq')
    await user.click(screen.getByRole('button', { name: /^Yeni malları yarat/ }))
    await waitFor(() => expect(lastToast().text).toContain('1 yeni mal yaradıldı'))
    expect(lastToast().text).toContain('1 sətir ötürüldü')
    expect(onDone).toHaveBeenCalled()
  })

  it('reports a failure without claiming success', async () => {
    const user = userEvent.setup()
    vi.mocked(importNewItems).mockResolvedValue({ ok: false, created: [], skipped: [], error: 'denied' })
    const { onDone } = renderDialog()
    await paste(user, 'Yeni mal adı\tkq')
    await user.click(screen.getByRole('button', { name: /^Yeni malları yarat/ }))
    await waitFor(() => expect(lastToast().isError).toBe(true))
    expect(onDone).not.toHaveBeenCalled()
  })
})

/* A03 / I-14 — niCount() (index.html:6086-6094) disables the import whenever
   ANY row is `err`, however many valid rows sit beside it. The pre-fix code
   selected the valid rows and disabled the button only when none existed, so
   a file with one short name still imported its other rows. */
describe('A03 — whole-file error gate', () => {
  it('blocks the import when a valid row and an error row are mixed', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Yeni mal adı\tkq\nab\tkq')
    const btn = screen.getByRole('button', { name: /Səhv sətirləri düzəldin \(1\)/ })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('runs no import RPC while an error row is present', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Yeni mal adı\tkq\nab\tkq')
    await user.click(screen.getByRole('button', { name: /Səhv sətirləri düzəldin/ }))
    expect(importNewItems).not.toHaveBeenCalled()
  })

  it('imports normally once the error row is gone', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Yeni mal adı\tkq\nab\tkq')
    expect(screen.queryByRole('button', { name: /^Yeni malları yarat/ })).toBeNull()

    await paste(user, 'Yeni mal adı\tkq')
    await user.click(screen.getByRole('button', { name: /^Yeni malları yarat/ }))
    await waitFor(() => expect(importNewItems).toHaveBeenCalledTimes(1))
  })

  it('shows the error count in the button label, as niCount() does', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'ab\tkq\ncd\tkq')
    expect(screen.getByRole('button', { name: 'Səhv sətirləri düzəldin (2)' })).toBeTruthy()
  })
})

/* A05 — per-row checkboxes and the code predictions that follow them
   (index.html:6072-6075, niRecompute 6047-6053). */
describe('A05 — per-row selection and code prediction', () => {
  it('excludes a row the user unchecks', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Birinci mal\tkq\nİkinci mal\tkq')
    await user.click(screen.getByLabelText('Sətir 2'))
    await user.click(screen.getByRole('button', { name: /^Yeni malları yarat/ }))
    await waitFor(() => expect(importNewItems).toHaveBeenCalled())
    expect(vi.mocked(importNewItems).mock.calls[0][0]).toEqual([
      { name: 'Birinci mal', unit: 'kq' },
    ])
  })

  /* Deselecting a row must close the gap in the predicted sequence: the
     remaining row takes the code the deselected one would have had. */
  it('recomputes the predicted codes when a row is deselected', async () => {
    const user = userEvent.setup()
    renderDialog([item({ code: '0000001' })])
    await paste(user, 'Birinci mal\tkq\nİkinci mal\tkq')
    expect(screen.getByText('0000002')).toBeTruthy()
    expect(screen.getByText('0000003')).toBeTruthy()

    await user.click(screen.getByLabelText('Sətir 1'))
    /* Row 1 loses its prediction; row 2 moves up to 0000002. */
    expect(screen.queryByText('0000003')).toBeNull()
    expect(screen.getByText('0000002')).toBeTruthy()
  })

  it('locks an error row off so it can never be selected', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'ab\tkq')
    const cb = screen.getByLabelText('Sətir 1') as HTMLInputElement
    expect(cb.disabled).toBe(true)
    expect(cb.checked).toBe(false)
  })

  /* An exact duplicate is never created, so its checkbox is locked off too
     (index.html:6074 disables `err` AND `dup`). */
  it('locks a duplicate row off as well', async () => {
    const user = userEvent.setup()
    renderDialog([item()])
    await paste(user, 'Sement M400\tkq')
    const cb = screen.getByLabelText('Sətir 1') as HTMLInputElement
    expect(cb.disabled).toBe(true)
  })

  it('puts the selected row count in the button label', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Birinci mal\tkq\nİkinci mal\tkq')
    expect(screen.getByRole('button', { name: 'Yeni malları yarat (2)' })).toBeTruthy()
    await user.click(screen.getByLabelText('Sətir 1'))
    expect(screen.getByRole('button', { name: 'Yeni malları yarat (1)' })).toBeTruthy()
  })
})

describe('localhost write guard (R-F8)', () => {
  it('refuses the import and calls no RPC when blocked', async () => {
    const user = userEvent.setup()
    vi.mocked(blockedReason).mockReturnValueOnce('Bu əməliyyat lokal rejimdə bloklanıb')
    renderDialog()
    await paste(user, 'Yeni mal adı\tkq')
    await user.click(screen.getByRole('button', { name: /^Yeni malları yarat/ }))
    expect(importNewItems).not.toHaveBeenCalled()
    expect(lastToast().text).toContain('bloklanıb')
  })
})
