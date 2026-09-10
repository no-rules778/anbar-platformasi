import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/referenceDirectory.api', () => ({ manageReference: vi.fn() }))
vi.mock('../../lib/mutationGuard', async (orig) => ({
  ...(await orig<typeof import('../../lib/mutationGuard')>()),
  blockedReason: vi.fn(() => null),
}))

import { manageReference } from '../../api/referenceDirectory.api'
import { ReferenceDirectoryFormDialog } from './ReferenceDirectoryFormDialog'
import { useToastStore } from '../../store/toast.store'
import { blockedReason } from '../../lib/mutationGuard'
import type { ReferenceEntity } from '../../types/referenceDirectory'

const unusedWarehouse: ReferenceEntity = {
  kind: 'warehouse', id: '7', name: 'Bos anbar', active: true, voen: '', contract: '', contractDate: '', linkedWarehouse: '',
}
const partner: ReferenceEntity = {
  kind: 'partner',
  id: '8b1f0a2c-0000-4000-8000-000000000001',
  name: 'Bakcell MMC',
  active: true,
  voen: '1234567890',
  contract: 'MQ-15',
  contractDate: '2026-06-05',
  linkedWarehouse: '',
}

const ok = { data: { ok: true, kind: 'partner', action: 'update', id: 'x', cascaded_rows: 0 }, error: null }
const toasts = () => useToastStore.getState().messages.map((m) => m.text)

beforeEach(() => {
  vi.clearAllMocks()
  useToastStore.setState({ messages: [] })
  vi.mocked(manageReference).mockResolvedValue(ok as never)
  vi.mocked(blockedReason).mockReturnValue(null)
})

const exact = (count: number) => ({ count, exact: true })

describe('ReferenceDirectoryFormDialog — partner fields', () => {
  it('shows VÖEN, contract date and contract number with their stored values', () => {
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    expect((screen.getByLabelText('VÖEN') as HTMLInputElement).value).toBe('1234567890')
    expect((screen.getByLabelText('Müqavilə tarixi') as HTMLInputElement).value).toBe('2026-06-05')
    expect((screen.getByLabelText('Müqavilə №') as HTMLInputElement).value).toBe('MQ-15')
    expect(screen.getByText('Kontragent — redaktə')).toBeTruthy()
  })

  it('does not show partner fields for a warehouse', () => {
    render(<ReferenceDirectoryFormDialog entity={unusedWarehouse} kind="warehouse" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByLabelText('VÖEN')).toBeNull()
    expect(screen.queryByLabelText('Müqavilə №')).toBeNull()
    expect(screen.getByText('Anbar — redaktə')).toBeTruthy()
  })

  it('sends the partner meta the original assembles (index.html:3156-3159)', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'partner', 'update', partner.id, 'Bakcell MMC',
      { voen: '1234567890', contract: 'MQ-15', contract_date: '2026-06-05' },
    ))
  })

  it('trims VÖEN and contract number, like the original', async () => {
    const user = userEvent.setup()
    const blank: ReferenceEntity = { ...partner, voen: '', contract: '', contractDate: '' }
    render(<ReferenceDirectoryFormDialog entity={blank} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('VÖEN'), '1234567890')
    await user.type(screen.getByLabelText('Müqavilə №'), '  MQ-9  ')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'partner', 'update', blank.id, 'Bakcell MMC',
      { voen: '1234567890', contract: 'MQ-9', contract_date: '' },
    ))
  })
})

/* index.html:3163 — the client refuses a VÖEN that is not exactly 10 digits. */
describe('ReferenceDirectoryFormDialog — VÖEN validation', () => {
  /* 11 digits is not in this list on purpose: maxlength=10 truncates it to a
     valid VÖEN before the check ever runs — exactly as the original behaves. */
  it.each(['123', 'abcdefghij', '12345 6789'])('refuses %s without calling the server', async (bad) => {
    const user = userEvent.setup()
    const blank: ReferenceEntity = { ...partner, voen: '' }
    render(<ReferenceDirectoryFormDialog entity={blank} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('VÖEN'), bad)
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    expect(manageReference).not.toHaveBeenCalled()
    expect(toasts()).toContain('VÖEN 10 rəqəm olmalıdır')
  })

  it('accepts an empty VÖEN — the field is optional', async () => {
    const user = userEvent.setup()
    const blank: ReferenceEntity = { ...partner, voen: '' }
    render(<ReferenceDirectoryFormDialog entity={blank} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalled())
    expect(toasts()).not.toContain('VÖEN 10 rəqəm olmalıdır')
  })

  it('caps the field at 10 characters, as the original does with maxlength', () => {
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)
    expect((screen.getByLabelText('VÖEN') as HTMLInputElement).maxLength).toBe(10)
  })
})

