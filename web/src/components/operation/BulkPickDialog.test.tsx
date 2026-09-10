import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkPickDialog } from './BulkPickDialog'
import type { BulkRow } from '../../lib/bulkWriteOff'
import type { CondRecord, CondSplit } from '../../lib/condSplit'

const row = (over: Partial<BulkRow> = {}): BulkRow => ({
  c: '0000001', name: 'Sement', unit: 'kq', price: 10, bal: 8, pending: 0, avail: 8, ...over,
})

const props = {
  mode: 'wo' as const,
  warehouse: 'Ələt',
  condOf: () => null as CondRecord | null,
  condPendingOf: () => ({}),
  layerActive: false,
  lots: new Map(),
  values: new Map(),
  onPickLayers: vi.fn(),
  onInvalidateLot: vi.fn(),
  onApply: vi.fn(),
  onClose: vi.fn(),
}

const applyBtn = () => screen.getByRole('button', { name: 'Əlavə et' }) as HTMLButtonElement

/* H3-A05 — the dialog no longer owns its draft: the store does, because
   «Partiya seç» unmounts it. This harness plays the store's part so the
   behavioural tests below still exercise a live, editable dialog. */
type HarnessProps = Partial<React.ComponentProps<typeof BulkPickDialog>>

function Harness(over: HarnessProps = {}) {
  const [query, setQuery] = useState(over.query ?? '')
  const [sel, setSel] = useState<Map<string, number>>(() => new Map(over.sel ?? []))
  const [split, setSplit] = useState<Map<string, Partial<CondSplit>>>(
    () => new Map(over.split ?? []),
  )
  const [note, setNote] = useState(over.note ?? '')
  return (
    <BulkPickDialog
      {...props}
      {...over}
      rows={over.rows ?? [row()]}
      query={query}
      sel={sel}
      split={split}
      note={note}
      onQueryChange={setQuery}
      onSelChange={(nextSel, nextSplit) => { setSel(nextSel); setSplit(nextSplit) }}
      onNoteChange={setNote}
    />
  )
}

describe('BulkPickDialog — selection (M7-60)', () => {
  /* Selecting takes the WHOLE available quantity by default. */
  it('takes the full available quantity on selection', async () => {
    const user = userEvent.setup()
    render(<Harness rows={[row()]} onApply={vi.fn()} />)
    await user.click(screen.getByLabelText('Seç 0000001'))
    expect((screen.getByLabelText('Miqdar 0000001') as HTMLInputElement).value).toBe('8')
  })

  it('deselecting clears the row', async () => {
    const user = userEvent.setup()
    render(<Harness rows={[row()]} onApply={vi.fn()} />)
    const box = screen.getByLabelText('Seç 0000001')
    await user.click(box)
    await user.click(box)
    expect(screen.getByTestId('bulk-counters').textContent).toContain('0 seçilib')
  })

  /* M7-61 — a typed quantity clamps to what is available. */
  it('clamps a typed quantity to the availability', async () => {
    const user = userEvent.setup()
    render(<Harness rows={[row()]} onApply={vi.fn()} />)
    await user.click(screen.getByLabelText('Seç 0000001'))
    const input = screen.getByLabelText('Miqdar 0000001')
    await user.clear(input)
    await user.type(input, '99')
    expect((input as HTMLInputElement).value).toBe('8')
  })
})

/* M7-65 — checked only when EVERY filtered row is selected. */
describe('BulkPickDialog — select all (M7-65)', () => {
  const rows = [row(), row({ c: '0000002', name: 'Boya', avail: 4 })]

  it('selects every filtered row', async () => {
    const user = userEvent.setup()
    render(<Harness rows={rows} onApply={vi.fn()} />)
    await user.click(screen.getByLabelText('Hamısını seç'))
    expect(screen.getByTestId('bulk-counters').textContent).toContain('2 seçilib')
  })

  it('is UNCHECKED while only some rows are selected', async () => {
    const user = userEvent.setup()
    render(<Harness rows={rows} onApply={vi.fn()} />)
    await user.click(screen.getByLabelText('Seç 0000001'))
    expect((screen.getByLabelText('Hamısını seç') as HTMLInputElement).checked).toBe(false)
  })

  it('is checked once every row is selected', async () => {
    const user = userEvent.setup()
    render(<Harness rows={rows} onApply={vi.fn()} />)
    await user.click(screen.getByLabelText('Seç 0000001'))
    await user.click(screen.getByLabelText('Seç 0000002'))
    expect((screen.getByLabelText('Hamısını seç') as HTMLInputElement).checked).toBe(true)
  })
})

