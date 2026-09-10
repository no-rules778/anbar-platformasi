import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditLineDialog } from './EditLineDialog'
import type { DraftOpLineState } from '../../store/operation.store'
import type { ValidateContext, OpLineInput } from '../../lib/opLineValidation'

const line = (over: Partial<DraftOpLineState> = {}): DraftOpLineState => ({
  kind: 'out', w: 'Ələt', c: '0000001', q: 2, d: '2026-01-05', t: 'Sahəyə',
  p: 'Layihə A', ch: '', ct: '', iv: '', note: '', cond: null,
  name: 'Sement', unit: 'kq', pr: 10, ...over,
})

/* Balances are generous unless a test says otherwise, so the stock rule only
   fires where it is the subject. */
const ctx = (over: Partial<ValidateContext> = {}): ValidateContext => ({
  itemBy: new Map([['0000001', { code: '0000001', name: 'Sement M400', unit: 'kq' }]]),
  balanceOf: () => 100,
  allowedWarehouses: ['Ələt', 'Astara'],
  transferSources: ['Ələt'],
  transferDests: ['Astara', 'Harmony'],
  lines: [],
  isAdmin: true,
  ...over,
})

const props = {
  index: 0,
  ctx: ctx(),
  channels: ['Nağd', 'Köçürmə'],
  partners: ['Layihə A', 'Layihə B'],
  warehouses: ['Ələt', 'Astara'],
  transferDests: ['Astara', 'Harmony'],
  onSave: vi.fn(),
  onClose: vi.fn(),
}

describe('EditLineDialog — the working copy (M7-45)', () => {
  it('seeds every field from the line', () => {
    render(<EditLineDialog {...props} line={line()} onSave={vi.fn()} />)
    expect((screen.getByLabelText('Miqdar') as HTMLInputElement).value).toBe('2')
    expect((screen.getByLabelText('Növ') as HTMLSelectElement).value).toBe('Sahəyə')
  })

  /* The row's whole point: cancelling changes NOTHING. */
  it('saves nothing when cancelled, even after edits', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<EditLineDialog {...props} line={line()} onSave={onSave} />)
    await user.clear(screen.getByLabelText('Miqdar'))
    await user.type(screen.getByLabelText('Miqdar'), '9')
    await user.click(screen.getByRole('button', { name: 'İmtina' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('commits the edited values on save', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<EditLineDialog {...props} line={line()} onSave={onSave} />)
    await user.clear(screen.getByLabelText('Miqdar'))
    await user.type(screen.getByLabelText('Miqdar'), '7')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(onSave.mock.calls[0][0].q).toBe(7)
  })

  /* M7-49 — an invalid edit keeps the dialog OPEN with the reason visible;
     closing on failure would read as a successful save. */
  it('keeps the dialog open and shows the reason when validation fails', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<EditLineDialog {...props} line={line()} onSave={onSave} />)
    await user.clear(screen.getByLabelText('Miqdar'))
    await user.type(screen.getByLabelText('Miqdar'), '0')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByTestId('edit-line-dialog')).toBeTruthy()
  })

  /* M7-49 — name and unit refresh from the nomenclature on save. The fixture
     line carries a stale «Sement»; the directory says «Sement M400». */
  it('refreshes the name and unit from the nomenclature', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<EditLineDialog {...props} line={line()} onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(onSave.mock.calls[0][0].name).toBe('Sement M400')
  })
})

/* M7-32 / M7-36 — the edited line must not count ITSELF as pending stock,
   which is what `skipIndex` excludes. Verified to fail against a call that
   omits it: the line's own 2 units would be deducted twice. */
describe('EditLineDialog — skipIndex (M7-32)', () => {
  it('excludes the edited line from the pending total', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const existing = line({ q: 10 })
    render(
      <EditLineDialog
        {...props}
        index={0}
        line={existing}
        ctx={ctx({ balanceOf: () => 10, lines: [existing as unknown as OpLineInput] })}
        onSave={onSave}
      />,
    )
    /* The full balance is available because the line's own 10 are skipped. */
    await user.clear(screen.getByLabelText('Miqdar'))
    await user.type(screen.getByLabelText('Miqdar'), '10')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(onSave).toHaveBeenCalled()
    expect(onSave.mock.calls[0][0].q).toBe(10)
  })
})

