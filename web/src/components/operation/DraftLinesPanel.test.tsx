import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DraftLinesPanel } from './DraftLinesPanel'
import type { DraftOpLineState } from '../../store/operation.store'

const line = (over: Partial<DraftOpLineState> = {}): DraftOpLineState => ({
  kind: 'in', w: 'Ələt', c: 'C1', d: '2026-01-01', t: 'Satınalma', q: 5,
  name: 'Sement', unit: 'kq', pr: 10, ...over,
})

function renderPanel(props: Partial<Parameters<typeof DraftLinesPanel>[0]> = {}) {
  const onDismissRestoreBanner = vi.fn()
  const onRemove = vi.fn()
  const onEdit = vi.fn()
  const onPost = vi.fn()
  const onClear = vi.fn()
  const view = render(
    <DraftLinesPanel
      lines={[]}
      restoredAt={null}
      onDismissRestoreBanner={onDismissRestoreBanner}
      onRemove={onRemove}
      onEdit={onEdit}
      canPost={false}
      editMode={false}
      onPost={onPost}
      onClear={onClear}
      {...props}
    />,
  )
  return { ...view, onDismissRestoreBanner, onRemove, onEdit, onPost, onClear }
}

describe('DraftLinesPanel — M7-40/41', () => {
  it('shows the empty state with no lines', () => {
    renderPanel()
    expect(screen.getByText('Sətir əlavə edilməyib.')).toBeTruthy()
  })

  it('lists lines and reports the counter with total and priceless count', () => {
    renderPanel({ lines: [line(), line({ c: 'C2', name: 'Mismar', pr: null })] })
    expect(screen.getByText('Sement')).toBeTruthy()
    expect(screen.getByText('Mismar')).toBeTruthy()
    expect(screen.getByText(/2 sətir/)).toBeTruthy()
    expect(screen.getByText(/1 qiymətsiz/)).toBeTruthy()
  })

  it('a missing amount renders an em-dash, not 0', () => {
    renderPanel({ lines: [line({ pr: null })] })
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('a layered line with no unit price shows an em-dash', () => {
    renderPanel({ lines: [line({ pr: null, allocations: [{ layer_id: 'L1', qty: 5 }] })] })
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('a layered line shows its distinct source prices instead of a blended price', () => {
    renderPanel({
      lines: [line({
        pr: 7.5,
        allocations: [{ layer_id: 'L1', qty: 2 }, { layer_id: 'L2', qty: 3 }],
        priceVariants: [5, 10],
      })],
    })
    expect(screen.getByText(/^5[,.]00 \/ 10[,.]00$/)).toBeTruthy()
    expect(screen.queryByText(/^7[,.]50$/)).toBeNull()
  })

  it('a transfer line shows the route as source → dest', () => {
    renderPanel({ lines: [line({ kind: 'mv', t: 'Yerdəyişmə', w: 'Ələt', w2: 'Astara' })] })
    expect(screen.getByText('Yerdəyişmə · Ələt → Astara')).toBeTruthy()
  })

  it('removing a line calls onRemove with its index', async () => {
    const { onRemove } = renderPanel({ lines: [line()] })
    await userEvent.click(screen.getByText('Sil'))
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('editing a line calls onEdit with its index', async () => {
    const { onEdit } = renderPanel({ lines: [line()] })
    await userEvent.click(screen.getByText('Düzəlt'))
    expect(onEdit).toHaveBeenCalledWith(0)
  })

  it('the post button is disabled while canPost is false', () => {
    renderPanel({ lines: [line()], canPost: false })
    const btn = screen.getByText('Sənədi qeyd et') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('the post button is enabled when canPost is true', () => {
    renderPanel({ lines: [line()], canPost: true })
    const btn = screen.getByText('Sənədi qeyd et') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('shows the edit-mode label in edit mode', () => {
    renderPanel({ lines: [line()], canPost: true, editMode: true })
    expect(screen.getByText('Düzəlişi qeyd et')).toBeTruthy()
  })

  it('the clear button is disabled with no lines', () => {
    renderPanel({ lines: [] })
    const btn = screen.getByText('Təmizlə') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('clicking clear calls onClear', async () => {
    const { onClear } = renderPanel({ lines: [line()] })
    await userEvent.click(screen.getByText('Təmizlə'))
    expect(onClear).toHaveBeenCalled()
  })
})

/* Regression for audit A06 — M7-40 requires the FULL route (partner/warehouse
   both ends) plus the operation type, not the warehouse alone
   (index.html:3742, `TYPE_TAG(l.t)` + `l.p → l.w` / `l.w → l.p` / `l.w →
   l.w2`). A straight warehouse-only render would drop the counterparty and
   the type tag entirely. */
describe('DraftLinesPanel — route and type (audit A06 / M7-40)', () => {
  it('an inbound line shows partner → warehouse, with its type', () => {
    renderPanel({ lines: [line({ kind: 'in', t: 'Satınalma', w: 'Ələt', p: 'Partner A' })] })
    expect(screen.getByText('Satınalma · Partner A → Ələt')).toBeTruthy()
  })

  it('an outbound line shows warehouse → partner, with its type', () => {
    renderPanel({ lines: [line({ kind: 'out', t: 'Sahəyə', w: 'Ələt', p: 'Layihə A' })] })
    expect(screen.getByText('Sahəyə · Ələt → Layihə A')).toBeTruthy()
  })

  it('a transfer line still shows its operation type alongside the route', () => {
    renderPanel({ lines: [line({ kind: 'mv', t: 'Yerdəyişmə', w: 'Ələt', w2: 'Astara' })] })
    expect(screen.getByText('Yerdəyişmə · Ələt → Astara')).toBeTruthy()
  })
})

describe('draft restore banner — M7-55', () => {
  it('shows the formatted stamp when restoredAt is set', () => {
    // 2026-03-05 14:30 local
    const ts = new Date(2026, 2, 5, 14, 30).getTime()
    renderPanel({ restoredAt: ts })
    expect(screen.getByText(/05\.03\.2026 14:30/)).toBeTruthy()
  })

  it('does not show the banner when restoredAt is null', () => {
    renderPanel({ restoredAt: null })
    expect(screen.queryByTestId('draft-restore-banner')).toBeNull()
  })

  it('«Anladım» calls onDismissRestoreBanner', async () => {
    const { onDismissRestoreBanner } = renderPanel({ restoredAt: Date.now() })
    await userEvent.click(screen.getByText('Anladım'))
    expect(onDismissRestoreBanner).toHaveBeenCalled()
  })
})
