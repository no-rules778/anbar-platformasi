import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OperationForm } from './OperationForm'
import { ItemStatePanel } from './ItemStatePanel'
import { DraftLinesPanel } from './DraftLinesPanel'
import type { OperationState } from '../../store/operation.store'
import type { Me } from '../../lib/roles'
import type { ItemRow } from '../../api/items.api'

/* M18-53…M18-56 — the CORRECTION pass.

   A previous parity report claimed the two-column «Yeni əməliyyat» screen
   matched production. An authenticated browser check found four remaining
   differences, all of which are text or ORDER rather than CSS, and none of
   which the earlier `setContent()` structural checks could see.

   These assertions are deliberately falsifiable against the legacy authority:
   each pins an exact string from `platform/index.html`, or the exact SEQUENCE
   in which `rOp()` (index.html:3262-3295) emits its fields. Reordering the
   form, paraphrasing a caption or dropping the bold lead from an empty state
   fails a named test here rather than surviving to a screenshot review. */

const ADMIN: Me = { id: 'u1', sbId: 'u1', email: 'a@a.com', name: 'A', role: 'admin', wh: '' }

const items: ItemRow[] = [
  { code: '0000001', name: 'Sement M400', unit: 'kq', price: 12, category: null },
]

function baseState(over: Partial<OperationState> = {}): OperationState {
  return {
    core: {
      items,
      itemBy: new Map(items.map((i) => [i.code, i])),
      indexes: {
        byItem: new Map(),
        bal: [{ w: 'Ələt', c: '0000001', in: 10, out: 0, n: 1, q: 10, last: '', first: '9999', price: 0, val: 0, name: '', unit: '' }],
        priceObs: new Map(),
        operational: [],
      },
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
    header: { d: '2026-01-01', t: 'Satınalma', w: 'Ələt', w2: '', p: 'Partner A', ch: '', ct: '', iv: '', note: '', pr: '' },
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
    consumePrefill: vi.fn(), postDocument: vi.fn(), load: vi.fn(), refresh: vi.fn(),
    saveDraftNow: vi.fn(), restoreDraftOnBoot: vi.fn(), reset: vi.fn(),
    ...over,
  }
}

/* M18-57 — the quantity / unit / price triple is now ALWAYS rendered in the
   ordinary single-item flow, matching legacy (index.html:3278-3282). The
   earlier `pickedItem` gating recorded here was the defect, not the contract:
   an empty form was three fields short of production.

   These order assertions still run against a PICKED state, because that is
   what the production screenshot shows and because the unit only carries a
   value once an item is chosen; `pick` is set directly on the state rather
   than driven through the combobox, which keeps these tests about ORDER alone
   and leaves pick/focus behaviour to OperationForm.test.tsx. The unpicked
   sequence is pinned separately, in OperationForm.test.tsx. */
function pickedState(over: Partial<OperationState> = {}): OperationState {
  return baseState({ pick: '0000001', ...over })
}

function renderForm(state: OperationState, me: Me = ADMIN) {
  return render(
    <OperationForm
      me={me}
      state={state}
      onSetKind={vi.fn()}
      onSetHeaderField={vi.fn()}
      onSetPick={vi.fn()}
      onConsumePrefill={vi.fn()}
      onCommitLine={vi.fn()}
      commitSignal={0}
      onNeedsLayerPick={vi.fn()}
      onCreateItem={vi.fn()}
      onOpenBulk={vi.fn()}
    />,
  )
}

/** The visible caption of every field the form renders, in DOM order.
    `label.f > span` is the legacy caption element (index.html:3263), so this
    reads the same sequence a user reads down the form. The trailing hint
    spans inside a field are not captions and are excluded by taking only the
    FIRST span of each label. */
function captionOrder(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('label.f'))
    .map((l) => l.querySelector('span')?.textContent?.trim() ?? '')
    .filter(Boolean)
}

