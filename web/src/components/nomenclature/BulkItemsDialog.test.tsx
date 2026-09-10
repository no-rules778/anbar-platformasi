import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/itemWrite.api', () => ({ createItem: vi.fn(), updateItem: vi.fn() }))
vi.mock('../../lib/mutationGuard', async (orig) => ({
  ...(await orig<typeof import('../../lib/mutationGuard')>()),
  blockedReason: vi.fn(() => null),
}))

import { createItem, updateItem } from '../../api/itemWrite.api'
import { blockedReason } from '../../lib/mutationGuard'
import { BulkItemsDialog } from './BulkItemsDialog'
import { useToastStore } from '../../store/toast.store'
import type { ItemRow } from '../../api/items.api'
import type { Me } from '../../lib/roles'

const me: Me = { id: 'u1', sbId: 'sb1', email: 'a@x.com', name: 'Admin', role: 'admin', wh: '' }
const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null, ...over,
})

const lastToast = () => {
  const m = useToastStore.getState().messages
  return m[m.length - 1]
}

beforeEach(() => {
  vi.clearAllMocks()
  useToastStore.setState({ messages: [] })
  vi.mocked(createItem).mockResolvedValue({ ok: true, code: '0000002', error: null })
  vi.mocked(updateItem).mockResolvedValue({ ok: true, code: '0000001', error: null })
})

function renderDialog(items: ItemRow[] = []) {
  const onDone = vi.fn()
  render(<BulkItemsDialog items={items} units={['kq', 'ədəd']} me={me} onDone={onDone} onClose={vi.fn()} />)
  return { onDone }
}

/* fireEvent.change rather than userEvent.paste: identical resulting state,
   without simulating each keystroke, which kept these tests inside the
   default timeout when the suite runs in parallel. */
async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
  fireEvent.change(screen.getByLabelText('Sətirlər'), { target: { value: text } })
  await user.click(screen.getByRole('button', { name: 'Yoxla' }))
}

