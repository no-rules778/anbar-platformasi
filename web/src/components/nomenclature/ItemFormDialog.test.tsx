import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/itemWrite.api', () => ({ createItem: vi.fn(), updateItem: vi.fn() }))

/* jsdom serves the page from `localhost`, so the real mutation guard blocks
   every write — correctly, and that is asserted separately below. To exercise
   the save path itself the guard is stubbed open here. */
vi.mock('../../lib/mutationGuard', async (orig) => ({
  ...(await orig<typeof import('../../lib/mutationGuard')>()),
  blockedReason: vi.fn(() => null),
}))

import { createItem, updateItem } from '../../api/itemWrite.api'
import { blockedReason } from '../../lib/mutationGuard'
import { ItemFormDialog } from './ItemFormDialog'
import { useToastStore } from '../../store/toast.store'
import type { ItemRow } from '../../api/items.api'
import type { Me } from '../../lib/roles'

const admin: Me = { id: 'u1', sbId: 'sb1', email: 'a@x.com', name: 'Admin', role: 'admin', wh: '' }
const anbardar: Me = { ...admin, role: 'anbardar' }

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement M400', unit: 'kq', price: 10, category: 'Filtrlər', ...over,
})

const props = {
  items: [item()],
  units: ['kq', 'ədəd'],
  categories: ['Filtrlər', 'Ehtiyat'],
  me: admin,
  onSaved: vi.fn(),
  onClose: vi.fn(),
}

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

describe('create mode', () => {
  /* A08 — index.html:5576 applies `readonly` only when editing an existing
     item. On create the proposed code is a SUGGESTION the user may override;
     the pre-fix dialog locked it, which removed a capability the old platform
     has (confirmed in the browser: 0001532 is editable there). */
  it('prefills the next code and leaves it EDITABLE', () => {
    render(<ItemFormDialog {...props} item={null} />)
    const code = screen.getByLabelText('Kod') as HTMLInputElement
    expect(code.value).toBe('0000002')
    expect(code.readOnly).toBe(false)
  })

  it('creates the item under a code the user typed instead of the proposal', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    const code = screen.getByLabelText('Kod')
    await user.clear(code)
    await user.type(code, '0009999')
    await user.type(screen.getByLabelText('Malın adı'), 'Boru')
    await user.selectOptions(screen.getByLabelText('Kateqoriya'), 'Filtrlər')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({ code: '0009999', name: 'Boru' }), 'sb1',
    ))
  })

  /* The overridden code still goes through the original's validation, so the
     editability cannot be used to create a malformed or duplicate code. */
  it('still refuses a code that is not seven digits', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    const code = screen.getByLabelText('Kod')
    await user.clear(code)
    await user.type(code, '123')
    await user.type(screen.getByLabelText('Malın adı'), 'Boru')
    await user.selectOptions(screen.getByLabelText('Kateqoriya'), 'Filtrlər')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(createItem).not.toHaveBeenCalled()
    expect(lastToast().text).toBe('Kod 7 rəqəmli olmalıdır')
  })

  it('still refuses a code that already exists', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    const code = screen.getByLabelText('Kod')
    await user.clear(code)
    await user.type(code, '0000001')
    await user.type(screen.getByLabelText('Malın adı'), 'Boru')
    await user.selectOptions(screen.getByLabelText('Kateqoriya'), 'Filtrlər')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(createItem).not.toHaveBeenCalled()
    expect(lastToast().text).toBe('Bu kod artıq mövcuddur')
  })

  /* M5-27 — mandatory on create for a category-editing user. */
  it('refuses to save without a category', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'Yeni mal')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(createItem).not.toHaveBeenCalled()
    expect(lastToast().text).toBe('Yeni mal üçün kateqoriya seçin')
  })

  it('saves once a name and category are given', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'Yeni mal')
    await user.selectOptions(screen.getByLabelText('Kateqoriya'), 'Ehtiyat')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(createItem).toHaveBeenCalled())
    expect(vi.mocked(createItem).mock.calls[0][0]).toMatchObject({
      code: '0000002', name: 'Yeni mal', category: 'Ehtiyat',
    })
    expect(props.onSaved).toHaveBeenCalledWith('0000002')
  })

  it('rejects a name shorter than three characters', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'ab')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(createItem).not.toHaveBeenCalled()
    expect(lastToast().text).toBe('Malın adını yazın')
  })
})

