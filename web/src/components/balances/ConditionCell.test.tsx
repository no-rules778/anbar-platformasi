import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConditionCell, type ConditionCellProps } from './ConditionCell'

/* M9-44, M9-93 … M9-95, M9-134, M9-134a, M9-135 — legacy condCell (2349-2354)
   and condEditStart (2380-2410), plus the D-J3 mid-edit policy. The RPC is
   the caller's business: this component hands over a raw string ONCE. */

function renderCell(over: Partial<ConditionCellProps> = {}, rowClick = vi.fn()) {
  const props: ConditionCellProps = {
    warehouse: 'Ələt', code: '0000001', condKey: 'unfit', title: 'Yararsız',
    value: 3, canEdit: true, pending: false, onCommit: vi.fn(), ...over,
  }
  const utils = render(
    <table><tbody>
      <tr onClick={rowClick} data-testid="row">
        <td><ConditionCell {...props} /></td>
      </tr>
    </tbody></table>,
  )
  const rerender = (next: Partial<ConditionCellProps>) =>
    utils.rerender(
      <table><tbody>
        <tr onClick={rowClick} data-testid="row">
          <td><ConditionCell {...props} {...next} /></td>
        </tr>
      </tbody></table>,
    )
  return { ...utils, props, rerender, rowClick }
}

const cell = () => document.querySelector('[data-cond-cell]') as HTMLElement | null
const editor = () => document.querySelector('input[data-cond-editor]') as HTMLInputElement | null

describe('display (M9-44, M9-93)', () => {
  it('renders a value > 0 through nf(v, 2)', () => {
    renderCell({ value: 3 })
    expect(cell()?.textContent).toBe('3,00')
  })

  it('renders a marker of 0 as a muted em-dash, not «0»', () => {
    renderCell({ value: 0 })
    expect(cell()?.textContent).toBe('—')
    expect(cell()?.querySelector('.muted')).not.toBeNull()
    expect(cell()?.textContent).not.toContain('0')
  })

  it('a non-editor sees the SAME number as plain text, with no editable span', () => {
    renderCell({ value: 3, canEdit: false })
    expect(cell()).toBeNull()
    expect(screen.getByText('3,00')).toBeTruthy()
  })

  it('a non-editor sees the same em-dash for 0', () => {
    renderCell({ value: 0, canEdit: false })
    expect(cell()).toBeNull()
    expect(document.querySelector('td')?.textContent).toBe('—')
  })

  it('shows «…» while a commit is pending, and no editor', () => {
    renderCell({ pending: true })
    expect(document.querySelector('td')?.textContent).toBe('…')
    expect(cell()).toBeNull()
    expect(editor()).toBeNull()
  })

  it('carries the legacy tooltip', () => {
    renderCell()
    expect(cell()?.getAttribute('title')).toBe('Yararsız — dəyişmək üçün klikləyin')
  })
})

describe('the inline editor (M9-94)', () => {
  it('opens a number input with min=0 step=0.01, pre-filled when value > 0', async () => {
    renderCell({ value: 3 })
    await userEvent.click(cell()!)
    const inp = editor()!
    expect(inp.type).toBe('number')
    expect(inp.getAttribute('min')).toBe('0')
    expect(inp.getAttribute('step')).toBe('0.01')
    expect(inp.value).toBe('3')
  })

  it('is EMPTY, not «0», when the value is 0', async () => {
    renderCell({ value: 0 })
    await userEvent.click(cell()!)
    expect(editor()!.value).toBe('')
  })

  it('focuses and selects the input on open', async () => {
    renderCell({ value: 3 })
    await userEvent.click(cell()!)
    expect(document.activeElement).toBe(editor())
  })

  it('Enter commits the raw text and closes the editor', async () => {
    const onCommit = vi.fn()
    renderCell({ value: 3, onCommit })
    await userEvent.click(cell()!)
    await userEvent.clear(editor()!)
    await userEvent.type(editor()!, '4.5')
    await userEvent.keyboard('{Enter}')
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('4.5')
    expect(editor()).toBeNull()
  })

  it('blur commits', async () => {
    const onCommit = vi.fn()
    renderCell({ value: 3, onCommit })
    await userEvent.click(cell()!)
    await userEvent.clear(editor()!)
    await userEvent.type(editor()!, '2')
    fireEvent.blur(editor()!)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('2')
  })

  it('an emptied input commits the empty string (the caller reads it as 0)', async () => {
    const onCommit = vi.fn()
    renderCell({ value: 3, onCommit })
    await userEvent.click(cell()!)
    await userEvent.clear(editor()!)
    await userEvent.keyboard('{Enter}')
    expect(onCommit).toHaveBeenCalledWith('')
  })

  /* Escape is the ONLY cancel gesture (M9-134a); blur commits (M9-94). */
  it('Escape cancels: no commit, editor closed, display shows the value', async () => {
    const onCommit = vi.fn()
    renderCell({ value: 3, onCommit })
    await userEvent.click(cell()!)
    await userEvent.clear(editor()!)
    await userEvent.type(editor()!, '9')
    await userEvent.keyboard('{Escape}')
    expect(onCommit).not.toHaveBeenCalled()
    expect(editor()).toBeNull()
    expect(cell()?.textContent).toBe('3,00')
  })

  it('a second click while editing does not reset the draft', async () => {
    renderCell({ value: 3 })
    await userEvent.click(cell()!)
    await userEvent.clear(editor()!)
    await userEvent.type(editor()!, '7')
    await userEvent.click(editor()!)
    expect(editor()!.value).toBe('7')
  })
})

