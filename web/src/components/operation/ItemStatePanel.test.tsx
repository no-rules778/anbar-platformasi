import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ItemStatePanel } from './ItemStatePanel'
import type { WarehouseBalance } from '../../lib/itemIndex'

const bal = (over: Partial<WarehouseBalance>): WarehouseBalance => ({
  w: 'Ələt', c: 'C1', in: 0, out: 0, n: 0, q: 0,
  last: '', first: '9999', price: 0, val: 0, name: '', unit: '', ...over,
})

describe('ItemStatePanel — M7-24', () => {
  it('shows the no-selection state when nothing is picked', () => {
    render(<ItemStatePanel code={null} bal={[]} />)
    /* M18-55 — the legacy initial text (index.html:309); «Mal seçilməyib.»
       was a React paraphrase. */
    expect(screen.getByText('Mal seçin — bütün anbarlar üzrə qalıq burada görünəcək.')).toBeTruthy()
  })

  it('shows the empty-movement text for a code with no balance rows', () => {
    render(<ItemStatePanel code="C1" bal={[]} />)
    expect(screen.getByText('Bu mal üzrə hələ hərəkət yoxdur.')).toBeTruthy()
  })

  it('lists a balance per warehouse for the picked code only', () => {
    render(<ItemStatePanel code="C1" bal={[
      bal({ w: 'Ələt', q: 5 }),
      bal({ w: 'Astara', c: 'OTHER', q: 9 }),
    ]} />)
    expect(screen.getByText('Ələt')).toBeTruthy()
    expect(screen.queryByText('Astara')).toBeNull()
  })

  it('ignores pending draft lines — the panel reads IX.bal only, by construction', () => {
    // The component takes no `lines` prop at all: passing balances is the
    // only input, so there is no code path by which a pending draft line
    // could influence this panel's rendering (M7-24).
    render(<ItemStatePanel code="C1" bal={[bal({ w: 'Ələt', q: 3 })]} />)
    expect(screen.getByText('3,00')).toBeTruthy()
  })

  it('styles a negative balance distinctly', () => {
    render(<ItemStatePanel code="C1" bal={[bal({ w: 'Ələt', q: -2 })]} />)
    const cell = screen.getByText('-2,00')
    expect(cell.className).toContain('neg')
  })

  it('the picked code stays isolated from a different code sharing a warehouse', () => {
    render(<ItemStatePanel code="C1" bal={[bal({ w: 'Ələt', c: 'C2', q: 7 })]} />)
    expect(screen.getByText('Bu mal üzrə hələ hərəkət yoxdur.')).toBeTruthy()
  })
})