describe('preview (M5-38)', () => {
  it('classifies rows and reports an empty paste', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: 'Yoxla' }))
    expect(screen.getByText('Sətir tapılmadı')).toBeTruthy()
  })

  it('marks a valid line as new and a bad unit as an error', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Sement\tkq\nBoru\tton')
    expect(screen.getByText('yeni')).toBeTruthy()
    expect(screen.getByText('səhv')).toBeTruthy()
  })

  it('never sends an error row', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Boru\tton')
    /* Nothing applicable → the apply button stays disabled. */
    expect((screen.getByRole('button', { name: /^Bazaya yaz/ }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('apply', () => {
  it('creates each new row', async () => {
    const user = userEvent.setup()
    const { onDone } = renderDialog()
    await paste(user, 'Sement\tkq\nBoru\tkq')
    await user.click(screen.getByRole('button', { name: /^Bazaya yaz/ }))
    await waitFor(() => expect(createItem).toHaveBeenCalledTimes(2))
    expect(lastToast().text).toContain('2 yeni mal əlavə edildi')
    expect(onDone).toHaveBeenCalled()
  })

  it('updates an existing code when «Mövcudları yenilə» is on', async () => {
    const user = userEvent.setup()
    renderDialog([item()])
    await user.click(screen.getByLabelText('Mövcudları yenilə'))
    await paste(user, '1\tSement\tkq')
    await user.click(screen.getByRole('button', { name: /^Bazaya yaz/ }))
    await waitFor(() => expect(updateItem).toHaveBeenCalled())
  })
})

/* R-F6 — emitMany() is a sequential loop, NOT a transaction. A failure
   part-way through leaves earlier rows written, and the report must say so
   rather than implying a rollback. */
describe('non-atomic apply (M5-39)', () => {
  it('writes rows one at a time and reports a PARTIAL result on failure', async () => {
    const user = userEvent.setup()
    vi.mocked(createItem)
      .mockResolvedValueOnce({ ok: true, code: '0000002', error: null })
      .mockResolvedValueOnce({ ok: false, code: null, error: 'rls' })
    renderDialog()
    await paste(user, 'Sement\tkq\nBoru\tkq')
    await user.click(screen.getByRole('button', { name: /^Bazaya yaz/ }))

    await waitFor(() => expect(lastToast().isError).toBe(true))
    /* The first row really was written — the message must not claim otherwise. */
    expect(lastToast().text).toContain('1 əlavə')
    expect(lastToast().text).toContain('1 sətir alınmadı')
    expect(createItem).toHaveBeenCalledTimes(2)
  })
})

/* A01 — the update price fallback (index.html:5754):
     price: r.price || (r.st === 'upd' ? existing.price || 0 : 0)
   An update whose pasted row omits the price must keep the STORED price. The
   pre-fix code passed `r.price` straight through, so an omitted price was
   parsed as 0 and silently erased a real price. */
describe('A01 — an omitted price must not erase the stored one', () => {
  async function pasteUpdate(text: string, stored: Partial<ItemRow> = {}) {
    const user = userEvent.setup()
    renderDialog([item({ price: 10, ...stored })])
    await user.click(screen.getByLabelText('Mövcudları yenilə'))
    await paste(user, text)
    await user.click(screen.getByRole('button', { name: /^Bazaya yaz/ }))
    return user
  }

  it('keeps the existing price when the row omits it', async () => {
    await pasteUpdate('1\tSement\tkq')
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith(
      { code: '0000001', name: 'Sement', unit: 'kq', price: 10 },
    ))
  })

  it('writes a positive replacement price when the row supplies one', async () => {
    await pasteUpdate('1\tSement\tkq\t25.5')
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith(
      { code: '0000001', name: 'Sement', unit: 'kq', price: 25.5 },
    ))
  })

  /* An explicit 0 is indistinguishable from an omission in the original: the
     `||` chain treats both as falsy and falls back to the stored price. That
     is inherited behaviour, pinned here so nobody "fixes" it into a
     divergence — a legacy defect kept deliberately for parity. */
  it('an explicit zero also falls back to the stored price, as the original does', async () => {
    await pasteUpdate('1\tSement\tkq\t0')
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith(
      { code: '0000001', name: 'Sement', unit: 'kq', price: 10 },
    ))
  })

  /* The fallback is for updates only — a CREATE with no price gets 0. */
  it('a created row with no price still gets zero, not a borrowed one', async () => {
    const user = userEvent.setup()
    renderDialog([item({ price: 10 })])
    await paste(user, 'Boru\tkq')
    await user.click(screen.getByRole('button', { name: /^Bazaya yaz/ }))
    await waitFor(() => expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Boru', price: 0 }), 'sb1',
    ))
  })

  /* An update on a code that is NOT in the directory (name-matched row whose
     stored price is absent) must fall back to 0, never to undefined. */
  it('falls back to zero when the matched item has no stored price', async () => {
    const user = userEvent.setup()
    renderDialog([item({ price: 0 })])
    await user.click(screen.getByLabelText('Mövcudları yenilə'))
    await paste(user, '1\tSement\tədəd')
    await user.click(screen.getByRole('button', { name: /^Bazaya yaz/ }))
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith(
      { code: '0000001', name: 'Sement', unit: 'ədəd', price: 0 },
    ))
  })
})

/* A05 — per-row checkboxes (index.html:5706-5711). The user must be able to
   exclude a row they do not want; the pre-fix preview rendered plain rows
   whose `use` value could never be changed. */
describe('A05 — per-row selection', () => {
  it('excludes a row the user unchecks', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Sement\tkq\nBoru\tkq')
    await user.click(screen.getByLabelText('Sətir 2'))
    await user.click(screen.getByRole('button', { name: /^Bazaya yaz/ }))
    await waitFor(() => expect(createItem).toHaveBeenCalledTimes(1))
    expect(createItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sement' }), 'sb1')
  })

  it('locks an error row off and never lets it be selected', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Boru\tton')
    const cb = screen.getByLabelText('Sətir 1') as HTMLInputElement
    expect(cb.disabled).toBe(true)
    expect(cb.checked).toBe(false)
  })

  it('puts the selected row count in the apply button, as bulkCount() does', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Sement\tkq\nBoru\tkq')
    expect(screen.getByRole('button', { name: 'Bazaya yaz (2 sətir)' })).toBeTruthy()
    await user.click(screen.getByLabelText('Sətir 1'))
    expect(screen.getByRole('button', { name: 'Bazaya yaz (1 sətir)' })).toBeTruthy()
  })

  it('shows the price column the original previews', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'Sement\tkq\t0.35')
    expect(screen.getByText('0,35')).toBeTruthy()
  })
})

