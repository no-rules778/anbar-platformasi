import { describe, it, expect, vi } from 'vitest'
import { useEffect, useState } from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OperationForm } from './OperationForm'
import type { OperationState, DraftOpLineState } from '../../store/operation.store'
import type { Me } from '../../lib/roles'
import type { ItemRow } from '../../api/items.api'
import { today } from '../../lib/format'

const ADMIN: Me = { id: 'u1', sbId: 'u1', email: 'a@a.com', name: 'A', role: 'admin', wh: '' }
const ANBARDAR: Me = { id: 'u2', sbId: 'u2', email: 'b@a.com', name: 'B', role: 'anbardar', wh: 'Ələt' }

const items: ItemRow[] = [
  { code: '0000001', name: 'Sement M400', unit: 'kq', price: 12, category: null },
  { code: '0000002', name: 'Mismar', unit: 'ədəd', price: 1, category: null },
]

function baseState(over: Partial<OperationState> = {}): OperationState {
  return {
    core: {
      items,
      itemBy: new Map(items.map((i) => [i.code, i])),
      indexes: { byItem: new Map(), bal: [{ w: 'Ələt', c: '0000001', in: 10, out: 0, n: 1, q: 10, last: '', first: '9999', price: 0, val: 0, name: '', unit: '' }], priceObs: new Map(), operational: [] },
      warehouseRows: [{ name: 'Ələt', type: 'anbar', active: true }, { name: 'Astara', type: 'anbar', active: true }],
      warehouses: ['Ələt', 'Astara'],
      locations: [],
      partners: [{ name: 'Partner A', active: true }],
      condByKey: new Map(),
    },
    readiness: { loaded: true, coreError: null, failedCore: null, splitReady: true, layerActive: false, refsReady: true, transferDestsReady: true },
    loading: false,
    refsReady: true,
    channels: [{ name: 'Nağd alış', active: true }],
    observedChannels: [],
    layerActive: false,
    layerVersion: 0,
    transferDests: ['Ələt', 'Astara'],
    transferDestsReady: true,
    kind: 'in',
    header: { d: '2026-01-01', t: 'Satınalma', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' },
    headerByKind: {},
    lines: [],
    pick: null,
    pendingPrefill: null,
    requestKey: '',
    editDoc: null,
    restoredAt: null,
    inFlight: false,
    bulkOpen: false,
    bulkMode: 'wo',
    bulkQuery: '',
    bulkSel: new Map(),
    bulkSplit: new Map(),
    bulkLots: new Map(),
    bulkValues: new Map(),
    bulkNote: '',
    bulkIcareOk: false,
    editLineIndex: null,
    editLineDraft: null,
    layerPickerOpen: false,
    layerPickerCode: null,
    layerPickerWarehouse: null,
    setKind: vi.fn(), setHeaderField: vi.fn(), setPick: vi.fn(), prefill: vi.fn(),
    invalidateRequestKey: vi.fn(), ensureRequestKey: vi.fn(() => 'k'),
    addLineRaw: vi.fn(), removeLine: vi.fn(), clearLines: vi.fn(), setInFlight: vi.fn(),
    openEditLine: vi.fn(), closeEditLine: vi.fn(), saveEditLine: vi.fn(),
    enterEditMode: vi.fn(), exitEditMode: vi.fn(), setBulkOpen: vi.fn(),
    openBulk: vi.fn(), setBulkDraft: vi.fn(), invalidateBulkLot: vi.fn(),
    consumePrefill: vi.fn(), postDocument: vi.fn(), load: vi.fn(), refresh: vi.fn(), saveDraftNow: vi.fn(), restoreDraftOnBoot: vi.fn(), reset: vi.fn(),
    ...over,
  }
}

function renderForm(state: OperationState, me: Me = ADMIN) {
  const onSetKind = vi.fn()
  const onSetHeaderField = vi.fn()
  const onSetPick = vi.fn()
  const onCommitLine = vi.fn()
  const onNeedsLayerPick = vi.fn()
  const onCreateItem = vi.fn()
  const onOpenBulk = vi.fn()
  const view = render(
    <OperationForm
      me={me}
      state={state}
      onSetKind={onSetKind}
      onSetHeaderField={onSetHeaderField}
      onSetPick={onSetPick}
      onConsumePrefill={vi.fn()}
      onCommitLine={onCommitLine}
      commitSignal={0}
      onNeedsLayerPick={onNeedsLayerPick}
      onCreateItem={onCreateItem}
      onOpenBulk={onOpenBulk}
    />,
  )
  return { ...view, onSetKind, onSetHeaderField, onSetPick, onCommitLine, onNeedsLayerPick, onCreateItem, onOpenBulk }
}

/* ------------------------------------------------------------------------- *
 * M18-57 — the quantity / unit / price row exists BEFORE an item is picked.
 *
 * Legacy emits that row unconditionally inside the `isWoOut ? '' : …` branch
 * (index.html:3278-3282): the only state without it is out + «Silinmə», where
 * «Malları seç» replaces the entire single-item route. React had gated it on
 * `pickedItem`, so a freshly opened «Mədaxil» form showed neither quantity nor
 * unit nor unit price — three fields short of production.
 *
 * These read the rendered DOM of an EMPTY form (no `pick`), which is exactly
 * the state the gating hid, so they fail against the pre-fix component for the
 * intended reason: the elements are absent.
 * ------------------------------------------------------------------------- */

/** The visible caption of every field, in DOM order — `label.f > span` is the
    legacy caption element (index.html:3263). */
function captionOrder(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('label.f'))
    .map((l) => l.querySelector('span')?.textContent?.trim() ?? '')
    .filter(Boolean)
}

