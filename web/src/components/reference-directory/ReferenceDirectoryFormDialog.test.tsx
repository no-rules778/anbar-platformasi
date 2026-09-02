import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/referenceDirectory.api', () => ({ manageReference: vi.fn() }))

import { manageReference } from '../../api/referenceDirectory.api'
import { ReferenceDirectoryFormDialog } from './ReferenceDirectoryFormDialog'
import { useToastStore } from '../../store/toast.store'
import type { ReferenceEntity } from '../../types/referenceDirectory'

const unusedWarehouse: ReferenceEntity = {
  kind: 'warehouse', id: '7', name: 'Bos anbar', active: true, voen: '', contract: '', contractDate: '',
}
const partner: ReferenceEntity = {
  kind: 'partner',
  id: '8b1f0a2c-0000-4000-8000-000000000001',
  name: 'Bakcell MMC',
  active: true,
  voen: '1234567890',
  contract: 'MQ-15',
  contractDate: '2026-06-05',
}

const ok = { data: { ok: true, kind: 'partner', action: 'update', id: 'x', cascaded_rows: 0 }, error: null }
const toasts = () => useToastStore.getState().messages.map((m) => m.text)

beforeEach(() => {
  vi.clearAllMocks()
  useToastStore.setState({ messages: [] })
  vi.mocked(manageReference).mockResolvedValue(ok as never)
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