/* index.html:3085 — the name lock is for accounting keys (warehouse/location).
   A partner rename is allowed: the server cascades it into movements.partner. */
describe('ReferenceDirectoryFormDialog — name lock differs per kind', () => {
  it('locks a used warehouse name and hides «Yadda saxla»', () => {
    render(<ReferenceDirectoryFormDialog entity={unusedWarehouse} kind="warehouse" usage={exact(4)} onDone={vi.fn()} onClose={vi.fn()} />)

    expect((screen.getByDisplayValue('Bos anbar') as HTMLInputElement).readOnly).toBe(true)
    expect(screen.queryByRole('button', { name: 'Yadda saxla' })).toBeNull()
    expect(screen.getByText(/Adı uçot və giriş hüquqlarının/)).toBeTruthy()
  })

  it('keeps a used partner name editable and explains the cascade', () => {
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(4)} onDone={vi.fn()} onClose={vi.fn()} />)

    expect((screen.getByDisplayValue('Bakcell MMC') as HTMLInputElement).readOnly).toBe(false)
    expect(screen.getByRole('button', { name: 'Yadda saxla' })).toBeTruthy()
    expect(screen.getByText(/keçmiş qeydlərdəki mətn də avtomatik yenilənəcək/)).toBeTruthy()
  })

  it('reports the cascaded row count the server returns', async () => {
    vi.mocked(manageReference).mockResolvedValue({
      data: { ok: true, kind: 'partner', action: 'update', id: 'x', cascaded_rows: 7 }, error: null,
    } as never)
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(4)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(toasts()).toContain('Soraqça yeniləndi (7 tarixi qeydin mətni uzlaşdırıldı)'))
  })
})

describe('ReferenceDirectoryFormDialog — shared rules still hold', () => {
  it('refuses a name shorter than two characters for either kind', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={null} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Ad'), 'A')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    expect(manageReference).not.toHaveBeenCalled()
    expect(toasts()).toContain('Ad ən azı 2 simvol olmalıdır')
  })

  it('creates with the name typed on the page', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={null} kind="partner" presetName="Yeni MMC" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('Kontragent — yeni dəyər')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'partner', 'create', null, 'Yeni MMC', { voen: '', contract: '', contract_date: '' },
    ))
  })

  it('deletes only after the second confirmation, and only when unused', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))
    expect(manageReference).not.toHaveBeenCalled()
    expect(screen.getByText('Soraqçanın silinməsi')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('partner', 'delete', partner.id, 'Bakcell MMC', expect.anything()))
  })

  it('offers no delete for a used value', () => {
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(2)} onDone={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Tamamilə sil' })).toBeNull()
  })

  it('hides and reactivates', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(2)} onDone={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Gizlət' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('partner', 'deactivate', partner.id, expect.anything(), expect.anything()))
    unmount()

    render(<ReferenceDirectoryFormDialog entity={{ ...partner, active: false }} kind="partner" usage={exact(2)} onDone={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Aktiv et' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('partner', 'activate', partner.id, expect.anything(), expect.anything()))
  })

  it('surfaces the server refusal verbatim — e.g. the partner/warehouse name collision', async () => {
    vi.mocked(manageReference).mockResolvedValue({
      data: null, error: { message: 'Kontragent adı anbar adı ilə eyni ola bilməz' },
    } as never)
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(toasts()).toContain('Soraqça yenilənmədi: Kontragent adı anbar adı ilə eyni ola bilməz'))
  })

  it('translates a duplicate-key error into the original wording', async () => {
    vi.mocked(manageReference).mockResolvedValue({
      data: null, error: { message: 'duplicate key value violates unique constraint' },
    } as never)
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(toasts()).toContain('Bu ad artıq mövcuddur'))
  })

  it('treats an unreadable usage count as in use, for both kinds', () => {
    const { unmount } = render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={{ count: 1, exact: false }} onDone={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Tamamilə sil' })).toBeNull()
    expect(screen.getByText(/İstifadə məlumatı yüklənmədi/)).toBeTruthy()
    unmount()

    render(<ReferenceDirectoryFormDialog entity={unusedWarehouse} kind="warehouse" usage={{ count: 1, exact: false }} onDone={vi.fn()} onClose={vi.fn()} />)
    expect((screen.getByDisplayValue('Bos anbar') as HTMLInputElement).readOnly).toBe(true)
  })
})

