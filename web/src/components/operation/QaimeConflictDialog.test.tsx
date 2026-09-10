import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QaimeConflictDialog } from './QaimeConflictDialog'

const conflict = { iv: 'A-100', doc: 'DOC-7', date: '2026-01-05', partner: 'Contragent X' }

/* M7-89 — a HARD block. The absence of a continue button is the row. */
describe('QaimeConflictDialog', () => {
  it('names the invoice, the conflicting document, its date and partner', () => {
    render(<QaimeConflictDialog conflict={conflict} onClose={vi.fn()} />)
    const body = screen.getByTestId('qaime-conflict-body').textContent ?? ''
    expect(body).toContain('A-100')
    expect(body).toContain('DOC-7')
    expect(body).toContain('2026-01-05')
    expect(body).toContain('Contragent X')
  })

  /* Verified to fail against any «anladım, davam et» affordance: the only
     buttons are «Bağla» and the header's ×. */
  it('offers NO continue button — closing is the only exit', () => {
    render(<QaimeConflictDialog conflict={conflict} onClose={vi.fn()} />)
    const labels = screen.getAllByRole('button').map((b) => b.textContent?.trim())
    expect(labels).toEqual(expect.arrayContaining(['Bağla']))
    for (const l of labels) {
      expect(l).not.toMatch(/davam|anladım|təsdiq|qeyd et/i)
    }
  })

  it('tells the user the number must be changed', () => {
    render(<QaimeConflictDialog conflict={conflict} onClose={vi.fn()} />)
    expect(screen.getByText(/qaimə nömrəsini dəyişin/i)).toBeTruthy()
  })
})
