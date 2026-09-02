import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../api/referenceDirectory.api', () => ({ manageReference: vi.fn() }))

import { manageReference } from '../../api/referenceDirectory.api'
import { WarehouseFormDialog } from './WarehouseFormDialog'
import type { WarehouseRow } from '../../api/warehouses.api'

const unusedWarehouse: WarehouseRow = { id: 7, name: 'Bos anbar', type: 'anbar', active: true }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(manageReference).mockResolvedValue({ data: { ok: true, kind: 'warehouse', action: 'delete', id: '7', cascaded_rows: 0 }, error: null })
})

const deleteButtons = () => screen.getAllByRole('button', { name: 'Tamamilə sil' })

/* Original: the ✕ action opens a separate «Soraqçanın silinməsi» window and
   only the button inside it deletes (index.html refRemove, 3125-3150). */
describe('WarehouseFormDialog — deletion is two-step', () => {
  it('does not delete on the first click; it opens the confirmation instead', async () => {
    const user = userEvent.setup()
    render(<WarehouseFormDialog warehouse={unusedWarehouse} usage={{ count: 0, exact: true }} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(deleteButtons()[0])

    expect(manageReference).not.toHaveBeenCalled()
    expect(screen.getByText('Soraqçanın silinməsi')).toBeTruthy()
  })

  it('deletes only after confirming in the second window', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    render(<WarehouseFormDialog warehouse={unusedWarehouse} usage={{ count: 0, exact: true }} onDone={onDone} onClose={vi.fn()} />)

    await user.click(deleteButtons()[0])
    await user.click(deleteButtons()[0])

    await waitFor(() => expect(manageReference).toHaveBeenCalledWith('warehouse', 'delete', '7', 'Bos anbar', {}))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('lets the user back out of the confirmation without deleting', async () => {
    const user = userEvent.setup()
    render(<WarehouseFormDialog warehouse={unusedWarehouse} usage={{ count: 0, exact: true }} onDone={vi.fn()} onClose={vi.fn()} />)

    await user.click(deleteButtons()[0])
    await user.click(screen.getByRole('button', { name: 'İmtina' }))

    expect(manageReference).not.toHaveBeenCalled()
    expect(screen.queryByText('Soraqçanın silinməsi')).toBeNull()
    expect(screen.getByText('Anbar — redaktə')).toBeTruthy()
  })
})

describe('WarehouseFormDialog — delete is offered only when it is safe', () => {
  it('hides delete for a warehouse that is in use', () => {
    render(<WarehouseFormDialog warehouse={unusedWarehouse} usage={{ count: 3, exact: true }} onDone={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Tamamilə sil' })).toBeNull()
  })

  it('hides delete and locks the name when the usage count is not trustworthy', () => {
    render(<WarehouseFormDialog warehouse={unusedWarehouse} usage={{ count: 1, exact: false }} onDone={vi.fn()} onClose={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Tamamilə sil' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Yadda saxla' })).toBeNull()
    expect(screen.getByText(/İstifadə məlumatı yüklənmədi/)).toBeTruthy()
    expect((screen.getByDisplayValue('Bos anbar') as HTMLInputElement).readOnly).toBe(true)
  })

  it('hides delete entirely when creating a new warehouse', () => {
    render(<WarehouseFormDialog warehouse={null} usage={{ count: 0, exact: true }} onDone={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Tamamilə sil' })).toBeNull()
    expect(screen.getByText('Anbar — yeni dəyər')).toBeTruthy()
  })
})
