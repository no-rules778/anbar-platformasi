import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostConfirmDialog } from './PostConfirmDialog'

const base = {
  lineCount: 3,
  editMode: false,
  canPost: true,
  inFlight: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

describe('PostConfirmDialog — normal (M7-92)', () => {
  it('states the line count and the "cannot be edited afterwards" warning', () => {
    render(<PostConfirmDialog {...base} onConfirm={vi.fn()} />)
    const body = screen.getByTestId('post-confirm-body').textContent ?? ''
    expect(body).toContain('3 sətir qeyd ediləcək')
    expect(body).toContain('birbaşa redaktə edilə bilməz')
  })

  it('requires NO reason', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<PostConfirmDialog {...base} onConfirm={onConfirm} />)
    await user.click(screen.getByRole('button', { name: 'Qeyd et' }))
    expect(onConfirm).toHaveBeenCalledWith('')
  })
})

describe('PostConfirmDialog — edit mode (M7-93)', () => {
  const edit = { ...base, editMode: true, editDocNum: 'DOC-7' }

  it('names the document and carries the Excel-export warning', () => {
    render(<PostConfirmDialog {...edit} onConfirm={vi.fn()} />)
    const body = screen.getByTestId('post-confirm-body').textContent ?? ''
    expect(body).toContain('DOC-7')
    expect(body).toContain('Excel')
  })

  it('keeps the button DISABLED until a reason is given', async () => {
    const user = userEvent.setup()
    render(<PostConfirmDialog {...edit} onConfirm={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Düzəlişi qeyd et' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    await user.type(screen.getByLabelText('Düzəlişin səbəbi'), 'səhv miqdar')
    expect(btn.disabled).toBe(false)
  })

  it('passes the trimmed reason', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<PostConfirmDialog {...edit} onConfirm={onConfirm} />)
    await user.type(screen.getByLabelText('Düzəlişin səbəbi'), '  səhv  ')
    await user.click(screen.getByRole('button', { name: 'Düzəlişi qeyd et' }))
    expect(onConfirm).toHaveBeenCalledWith('səhv')
  })
})

/* M7-S5 — the dialog consults the SAME gate the panel's button used. A
   dialog that could post while `canPost` is false would be exactly the
   second, disagreeing condition that row forbids. */
describe('PostConfirmDialog — the single gate', () => {
  it('disables confirm when canPost is false', () => {
    render(<PostConfirmDialog {...base} canPost={false} onConfirm={vi.fn()} />)
    expect((screen.getByRole('button', { name: 'Qeyd et' }) as HTMLButtonElement).disabled).toBe(true)
  })

  /* M7-108 — the in-flight lock reaches the dialog too, not only the panel. */
  it('disables confirm while a post is in flight', () => {
    render(<PostConfirmDialog {...base} inFlight onConfirm={vi.fn()} />)
    expect((screen.getByRole('button', { name: 'Qeyd et' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
