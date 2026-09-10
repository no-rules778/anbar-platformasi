import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditModeBanner } from './EditModeBanner'

/* M7-110 — the banner states the one fact the screen cannot show: the
   correction has not reached the database yet. */
describe('EditModeBanner', () => {
  it('names the document and says the database is unchanged', () => {
    render(<EditModeBanner docNum="DOC-7" onExit={vi.fn()} />)
    const text = screen.getByTestId('edit-mode-banner').textContent ?? ''
    expect(text).toContain('DOC-7')
    expect(text).toContain('bazada hələ heç nə dəyişməyib')
  })

  it('offers «Düzəlişdən imtina» and reports the click', async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()
    render(<EditModeBanner docNum="DOC-7" onExit={onExit} />)
    await user.click(screen.getByRole('button', { name: 'Düzəlişdən imtina' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