describe('OperationForm — unpicked field sequence (M18-57)', () => {
  it('renders the COMPLETE legacy inbound sequence before any item is selected', () => {
    const { container } = renderForm(baseState({ kind: 'in', pick: null }))
    expect(captionOrder(container)).toEqual([
      'Tarix',
      'Əməliyyatın növü',
      'Anbar',
      'Kontragent',
      'Mal (ad və ya kod yazın)',
      'Miqdar',
      'Ölçü vahidi',
      'Vahidin qiyməti (₼)',
      'Alınma kanalı',
      'Müqavilə №',
      'Qaimə №',
      'Qeyd',
    ])
  })

  it('renders «Sətri əlavə et» last, after every unpicked field', () => {
    const { container } = renderForm(baseState({ kind: 'in', pick: null }))
    const add = screen.getByRole('button', { name: 'Sətri əlavə et' })
    const note = Array.from(container.querySelectorAll('label.f'))
      .find((l) => l.querySelector('span')?.textContent?.trim() === 'Qeyd')
    expect(note!.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows quantity, unit and price as present and empty, with the add button disabled', () => {
    renderForm(baseState({ kind: 'in', pick: null }))
    const qty = screen.getByLabelText(/Miqdar/) as HTMLInputElement
    const unit = screen.getByLabelText('Ölçü vahidi') as HTMLInputElement
    const price = screen.getByLabelText('Vahidin qiyməti (₼)') as HTMLInputElement

    expect(qty.value).toBe('')
    expect(unit.value).toBe('')
    /* The legacy empty state for the unit is its `—` PLACEHOLDER, not a
       value (index.html:3280). */
    expect(unit.getAttribute('placeholder')).toBe('—')
    expect(unit.readOnly).toBe(true)
    /* The price is bound to the header field, which is empty here. */
    expect(price.value).toBe('')

    expect((screen.getByRole('button', { name: 'Sətri əlavə et' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders quantity and unit — and no price — on an unpicked outbound form', () => {
    renderForm(baseState({
      kind: 'out', pick: null,
      header: { d: '2026-01-01', t: 'Sahəyə', w: 'Ələt', w2: '', p: 'Partner A', ch: '', ct: '', iv: '', note: '', pr: '' },
    }))
    expect(screen.getByLabelText(/Miqdar/)).toBeTruthy()
    expect(screen.getByLabelText('Ölçü vahidi')).toBeTruthy()
    /* index.html:3281 — the unit price is inbound-only. */
    expect(screen.queryByLabelText('Vahidin qiyməti (₼)')).toBeNull()
  })

  it('renders quantity and unit — and no price — on an unpicked transfer form', () => {
    renderForm(baseState({
      kind: 'mv', pick: null,
      header: { d: '2026-01-01', t: 'Yerdəyişmə', w: 'Ələt', w2: 'Astara', p: '', ch: '', ct: '', iv: '', note: '', pr: '' },
    }))
    expect(screen.getByLabelText(/Miqdar/)).toBeTruthy()
    expect(screen.getByLabelText('Ölçü vahidi')).toBeTruthy()
    expect(screen.queryByLabelText('Vahidin qiyməti (₼)')).toBeNull()
  })

  /* The ONE exception (index.html:3274/3283, isWoOut): the bulk route replaces
     the whole single-item block, so the row must NOT reappear there. This is
     the negative that keeps the fix from becoming "always render". */
  it('does NOT render the single-item row on out + Silinmə, keeping the bulk flow', () => {
    renderForm(baseState({
      kind: 'out', pick: null,
      header: { d: '2026-01-01', t: 'Silinmə', w: 'Ələt', w2: '', p: 'Sahə üzrə məsul şəxs', ch: '', ct: '', iv: '', note: '', pr: '' },
    }))
    expect(screen.queryByLabelText(/Miqdar/)).toBeNull()
    expect(screen.queryByLabelText('Ölçü vahidi')).toBeNull()
    expect(screen.queryByLabelText('Mal axtarışı')).toBeNull()
    expect(screen.getByTestId('bulk-pick-affordance')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Malları seç' })).toBeTruthy()
    /* «Sətri əlavə et» is absent on this route (index.html:3293-3295). */
    expect(screen.queryByRole('button', { name: 'Sətri əlavə et' })).toBeNull()
  })
})

/* M18-57 — legacy numeric attributes, index.html:3279/3281. `min="0"` was
   dropped in the React port, so the browser's own constraint validation no
   longer refused a negative quantity or price. */
describe('OperationForm — legacy numeric attributes (M18-57)', () => {
  it('quantity carries min="0", step="0.01" and placeholder "0"', () => {
    renderForm(baseState({ kind: 'in', pick: null }))
    const qty = screen.getByLabelText(/Miqdar/)
    expect(qty.getAttribute('min')).toBe('0')
    expect(qty.getAttribute('step')).toBe('0.01')
    expect(qty.getAttribute('placeholder')).toBe('0')
    expect(qty.getAttribute('type')).toBe('number')
  })

  it('price carries min="0", step="0.01" and placeholder "0.00"', () => {
    renderForm(baseState({ kind: 'in', pick: null }))
    const price = screen.getByLabelText('Vahidin qiyməti (₼)')
    expect(price.getAttribute('min')).toBe('0')
    expect(price.getAttribute('step')).toBe('0.01')
    expect(price.getAttribute('placeholder')).toBe('0.00')
    expect(price.getAttribute('type')).toBe('number')
  })
})

/* M18-57 — index.html:3275 renders the search as
   `<input type="text" id="o-item" autocomplete="off" …>`. Without the explicit
   type the stylesheet's `input[type=text]` rule does not match and the field
   renders unstyled; without `autocomplete="off"` the browser overlays its own
   history dropdown on top of the combobox results. */
describe('OperationForm — item search input attributes (M18-57)', () => {
  it('carries type="text" and autocomplete="off"', () => {
    renderForm(baseState({ kind: 'in' }))
    const search = screen.getByLabelText('Mal axtarışı')
    expect(search.getAttribute('type')).toBe('text')
    expect(search.getAttribute('autocomplete')).toBe('off')
  })

  it('text fields carry an explicit type="text" so the platform rule matches', () => {
    renderForm(baseState({ kind: 'in' }))
    for (const label of ['Müqavilə №', 'Qaimə №', 'Qeyd']) {
      expect(screen.getByLabelText(label).getAttribute('type')).toBe('text')
    }
  })
})

/* M18-57 — legacy's ONLY selection readout is `#o-itemsel`
   (index.html:3277/3282): «Seçilməyib», replaced by the chosen item. React
   additionally printed a bold `<b>name</b> (code)` line inside the picked
   block, a row production never shows. */
describe('OperationForm — single selection readout (M18-57)', () => {
  it('shows «Seçilməyib» and no item line before a pick', () => {
    const { container } = renderForm(baseState({ kind: 'in', pick: null }))
    expect(screen.getByText('Seçilməyib')).toBeTruthy()
    expect(container.querySelectorAll('[data-testid="picked-item"] b')).toHaveLength(0)
  })

  it('replaces it with «name (code)» exactly ONCE after a pick, with no bold duplicate', () => {
    const { container } = renderForm(baseState({ kind: 'in', pick: '0000001' }))
    expect(screen.queryByText('Seçilməyib')).toBeNull()
    /* The hint readout is the single source of the selection text. */
    expect(screen.getAllByText('Sement M400 (0000001)')).toHaveLength(1)
    /* The removed defect: a bold repeat inside the quantity block. */
    expect(container.querySelectorAll('[data-testid="picked-item"] b')).toHaveLength(0)
  })
})

describe('OperationForm — tabs (M7-03)', () => {
  it('renders three tabs and marks the active one', () => {
    renderForm(baseState({ kind: 'out' }))
    const tab = screen.getByRole('tab', { name: 'Məxaric' })
    expect(tab.getAttribute('aria-selected')).toBe('true')
  })

  it('clicking a tab calls onSetKind', async () => {
    const { onSetKind } = renderForm(baseState())
    await userEvent.click(screen.getByRole('tab', { name: 'Yerdəyişmə' }))
    expect(onSetKind).toHaveBeenCalledWith('mv')
  })
})

describe('OperationForm — type list per tab (M7-04)', () => {
  it('offers only the in-tab types', () => {
    renderForm(baseState({ kind: 'in' }))
    const select = screen.getAllByRole('combobox')[0] as HTMLSelectElement
    const opts = Array.from(select.options).map((o) => o.value).filter(Boolean)
    expect(opts).toEqual(['Satınalma', 'Qaytarma', 'İcarə', 'Əvvələ qalıq'])
  })
})

describe('OperationForm — mv route pickers (D-H1)', () => {
  it('an anbardar sees only their own warehouse as transfer source', () => {
    renderForm(baseState({
      kind: 'mv',
      header: { d: '2026-01-01', t: 'Yerdəyişmə', w: '', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' },
      core: {
        ...baseState().core,
        warehouseRows: [
          { name: 'Astara', type: 'anbar', active: true },
          { name: 'Harmony', type: 'anbar', active: true },
          { name: 'Ofis', type: 'anbar', active: true },
        ],
        warehouses: ['Astara', 'Harmony', 'Ofis'],
      },
      transferDests: ['Astara', 'Harmony', 'Ofis'],
    }), { ...ANBARDAR, wh: 'Astara' })
    /* M18-56 — the caption is now the legacy «Haradan (anbar)»
       (index.html:3268); «Mənbə anbar» was a React paraphrase. */
    const sourceSelect = screen.getByText('Haradan (anbar)').parentElement!.querySelector('select') as HTMLSelectElement
    const opts = Array.from(sourceSelect.options).map((o) => o.value).filter(Boolean)
    expect(opts).toEqual(['Astara'])
  })

  it('admin sees every warehouse as source and destination, «Ofis» included', () => {
    renderForm(baseState({
      kind: 'mv',
      header: { d: '2026-01-01', t: 'Yerdəyişmə', w: '', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' },
      core: {
        ...baseState().core,
        warehouseRows: [
          { name: 'Astara', type: 'anbar', active: true },
          { name: 'Harmony', type: 'anbar', active: true },
          { name: 'Ofis', type: 'anbar', active: true },
        ],
        warehouses: ['Astara', 'Harmony', 'Ofis'],
      },
      transferDests: ['Astara', 'Harmony', 'Ofis'],
    }), ADMIN)
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
    const destSelect = selects.find((s) => Array.from(s.options).some((o) => o.value === 'Ofis'))
    expect(destSelect).toBeTruthy()
  })
})

describe('OperationForm — item combobox (M7-19/M7-20)', () => {
  it('shows nothing for a 1-char query', async () => {
    renderForm(baseState())
    const input = screen.getByLabelText('Mal axtarışı')
    await userEvent.type(input, 'S')
    await new Promise((r) => setTimeout(r, 170))
    expect(screen.queryByText(/Sement/)).toBeNull()
  })

  it('finds an item by name on the in tab with no stock filter', async () => {
    renderForm(baseState({ kind: 'in' }))
    const input = screen.getByLabelText('Mal axtarışı')
    await userEvent.type(input, 'Mismar')
    await waitFor(() => expect(screen.getByText(/Mismar/)).toBeTruthy())
  })

  it('an item absent from the warehouse balance is NOT offered on out', async () => {
    renderForm(baseState({ kind: 'out', header: { d: '2026-01-01', t: 'Sahəyə', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' } }))
    const input = screen.getByLabelText('Mal axtarışı')
    await userEvent.type(input, 'Mismar')
    await waitFor(() => expect(screen.getByText(/anbarında bu axtarışa uyğun qalıq yoxdur/)).toBeTruthy())
  })

  it('an item WITH stock in the warehouse IS offered on out', async () => {
    renderForm(baseState({ kind: 'out', header: { d: '2026-01-01', t: 'Sahəyə', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' } }))
    const input = screen.getByLabelText('Mal axtarışı')
    await userEvent.type(input, 'Sement')
    await waitFor(() => expect(screen.getByText(/Sement/)).toBeTruthy())
  })

  it('shows the «Yeni mal yarat» link with item.add and no stock filter applies', async () => {
    renderForm(baseState({ kind: 'in' }))
    const input = screen.getByLabelText('Mal axtarışı')
    await userEvent.type(input, 'zzz')
    await waitFor(() => expect(screen.getByText('Yeni mal yarat →')).toBeTruthy())
  })

  it('hides the «Yeni mal yarat» link without item.add', async () => {
    const rehber: Me = { ...ADMIN, role: 'rehber' }
    renderForm(baseState({ kind: 'in' }), rehber)
    const input = screen.getByLabelText('Mal axtarışı')
    await userEvent.type(input, 'zzz')
    await new Promise((r) => setTimeout(r, 170))
    expect(screen.queryByText('Yeni mal yarat →')).toBeNull()
  })

  it('clicking a result calls onSetPick with the code', async () => {
    const { onSetPick } = renderForm(baseState({ kind: 'in' }))
    const input = screen.getByLabelText('Mal axtarışı')
    await userEvent.type(input, 'Mismar')
    await waitFor(() => expect(screen.getByText(/Mismar/)).toBeTruthy())
    await userEvent.click(screen.getByText(/Mismar/))
    expect(onSetPick).toHaveBeenCalledWith('0000002')
  })
})

describe('OperationForm — condition split (M7-27/M7-28)', () => {
  it('renders no split block for an unmarked item', async () => {
    renderForm(baseState({ kind: 'out', pick: '0000001', header: { d: '2026-01-01', t: 'Sahəyə', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' } }))
    expect(screen.queryByTestId('cond-split')).toBeNull()
  })

  it('renders the split block for a marked item on out, quantity becomes read-only', () => {
    renderForm(baseState({
      kind: 'out',
      pick: '0000001',
      header: { d: '2026-01-01', t: 'Sahəyə', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' },
      core: {
        ...baseState().core,
        condByKey: new Map([['Ələt|0000001', { unfit: 4, repair: 0, onsite: 0, icare: 0 }]]),
      },
    }))
    expect(screen.getByTestId('cond-split')).toBeTruthy()
    const qtyInput = screen.getByLabelText(/Miqdar/) as HTMLInputElement
    expect(qtyInput.readOnly).toBe(true)
  })

  it('does not render the split block on the in tab even for a marked item', () => {
    renderForm(baseState({
      kind: 'in',
      pick: '0000001',
      core: {
        ...baseState().core,
        condByKey: new Map([['Ələt|0000001', { unfit: 4, repair: 0, onsite: 0, icare: 0 }]]),
      },
    }))
    expect(screen.queryByTestId('cond-split')).toBeNull()
  })
})

describe('OperationForm — bulk pick affordance (M7-56)', () => {
  it('shows the bulk-pick note for out + Silinmə, not in edit mode', () => {
    renderForm(baseState({ kind: 'out', header: { d: '2026-01-01', t: 'Silinmə', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' } }))
    expect(screen.getByTestId('bulk-pick-affordance')).toBeTruthy()
  })

  it('does not show the note in edit mode', () => {
    renderForm(baseState({
      kind: 'out',
      header: { d: '2026-01-01', t: 'Silinmə', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' },
      editDoc: { docNum: 'D1', restore: new Map(), type: 'Silinmə', direction: 'out' },
    }))
    expect(screen.queryByTestId('bulk-pick-affordance')).toBeNull()
  })

  it('shows the note on mv even when NOT the Silinmə type (isMvPick)', () => {
    renderForm(baseState({ kind: 'mv', header: { d: '2026-01-01', t: 'Yerdəyişmə', w: 'Ələt', w2: 'Astara', p: '', ch: '', ct: '', iv: '', note: '', pr: '' } }))
    expect(screen.getByTestId('bulk-pick-affordance')).toBeTruthy()
  })

  /* H-3 — the affordance is now a real «Malları seç» button that reports its
     mode, not the H-2 placeholder notice. */
  it('opens the bulk dialog in wo mode from out + Silinmə', async () => {
    const user = userEvent.setup()
    const { onOpenBulk } = renderForm(baseState({ kind: 'out', header: { d: '2026-01-01', t: 'Silinmə', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' } }))
    await user.click(screen.getByRole('button', { name: 'Malları seç' }))
    expect(onOpenBulk).toHaveBeenCalledWith('wo')
  })

  it('opens the bulk dialog in mv mode from a transfer', async () => {
    const user = userEvent.setup()
    const { onOpenBulk } = renderForm(baseState({ kind: 'mv', header: { d: '2026-01-01', t: 'Yerdəyişmə', w: 'Ələt', w2: 'Astara', p: '', ch: '', ct: '', iv: '', note: '', pr: '' } }))
    await user.click(screen.getByRole('button', { name: 'Malları seç' }))
    expect(onOpenBulk).toHaveBeenCalledWith('mv')
  })
})

describe('OperationForm — «Silinmə» pins the counterparty (M7-11)', () => {
  it('the counterparty field is disabled and forced to Sahə üzrə məsul şəxs', () => {
    renderForm(baseState({ kind: 'out', header: { d: '2026-01-01', t: 'Silinmə', w: 'Ələt', w2: '', p: 'Sahə üzrə məsul şəxs', ch: '', ct: '', iv: '', note: '', pr: '' } }))
    const select = screen.getByText('Təhvil alan / layihə').parentElement!.querySelector('select') as HTMLSelectElement
    expect(select.disabled).toBe(true)
  })
})

/* Regression for audit A02 — changing the source warehouse on out/mv must
   clear the armed quantity along with the picked item (legacy
   `clearPickedItem()`, index.html:3379-3389), not just the pick/query/split. */
describe('OperationForm — warehouse change clears quantity (audit A02)', () => {
  it('clears qty when the out warehouse changes', async () => {
    renderForm(baseState({
      kind: 'out',
      pick: '0000001',
      header: { d: '2026-01-01', t: 'Sahəyə', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' },
    }))
    const qtyInput = screen.getByLabelText(/Miqdar/) as HTMLInputElement
    await userEvent.type(qtyInput, '5')
    expect(qtyInput.value).toBe('5')

    const whSelect = screen.getByText('Anbar').parentElement!.querySelector('select') as HTMLSelectElement
    await userEvent.selectOptions(whSelect, 'Astara')
    expect(qtyInput.value).toBe('')
  })

  it('keeps qty when the in warehouse changes', async () => {
    renderForm(baseState({
      kind: 'in',
      pick: '0000001',
      header: { d: '2026-01-01', t: 'Satınalma', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '12' },
    }))
    const qtyInput = screen.getByLabelText(/Miqdar/) as HTMLInputElement
    await userEvent.type(qtyInput, '5')
    const whSelect = screen.getByText('Anbar').parentElement!.querySelector('select') as HTMLSelectElement
    await userEvent.selectOptions(whSelect, 'Astara')
    expect(qtyInput.value).toBe('5')
  })
})

/* Regression for audit A03 — outbound «Qaytarma» returns goods to their
   OWNER, so the counterparty list must be partnerOptions('in') (contragents),
   not the outbound project/location list (index.html:3338-3351, M7-10). */
describe('OperationForm — outbound «Qaytarma» counterparty swap (audit A03 / M7-10)', () => {
  function retState(over: Partial<OperationState> = {}) {
    return baseState({
      kind: 'out',
      header: { d: '2026-01-01', t: 'Qaytarma', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' },
      core: {
        ...baseState().core,
        locations: [{ name: 'Layihə A', kind: 'project', active: true }],
        partners: [{ name: 'Contragent X', active: true }],
      },
      ...over,
    })
  }

  it('offers contragents (partnerOptions("in")), not the project list', () => {
    renderForm(retState())
    const select = screen.getByText('Təhvil alan / layihə').parentElement!.querySelector('select') as HTMLSelectElement
    const opts = Array.from(select.options).map((o) => o.value).filter(Boolean)
    expect(opts).toEqual(['Contragent X'])
    expect(opts).not.toContain('Layihə A')
  })

  it('switching back to a plain outbound type restores the project/location list', () => {
    const { rerender } = renderForm(retState())
    rerender(
      <OperationForm
        me={ADMIN}
        state={retState({ header: { d: '2026-01-01', t: 'Sahəyə', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' } })}
        onSetKind={vi.fn()} onSetHeaderField={vi.fn()} onSetPick={vi.fn()} onConsumePrefill={vi.fn()}
        onCommitLine={vi.fn()} commitSignal={0} onNeedsLayerPick={vi.fn()} onCreateItem={vi.fn()}
        onOpenBulk={vi.fn()}
      />,
    )
    const select = screen.getByText('Təhvil alan / layihə').parentElement!.querySelector('select') as HTMLSelectElement
    const opts = Array.from(select.options).map((o) => o.value).filter(Boolean)
    expect(opts).toContain('Layihə A')
  })

  it('keeps a still-valid current value instead of resetting it', () => {
    renderForm(retState({ header: { d: '2026-01-01', t: 'Qaytarma', w: 'Ələt', w2: '', p: 'Contragent X', ch: '', ct: '', iv: '', note: '', pr: '' } }))
    const select = screen.getByText('Təhvil alan / layihə').parentElement!.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('Contragent X')
  })

  it('selects the first valid partner when the current value is no longer in the list', async () => {
    const { onSetHeaderField } = renderForm(retState({
      header: { d: '2026-01-01', t: 'Qaytarma', w: 'Ələt', w2: '', p: 'Layihə A', ch: '', ct: '', iv: '', note: '', pr: '' },
    }))
    await waitFor(() => expect(onSetHeaderField).toHaveBeenCalledWith({ p: 'Contragent X' }))
  })
})

/* Regression for audit A05 — M7-19 requires a 160 ms debounce and an
   UNCONDITIONAL code substring match, regardless of the query's first
   character (index.html:3304-3327). */
describe('OperationForm — combobox debounce and code matching (audit A05 / M7-19)', () => {
  it('does not search until 160 ms after the last keystroke', async () => {
    vi.useFakeTimers()
    try {
      renderForm(baseState({ kind: 'in' }))
      const input = screen.getByLabelText('Mal axtarışı')
      fireEvent.change(input, { target: { value: 'Mismar' } })
      expect(screen.queryByText(/Mismar/)).toBeNull()
      await act(async () => { await vi.advanceTimersByTimeAsync(160) })
      expect(screen.getByText(/Mismar/)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('matches an item code substring even when the query does not start with a digit', async () => {
    vi.useFakeTimers()
    try {
      renderForm(baseState({
        kind: 'in',
        core: {
          ...baseState().core,
          items: [{ code: 'ax0000003', name: 'Boya', unit: 'litr', price: 5, category: null }],
        },
      }))
      const input = screen.getByLabelText('Mal axtarışı')
      fireEvent.change(input, { target: { value: '0000003' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(160) })
      expect(screen.getByText(/Boya/)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})

/* Regression for audit A09 — M7-20 / index.html:3311-3317. The legacy list is
   `DB.items.filter(stock && textMatch).slice(0, 12)`: the outbound stock
   predicate runs BEFORE the 12-row cut. Cutting first and filtering afterwards
   makes the form report «no result» whenever the first 12 text matches are all
   out of stock — which is exactly what this fixture builds. */
describe('OperationForm — outbound stock filter precedes the 12-row cut (audit A09 / M7-20)', () => {
  /* 13 matching items; ONLY the last one has stock in «Ələt». */
  const many: ItemRow[] = Array.from({ length: 13 }, (_, i) => ({
    code: `900000${String(i).padStart(2, '0')}`,
    name: `Kabel tip ${i}`,
    unit: 'metr',
    price: 1,
    category: null,
  }))
  const stocked = many[12]

  function manyState(kind: 'in' | 'out') {
    const base = baseState()
    return baseState({
      kind,
      header: { ...base.header, t: kind === 'out' ? 'Sahəyə' : 'Satınalma', w: 'Ələt', p: kind === 'out' ? 'Sahə üzrə məsul şəxs' : '' },
      core: {
        ...base.core,
        items: many,
        itemBy: new Map(many.map((i) => [i.code, i])),
        indexes: {
          byItem: new Map(),
          bal: [{ w: 'Ələt', c: stocked.code, in: 5, out: 0, n: 1, q: 5, last: '', first: '9999', price: 0, val: 0, name: '', unit: '' }],
          priceObs: new Map(),
          operational: [],
        },
      },
    })
  }

  it('finds the 13th matching item when it is the only one with stock', async () => {
    vi.useFakeTimers()
    try {
      /* «Sahəyə», not «Silinmə» — Silinmə routes to the bulk affordance and
         the combobox is not rendered at all (M7-56). */
      renderForm(manyState('out'))
      const input = screen.getByLabelText('Mal axtarışı')
      fireEvent.change(input, { target: { value: 'Kabel' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(160) })
      expect(screen.getByText(new RegExp(stocked.name))).toBeTruthy()
      expect(screen.queryByText(/anbarında bu axtarışa uyğun qalıq yoxdur/)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows only the stocked item outbound, not the 12 unstocked text matches', async () => {
    vi.useFakeTimers()
    try {
      renderForm(manyState('out'))
      const input = screen.getByLabelText('Mal axtarışı')
      fireEvent.change(input, { target: { value: 'Kabel' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(160) })
      expect(screen.queryByText(/Kabel tip 0\b/)).toBeNull()
      expect(screen.getByText(/Kabel tip 12/)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('inbound is unfiltered and still cut to 12 rows', async () => {
    vi.useFakeTimers()
    try {
      const { container } = renderForm(manyState('in'))
      const input = screen.getByLabelText('Mal axtarışı')
      fireEvent.change(input, { target: { value: 'Kabel' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(160) })
      expect(container.querySelectorAll('.combobox-results li')).toHaveLength(12)
      expect(screen.getByText(/Kabel tip 0\b/)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})

/* Regression for audit A10 — the legacy form renders effective defaults the
   moment a tab is drawn (index.html:3264-3277: no blank option in the type /
   warehouse / partner selects, `H.d || today()`, `H.w || ME.wh`), and
   `syncSil()` PINS the counterparty on every type change (3350). These tests
   start from a genuinely EMPTY header and from a real type transition, so they
   fail against an implementation that only seeds an already-correct value. */
describe('OperationForm — effective header defaults (audit A10 / M7-11)', () => {
  const EMPTY = { d: '', t: '', w: '', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '' }

  it('fills date, type, warehouse and counterparty from a completely empty header', async () => {
    const { onSetHeaderField } = renderForm(baseState({ kind: 'in', header: { ...EMPTY } }))
    await waitFor(() => expect(onSetHeaderField).toHaveBeenCalled())
    const patch = onSetHeaderField.mock.calls[0][0]
    expect(patch.d).toBe(today())
    expect(patch.t).toBe('Satınalma')
    expect(patch.w).toBe('Ələt')
    expect(patch.p).toBe('Partner A')
  })

  it('defaults the warehouse to the anbardar\u2019s own warehouse (ME.wh)', async () => {
    const { onSetHeaderField } = renderForm(
      baseState({ kind: 'out', header: { ...EMPTY } }),
      ANBARDAR,
    )
    await waitFor(() => expect(onSetHeaderField).toHaveBeenCalled())
    expect(onSetHeaderField.mock.calls[0][0].w).toBe('Ələt')
  })

  it('renders no blank option in the type, warehouse or counterparty selects', () => {
    const { container } = renderForm(baseState({ kind: 'in' }))
    const blanks = Array.from(container.querySelectorAll('select option'))
      .filter((o) => (o as HTMLOptionElement).value === '')
      .map((o) => o.textContent)
    /* «Kanal» legitimately keeps its «—» entry — index.html:3283 renders
       `<option value="">—</option>` for the channel select only. */
    expect(blanks).toEqual(['—'])
  })

  it('defaults a transfer destination to a warehouse other than ME.wh', async () => {
    const { onSetHeaderField } = renderForm(
      baseState({ kind: 'mv', header: { ...EMPTY } }),
      ANBARDAR,
    )
    await waitFor(() => expect(onSetHeaderField).toHaveBeenCalled())
    expect(onSetHeaderField.mock.calls[0][0].w2).toBe('Astara')
  })

  it('pins the counterparty to «Sahə üzrə məsul şəxs» on a real transition into Silinmə', async () => {
    /* A GENUINE transition: the header still carries the previous type's
       counterparty («Layihə A»), exactly as it does the instant the user
       switches the type select to «Silinmə». */
    const base = baseState()
    const { onSetHeaderField } = renderForm(baseState({
      kind: 'out',
      header: { ...base.header, t: 'Silinmə', w: 'Ələt', p: 'Layihə A' },
      core: {
        ...base.core,
        locations: [{ name: 'Layihə A', kind: 'layihe', active: true }],
      },
    }))
    await waitFor(() => expect(onSetHeaderField).toHaveBeenCalledWith({ p: 'Sahə üzrə məsul şəxs' }))
  })

  it('does not re-pin when the counterparty is already «Sahə üzrə məsul şəxs»', async () => {
    const base = baseState()
    const { onSetHeaderField } = renderForm(baseState({
      kind: 'out',
      header: { ...base.header, t: 'Silinmə', w: 'Ələt', p: 'Sahə üzrə məsul şəxs' },
    }))
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    expect(onSetHeaderField.mock.calls.filter((c) => 'p' in c[0])).toHaveLength(0)
  })
})

/* ------------------------------------------------------------------------- *
 * M7-22 / M7-39 — focus parity (legacy index.html:3400 and 3669)
 *
 * `renderForm` above passes a MOCK `onSetPick`, so a pick never reaches the
 * state the form renders from. These tests therefore drive a small controlled
 * wrapper that feeds `pick` and `lines` back in, which is what the real
 * NewOperationPage does through the store. Without that the component could
 * never show a picked item and every focus assertion would be vacuous.
 * ------------------------------------------------------------------------- */

interface ControlledProps {
  initial: OperationState
  me?: Me
  /** When false a commit does NOT append, modelling a route that leaves the form. */
  commitAppends?: boolean
  /** M18-56 — publishes the live state so a test can assert `header.pr` at a
      moment when no item is picked and the price INPUT is therefore unmounted.
      Legacy renders the price inside the same picked-item row
      (index.html:3285-3289), so the field's absence there is parity, not a
      defect; the value under test is the header field it is bound to. */
  onState?: (s: OperationState) => void
}

function ControlledForm({ initial, me = ADMIN, commitAppends = true, onState }: ControlledProps) {
  const [st, setSt] = useState<OperationState>(initial)
  useEffect(() => { onState?.(st) }, [st, onState])
  /* Mirrors NewOperationPage: the signal is owned HERE and advanced only at a
     real commit, never as a by-product of `lines` changing. */
  const [commitSignal, setCommitSignal] = useState(0)
  return (
    <OperationForm
      me={me}
      state={st}
      onSetKind={vi.fn()}
      onSetHeaderField={(patch) => setSt((s) => ({ ...s, header: { ...s.header, ...patch } }))}
      onSetPick={(code) => setSt((s) => ({ ...s, pick: code }))}
      onConsumePrefill={() => setSt((s) => ({ ...s, pendingPrefill: null }))}
      onCommitLine={(line) => {
        if (!commitAppends) return
        setSt((s) => ({ ...s, lines: [...s.lines, line], pick: null, requestKey: '' }))
        setCommitSignal((n) => n + 1)
      }}
      commitSignal={commitSignal}
      /* The layered route LEAVES the form; LayerPickDialog commits later. Not
         appending here is the point of the "opened but not confirmed" test. */
      onNeedsLayerPick={vi.fn()}
      onCreateItem={vi.fn()}
      onOpenBulk={vi.fn()}
    />
  )
}

/** Selects an item through the real combobox, as a user would. */
async function pickThroughCombobox(text: string) {
  await userEvent.type(screen.getByLabelText('Mal axtarışı'), text)
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(text) }))
}

/** `unfit: 4` makes condBuckets() report marked, so the split renders on out. */
const SPLIT_CONDS = new Map([['Ələt|0000001', { unfit: 4, repair: 0, onsite: 0, icare: 0 }]])

function outState(over: Partial<OperationState> = {}): OperationState {
  const base = baseState()
  return {
    ...base,
    kind: 'out',
    header: { ...base.header, t: 'Sahəyə', w: 'Ələt', p: 'Partner A' },
    ...over,
  }
}

describe('OperationForm — quantity focus after pick (M7-22)', () => {
  it('focuses quantity after an EXPLICIT pick when no condition split exists', async () => {
    render(<ControlledForm initial={baseState({ kind: 'in' })} />)
    await pickThroughCombobox('Sement')
    const qty = (await screen.findByLabelText(/Miqdar/)) as HTMLInputElement
    /* Identity against the real quantity element, not merely "something has
       focus" — this is the positive assertion the whole row turns on. */
    await waitFor(() => expect(document.activeElement).toBe(qty))
    expect(qty.readOnly).toBe(false)
  })

  it('does NOT focus quantity when a condition split exists, and keeps it read-only', async () => {
    const base = baseState()
    render(<ControlledForm initial={outState({ core: { ...base.core, condByKey: SPLIT_CONDS } })} />)
    await pickThroughCombobox('Sement')
    await screen.findByTestId('cond-split')
    const qty = screen.getByLabelText(/Miqdar/) as HTMLInputElement
    expect(qty.readOnly).toBe(true)
    expect(document.activeElement).not.toBe(qty)
  })

  it('does NOT steal focus when an EXISTING pick merely rerenders (legacy keep=true)', async () => {
    render(<ControlledForm initial={baseState({ kind: 'in', pick: '0000001' })} />)
    const qty = await screen.findByLabelText(/Miqdar/)
    /* Mounting with a pick already in place is not an explicit choice. */
    expect(document.activeElement).not.toBe(qty)

    /* Force a rerender of that same pick through an unrelated field. */
    const note = screen.getByLabelText('Qeyd')
    await userEvent.click(note)
    await userEvent.type(note, 'x')
    expect(document.activeElement).toBe(note)
    expect(document.activeElement).not.toBe(qty)
  })

  it('focuses quantity when the M5-55 pending prefill resolves with no split', async () => {
    render(<ControlledForm initial={baseState({ kind: 'in', pick: '0000001', pendingPrefill: '0000001' })} />)
    const qty = await screen.findByLabelText(/Miqdar/)
    await waitFor(() => expect(document.activeElement).toBe(qty))
  })

  it('does NOT focus quantity when the pending prefill resolves onto a SPLIT item', async () => {
    const base = baseState()
    render(<ControlledForm initial={outState({
      pick: '0000001', pendingPrefill: '0000001',
      core: { ...base.core, condByKey: SPLIT_CONDS },
    })} />)
    await screen.findByTestId('cond-split')
    const qty = screen.getByLabelText(/Miqdar/) as HTMLInputElement
    expect(qty.readOnly).toBe(true)
    expect(document.activeElement).not.toBe(qty)
  })
})

describe('OperationForm — add-line clamp and warning (M7-38)', () => {
  it('commits the available quantity and renders the validator warning', async () => {
    const { onCommitLine, onNeedsLayerPick } = renderForm(outState({ pick: '0000001' }))
    const qty = await screen.findByLabelText(/Miqdar/)
    await userEvent.clear(qty)
    await userEvent.type(qty, '50')
    await userEvent.click(screen.getByRole('button', { name: 'Sətri əlavə et' }))
    expect(onCommitLine).toHaveBeenCalledTimes(1)
    expect(onNeedsLayerPick).not.toHaveBeenCalled()
    expect(onCommitLine.mock.calls[0][0].q).toBe(10)
    expect(screen.getByText(/maksimum 10[,.]00.*endirildi/)).toBeTruthy()
  })
})

describe('OperationForm — item search focus after commit (M7-39)', () => {
  it('focuses item search after an ordinary line is committed', async () => {
    render(<ControlledForm initial={baseState({ kind: 'in' })} />)
    await pickThroughCombobox('Sement')
    const qty = await screen.findByLabelText(/Miqdar/)
    await userEvent.clear(qty)
    await userEvent.type(qty, '2')
    await userEvent.click(screen.getByRole('button', { name: 'Sətri əlavə et' }))
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Mal axtarışı'))
    })
  })

  it('focuses item search when a layer-selected line returns COMMITTED from the dialog', async () => {
    /* The layered non-inbound route commits OUTSIDE this component
       (LayerPickDialog -> addLineRaw in the page), so the only signal the form
       sees is `lines` growing while it stands mounted. A committed line arriving
       by prop IS that signal, and is what the dialog return produces. */
    const committed: DraftOpLineState = {
      kind: 'out', w: 'Ələt', c: '0000001', q: 1, d: '2026-01-01', t: 'Sahəyə',
      p: 'Partner A', cond: null, name: 'Sement M400', unit: 'kq', pr: null,
    }
    function DialogReturn() {
      const [st, setSt] = useState<OperationState>(outState({ layerActive: true }))
      const [commitSignal, setCommitSignal] = useState(0)
      return (
        <>
          <button onClick={() => {
            /* Exactly what `confirmLayers` does on a CONFIRMED single line:
               addLineRaw, then advance the explicit commit signal. */
            setSt((s) => ({ ...s, lines: [...s.lines, committed], pick: null }))
            setCommitSignal((n) => n + 1)
          }}>
            confirm-layers
          </button>
          <OperationForm
            me={ADMIN}
            state={st}
            onSetKind={vi.fn()}
            onSetHeaderField={(patch) => setSt((s) => ({ ...s, header: { ...s.header, ...patch } }))}
            onSetPick={(code) => setSt((s) => ({ ...s, pick: code }))}
            onConsumePrefill={vi.fn()}
            onCommitLine={vi.fn()}
            commitSignal={commitSignal}
            onNeedsLayerPick={vi.fn()}
            onCreateItem={vi.fn()}
            onOpenBulk={vi.fn()}
          />
        </>
      )
    }
    render(<DialogReturn />)
    const search = screen.getByLabelText('Mal axtarışı')
    expect(document.activeElement).not.toBe(search)
    await userEvent.click(screen.getByRole('button', { name: 'confirm-layers' }))
    await waitFor(() => expect(document.activeElement).toBe(search))
  })

  it('does NOT focus item search on initial mount with a RESTORED draft', async () => {
    const restored: DraftOpLineState = {
      kind: 'in', w: 'Ələt', c: '0000001', q: 5, d: '2026-01-01', t: 'Satınalma',
      cond: null, name: 'Sement M400', unit: 'kq', pr: 12,
    }
    render(<ControlledForm initial={baseState({ kind: 'in', lines: [restored], restoredAt: Date.now() })} />)
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    expect(document.activeElement).not.toBe(screen.getByLabelText('Mal axtarışı'))
  })

  /* Codex audit 2026-09-09 — the real page mounts with `lines = []` against an
     already-healthy core and only THEN does the boot effect run
     `restoreDraftOnBoot()`, which replaces `lines` from localStorage after
     mount. That post-mount 0→N growth is a RESTORE, not a commit. The older
     negative test only covered a draft already present on the FIRST render, so
     it could not see this path: a `lines.length`-based rule establishes its
     baseline at 0 and then reads the restore as growth. Keying the effect on
     the caller's explicit commit signal — which `restoreDraftOnBoot` never
     advances — is what makes this pass. */
  it('does NOT focus item search when a restored draft arrives AFTER mount with zero lines', async () => {
    const restored: DraftOpLineState = {
      kind: 'in', w: 'Ələt', c: '0000001', q: 5, d: '2026-01-01', t: 'Satınalma',
      cond: null, name: 'Sement M400', unit: 'kq', pr: 12,
    }
    /* The signal is fixed at 0 for this component's whole life: the restore
       route never touches it. Only `lines` change, asynchronously.

       The restore is delivered through a captured setter rather than a click,
       because clicking a trigger would move focus to that trigger and destroy
       the very thing under test. `restoreDraftOnBoot()` is likewise reached
       from an effect, not from a user gesture. */
    let deliverRestore: (() => void) | null = null
    function LateRestore() {
      const [st, setSt] = useState<OperationState>(baseState({ kind: 'in', lines: [] }))
      /* Published from an effect, not during render: the setter is stable, so
         this runs once and never mutates anything the render depends on. */
      useEffect(() => {
        deliverRestore = () => setSt((s) => ({ ...s, lines: [restored], restoredAt: Date.now() }))
      }, [])
      return (
        <>
          <OperationForm
            me={ADMIN}
            state={st}
            onSetKind={vi.fn()}
            onSetHeaderField={(patch) => setSt((s) => ({ ...s, header: { ...s.header, ...patch } }))}
            onSetPick={(code) => setSt((s) => ({ ...s, pick: code }))}
            onConsumePrefill={vi.fn()}
            onCommitLine={vi.fn()}
            commitSignal={0}
            onNeedsLayerPick={vi.fn()}
            onCreateItem={vi.fn()}
            onOpenBulk={vi.fn()}
          />
        </>
      )
    }
    render(<LateRestore />)
    const search = screen.getByLabelText('Mal axtarışı')
    /* Mounted with NO lines — the baseline a real boot establishes. */
    expect(search).toBeTruthy()

    /* The user is already working in another control when the restore lands. */
    const note = screen.getByLabelText('Qeyd')
    await userEvent.click(note)
    expect(document.activeElement).toBe(note)

    /* The draft arrives asynchronously, after mount: 0 → 1 lines. */
    await act(async () => {
      await Promise.resolve()
      deliverRestore!()
    })
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())

    /* Item search must NOT be focused, and the user keeps the control they
       were in. */
    expect(document.activeElement).not.toBe(screen.getByLabelText('Mal axtarışı'))
    expect(document.activeElement).toBe(note)
  })

  it('does NOT focus item search when validation FAILS and nothing is committed', async () => {
    render(<ControlledForm initial={baseState({ kind: 'in' })} />)
    await pickThroughCombobox('Sement')
    const qty = await screen.findByLabelText(/Miqdar/)
    await userEvent.clear(qty)
    /* Quantity 0 is refused by validateOpLine, so no line is committed. */
    await userEvent.click(screen.getByRole('button', { name: 'Sətri əlavə et' }))
    expect(document.activeElement).not.toBe(screen.getByLabelText('Mal axtarışı'))
  })

  it('does NOT focus item search when a layer dialog is opened but never confirmed', async () => {
    render(<ControlledForm initial={outState({ layerActive: true })} />)
    await pickThroughCombobox('Sement')
    const qty = await screen.findByLabelText(/Miqdar/)
    await userEvent.clear(qty)
    await userEvent.type(qty, '1')
    await userEvent.click(screen.getByRole('button', { name: 'Sətri əlavə et' }))
    /* onNeedsLayerPick fired: the line left the form, `lines` did NOT grow. */
    expect(document.activeElement).not.toBe(screen.getByLabelText('Mal axtarışı'))
  })
})

/* M7-39 field clearing — Codex re-audit 2026-09-10. The live audit observed
   header «Qiymət» still holding `10` after a commit and called that retention
   "by design". It is not: legacy `commitDraftLine()` explicitly runs
   `$('#o-price').value = ''` (index.html:3668) alongside clearing item, unit,
   quantity and the condition split, and M7-39 requires clearing
   pick/qty/unit/split/price. These are POSITIVE assertions: they fail against a
   tree where the commit signal only moves focus. */
describe('OperationForm — post-commit field clearing (M7-39)', () => {
  /** Reads the visible price input. M18-56 — the caption is the legacy
      «Vahidin qiyməti (₼)» (index.html:3288). M18-57 — the field is part of
      the ALWAYS-rendered single-item row on the inbound tab, so it survives
      the pick being released; `header.pr`, read through `onState`, remains
      the value M7-39 governs and the one this input is bound to. */
  function priceInput() {
    return screen.getByLabelText('Vahidin qiyməti (₼)') as HTMLInputElement
  }

  it('clears the inbound header price, quantity and picked state after an ordinary commit', async () => {
    let live: OperationState | null = null
    render(<ControlledForm initial={baseState({ kind: 'in' })} onState={(s) => { live = s }} />)
    await pickThroughCombobox('Sement')
    /* Picking seeds the price from the item, exactly as legacy does. */
    const qty = await screen.findByLabelText(/Miqdar/)
    await userEvent.clear(qty)
    await userEvent.type(qty, '2')
    await userEvent.clear(priceInput())
    await userEvent.type(priceInput(), '10')
    expect(priceInput().value).toBe('10')

    await userEvent.click(screen.getByRole('button', { name: 'Sətri əlavə et' }))

    await waitFor(() => {
      /* The retained-price defect: this is the assertion that fails first.
         The commit releases the pick, so the input is gone and the cleared
         value is read from the header it mirrors. */
      expect(live!.header.pr).toBe('')
    })
    /* M18-57 — the quantity control REMAINS rendered (legacy emits the row
       unconditionally, index.html:3278-3282); what a commit clears is its
       VALUE, exactly as legacy `commitDraftLine()` does with
       `$('#o-qty').value = ''` (index.html:3665). Asserting the element had
       vanished was asserting the gating defect, not the M7-39 contract. */
    expect((screen.getByLabelText(/Miqdar/) as HTMLInputElement).value).toBe('')
    /* The pick itself is still released — the readout returns to «Seçilməyib»
       and the unit empties back to its placeholder. */
    expect(screen.getByText('Seçilməyib')).toBeTruthy()
    expect((screen.getByLabelText('Ölçü vahidi') as HTMLInputElement).value).toBe('')
    /* And the accepted M7-39 focus transition still happens. */
    expect(document.activeElement).toBe(screen.getByLabelText('Mal axtarışı'))
  })

  it('leaves every unrelated header field byte-identical across an ordinary commit', async () => {
    const header = {
      d: '2026-03-04', t: 'Satınalma', w: 'Ələt', w2: '', p: 'Partner A',
      ch: 'Nağd alış', ct: 'CT-9', iv: 'IV-9', note: 'qeyd mətni', pr: '',
    }
    let live: OperationState | null = null
    render(<ControlledForm initial={baseState({ kind: 'in', header })} onState={(s) => { live = s }} />)
    await pickThroughCombobox('Sement')
    const qty = await screen.findByLabelText(/Miqdar/)
    await userEvent.clear(qty)
    await userEvent.type(qty, '2')
    await userEvent.click(screen.getByRole('button', { name: 'Sətri əlavə et' }))
    await waitFor(() => expect(live!.header.pr).toBe(''))

    /* Only price is cleared; the document-level header survives untouched. */
    expect((screen.getByLabelText('Tarix') as HTMLInputElement).value).toBe('2026-03-04')
    expect((screen.getByLabelText('Qeyd') as HTMLInputElement).value).toBe('qeyd mətni')
    /* `Qaimə №` also exists on the out/mv branch, but this form is inbound, so
       exactly one instance renders. */
    expect((screen.getByLabelText('Müqavilə №') as HTMLInputElement).value).toBe('CT-9')
    expect((screen.getByLabelText('Qaimə №') as HTMLInputElement).value).toBe('IV-9')
  })

  /* The confirmed-dialog route is where "hidden" masquerades as "cleared": the
     page nulls `pick`, so the quantity and split controls unmount while their
     local state survives inside the still-mounted form. Picking a SECOND item
     re-renders those controls — stale values reappear unless the commit signal
     actually cleared them. */
  it('clears stale quantity/split after a CONFIRMED layer commit, so a later pick starts empty', async () => {
    const committed: DraftOpLineState = {
      kind: 'out', w: 'Ələt', c: '0000001', q: 3, d: '2026-01-01', t: 'Sahəyə',
      p: 'Partner A', cond: null, name: 'Sement M400', unit: 'kq', pr: null,
    }
    function DialogReturn() {
      const [st, setSt] = useState<OperationState>(outState({ layerActive: true }))
      const [commitSignal, setCommitSignal] = useState(0)
      return (
        <>
          <button onClick={() => {
            /* Exactly `confirmLayers` on a CONFIRMED single line. */
            setSt((s) => ({ ...s, lines: [...s.lines, committed], pick: null }))
            setCommitSignal((n) => n + 1)
          }}>
            confirm-layers
          </button>
          <OperationForm
            me={ADMIN}
            state={st}
            onSetKind={vi.fn()}
            onSetHeaderField={(patch) => setSt((s) => ({ ...s, header: { ...s.header, ...patch } }))}
            onSetPick={(code) => setSt((s) => ({ ...s, pick: code }))}
            onConsumePrefill={vi.fn()}
            onCommitLine={vi.fn()}
            commitSignal={commitSignal}
            onNeedsLayerPick={vi.fn()}
            onCreateItem={vi.fn()}
            onOpenBulk={vi.fn()}
          />
        </>
      )
    }
    render(<DialogReturn />)

    /* Build real local state: pick an item and type a quantity the user would
       have entered before the dialog took over. */
    await pickThroughCombobox('Sement')
    const qty = await screen.findByLabelText(/Miqdar/)
    await userEvent.clear(qty)
    await userEvent.type(qty, '7')
    expect((screen.getByLabelText(/Miqdar/) as HTMLInputElement).value).toBe('7')

    await userEvent.click(screen.getByRole('button', { name: 'confirm-layers' }))
    /* M18-57 — the row stays rendered; the commit signal CLEARS it. This is
       the same "cleared, not hidden" distinction the test name describes, now
       observable directly because the control no longer unmounts. */
    await waitFor(() => expect((screen.getByLabelText(/Miqdar/) as HTMLInputElement).value).toBe(''))

    /* Pick again: the resurrected-value check. */
    await pickThroughCombobox('Sement')
    const qty2 = await screen.findByLabelText(/Miqdar/)
    expect((qty2 as HTMLInputElement).value).not.toBe('7')
    expect((qty2 as HTMLInputElement).value).toBe('')
  })

  it('does NOT clear the price when a restored draft arrives (no commit occurred)', async () => {
    const restored: DraftOpLineState = {
      kind: 'in', w: 'Ələt', c: '0000001', q: 5, d: '2026-01-01', t: 'Satınalma',
      cond: null, name: 'Sement M400', unit: 'kq', pr: 12,
    }
    const header = { d: '2026-01-01', t: 'Satınalma', w: 'Ələt', w2: '', p: '', ch: '', ct: '', iv: '', note: '', pr: '33' }
    let live: OperationState | null = null
    render(
      <ControlledForm
        initial={baseState({ kind: 'in', header, lines: [restored], restoredAt: Date.now() })}
        onState={(s) => { live = s }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('operation-form')).toBeTruthy())
    /* Restore is not a commit: price survives and focus does not move. A
       restored draft has no pick, so the price input is not mounted and the
       surviving value is read from the header. */
    expect(live!.header.pr).toBe('33')
    expect(document.activeElement).not.toBe(screen.getByLabelText('Mal axtarışı'))
  })
})