/* Live data holds contract_date values in mixed formats (ISO and dd.MM.yyyy).
   A date input cannot render the legacy ones; the original silently dropped
   them on save. This warns instead — see the Phase 2 report. */
describe('ReferenceDirectoryFormDialog — legacy contract date', () => {
  it('warns when the stored date cannot be displayed', () => {
    render(<ReferenceDirectoryFormDialog entity={{ ...partner, contractDate: '17.06.2026' }} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    expect((screen.getByLabelText('Müqavilə tarixi') as HTMLInputElement).value).toBe('')
    expect(screen.getByText(/köhnə formatdadır/)).toBeTruthy()
    expect(screen.getByText(/17\.06\.2026/)).toBeTruthy()
  })

  /* APPROVED DEVIATION D-13, user decision 2026-09-02: option (a) — keep the
     original's behaviour and warn. Saving a partner whose stored date is in
     the legacy format therefore still clears it, exactly as the production
     platform does. This test pins that decision: if someone later makes the
     dialog preserve or normalise the value, they must revisit D-13 first. */
  it('still sends an empty contract_date when the legacy value cannot be shown', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={{ ...partner, contractDate: '17.06.2026' }} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'partner', 'update', partner.id, 'Bakcell MMC',
      expect.objectContaining({ contract_date: '' }),
    ))
  })

  it('keeps an ISO date intact when saving an unrelated field', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.clear(screen.getByLabelText('Müqavilə №'))
    await user.type(screen.getByLabelText('Müqavilə №'), 'MQ-20')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'partner', 'update', partner.id, 'Bakcell MMC',
      expect.objectContaining({ contract_date: '2026-06-05', contract: 'MQ-20' }),
    ))
  })

  it('does not warn for an ISO date or an empty one', () => {
    const { unmount } = render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByText(/köhnə formatdadır/)).toBeNull()
    unmount()

    render(<ReferenceDirectoryFormDialog entity={{ ...partner, contractDate: '' }} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByText(/köhnə formatdadır/)).toBeNull()
  })
})

/* Localhost shares the production database, so EVERY write is blocked there
   unless the developer opts in (VITE_ALLOW_LOCAL_WRITES=true). The dialog must
   refuse before any RPC leaves the browser. */
describe('ReferenceDirectoryFormDialog — localhost mutation guard', () => {
  const REFUSAL = 'Bu əməliyyat lokal rejimdə bloklanıb: localhost CANLI Supabase bazasına qoşulub.'

  it.each(['Gizlət', 'Tamamilə sil'])('refuses %s and sends nothing when blocked', async (button) => {
    vi.mocked(blockedReason).mockImplementation((action) =>
      action === 'deactivate' || action === 'delete' ? REFUSAL : null)
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    if (button === 'Tamamilə sil') await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))
    await user.click(screen.getByRole('button', { name: button }))

    expect(manageReference).not.toHaveBeenCalled()
    expect(toasts()).toContain(REFUSAL)
  })

  it('refuses «Aktiv et» for a hidden value', async () => {
    vi.mocked(blockedReason).mockImplementation((action) => (action === 'activate' ? REFUSAL : null))
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={{ ...partner, active: false }} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Aktiv et' }))

    expect(manageReference).not.toHaveBeenCalled()
    expect(toasts()).toContain(REFUSAL)
  })

  it('refuses «Yadda saxla» on an existing value — update is a live write too', async () => {
    vi.mocked(blockedReason).mockReturnValue(REFUSAL)
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    expect(manageReference).not.toHaveBeenCalled()
    expect(toasts()).toContain(REFUSAL)
  })

  it('refuses «Yadda saxla» on a new value — create leaves a real row behind', async () => {
    vi.mocked(blockedReason).mockReturnValue(REFUSAL)
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={null} kind="partner" presetName="TEST MMC" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    expect(manageReference).not.toHaveBeenCalled()
    expect(toasts()).toContain(REFUSAL)
  })

  it('refuses before the name and VÖEN checks, so nothing about the value can leak', async () => {
    vi.mocked(blockedReason).mockReturnValue(REFUSAL)
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={null} kind="partner" presetName="A" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    expect(manageReference).not.toHaveBeenCalled()
    expect(toasts()).toContain(REFUSAL)
    expect(toasts()).not.toContain('Ad ən azı 2 simvol olmalıdır')
  })

  it('lets writes through once the guard allows them', async () => {
    vi.mocked(blockedReason).mockReturnValue(null)
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(2)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Gizlət' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('partner', 'deactivate', partner.id, expect.anything(), expect.anything()))
  })
})

