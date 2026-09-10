import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/setItemCategories.api', () => ({ setItemCategories: vi.fn() }))
vi.mock('../../lib/mutationGuard', async (orig) => ({
  ...(await orig<typeof import('../../lib/mutationGuard')>()),
  blockedReason: vi.fn(() => null),
}))

import { setItemCategories } from '../../api/setItemCategories.api'
import { blockedReason } from '../../lib/mutationGuard'
import { CategoryImportDialog } from './CategoryImportDialog'
import { useToastStore } from '../../store/toast.store'
import type { ItemRow } from '../../api/items.api'
import type { Me } from '../../lib/roles'

const admin: Me = { id: 'u1', sbId: 'sb1', email: 'a@x.com', name: 'Admin', role: 'admin', wh: '' }
const viewer: Me = { ...admin, role: 'baxis' }

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
  vi.mocked(setItemCategories).mockResolvedValue({ ok: true, updated: 1, error: null })
})

function renderDialog(me: Me = admin, items: ItemRow[] = [item()]) {
  const onDone = vi.fn()
  render(
    <CategoryImportDialog
      items={items}
      categories={['Filtrlər', 'Ehtiyat']}
      me={me}
      onDone={onDone}
      onClose={vi.fn()}
    />,
  )
  return { onDone }
}

/* fireEvent.change rather than userEvent.paste: identical resulting state,
   without simulating each keystroke, which kept these tests inside the
   default timeout when the suite runs in parallel. */
async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
  fireEvent.change(screen.getByLabelText('CSV mətni'), { target: { value: text } })
  await user.click(screen.getByRole('button', { name: 'Yoxla' }))
}

/* M5-43 — Admin-only, with an explicit refusal. */
describe('admin gate', () => {
  it('refuses a non-admin and offers no form at all', () => {
    renderDialog(viewer)
    expect(screen.getByText('Yalnız Admin kateqoriya idxal edə bilər')).toBeTruthy()
    expect(screen.queryByLabelText('CSV mətni')).toBeNull()
  })

  it('never issues the RPC for a non-admin', () => {
    renderDialog(viewer)
    expect(setItemCategories).not.toHaveBeenCalled()
  })
})

/** The «Yazılacaq (kateqoriyalı)» KPI value — the count that will be written. */
const okCount = () =>
  screen.getByText('Yazılacaq (kateqoriyalı)').parentElement?.querySelector('.v')?.textContent
/** The «Səhv» KPI value. */
const errCount = () =>
  screen.getByText('Səhv').parentElement?.querySelector('.v')?.textContent
/** The «Təyin edilməyib» KPI value — informational, never written. */
const unsetCount = () =>
  screen.getByText('Təyin edilməyib').parentElement?.querySelector('.v')?.textContent

describe('preview', () => {
  it('accepts a valid mapping', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'code,category\n0000001,Filtrlər')
    expect(okCount()).toBe('1')
    expect(errCount()).toBe('0')
  })

  it('rejects a code that is not in the directory', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'code,category\n9999999,Filtrlər')
    expect(screen.getByText('Bazada yoxdur')).toBeTruthy()
    expect(errCount()).toBe('1')
  })

  it('rejects a category that is not in the reference directory', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'code,category\n0000001,Uydurma')
    expect(screen.getByText('Yanlış kateqoriya')).toBeTruthy()
  })

  /* M5-45 — codes are identifiers; leading zeros must survive. */
  it('preserves leading zeros through the preview', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'code,category\n0000001,Uydurma')
    expect(screen.getByText('0000001')).toBeTruthy()
  })
})

/* A02 — the legacy whole-file error gate (catImpCount/catImpApply,
   index.html:5862-5884). Every case below FAILS against the pre-fix code,
   which validated only three conditions and let a valid subset through. */
describe('A02 — whole-file error gate', () => {
  /* The audit's own browser reproduction: one valid row plus one unknown
     code. The old React code left «Bazaya yaz (RPC)» enabled and would have
     written the valid row. */
  it('blocks the entire apply when any row is an error, however many are valid', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'code,category\n0000001,Filtrlər\n9999999,Filtrlər')
    expect(okCount()).toBe('1')
    expect(errCount()).toBe('1')
    const btn = screen.getByRole('button', { name: /Səhv sətirləri düzəldin \(1\)/ })
    expect(btn.hasAttribute('disabled')).toBe(true)
  })

  /* The original does not trust the disabled attribute alone (5879-5884):
     catImpApply() re-checks and refuses. This drives the handler directly. */
  /* The handler's own barrier (index.html:5879-5884) is exercised against the
     pure gate in lib/categoryImportClassify.test.ts, which is what the
     handler consults — the disabled attribute above is only the first of the
     original's two defences. */

  it('treats a malformed (non seven-digit) code as an error, not a skipped row', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'code,category\n123,Filtrlər')
    expect(screen.getByText('Kod 7 rəqəm olmalıdır')).toBeTruthy()
    expect(errCount()).toBe('1')
  })

  /* csv.ts previously discarded a blank-code row outright, so the file looked
     clean and the remaining rows were written. The original keeps the row and
     fails it on the seven-digit test. */
  it('keeps a BLANK code as an error row rather than silently dropping it', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'code,category\n,Filtrlər\n0000001,Filtrlər')
    expect(errCount()).toBe('1')
    expect(screen.getByText('Kod 7 rəqəm olmalıdır')).toBeTruthy()
    expect(setItemCategories).not.toHaveBeenCalled()
  })

  it('rejects a duplicate code and names the first line it appeared on', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'code,category\n0000001,Filtrlər\n0000001,Ehtiyat')
    expect(screen.getByText('Təkrar kod (sətir 1)')).toBeTruthy()
    expect(errCount()).toBe('1')
    expect(okCount()).toBe('1')
  })

  it('an empty category is an error, not an unset bucket', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'code,category\n0000001,')
    expect(screen.getByText('Kateqoriya boşdur')).toBeTruthy()
    expect(errCount()).toBe('1')
  })
})