describe('edit mode', () => {
  it('shows the stored values and keeps the code read-only', () => {
    render(<ItemFormDialog {...props} item={item()} />)
    expect((screen.getByLabelText('Kod') as HTMLInputElement).value).toBe('0000001')
    expect((screen.getByLabelText('Malın adı') as HTMLInputElement).value).toBe('Sement M400')
  })

  /* M5-27 — the asymmetry: empty IS allowed on edit and means NULL. */
  it('allows clearing the category, which stores NULL', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={item()} />)
    await user.selectOptions(screen.getByLabelText('Kateqoriya'), '')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(updateItem).toHaveBeenCalled())
    expect(vi.mocked(updateItem).mock.calls[0][0]).toMatchObject({ category: '' })
  })

  it('keeps an item’s hidden unit available for that item only', () => {
    render(<ItemFormDialog {...props} item={item({ unit: 'köhnə' })} />)
    const opts = Array.from(
      (screen.getByLabelText('Ölçü vahidi') as HTMLSelectElement).options,
    ).map((o) => o.value)
    expect(opts).toContain('köhnə')
  })

  /* A08 — the code IS locked when editing: it is the item's identity. */
  it('locks the code when editing', () => {
    render(<ItemFormDialog {...props} item={item()} />)
    expect((screen.getByLabelText('Kod') as HTMLInputElement).readOnly).toBe(true)
  })
})

/* A09 — categoryOptionsFor(current), index.html:699-702. The category gets
   the SAME exception the unit already had. Without it, opening the card of an
   item whose category has since been hidden showed a DIFFERENT category than
   the one stored, and saving any other field silently changed it. */
describe('A09 — a hidden current category is retained', () => {
  it('keeps the stored category in the list when it is no longer active', () => {
    render(<ItemFormDialog {...props} item={item({ category: 'Ləğv edilmiş kateqoriya' })} />)
    const opts = Array.from(
      (screen.getByLabelText('Kateqoriya') as HTMLSelectElement).options,
    ).map((o) => o.value)
    expect(opts).toContain('Ləğv edilmiş kateqoriya')
  })

  it('shows that stored category as the SELECTED one, not a different value', () => {
    render(<ItemFormDialog {...props} item={item({ category: 'Ləğv edilmiş kateqoriya' })} />)
    expect((screen.getByLabelText('Kateqoriya') as HTMLSelectElement).value)
      .toBe('Ləğv edilmiş kateqoriya')
  })

  /* Editing an unrelated field must resend the stored category unchanged. */
  it('does not silently change the category when another field is edited', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={item({ category: 'Ləğv edilmiş kateqoriya' })} />)
    await user.type(screen.getByLabelText('Malın adı'), ' yeni')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(updateItem).toHaveBeenCalled())
    expect(vi.mocked(updateItem).mock.calls[0][0])
      .toMatchObject({ category: 'Ləğv edilmiş kateqoriya' })
  })

  /* The exception is for THIS item only — it is never offered to another. */
  it('does not offer that hidden category when creating a new item', () => {
    render(<ItemFormDialog {...props} item={null} />)
    const opts = Array.from(
      (screen.getByLabelText('Kateqoriya') as HTMLSelectElement).options,
    ).map((o) => o.value)
    expect(opts).not.toContain('Ləğv edilmiş kateqoriya')
  })
})

/* A09 / M5-36 — the keyword suggestion (catSug, index.html:5595-5602).
   It was declared delivered but had no implementation at all. Advisory only:
   it never auto-selects and never auto-saves. */