/* Reproduces the reported symptom end to end: type a date into the field on a
   NEW partner (as the CRUD smoke test did) and assert it reaches the RPC.
   The audit log shows contract_date arriving as NULL while voen and contract
   arrived fine, so this pins the client half of that path. */
describe('ReferenceDirectoryFormDialog — typed contract date reaches the RPC', () => {
  it('carries a date typed on a new partner', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={null} kind="partner" presetName="TEST MMC" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    const date = screen.getByLabelText('Müqavilə tarixi') as HTMLInputElement
    await user.type(date, '2026-06-17')
    await user.type(screen.getByLabelText('VÖEN'), '1234567890')
    await user.type(screen.getByLabelText('Müqavilə №'), 'TEST-CRUD-01')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'partner', 'create', null, 'TEST MMC',
      { voen: '1234567890', contract: 'TEST-CRUD-01', contract_date: '2026-06-17' },
    ))
  })

  it('carries a date changed on an existing partner', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    const date = screen.getByLabelText('Müqavilə tarixi') as HTMLInputElement
    await user.clear(date)
    await user.type(date, '2026-12-31')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'partner', 'update', partner.id, 'Bakcell MMC',
      expect.objectContaining({ contract_date: '2026-12-31' }),
    ))
  })
})

/* Phase 3a kinds. Their rules differ from warehouse in one decisive way: the
   name stays editable when the value is in use, because manage_reference
   cascades the rename instead of refusing it (index.html:3085 vs the RPC's
   channel/unit/category branch). */
const channel: ReferenceEntity = {
  kind: 'channel', id: 'rv-c1', name: 'Nağd', active: true, voen: '', contract: '', contractDate: '', linkedWarehouse: '',
}
const unit: ReferenceEntity = {
  kind: 'unit', id: 'rv-u1', name: 'ədəd', active: true, voen: '', contract: '', contractDate: '', linkedWarehouse: '',
}
const category: ReferenceEntity = {
  kind: 'category', id: 'rv-k1', name: 'Kanselyariya', active: true, voen: '', contract: '', contractDate: '', linkedWarehouse: '',
}

