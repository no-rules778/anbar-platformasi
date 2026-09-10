import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClearLinesDialog } from './ClearLinesDialog'

/* M7-44 — the confirmation IS the row. Without it a misclick discards an
   unposted document and its saved draft. */
describe('ClearLinesDialog', () => {
  it('names the number of lines that will be discarded', () => {
    render(<ClearLinesDialog count={3} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('clear-lines-body').textContent).toContain('3 sətir silinəcək')
  })

  it('confirms only on «Təmizlə»', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<ClearLinesDialog count={2} onConfirm={onConfirm} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Təmizlə' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  /* The half that matters: cancelling must clear NOTHING. */
  it('clears nothing when cancelled', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<ClearLinesDialog count={2} onConfirm={onConfirm} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'İmtina' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('states that nothing has changed in the database yet', () => {
    render(<ClearLinesDialog count={1} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/bazada heç nə dəyişmir/)).toBeTruthy()
  })
})