describe('OperationForm — legacy field ORDER (M18-56, index.html:3262-3295)', () => {
  /* The inbound tab is the widest case: it is the only kind carrying the
     channel/contract/invoice row and the unit price. */
  it('renders the inbound fields in the exact production order', () => {
    const { container } = renderForm(pickedState({ kind: 'in' }))
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

  /* The specific regression being pinned: item search must precede channel,
     contract, invoice, price and note. The earlier React form placed it
     AFTER all of them. */
  it('places «Mal» search before channel, contract, invoice, price and note', () => {
    const { container } = renderForm(pickedState({ kind: 'in' }))
    const order = captionOrder(container)
    const item = order.indexOf('Mal (ad və ya kod yazın)')
    expect(item).toBeGreaterThan(-1)
    for (const later of ['Alınma kanalı', 'Müqavilə №', 'Qaimə №', 'Qeyd']) {
      expect(item).toBeLessThan(order.indexOf(later))
    }
    expect(order.indexOf('Vahidin qiyməti (₼)')).toBeGreaterThan(item)
  })

  /* «Sətri əlavə et» is the LAST control of the form (index.html:3296). */
  it('renders «Sətri əlavə et» after every field', () => {
    const { container } = renderForm(pickedState({ kind: 'in' }))
    const add = screen.getByRole('button', { name: 'Sətri əlavə et' })
    const note = Array.from(container.querySelectorAll('label.f'))
      .find((l) => l.querySelector('span')?.textContent?.trim() === 'Qeyd')
    expect(note).toBeTruthy()
    expect(note!.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /* Outbound carries no channel/contract row and no unit price, but keeps the
     same relative order for everything it does render (index.html:3290). */
  it('keeps the order on the outbound tab, without the inbound-only fields', () => {
    const { container } = renderForm(pickedState({ kind: 'out', header: { ...baseState().header, t: 'Təhvil' } }))
    const order = captionOrder(container)
    expect(order.slice(0, 4)).toEqual(['Tarix', 'Əməliyyatın növü', 'Anbar', 'Təhvil alan / layihə'])
    expect(order).not.toContain('Alınma kanalı')
    expect(order).not.toContain('Müqavilə №')
    expect(order).not.toContain('Vahidin qiyməti (₼)')
    expect(order.indexOf('Mal (ad və ya kod yazın)')).toBeLessThan(order.indexOf('Qaimə №'))
    expect(order.indexOf('Qaimə №')).toBeLessThan(order.indexOf('Qeyd'))
  })

  /* A transfer replaces the single warehouse + counterparty pair with the two
     route pickers, in that position (index.html:3267-3270). */
  it('renders the transfer route pickers in the warehouse/counterparty slot', () => {
    const { container } = renderForm(pickedState({ kind: 'mv', header: { ...baseState().header, t: 'Yerdəyişmə', w2: 'Astara' } }))
    const order = captionOrder(container)
    expect(order.slice(0, 4)).toEqual(['Tarix', 'Əməliyyatın növü', 'Haradan (anbar)', 'Hara (anbar)'])
    expect(order).not.toContain('Kontragent')
    expect(order.indexOf('Mal (ad və ya kod yazın)')).toBeLessThan(order.indexOf('Qeyd'))
  })

  /* out + «Silinmə» REPLACES the single-item block with «Malları seç»
     (index.html:3283, isWoOut). The item search is absent by design — the
     order test must not resurrect it. */
  it('omits the item search on out + Silinmə, keeping the bulk affordance', () => {
    const { container } = renderForm(baseState({ kind: 'out', header: { ...baseState().header, t: 'Silinmə' } }))
    const order = captionOrder(container)
    expect(order).not.toContain('Mal (ad və ya kod yazın)')
    expect(order).toContain('Qeyd')
    expect(screen.getByRole('button', { name: 'Malları seç' })).toBeTruthy()
  })
})

describe('ItemStatePanel — legacy initial text (M18-55, index.html:309)', () => {
  it('shows the legacy prompt before any item is picked', () => {
    render(<ItemStatePanel code={null} bal={[]} />)
    expect(screen.getByText('Mal seçin — bütün anbarlar üzrə qalıq burada görünəcək.')).toBeTruthy()
  })

  it('does not render the earlier paraphrase', () => {
    render(<ItemStatePanel code={null} bal={[]} />)
    expect(screen.queryByText('Mal seçilməyib.')).toBeNull()
  })

  /* The no-rows case is a DIFFERENT legacy string (index.html:3450) and must
     not be replaced by the initial prompt. */
  it('keeps the distinct no-movement text for a picked item with no rows', () => {
    render(<ItemStatePanel code="0000001" bal={[]} />)
    expect(screen.getByText('Bu mal üzrə hələ hərəkət yoxdur.')).toBeTruthy()
    expect(screen.queryByText('Mal seçin — bütün anbarlar üzrə qalıq burada görünəcək.')).toBeNull()
  })
})

describe('DraftLinesPanel — legacy empty state (M18-54, index.html:1411/3751)', () => {
  function renderPanel() {
    return render(
      <DraftLinesPanel
        lines={[]}
        restoredAt={null}
        onDismissRestoreBanner={vi.fn()}
        onRemove={vi.fn()}
        onEdit={vi.fn()}
        canPost={false}
        editMode={false}
        onPost={vi.fn()}
        onClear={vi.fn()}
      />,
    )
  }

  it('leads with a BOLD «Məlumat yoxdur»', () => {
    const { container } = renderPanel()
    expect(container.querySelector('.empty > b')?.textContent).toBe('Məlumat yoxdur')
  })

  it('follows it with the legacy explanatory text', () => {
    const { container } = renderPanel()
    expect(container.querySelector('.empty')?.textContent)
      .toBe('Məlumat yoxdurSətir əlavə edin — sənəd bir neçə maldan ibarət ola bilər.')
  })

  it('does not render the earlier paraphrase', () => {
    renderPanel()
    expect(screen.queryByText('Sətir əlavə edilməyib.')).toBeNull()
  })
})