describe('ReferenceDirectoryFormDialog — Phase 3a kinds', () => {
  it('titles the dialog with each kind label', () => {
    for (const [entity, label] of [
      [channel, 'Alınma kanalı'],
      [unit, 'Ölçü vahidi'],
      [category, 'Mal kateqoriyası'],
    ] as const) {
      const { unmount } = render(
        <ReferenceDirectoryFormDialog entity={entity} kind={entity.kind} usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />,
      )
      expect(screen.getByText(`${label} — redaktə`)).toBeTruthy()
      unmount()
    }
  })

  it('keeps a used value renameable — unlike a warehouse', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={unit} kind="unit" usage={exact(41)} onDone={vi.fn()} onClose={vi.fn()} />)

    const name = screen.getByLabelText('Ad') as HTMLInputElement
    expect(name.readOnly).toBe(false)
    await user.clear(name)
    await user.type(name, 'ədəd (yeni)')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('unit', 'update', 'rv-u1', 'ədəd (yeni)', {}))
  })

  it('sends empty meta — VÖEN and contract fields belong to partners only', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={channel} kind="channel" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    expect(screen.queryByLabelText('VÖEN')).toBeNull()
    expect(screen.queryByLabelText('Müqavilə tarixi')).toBeNull()
    expect(screen.queryByLabelText('Müqavilə №')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('channel', 'update', 'rv-c1', 'Nağd', {}))
  })

  it('creates a new value with the UI kind name, which the server maps to its stored kind', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={null} kind="category" presetName="Yeni kateqoriya" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    /* p_kind is the UI name; manage_reference maps category to item_category. */
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('category', 'create', null, 'Yeni kateqoriya', {}))
  })

  it('enforces the 2-character minimum before calling the RPC', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={null} kind="unit" presetName="" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Ad'), 'q')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    expect(toasts()).toContain('Ad ən azı 2 simvol olmalıdır')
    expect(manageReference).not.toHaveBeenCalled()
  })

  it('offers delete only for an unused value, behind the two-step confirmation', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <ReferenceDirectoryFormDialog entity={unit} kind="unit" usage={exact(41)} onDone={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: 'Tamamilə sil' })).toBeNull()
    unmount()

    render(<ReferenceDirectoryFormDialog entity={unit} kind="unit" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))
    expect(manageReference).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('unit', 'delete', 'rv-u1', 'ədəd', {}))
  })

  it('hides and reactivates', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <ReferenceDirectoryFormDialog entity={channel} kind="channel" usage={exact(3)} onDone={vi.fn()} onClose={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: 'Gizlət' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('channel', 'deactivate', 'rv-c1', 'Nağd', {}))
    unmount()

    render(
      <ReferenceDirectoryFormDialog entity={{ ...channel, active: false }} kind="channel" usage={exact(3)} onDone={vi.fn()} onClose={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: 'Aktiv et' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('channel', 'activate', 'rv-c1', 'Nağd', {}))
  })

  it('reports the rename cascade count returned by the server', async () => {
    const user = userEvent.setup()
    vi.mocked(manageReference).mockResolvedValue({
      data: { ok: true, kind: 'channel', action: 'update', id: 'rv-c1', cascaded_rows: 12 },
      error: null,
    } as never)
    render(<ReferenceDirectoryFormDialog entity={channel} kind="channel" usage={exact(12)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(toasts()).toContain('Soraqça yeniləndi (12 tarixi qeydin mətni uzlaşdırıldı)'))
  })

  it('surfaces a server refusal verbatim', async () => {
    const user = userEvent.setup()
    vi.mocked(manageReference).mockResolvedValue({
      data: null,
      error: { message: 'Dəyər istifadə olunub: silinmir, yalnız gizlədilə bilər' },
    } as never)
    render(<ReferenceDirectoryFormDialog entity={unit} kind="unit" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))
    await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))

    await waitFor(() => expect(toasts()).toContain(
      'Soraqça yenilənmədi: Dəyər istifadə olunub: silinmir, yalnız gizlədilə bilər',
    ))
  })

  it('is blocked by the localhost write guard like every other kind', async () => {
    const user = userEvent.setup()
    vi.mocked(blockedReason).mockReturnValue('Bütün yazma əməliyyatları bloklanıb')
    render(<ReferenceDirectoryFormDialog entity={unit} kind="unit" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(manageReference).not.toHaveBeenCalled()
    expect(toasts()).toContain('Bütün yazma əməliyyatları bloklanıb')
  })

  it('warns that usage is unknown without claiming the name is locked', async () => {
    /* The warehouse-only clause about the name must not appear for these kinds. */
    render(<ReferenceDirectoryFormDialog entity={unit} kind="unit" usage={{ count: 1, exact: false }} onDone={vi.fn()} onClose={vi.fn()} />)

    const warning = screen.getByText(/İstifadə məlumatı yüklənmədi/)
    expect(warning.textContent).toContain('silinmir')
    expect(warning.textContent).not.toContain('adı dəyişdirilmir')
    expect((screen.getByLabelText('Ad') as HTMLInputElement).readOnly).toBe(false)
  })
})

/* Phase 3b. */
const location: ReferenceEntity = {
  kind: 'location', id: '9', name: 'Sahə A', active: true,
  voen: '', contract: '', contractDate: '', linkedWarehouse: '',
}
const project: ReferenceEntity = {
  kind: 'project', id: 'pj-1', name: 'Layihə A', active: true,
  voen: '', contract: '', contractDate: '', linkedWarehouse: 'Ələt',
}
const WHS = ['Ələt', 'Astara']

