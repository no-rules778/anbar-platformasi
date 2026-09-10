import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LayerPickDialog } from './LayerPickDialog'
import type { StockLayer } from '../../lib/layerAllocation'

const layer = (over: Partial<StockLayer> = {}): StockLayer => ({
  id: 'L1',
  source_type: 'purchase',
  received_date: '2026-01-02',
  source_doc_num: 'D-1',
  source_invoice_num: 'A-1',
  price_status: 'known',
  unit_price: 10,
  available_qty: 5,
  ...over,
})

const base = {
  code: '0000001',
  name: 'Sement',
  unit: 'kq',
  warehouse: 'Ələt',
  requiredQty: 5,
  showFinalAmount: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

async function take(user: ReturnType<typeof userEvent.setup>, id: string, qty: string) {
  const input = screen.getByLabelText(`Götürülür ${id}`)
  await user.clear(input)
  await user.type(input, qty)
}

describe('LayerPickDialog — the quantity gate (M7-72)', () => {
  it('keeps confirm DISABLED until the selection matches the required quantity', async () => {
    const user = userEvent.setup()
    render(<LayerPickDialog {...base} layers={[layer()]} onConfirm={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Təsdiq et' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    await take(user, 'L1', '5')
    expect(btn.disabled).toBe(false)
  })

  it('refuses a short selection', async () => {
    const user = userEvent.setup()
    render(<LayerPickDialog {...base} layers={[layer()]} onConfirm={vi.fn()} />)
    await take(user, 'L1', '3')
    expect((screen.getByRole('button', { name: 'Təsdiq et' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('clamps a typed quantity to the layer availability', async () => {
    const user = userEvent.setup()
    render(<LayerPickDialog {...base} layers={[layer()]} onConfirm={vi.fn()} />)
    await take(user, 'L1', '99')
    expect(screen.getByTestId('layer-totals').textContent).toContain('5,00')
  })

  it('passes the allocations on confirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<LayerPickDialog {...base} layers={[layer()]} onConfirm={onConfirm} />)
    await take(user, 'L1', '5')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))
    expect(onConfirm).toHaveBeenCalled()
    expect(onConfirm.mock.calls[0][0].allocations).toEqual([{ layer_id: 'L1', qty: 5 }])
  })
})

describe('LayerPickDialog — prices (M7-74, M7-76, M7-77)', () => {
  it('renders two distinct source prices as «a / b», never an average', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <LayerPickDialog
        {...base} requiredQty={4} onConfirm={onConfirm}
        layers={[layer({ id: 'L1', unit_price: 10, available_qty: 2 }), layer({ id: 'L2', unit_price: 20, available_qty: 2 })]}
      />,
    )
    await take(user, 'L1', '2')
    await take(user, 'L2', '2')
    const totals = screen.getByTestId('layer-totals').textContent ?? ''
    expect(totals).toContain('10,00 / 20,00')
    expect(totals).not.toContain('15,00')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))
    expect(onConfirm.mock.calls[0][0].priceVariants).toEqual([10, 20])
  })

  /* M7-77 — an unknown price contributes quantity but no amount, and makes
     the total unknowable: it must render «—», never 0. */
  it('shows an em-dash total when a selected layer has no price', async () => {
    const user = userEvent.setup()
    render(
      <LayerPickDialog
        {...base} requiredQty={5} onConfirm={vi.fn()}
        layers={[layer({ price_status: 'unknown', unit_price: null })]}
      />,
    )
    await take(user, 'L1', '5')
    const totals = screen.getByTestId('layer-totals').textContent ?? ''
    expect(totals).toContain('Məbləğ: —')
  })

  it('labels each layer by its source type', () => {
    render(<LayerPickDialog {...base} layers={[layer({ source_type: 'transfer' })]} onConfirm={vi.fn()} />)
    expect(screen.getByText(/Yerdəyişmə partiyası/)).toBeTruthy()
  })
})

/* M7-73 — the admin final amount is optional, but a reason is MANDATORY the
   moment it is set. */
describe('LayerPickDialog — admin final amount (M7-73)', () => {
  it('is absent unless the caller enables it', () => {
    render(<LayerPickDialog {...base} layers={[layer()]} onConfirm={vi.fn()} />)
    expect(screen.queryByLabelText('Yekun məbləğ')).toBeNull()
  })

  it('refuses an amount without a reason', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<LayerPickDialog {...base} showFinalAmount layers={[layer()]} onConfirm={onConfirm} />)
    await take(user, 'L1', '5')
    await user.type(screen.getByLabelText('Yekun məbləğ'), '100')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('səbəb')
  })

  it('accepts an amount with a reason', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<LayerPickDialog {...base} showFinalAmount layers={[layer()]} onConfirm={onConfirm} />)
    await take(user, 'L1', '5')
    await user.type(screen.getByLabelText('Yekun məbləğ'), '100')
    await user.type(screen.getByLabelText('Məbləğ dəyişikliyinin səbəbi'), 'razılaşma')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))
    expect(onConfirm.mock.calls[0][0].finalAmount).toBe('100')
    expect(onConfirm.mock.calls[0][0].overrideReason).toBe('razılaşma')
  })

  it('rejects a malformed amount', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<LayerPickDialog {...base} showFinalAmount layers={[layer()]} onConfirm={onConfirm} />)
    await take(user, 'L1', '5')
    await user.type(screen.getByLabelText('Yekun məbləğ'), '12.345')
    await user.type(screen.getByLabelText('Məbləğ dəyişikliyinin səbəbi'), 'səbəb')
    await user.click(screen.getByRole('button', { name: 'Təsdiq et' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

/* M7-75 — the bulk entry point returns to its list rather than discarding
   the whole selection. */
describe('LayerPickDialog — «Geri» (M7-75)', () => {
  it('is absent for the single-line entry point', () => {
    render(<LayerPickDialog {...base} layers={[layer()]} onConfirm={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Geri' })).toBeNull()
  })

  it('is offered when the caller supplies onBack', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    render(<LayerPickDialog {...base} layers={[layer()]} onConfirm={vi.fn()} onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: 'Geri' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