/* «Təyin edilməyib» is a separate INFORMATIONAL bucket (index.html:5834): it
   is never written, but unlike an error it does not block the file. */
describe('A02 — the unset bucket is informational, not an error', () => {
  it('does not block the apply and is excluded from the payload', async () => {
    const user = userEvent.setup()
    renderDialog(admin, [item(), item({ code: '0000002', name: 'Filtr' })])
    await paste(user, 'code,category\n0000001,Filtrlər\n0000002,Təyin edilməyib')
    expect(unsetCount()).toBe('1')
    expect(errCount()).toBe('0')
    expect(okCount()).toBe('1')

    await user.click(screen.getByRole('button', { name: /Bazaya yaz \(RPC\): 1/ }))
    await user.click(screen.getByRole('button', { name: /TƏSDİQ/ }))
    await waitFor(() => expect(setItemCategories).toHaveBeenCalledWith([
      { code: '0000001', category: 'Filtrlər' },
    ]))
  })
})

/* A07 — the file input the original has and React had lost
   (index.html:5800-5805): UTF-8, BOM stripped, previewed automatically. */
describe('A07 — CSV/TXT file upload', () => {
  it('reads a chosen file, strips the BOM and previews it without a Yoxla click', async () => {
    const user = userEvent.setup()
    renderDialog()
    const file = new File(['﻿code,category\n0000001,Filtrlər'], 'cats.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('Fayl'), file)
    await waitFor(() => expect(okCount()).toBe('1'))
    expect(errCount()).toBe('0')
    /* The BOM must not have leaked into the header, which would have made the
       first column unrecognisable and every row a malformed-code error. */
    expect(screen.queryByText('Kod 7 rəqəm olmalıdır')).toBeNull()
  })
})

/* The two-stage confirmation (index.html:5881-5886): the first click arms, the
   second writes. Nothing reaches the server until the user confirms. */
describe('two-stage confirmation (M5-46)', () => {
  it('does NOT write on the first click — it arms a confirmation instead', async () => {
    const user = userEvent.setup()
    renderDialog()
    await paste(user, 'code,category\n0000001,Filtrlər')
    await user.click(screen.getByRole('button', { name: /Bazaya yaz \(RPC\): 1/ }))
    expect(setItemCategories).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /TƏSDİQ: 1 mal yazılacaq/ })).toBeTruthy()
  })

  it('writes on the second click, sending only code and category', async () => {
    const user = userEvent.setup()
    const { onDone } = renderDialog()
    await paste(user, 'code,category\n0000001,Filtrlər')
    await user.click(screen.getByRole('button', { name: /Bazaya yaz \(RPC\): 1/ }))
    await user.click(screen.getByRole('button', { name: /TƏSDİQ/ }))
    await waitFor(() => expect(setItemCategories).toHaveBeenCalledWith([
      { code: '0000001', category: 'Filtrlər' },
    ]))
    expect(lastToast().text).toContain('1 malın kateqoriyası yeniləndi')
    expect(onDone).toHaveBeenCalled()
  })

  it('reports a failure and re-arms rather than claiming success', async () => {
    const user = userEvent.setup()
    vi.mocked(setItemCategories).mockResolvedValue({ ok: false, updated: 0, error: 'only admin' })
    const { onDone } = renderDialog()
    await paste(user, 'code,category\n0000001,Filtrlər')
    await user.click(screen.getByRole('button', { name: /Bazaya yaz \(RPC\): 1/ }))
    await user.click(screen.getByRole('button', { name: /TƏSDİQ/ }))
    await waitFor(() => expect(lastToast().isError).toBe(true))
    expect(onDone).not.toHaveBeenCalled()
  })
})

describe('localhost write guard (R-F8)', () => {
  it('refuses the write and calls no RPC when blocked', async () => {
    const user = userEvent.setup()
    vi.mocked(blockedReason).mockReturnValueOnce('Bu əməliyyat lokal rejimdə bloklanıb')
    renderDialog()
    await paste(user, 'code,category\n0000001,Filtrlər')
    await user.click(screen.getByRole('button', { name: /Bazaya yaz \(RPC\): 1/ }))
    await user.click(screen.getByRole('button', { name: /TƏSDİQ/ }))
    expect(setItemCategories).not.toHaveBeenCalled()
    expect(lastToast().text).toContain('bloklanıb')
  })
})