describe('ReferenceDirectoryFormDialog — location', () => {
  it('locks the name once the value is used, like a warehouse', async () => {
    /* index.html:3085 groups location with warehouse: the name is the
       accounting and access key, so it is frozen and «Yadda saxla» is gone. */
    render(<ReferenceDirectoryFormDialog entity={location} kind="location" usage={exact(4)} onDone={vi.fn()} onClose={vi.fn()} />)

    expect((screen.getByLabelText('Ad') as HTMLInputElement).readOnly).toBe(true)
    expect(screen.queryByRole('button', { name: 'Yadda saxla' })).toBeNull()
    expect(screen.getByText(/Adı uçot və giriş hüquqlarının/)).toBeTruthy()
  })

  it('stays editable while unused', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={location} kind="location" usage={exact(0)} onDone={vi.fn()} onClose={vi.fn()} />)

    const name = screen.getByLabelText('Ad') as HTMLInputElement
    expect(name.readOnly).toBe(false)
    await user.clear(name)
    await user.type(name, 'Sahə B')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('location', 'update', '9', 'Sahə B', {}))
  })

  it('locks the name when usage is unknown, and says so', async () => {
    render(<ReferenceDirectoryFormDialog entity={location} kind="location" usage={{ count: 1, exact: false }} onDone={vi.fn()} onClose={vi.fn()} />)

    expect((screen.getByLabelText('Ad') as HTMLInputElement).readOnly).toBe(true)
    expect(screen.getByText(/İstifadə məlumatı yüklənmədi/).textContent).toContain('adı dəyişdirilmir')
  })

  it('sends empty meta and shows no project or partner fields', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={null} kind="location" presetName="Yeni sahə" usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />)

    expect(screen.queryByLabelText('VÖEN')).toBeNull()
    expect(screen.queryByLabelText(/Bağlı anbar/)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('location', 'create', null, 'Yeni sahə', {}))
  })
})

describe('ReferenceDirectoryFormDialog — project linked warehouse', () => {
  it('offers the active anbar warehouses plus the empty option, with the original hint', () => {
    render(<ReferenceDirectoryFormDialog entity={project} kind="project" usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />)

    const select = screen.getByLabelText(/Bağlı anbar/) as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['— bağlanmayıb —', 'Ələt', 'Astara'])
    expect(select.value).toBe('Ələt')
    expect(screen.getByText(/yalnız bu layihədə sənəd yarada/)).toBeTruthy()
  })

  it('ALWAYS resends the stored linked_warehouse when only the name is edited', async () => {
    /* Approved decision Q4 / registry M3-11. manage_reference sets
       linked_warehouse unconditionally from meta, so omitting the key would
       silently clear the link — the same silent-data-loss shape as D-13. */
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={project} kind="project" usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />)

    const name = screen.getByLabelText('Ad')
    await user.clear(name)
    await user.type(name, 'Layihə B')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'project', 'update', 'pj-1', 'Layihə B', { linked_warehouse: 'Ələt' },
    ))
  })

  it('sends a changed linked warehouse', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={project} kind="project" usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText(/Bağlı anbar/), 'Astara')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'project', 'update', 'pj-1', 'Layihə A', { linked_warehouse: 'Astara' },
    ))
  })

  it('sends an empty string when the link is deliberately cleared', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={project} kind="project" usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText(/Bağlı anbar/), '')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    /* The server trims '' to NULL — clearing is a real, intended action, as
       distinct from omitting the key by accident. */
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'project', 'update', 'pj-1', 'Layihə A', { linked_warehouse: '' },
    ))
  })

  it('creates an unlinked project when nothing is selected', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryFormDialog entity={null} kind="project" presetName="Yeni layihə" usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith(
      'project', 'create', null, 'Yeni layihə', { linked_warehouse: '' },
    ))
  })

  it('surfaces the server\'s invalid-warehouse refusal verbatim', async () => {
    const user = userEvent.setup()
    vi.mocked(manageReference).mockResolvedValue({
      data: null,
      error: { message: 'Bağlı anbar tapılmadı və ya aktiv deyil: Yoxdur' },
    } as never)
    render(<ReferenceDirectoryFormDialog entity={project} kind="project" usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(toasts()).toContain(
      'Soraqça yenilənmədi: Bağlı anbar tapılmadı və ya aktiv deyil: Yoxdur',
    ))
  })

  it('does not render the linked-warehouse field for any other kind', () => {
    const { unmount } = render(
      <ReferenceDirectoryFormDialog entity={unit} kind="unit" usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.queryByLabelText(/Bağlı anbar/)).toBeNull()
    unmount()

    render(<ReferenceDirectoryFormDialog entity={partner} kind="partner" usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByLabelText(/Bağlı anbar/)).toBeNull()
  })
})