/* M7-59 — search by code or name; the code is compared as TEXT so leading
   zeroes survive. */
describe('BulkPickDialog — search (M7-59)', () => {
  const rows = [row(), row({ c: '0000002', name: 'Boya' })]

  it('finds a zero-padded code', async () => {
    const user = userEvent.setup()
    render(<Harness rows={rows} onApply={vi.fn()} />)
    await user.type(screen.getByLabelText('Mal axtarışı'), '0000001')
    expect(screen.getByTestId('bulk-counters').textContent).toContain('1 mövqe')
  })

  it('finds by name, case-insensitively', async () => {
    const user = userEvent.setup()
    render(<Harness rows={rows} onApply={vi.fn()} />)
    await user.type(screen.getByLabelText('Mal axtarışı'), 'boya')
    expect(screen.getByTestId('bulk-counters').textContent).toContain('1 mövqe')
  })
})

/* M7-63 / M7-64 — the counters and the readiness gate. */
describe('BulkPickDialog — readiness and counters', () => {
  it('disables «Əlavə et» while nothing is selected', () => {
    render(<Harness rows={[row()]} onApply={vi.fn()} />)
    expect(applyBtn().disabled).toBe(true)
    expect(screen.getByTestId('bulk-footer').textContent).toContain('Silinəcək mal seçin')
  })

  it('reports rows, units and money once a row is selected', async () => {
    const user = userEvent.setup()
    render(<Harness rows={[row()]} onApply={vi.fn()} />)
    await user.click(screen.getByLabelText('Seç 0000001'))
    const footer = screen.getByTestId('bulk-footer').textContent ?? ''
    expect(footer).toContain('1 sətir')
    expect(footer).toContain('8,00 vahid')
    expect(applyBtn().disabled).toBe(false)
  })

  /* A bad row blocks the apply and names its reason — each `why` is a real
     gate, not advisory text. */
  it('blocks and explains when a layered row has no lot selected', async () => {
    const user = userEvent.setup()
    render(<Harness rows={[row()]} layerActive onApply={vi.fn()} />)
    await user.click(screen.getByLabelText('Seç 0000001'))
    expect(applyBtn().disabled).toBe(true)
    expect(screen.getByTestId('bulk-bad').textContent).toContain('mənbə partiyası seçilməyib')
  })
})

/* M7-70 — «Ümumi qeyd» reaches every produced line. */
describe('BulkPickDialog — apply (M7-68, M7-70)', () => {
  it('hands the selection and the shared note to the caller', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<Harness rows={[row()]} onApply={onApply} />)
    await user.click(screen.getByLabelText('Seç 0000001'))
    await user.type(screen.getByLabelText('Ümumi qeyd'), 'inventar')
    await user.click(applyBtn())
    const arg = onApply.mock.calls[0][0]
    expect(arg.note).toBe('inventar')
    expect(arg.sel.get('0000001')).toBe(8)
  })

  it('applies nothing when cancelled', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<Harness rows={[row()]} onApply={onApply} />)
    await user.click(screen.getByLabelText('Seç 0000001'))
    await user.click(screen.getByRole('button', { name: 'İmtina' }))
    expect(onApply).not.toHaveBeenCalled()
  })
})

/* M7-60 / M7-62 — a marked item is filled bucket by bucket, and its total is
   the SUM of the buckets, never typed directly. */