/* A06 — index.html:5740 re-runs bulkPreview() when the checkbox changes and a
   preview exists. Without it the stale preview keeps an `upd` row the new
   setting would never produce, and the apply would still write it. */
describe('A06 — toggling «Mövcudları yenilə» recomputes the preview', () => {
  it('drops the update row when updating is switched OFF after a preview', async () => {
    const user = userEvent.setup()
    renderDialog([item()])
    await user.click(screen.getByLabelText('Mövcudları yenilə'))
    await paste(user, '1\tSement\tkq')
    expect(screen.getByText('yenilənir')).toBeTruthy()

    await user.click(screen.getByLabelText('Mövcudları yenilə'))
    expect(screen.queryByText('yenilənir')).toBeNull()
    expect(screen.getByText('bazada var')).toBeTruthy()
    /* Nothing applicable is left, so no write can happen at all. */
    expect((screen.getByRole('button', { name: /^Bazaya yaz/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('produces the update row when updating is switched ON after a preview', async () => {
    const user = userEvent.setup()
    renderDialog([item()])
    await paste(user, '1\tSement\tkq')
    expect(screen.getByText('bazada var')).toBeTruthy()

    await user.click(screen.getByLabelText('Mövcudları yenilə'))
    expect(screen.getByText('yenilənir')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /^Bazaya yaz/ }))
    await waitFor(() => expect(updateItem).toHaveBeenCalled())
    expect(createItem).not.toHaveBeenCalled()
  })

  it('does not build a preview from the toggle alone before «Yoxla»', async () => {
    const user = userEvent.setup()
    renderDialog([item()])
    fireEvent.change(screen.getByLabelText('Sətirlər'), { target: { value: '1\tSement\tkq' } })
    await user.click(screen.getByLabelText('Mövcudları yenilə'))
    expect(screen.queryByLabelText('Sətir 1')).toBeNull()
  })
})

/* A07 — the CSV/TXT/TSV file input the original has (index.html:5742-5747):
   read as UTF-8, BOM stripped, and previewed automatically. */
describe('A07 — file upload', () => {
  it('reads a file, strips the BOM and previews it with no Yoxla click', async () => {
    const user = userEvent.setup()
    renderDialog()
    const file = new File(['﻿Sement\tkq\nBoru\tkq'], 'items.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('Fayl'), file)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bazaya yaz (2 sətir)' })).toBeTruthy())
    /* A leaked BOM would corrupt the first name and change what is written. */
    expect(screen.getByText('Sement')).toBeTruthy()
  })

  it('applies exactly the rows the uploaded file produced', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.upload(
      screen.getByLabelText('Fayl'),
      new File(['Sement\tkq'], 'items.csv', { type: 'text/csv' }),
    )
    await waitFor(() => expect(screen.getByRole('button', { name: /^Bazaya yaz/ })).toBeTruthy())
    await user.click(screen.getByRole('button', { name: /^Bazaya yaz/ }))
    await waitFor(() => expect(createItem).toHaveBeenCalledTimes(1))
    expect(createItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sement' }), 'sb1')
  })
})

describe('localhost write guard (R-F8)', () => {
  it('refuses the whole apply and calls no API when blocked', async () => {
    const user = userEvent.setup()
    vi.mocked(blockedReason).mockReturnValueOnce('Bu əməliyyat lokal rejimdə bloklanıb')
    renderDialog()
    await paste(user, 'Sement\tkq')
    await user.click(screen.getByRole('button', { name: /^Bazaya yaz/ }))
    expect(createItem).not.toHaveBeenCalled()
    expect(lastToast().text).toContain('bloklanıb')
  })
})