describe('A09 — category suggestion', () => {
  it('offers a suggestion once a matching name is typed', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'Yağ filtri')
    expect(screen.getByRole('button', { name: /Təklif: Filtrlər/ })).toBeTruthy()
  })

  it('does NOT apply the suggestion on its own', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'Yağ filtri')
    expect((screen.getByLabelText('Kateqoriya') as HTMLSelectElement).value).toBe('')
  })

  it('applies it only when the user clicks it', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'Yağ filtri')
    await user.click(screen.getByRole('button', { name: /Təklif: Filtrlər/ }))
    expect((screen.getByLabelText('Kateqoriya') as HTMLSelectElement).value).toBe('Filtrlər')
  })

  /* It disappears once a category is chosen — the original clears #i-cat-sug
     as soon as the select has a value (5597). */
  it('disappears once a category is chosen', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'Yağ filtri')
    await user.selectOptions(screen.getByLabelText('Kateqoriya'), 'Ehtiyat')
    expect(screen.queryByRole('button', { name: /Təklif:/ })).toBeNull()
  })

  it('offers nothing when no keyword matches', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'Qeyri-müəyyən şey')
    expect(screen.queryByRole('button', { name: /Təklif:/ })).toBeNull()
  })

  /* The suggestion is not a permission bypass: a user who cannot edit
     categories never sees the field, and so never sees the suggestion. */
  it('is absent for a user who cannot edit categories', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} me={{ ...admin, role: 'tedaruk' }} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'Yağ filtri')
    expect(screen.queryByRole('button', { name: /Təklif:/ })).toBeNull()
  })
})

/* A14 — index.html:5573. With no unit options the original refuses to open
   the form at all, rather than presenting an empty <select> that would let
   the user save an item with no unit. */
describe('A14 — no active unit options', () => {
  it('refuses to open the form and offers no fields', () => {
    render(<ItemFormDialog {...props} units={[]} item={null} />)
    expect(screen.getByText('Soraqçalarda aktiv ölçü vahidi yoxdur — əvvəlcə əlavə edin')).toBeTruthy()
    expect(screen.queryByLabelText('Malın adı')).toBeNull()
  })

  it('makes a save impossible, so no write can occur', () => {
    render(<ItemFormDialog {...props} units={[]} item={null} />)
    expect(screen.queryByRole('button', { name: 'Yadda saxla' })).toBeNull()
    expect(createItem).not.toHaveBeenCalled()
  })

  /* The existing-item exception applies FIRST: an item whose own unit was
     hidden still has one option, so its form still opens. */
  it('still opens for an item whose own hidden unit is the only option', () => {
    render(<ItemFormDialog {...props} units={[]} item={item({ unit: 'köhnə' })} />)
    expect(screen.getByLabelText('Malın adı')).toBeTruthy()
    expect((screen.getByLabelText('Ölçü vahidi') as HTMLSelectElement).value).toBe('köhnə')
  })
})

/* M5-32 — the dialog must NOT close and must NOT claim success on failure.
   This is the visible half of the silent-RLS-refusal guard (R-F5). */
describe('server refusal handling', () => {
  it('keeps the dialog open and reports the error when the save is refused', async () => {
    const user = userEvent.setup()
    vi.mocked(updateItem).mockResolvedValue({
      ok: false, code: null, error: 'Nomenklatura yenilənmədi: serverdə dəyişiklik təsdiqlənmədi',
    })
    render(<ItemFormDialog {...props} item={item()} />)
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(lastToast().isError).toBe(true))
    expect(lastToast().text).toContain('serverdə dəyişiklik təsdiqlənmədi')
    expect(props.onSaved).not.toHaveBeenCalled()
    /* Still on screen — the user's input is not lost. */
    expect(screen.getByRole('dialog', { name: 'Malın düzəlişi' })).toBeTruthy()
  })
})

