import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadErrorState } from './LoadErrorState'

describe('LoadErrorState — M7-S1', () => {
  it('renders the fixed title and the real error, no row-count claim', () => {
    render(<LoadErrorState error="stock_conditions: nəticə yoxdur" />)
    expect(screen.getByText('Məlumat yüklənmədi')).toBeTruthy()
    expect(screen.getByText('stock_conditions: nəticə yoxdur')).toBeTruthy()
  })

  it('never renders an empty-result claim', () => {
    render(<LoadErrorState error="x" />)
    expect(screen.queryByText(/Nəticə yoxdur/)).toBeNull()
  })
})
