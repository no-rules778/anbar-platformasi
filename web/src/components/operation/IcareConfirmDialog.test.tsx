import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IcareConfirmDialog } from './IcareConfirmDialog'
import type { ExposureHit, ExposureLine } from '../../lib/icareExposure'

const hit = (over: Partial<ExposureLine> = {}, exp = 2): ExposureHit<ExposureLine> => ({
  line: { kind: 'out', t: 'Silinmə', w: 'Ələt', c: '0000001', q: 6, name: 'Sement', unit: 'kq', ...over },
  w: 'Ələt',
  exp,
})

/* M7-81 — the reason is MANDATORY. Moving rented stock is allowed but never
   silent; the server records the same fact in the audit log. */
describe('IcareConfirmDialog', () => {
  it('lists each exposed line with its warehouse and exposed quantity', () => {
    render(<IcareConfirmDialog hits={[hit()]} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Sement')).toBeTruthy()
    expect(screen.getByText('Ələt')).toBeTruthy()
    expect(screen.getByText(/2,00 kq/)).toBeTruthy()
  })

  it('keeps the confirm button DISABLED while the reason is empty', () => {
    render(<IcareConfirmDialog hits={[hit()]} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect((screen.getByRole('button', { name: 'Təsdiq et' }) as HTMLButtonElement).disabled).toBe(true)
  })

  /* Whitespace is not a reason — the gate trims before judging. */
  it('treats a whitespace-only reason as empty', async () => {
    const user = userEvent.setup()
    render(<IcareConfirmDialog hits={[hit()]} onConfirm={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByLabelText('Səbəb'), '   ')
    expect((screen.getByRole('button', { name: 'Təsdiq et' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('passes the trimmed reason on confirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<IcareConfirmDialog hits={[hit()]} onConfirm={onConfirm} onClose={vi.fn()} />)
    await user.type(screen.getByLabelText('Səbəb'), '  təcili iş  ')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))
    expect(onConfirm).toHaveBeenCalledWith('təcili iş')
  })

  it('confirms nothing when cancelled', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<IcareConfirmDialog hits={[hit()]} onConfirm={onConfirm} onClose={vi.fn()} />)
    await user.type(screen.getByLabelText('Səbəb'), 'səbəb')
    await user.click(screen.getByRole('button', { name: 'İmtina' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