describe('BulkPickDialog — marked items (M7-60, M7-62)', () => {
  const marked: CondRecord = { unfit: 0, repair: 0, onsite: 0, icare: 3 } as CondRecord

  it('fills each bucket to its own max on selection', async () => {
    const user = userEvent.setup()
    render(
      <Harness rows={[row()]} condOf={() => marked} onApply={vi.fn()} />,
    )
    await user.click(screen.getByLabelText('Seç 0000001'))
    const split = screen.getByTestId('bulk-split-0000001')
    expect((within(split).getByLabelText('İcarədə 0000001') as HTMLInputElement).value).toBe('3')
    /* normal = avail − markers = 8 − 3 = 5, so the total is still 8. */
    expect((screen.getByLabelText('Miqdar 0000001') as HTMLInputElement).value).toBe('8')
  })

  it('makes the row total read-only for a marked item', async () => {
    const user = userEvent.setup()
    render(<Harness rows={[row()]} condOf={() => marked} onApply={vi.fn()} />)
    await user.click(screen.getByLabelText('Seç 0000001'))
    expect((screen.getByLabelText('Miqdar 0000001') as HTMLInputElement).readOnly).toBe(true)
  })

  it('clamps a bucket to its own maximum', async () => {
    const user = userEvent.setup()
    render(<Harness rows={[row()]} condOf={() => marked} onApply={vi.fn()} />)
    await user.click(screen.getByLabelText('Seç 0000001'))
    const bucket = within(screen.getByTestId('bulk-split-0000001')).getByLabelText('İcarədə 0000001')
    await user.clear(bucket)
    await user.type(bucket, '99')
    expect((bucket as HTMLInputElement).value).toBe('3')
  })
})

/* H-3 — a stored lot describes a specific quantity. Changing that quantity,
   directly or through a condition bucket, makes the allocation mismatched, so
   the dialog must tell the parent to drop it: the parent owns bulkLots and
   bulkValues and is the only one who can. Silently keeping the lot posts
   allocations that do not sum to the line quantity. */
describe('BulkPickDialog — a changed quantity invalidates the stored lot (H-3)', () => {
  const marked: CondRecord = { unfit: 0, repair: 0, onsite: 0, icare: 3 } as CondRecord

  it('reports the row when the typed quantity changes', async () => {
    const user = userEvent.setup()
    const onInvalidateLot = vi.fn()
    render(
      <Harness
        rows={[row()]}
        onApply={vi.fn()}
        onInvalidateLot={onInvalidateLot}
      />,
    )
    await user.click(screen.getByLabelText('Seç 0000001'))
    onInvalidateLot.mockClear()
    const input = screen.getByLabelText('Miqdar 0000001')
    await user.clear(input)
    await user.type(input, '3')
    expect(onInvalidateLot).toHaveBeenCalledWith('0000001')
  })

  it('reports the row when a condition bucket changes', async () => {
    const user = userEvent.setup()
    const onInvalidateLot = vi.fn()
    render(
      <Harness
        rows={[row()]}
        condOf={() => marked}
        onApply={vi.fn()}
        onInvalidateLot={onInvalidateLot}
      />,
    )
    await user.click(screen.getByLabelText('Seç 0000001'))
    onInvalidateLot.mockClear()
    const bucket = within(screen.getByTestId('bulk-split-0000001')).getByLabelText('İcarədə 0000001')
    await user.clear(bucket)
    await user.type(bucket, '2')
    expect(onInvalidateLot).toHaveBeenCalledWith('0000001')
  })

  /* Selecting and deselecting are NOT quantity edits of a kept row; the
     existing selectRow/deselectRow paths already reset the row wholesale, so
     no invalidation is reported for them. */
  it('does not report the row merely for opening the dialog', () => {
    const onInvalidateLot = vi.fn()
    render(
      <Harness
        rows={[row()]}
        onApply={vi.fn()}
        onInvalidateLot={onInvalidateLot}
      />,
    )
    expect(onInvalidateLot).not.toHaveBeenCalled()
  })
})

describe('BulkPickDialog — empty state', () => {
  it('reports no positive balance rather than an empty table', () => {
    render(<Harness rows={[]} onApply={vi.fn()} />)
    expect(screen.getByText('Bu anbarda uyğun müsbət qalıq yoxdur.')).toBeTruthy()
  })
})