/* M5-34 — price editing is gated on price.edit. */
describe('permissions', () => {
  it('disables the price input without price.edit', () => {
    render(<ItemFormDialog {...props} me={anbardar} item={item()} />)
    expect((screen.getByLabelText('Son vahid qiyməti') as HTMLInputElement).disabled).toBe(true)
  })

  it('hides the category field from a non-admin', () => {
    render(<ItemFormDialog {...props} me={anbardar} item={item()} />)
    expect(screen.queryByLabelText('Kateqoriya')).toBeNull()
  })

  it('omits category from the payload when the user cannot edit it', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} me={anbardar} item={item()} />)
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(updateItem).toHaveBeenCalled())
    expect('category' in vi.mocked(updateItem).mock.calls[0][0]).toBe(false)
  })
})

/* M5-35 — advisory warning only; it never blocks a save. */
describe('similar-name warning', () => {
  it('warns about an existing similar name while typing', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'Sement M400')
    expect(await screen.findByText(/Oxşar mallar mövcuddur/)).toBeTruthy()
  })

  it('does not warn below the four-character threshold', async () => {
    const user = userEvent.setup()
    render(<ItemFormDialog {...props} item={null} />)
    await user.type(screen.getByLabelText('Malın adı'), 'Sem')
    expect(screen.queryByText(/Oxşar mallar mövcuddur/)).toBeNull()
  })
})

/* R-F8 — the localhost guard still protects this new write path. */
describe('localhost write guard', () => {
  it('refuses the save and never calls the API when the guard blocks', async () => {
    const user = userEvent.setup()
    vi.mocked(blockedReason).mockReturnValueOnce('Bu əməliyyat lokal rejimdə bloklanıb')
    render(<ItemFormDialog {...props} item={item()} />)
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(updateItem).not.toHaveBeenCalled()
    expect(lastToast().text).toContain('bloklanıb')
  })
})

/* T6b / M7-21b — the ONE additive prop the «Yeni mal yarat» transition needs.
   Item creation itself is not reimplemented in Phase 7; this dialog is reused,
   so these tests pin both that the prop works and that it changes nothing for
   the existing Nomenklatura call site. */
describe('presetName (M7-21b)', () => {
  it('seeds the name field verbatim when creating', () => {
    render(<ItemFormDialog {...props} item={null} presetName="Sement M500" />)
    expect((screen.getByLabelText('Malın adı') as HTMLInputElement).value).toBe('Sement M500')
  })

  /* Legacy passes `inp.value` — the raw input, not a trimmed copy — so the
     user sees exactly what they typed and can correct it themselves. */
  it('does NOT trim the preset text', () => {
    render(<ItemFormDialog {...props} item={null} presetName="  Sement  " />)
    expect((screen.getByLabelText('Malın adı') as HTMLInputElement).value).toBe('  Sement  ')
  })

  /* Verified to FAIL against seeding the name on edit as well (plan T8): the
     edited item's stored name would be silently replaced by the search text. */
  it('is IGNORED when editing — the stored name wins', () => {
    render(<ItemFormDialog {...props} item={item()} presetName="Başqa ad" />)
    expect((screen.getByLabelText('Malın adı') as HTMLInputElement).value).toBe('Sement M400')
  })

  it('defaults to an empty name when omitted — existing call sites unaffected', () => {
    render(<ItemFormDialog {...props} item={null} />)
    expect((screen.getByLabelText('Malın adı') as HTMLInputElement).value).toBe('')
  })

  /* M7-21f — the no-active-units refusal still fires from this entry point. */
  it('still refuses to open a form when no unit is active', () => {
    render(<ItemFormDialog {...props} item={null} units={[]} presetName="Sement" />)
    expect(screen.getByText('Soraqçalarda aktiv ölçü vahidi yoxdur — əvvəlcə əlavə edin')).toBeTruthy()
    expect(screen.queryByLabelText('Malın adı')).toBeNull()
  })
})
