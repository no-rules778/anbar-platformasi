import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

/* M18-57 — the platform stylesheet selects inputs by ATTRIBUTE
   (`input[type=text],input[type=number],…`, index.css:129), not by element.
   A bare `<input>` carries an implied text type but emits NO `type`
   attribute, so it matched none of those rules and rendered with no border,
   background, padding or width. Legacy writes `type="text"` explicitly on
   every such field (index.html:3275, 3286-3292).

   These assertions read the DOM attribute rather than the `type` IDL
   property: the property reports "text" for a bare input regardless, so a
   property-based test could not see the defect at all. */

describe('Input — default type (M18-57)', () => {
  it('emits an explicit type="text" attribute when no type is given', () => {
    render(<Input aria-label="bare" />)
    const el = screen.getByLabelText('bare')
    /* getAttribute, not `.type` — the latter is "text" even when the
       attribute is absent, which is precisely the unstyled case. */
    expect(el.getAttribute('type')).toBe('text')
  })

  it('matches the stylesheet’s input[type=text] selector', () => {
    render(<Input aria-label="bare" />)
    expect(screen.getByLabelText('bare').matches('input[type=text]')).toBe(true)
  })

  it('does not overwrite an explicit type="date"', () => {
    render(<Input type="date" aria-label="d" />)
    expect(screen.getByLabelText('d').getAttribute('type')).toBe('date')
  })

  it('does not overwrite an explicit type="number"', () => {
    render(<Input type="number" aria-label="n" />)
    expect(screen.getByLabelText('n').getAttribute('type')).toBe('number')
  })

  it('preserves the other explicit types the stylesheet targets', () => {
    render(
      <>
        <Input type="search" aria-label="s" />
        <Input type="email" aria-label="e" />
        <Input type="password" aria-label="p" />
      </>,
    )
    expect(screen.getByLabelText('s').getAttribute('type')).toBe('search')
    expect(screen.getByLabelText('e').getAttribute('type')).toBe('email')
    expect(screen.getByLabelText('p').getAttribute('type')).toBe('password')
  })
})

/* The default must not come at the cost of the component API: the ref is
   still forwarded and handlers still fire. */
describe('Input — API preserved across the default (M18-57)', () => {
  it('still forwards the ref to the real input element', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} aria-label="r" />)
    expect(ref.current).toBe(screen.getByLabelText('r'))
    expect(ref.current?.tagName).toBe('INPUT')
  })

  it('still forwards value/onChange and other attributes', async () => {
    render(<Input aria-label="t" placeholder="ph" defaultValue="" />)
    const el = screen.getByLabelText('t') as HTMLInputElement
    expect(el.placeholder).toBe('ph')
    await userEvent.type(el, 'abc')
    expect(el.value).toBe('abc')
  })
})