/* M9-135 — the `done` latch: Enter causes the browser to blur the input as
   the editor unmounts; that blur must NOT produce a second commit. */
describe('duplicate-submit latch (M9-135)', () => {
  it('Enter followed by blur sends exactly ONE commit', async () => {
    const onCommit = vi.fn()
    renderCell({ value: 3, onCommit })
    await userEvent.click(cell()!)
    const inp = editor()!
    await userEvent.clear(inp)
    await userEvent.type(inp, '5')
    fireEvent.keyDown(inp, { key: 'Enter' })
    fireEvent.blur(inp)
    fireEvent.blur(inp)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('5')
  })

  it('Escape followed by blur commits nothing', async () => {
    const onCommit = vi.fn()
    renderCell({ value: 3, onCommit })
    await userEvent.click(cell()!)
    const inp = editor()!
    fireEvent.keyDown(inp, { key: 'Escape' })
    fireEvent.blur(inp)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('a NEW edit session after a commit can commit again', async () => {
    const onCommit = vi.fn()
    const { rerender } = renderCell({ value: 3, onCommit })
    await userEvent.click(cell()!)
    fireEvent.keyDown(editor()!, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledTimes(1)
    /* The caller applies the server value and the cell re-renders. */
    rerender({ value: 3 })
    await userEvent.click(cell()!)
    await userEvent.clear(editor()!)
    await userEvent.type(editor()!, '6')
    fireEvent.keyDown(editor()!, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledTimes(2)
    expect(onCommit).toHaveBeenLastCalledWith('6')
  })
})

/* M9-95 — the cell and its input never open the item card. */
describe('row-click isolation (M9-95)', () => {
  it('clicking the editable cell does not reach the row', async () => {
    const { rowClick } = renderCell({ value: 3 })
    await userEvent.click(cell()!)
    expect(rowClick).not.toHaveBeenCalled()
  })

  it('clicking the open input does not reach the row', async () => {
    const { rowClick } = renderCell({ value: 3 })
    await userEvent.click(cell()!)
    await userEvent.click(editor()!)
    expect(rowClick).not.toHaveBeenCalled()
  })

  /* CONTROL: a non-editable cell is plain text — a click there DOES reach
     the row, exactly as the legacy plain `txt` cell does. Without this the
     two assertions above could pass against a cell that swallows every click. */
  it('control: clicking a NON-editable cell propagates to the row', async () => {
    const { rowClick } = renderCell({ value: 3, canEdit: false })
    await userEvent.click(screen.getByText('3,00'))
    expect(rowClick).toHaveBeenCalledTimes(1)
  })
})

/* D-J3 — the mid-edit refresh policy (M9-134, M9-134a). */
describe('D-J3 — a snapshot refresh during an edit', () => {
  it('M9-134: the editor and its uncommitted draft SURVIVE a new value prop', async () => {
    const { rerender } = renderCell({ value: 3 })
    await userEvent.click(cell()!)
    await userEvent.clear(editor()!)
    await userEvent.type(editor()!, '8')
    /* A realtime refresh changes THIS cell's stored value under the editor. */
    rerender({ value: 5 })
    expect(editor()).not.toBeNull()
    expect(editor()!.value).toBe('8')
  })

  it('M9-134a: Escape after such a refresh shows the LATEST value, not the pre-edit one', async () => {
    const onCommit = vi.fn()
    const { rerender } = renderCell({ value: 3, onCommit })
    await userEvent.click(cell()!)
    await userEvent.clear(editor()!)
    await userEvent.type(editor()!, '8')
    rerender({ value: 5 })
    await userEvent.keyboard('{Escape}')
    expect(onCommit).not.toHaveBeenCalled()
    expect(cell()?.textContent).toBe('5,00')
    expect(cell()?.textContent).not.toBe('3,00')
  })

  it('M9-134b (component half): Enter after such a refresh hands over the DRAFT exactly once', async () => {
    const onCommit = vi.fn()
    const { rerender } = renderCell({ value: 3, onCommit })
    await userEvent.click(cell()!)
    await userEvent.clear(editor()!)
    await userEvent.type(editor()!, '8')
    rerender({ value: 5 })
    const inp = editor()!
    fireEvent.keyDown(inp, { key: 'Enter' })
    /* The editor unmounts on Enter; the browser's blur on the detached input
       must still be a no-op. */
    fireEvent.blur(inp)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('8')
  })

  it('losing edit rights under a refresh closes the editor without committing', async () => {
    const onCommit = vi.fn()
    const { rerender } = renderCell({ value: 3, onCommit })
    await userEvent.click(cell()!)
    rerender({ canEdit: false })
    expect(editor()).toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByText('3,00')).toBeTruthy()
  })
})