/* M7-48 — the fields differ per tab, and `kind` itself never changes. */
describe('EditLineDialog — per-kind fields (M7-48)', () => {
  it('offers the destination and NO counterparty or price on a transfer', () => {
    render(<EditLineDialog {...props} line={line({ kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara' })} onSave={vi.fn()} />)
    expect(screen.getByLabelText('Təyinat anbar')).toBeTruthy()
    expect(screen.queryByLabelText('Qarşı tərəf')).toBeNull()
    expect(screen.queryByLabelText('Qiymət')).toBeNull()
  })

  it('offers channel, contract and price on an inbound line only', () => {
    render(<EditLineDialog {...props} line={line({ kind: 'in', t: 'Satınalma' })} onSave={vi.fn()} />)
    expect(screen.getByLabelText('Kanal')).toBeTruthy()
    expect(screen.getByLabelText('Müqavilə №')).toBeTruthy()
    expect(screen.getByLabelText('Qiymət')).toBeTruthy()
  })

  it('offers no destination on a non-transfer line', () => {
    render(<EditLineDialog {...props} line={line()} onSave={vi.fn()} />)
    expect(screen.queryByLabelText('Təyinat anbar')).toBeNull()
  })

  it('offers only this kind\'s operation types', () => {
    render(<EditLineDialog {...props} line={line()} onSave={vi.fn()} />)
    const opts = Array.from((screen.getByLabelText('Növ') as HTMLSelectElement).options).map((o) => o.value)
    expect(opts).toContain('Silinmə')
    expect(opts).not.toContain('Satınalma')
  })
})

/* M7-50 — on a transfer the counterparty IS the destination warehouse, so a
   stale partner cannot survive a destination change. */
describe('EditLineDialog — transfer counterparty (M7-50)', () => {
  it('forces p to equal w2 on save', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <EditLineDialog
        {...props}
        line={line({ kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara', p: 'köhnə dəyər' })}
        onSave={onSave}
      />,
    )
    await user.selectOptions(screen.getByLabelText('Təyinat anbar'), 'Harmony')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(onSave.mock.calls[0][0].p).toBe('Harmony')
    expect(onSave.mock.calls[0][0].w2).toBe('Harmony')
  })
})

/* M7-47 — a value hidden in Soraqçalar since the line was added stays
   selectable for THIS line, so an unrelated edit cannot silently drop it. */
describe('EditLineDialog — option preservation (M7-47)', () => {
  it('keeps a counterparty that is no longer in the directory', () => {
    render(<EditLineDialog {...props} line={line({ p: 'Gizlədilmiş' })} onSave={vi.fn()} />)
    const opts = Array.from((screen.getByLabelText('Qarşı tərəf') as HTMLSelectElement).options).map((o) => o.value)
    expect(opts).toContain('Gizlədilmiş')
  })
})

/* M7-31 — a split cut is REJECTED, not silently trimmed: trimming would break
   the split sum. */
describe('EditLineDialog — split cut mismatch (M7-31)', () => {
  /* Verified to FAIL against applying the clamp blindly (plan T8, «Split cut
     mismatch rejects rather than trims»): a naive save would commit q=3 and
     leave the 5-unit split describing a 3-unit line. */
  it('refuses rather than clamping a split line over the balance', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <EditLineDialog
        {...props}
        line={line({ q: 5, cond: { icare: 5 } })}
        ctx={ctx({ balanceOf: () => 3 })}
        onSave={onSave}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('avtomatik endirilə bilməz')
  })

  /* The companion half: with no split present the clamp DOES apply, with a
     warning — that is M7-36's ordinary behaviour and must not regress. */
  it('still clamps a plain line and reports the warning', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <EditLineDialog {...props} line={line({ q: 2 })} ctx={ctx({ balanceOf: () => 3 })} onSave={onSave} />,
    )
    await user.clear(screen.getByLabelText('Miqdar'))
    await user.type(screen.getByLabelText('Miqdar'), '5')
    await user.click(screen.getByRole('button', { name: 'Yadda saxla' }))
    expect(onSave.mock.calls[0][0].q).toBe(3)
  })

  it('makes the quantity read-only while a split is present', () => {
    render(<EditLineDialog {...props} line={line({ cond: { icare: 2 } })} onSave={vi.fn()} />)
    expect((screen.getByLabelText('Miqdar') as HTMLInputElement).readOnly).toBe(true)
  })
})