/* Registry M3-17 — the approved safety deviation from the old platform. */
describe('ReferenceDirectoryFormDialog — typed-name gate for project deletion', () => {
  async function openDelete(user: ReturnType<typeof userEvent.setup>) {
    render(<ReferenceDirectoryFormDialog entity={project} kind="project" usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))
  }

  it('asks for the project name and keeps the delete button disabled until it matches', async () => {
    const user = userEvent.setup()
    await openDelete(user)

    const confirm = screen.getByLabelText('Layihənin adı')
    const del = screen.getByRole('button', { name: 'Tamamilə sil' }) as HTMLButtonElement
    expect(del.disabled).toBe(true)

    await user.type(confirm, 'Layihə')
    expect((screen.getByRole('button', { name: 'Tamamilə sil' }) as HTMLButtonElement).disabled).toBe(true)

    await user.type(confirm, ' A')
    expect((screen.getByRole('button', { name: 'Tamamilə sil' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('does not call the RPC while the typed name is wrong, even if the click gets through', async () => {
    const user = userEvent.setup()
    await openDelete(user)

    await user.type(screen.getByLabelText('Layihənin adı'), 'Layihə B')
    /* The guard lives in send(), not only on the disabled attribute. */
    screen.getByRole('button', { name: 'Tamamilə sil' }).click()

    expect(manageReference).not.toHaveBeenCalled()
  })

  it('deletes once the exact name is typed', async () => {
    const user = userEvent.setup()
    await openDelete(user)

    await user.type(screen.getByLabelText('Layihənin adı'), 'Layihə A')
    await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('project', 'delete', 'pj-1', 'Layihə A', { linked_warehouse: 'Ələt' }))
  })

  it('tolerates surrounding whitespace but not a different name', async () => {
    const user = userEvent.setup()
    await openDelete(user)

    await user.type(screen.getByLabelText('Layihənin adı'), '  Layihə A  ')
    await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalled())
  })

  it('warns that the server will not stop the deletion', async () => {
    const user = userEvent.setup()
    await openDelete(user)
    expect(screen.getByText(/server bu silinməni dayandırmayacaq/)).toBeTruthy()
  })

  it('still offers «Gizlət» as the safe alternative', async () => {
    const user = userEvent.setup()
    await openDelete(user)
    await user.click(screen.getByRole('button', { name: 'Gizlət' }))
    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('project', 'deactivate', 'pj-1', 'Layihə A', { linked_warehouse: 'Ələt' }))
  })

  it('does NOT gate deletion for the other seven kinds', async () => {
    /* The deviation is project-specific; every other kind keeps the
       original's plain two-step confirmation. */
    const user = userEvent.setup()
    for (const [entity, kind] of [
      [unusedWarehouse, 'warehouse'],
      [location, 'location'],
      [partner, 'partner'],
      [channel, 'channel'],
      [unit, 'unit'],
      [category, 'category'],
    ] as const) {
      vi.mocked(manageReference).mockClear()
      const { unmount } = render(
        <ReferenceDirectoryFormDialog entity={entity} kind={kind} usage={exact(0)} warehouseNames={WHS} onDone={vi.fn()} onClose={vi.fn()} />,
      )
      await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))
      expect(screen.queryByLabelText('Layihənin adı')).toBeNull()
      await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))
      await waitFor(() => expect(manageReference).toHaveBeenCalledWith(kind, 'delete', entity.id, entity.name, expect.anything()))
      unmount()
    }
  })

  it('is still subject to the localhost write guard', async () => {
    const user = userEvent.setup()
    vi.mocked(blockedReason).mockReturnValue('Bütün yazma əməliyyatları bloklanıb')
    await openDelete(user)

    await user.type(screen.getByLabelText('Layihənin adı'), 'Layihə A')
    await user.click(screen.getByRole('button', { name: 'Tamamilə sil' }))

    expect(manageReference).not.toHaveBeenCalled()
    expect(toasts()).toContain('Bütün yazma əməliyyatları bloklanıb')
  })
})
