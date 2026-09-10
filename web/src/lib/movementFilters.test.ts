import { describe, it, expect } from 'vitest'
import {
  EMPTY_MOVEMENT_FILTERS,
  MOVEMENT_TYPE_FILTERS,
  filterMovements,
  movKeyOptions,
  movementKpis,
  resolveMovKeySelection,
  searchableNote,
  sortMovements,
  type MovementFilterItem,
  type MovementFilterRow,
  type MovementFilters,
} from './movementFilters'
import { SHOW_MAX, applyCut } from './showAllCut'
import { CANCELLABLE_TYPES } from './documentCancelState'

const WHS = ['Ələt', 'Astara', 'Xocahəsən', 'Harmony', 'Ofis']

const mv = (over: Partial<MovementFilterRow> = {}): MovementFilterRow => ({
  id: '1',
  item_code: '0000001',
  warehouse: 'Ələt',
  date: '2026-09-01',
  type: 'Satınalma',
  partner: 'Azpetrol',
  in_qty: 10,
  out_qty: 0,
  price: 2,
  invoice_num: null,
  contract_num: null,
  note: null,
  doc_num: null,
  created_at: '2026-09-01T10:00:00Z',
  ...over,
})

const f = (over: Partial<MovementFilters> = {}): MovementFilters => ({
  ...EMPTY_MOVEMENT_FILTERS,
  ...over,
})

const items = (entries: Record<string, MovementFilterItem> = {}): Map<string, MovementFilterItem> =>
  new Map(Object.entries(entries))

const noItems = items()

describe('MOVEMENT_TYPE_FILTERS (M8-08)', () => {
  it('is the fixed eight-type list in legacy order', () => {
    expect([...MOVEMENT_TYPE_FILTERS]).toEqual([
      'Əvvələ qalıq',
      'Satınalma',
      'Yerdəyişmə',
      'Silinmə',
      'Sahəyə',
      'Qaytarma',
      'İcarə',
      'Satış',
    ])
  })

  it('is NOT CANCELLABLE_TYPES — it includes Yerdəyişmə and is longer', () => {
    expect(MOVEMENT_TYPE_FILTERS).toHaveLength(8)
    expect(CANCELLABLE_TYPES).toHaveLength(7)
    expect((MOVEMENT_TYPE_FILTERS as readonly string[]).includes('Yerdəyişmə')).toBe(true)
  })
})

describe('searchableNote (M8-07)', () => {
  it('strips the technical replacement fragment', () => {
    expect(searchableNote('Mal əvəzləndi: 0001170 → 0001260 · Səbəb: səhv kod')).toBe(
      'Səbəb: səhv kod',
    )
  })

  it('keeps the reason text searchable', () => {
    expect(searchableNote('Mal əvəzləndi: 0001170 → 0001260 · Səbəb: səhv kod')).toContain('səhv kod')
  })

  it('removes EVERY occurrence, not only the first', () => {
    const note = 'Mal əvəzləndi: 1 → 2 · Mal əvəzləndi: 3 → 4 · son'
    expect(searchableNote(note)).toBe('son')
  })

  it('leaves an unrelated note untouched', () => {
    expect(searchableNote('Adi qeyd')).toBe('Adi qeyd')
  })

  it('returns an empty string for null/undefined', () => {
    expect(searchableNote(null)).toBe('')
    expect(searchableNote(undefined)).toBe('')
  })
})

describe('filterMovements — scope filters (M8-08)', () => {
  const rows = [
    mv({ id: '1', warehouse: 'Ələt', type: 'Satınalma', date: '2026-09-01' }),
    mv({ id: '2', warehouse: 'Astara', type: 'Silinmə', date: '2026-09-05' }),
    mv({ id: '3', warehouse: 'Ələt', type: 'Silinmə', date: '2026-09-10' }),
  ]
  const ids = (r: MovementFilterRow[]): string[] => r.map((x) => String(x.id))

  it('returns everything when no filter is set', () => {
    expect(ids(filterMovements(rows, f(), noItems, WHS))).toEqual(['1', '2', '3'])
  })

  it('filters by warehouse using the STORED name', () => {
    expect(ids(filterMovements(rows, f({ w: 'Ələt' }), noItems, WHS))).toEqual(['1', '3'])
  })

  it('filters by type', () => {
    expect(ids(filterMovements(rows, f({ t: 'Silinmə' }), noItems, WHS))).toEqual(['2', '3'])
  })

  it('treats both date bounds as INCLUSIVE', () => {
    expect(ids(filterMovements(rows, f({ d1: '2026-09-05', d2: '2026-09-05' }), noItems, WHS))).toEqual(['2'])
  })

  it('applies the date bounds independently', () => {
    expect(ids(filterMovements(rows, f({ d1: '2026-09-05' }), noItems, WHS))).toEqual(['2', '3'])
    expect(ids(filterMovements(rows, f({ d2: '2026-09-05' }), noItems, WHS))).toEqual(['1', '2'])
  })

  it('combines filters conjunctively', () => {
    expect(ids(filterMovements(rows, f({ w: 'Ələt', t: 'Silinmə' }), noItems, WHS))).toEqual(['3'])
  })

  it('filters by the movKey selection', () => {
    const transfer = mv({ id: '4', type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', in_qty: 0, out_qty: 1 })
    const all = [...rows, transfer]
    expect(ids(filterMovements(all, f({ p: 'route:Ələt → Astara' }), noItems, WHS))).toEqual(['4'])
    expect(ids(filterMovements(all, f({ p: 'partner:Azpetrol' }), noItems, WHS))).toEqual(['1', '2', '3'])
  })
})

describe('filterMovements — search haystack (M8-07)', () => {
  const idx = items({ '0000001': { name: 'Sement M400' } })

  it('matches the item code', () => {
    expect(filterMovements([mv()], f({ q: '0000001' }), idx, WHS)).toHaveLength(1)
  })

  it('matches the item NAME from the nomenclature index', () => {
    expect(filterMovements([mv()], f({ q: 'sement' }), idx, WHS)).toHaveLength(1)
  })

  it('matches the stored partner text', () => {
    expect(filterMovements([mv()], f({ q: 'azpetrol' }), idx, WHS)).toHaveLength(1)
  })

  it('matches the invoice and the contract number', () => {
    const m = mv({ invoice_num: 'QM-77', contract_num: 'MQ-88' })
    expect(filterMovements([m], f({ q: 'qm-77' }), idx, WHS)).toHaveLength(1)
    expect(filterMovements([m], f({ q: 'mq-88' }), idx, WHS)).toHaveLength(1)
  })

  it('matches the type', () => {
    expect(filterMovements([mv()], f({ q: 'satınalma' }), idx, WHS)).toHaveLength(1)
  })

  it('finds a transfer by BOTH the stored partner text and the displayed route', () => {
    const t = mv({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', in_qty: 0, out_qty: 1 })
    expect(filterMovements([t], f({ q: 'astara anbarına' }), idx, WHS)).toHaveLength(1)
    expect(filterMovements([t], f({ q: 'ələt → astara' }), idx, WHS)).toHaveLength(1)
  })

  it('searches the note through searchableNote — the reason stays findable', () => {
    const m = mv({ note: 'Mal əvəzləndi: 0001170 → 0001260 · Səbəb: səhv kod' })
    expect(filterMovements([m], f({ q: 'səhv kod' }), idx, WHS)).toHaveLength(1)
  })

  it('does NOT surface a row through the stripped OLD code in its note', () => {
    /* The whole point of searchableNote(): a query for 1170 must not return the
       row whose item code is 0001260. */
    const m = mv({
      item_code: '0001260',
      note: 'Mal əvəzləndi: 0001170 → 0001260 · Səbəb: səhv kod',
    })
    expect(filterMovements([m], f({ q: '0001170' }), items({ '0001260': { name: 'Armatur' } }), WHS)).toHaveLength(0)
  })

  it('does not drop a row whose item code is missing from the index', () => {
    expect(filterMovements([mv({ item_code: 'ZZZ' })], f({ q: 'azpetrol' }), idx, WHS)).toHaveLength(1)
  })

  it('rejects a row that matches nothing', () => {
    expect(filterMovements([mv()], f({ q: 'tapılmayan' }), idx, WHS)).toHaveLength(0)
  })
})

describe('sortMovements (M8-10)', () => {
  it('orders by date DESCENDING', () => {
    const rows = [mv({ id: 'a', date: '2026-09-01' }), mv({ id: 'b', date: '2026-09-10' })]
    expect(sortMovements(rows).map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('breaks a date tie by created_at DESCENDING', () => {
    const rows = [
      mv({ id: 'a', date: '2026-09-01', created_at: '2026-09-01T08:00:00Z' }),
      mv({ id: 'b', date: '2026-09-01', created_at: '2026-09-01T20:00:00Z' }),
    ]
    expect(sortMovements(rows).map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('lets the DATE outrank created_at', () => {
    const rows = [
      mv({ id: 'old-date-new-ts', date: '2026-09-01', created_at: '2026-09-30T23:00:00Z' }),
      mv({ id: 'new-date-old-ts', date: '2026-09-20', created_at: '2026-09-02T01:00:00Z' }),
    ]
    expect(sortMovements(rows).map((r) => r.id)).toEqual(['new-date-old-ts', 'old-date-new-ts'])
  })

  it('sorts a null or unparseable created_at LAST among an equal date, not NaN-first', () => {
    const rows = [
      mv({ id: 'null-ts', date: '2026-09-01', created_at: null }),
      mv({ id: 'bad-ts', date: '2026-09-01', created_at: 'not-a-date' }),
      mv({ id: 'good-ts', date: '2026-09-01', created_at: '2026-09-01T09:00:00Z' }),
    ]
    expect(sortMovements(rows)[0].id).toBe('good-ts')
  })

  it('does not mutate the input array', () => {
    const rows = [mv({ id: 'a', date: '2026-09-01' }), mv({ id: 'b', date: '2026-09-10' })]
    sortMovements(rows)
    expect(rows.map((r) => r.id)).toEqual(['a', 'b'])
  })
})

describe('soft cap (M8-11) — the shared showAllCut', () => {
  it('caps at 3000 rows and reveals the rest on demand', () => {
    expect(SHOW_MAX).toBe(3000)
    const rows = Array.from({ length: SHOW_MAX + 5 }, (_, i) => mv({ id: String(i) }))
    expect(applyCut(rows, false)).toHaveLength(SHOW_MAX)
    expect(applyCut(rows, true)).toHaveLength(SHOW_MAX + 5)
  })

  it('leaves a set at exactly the cap untouched', () => {
    const rows = Array.from({ length: SHOW_MAX }, (_, i) => mv({ id: String(i) }))
    expect(applyCut(rows, false)).toHaveLength(SHOW_MAX)
  })
})

describe('movementKpis (M8-12)', () => {
  it('counts rows and totals both directions', () => {
    const rows = [
      mv({ in_qty: 10, out_qty: 0 }),
      mv({ in_qty: 0, out_qty: 4 }),
      mv({ in_qty: 2, out_qty: 0 }),
    ]
    const k = movementKpis(rows, noItems)
    expect(k.count).toBe(3)
    expect(k.totalIn).toBe(12)
    expect(k.totalOut).toBe(4)
  })

  it('values ONLY the inbound quantity — an outbound row adds nothing', () => {
    const rows = [mv({ in_qty: 0, out_qty: 100, price: 5 })]
    expect(movementKpis(rows, noItems).inboundValue).toBe(0)
  })

  it("uses the movement's own price first", () => {
    const rows = [mv({ in_qty: 3, price: 7 })]
    const idx = items({ '0000001': { price: 999 } })
    expect(movementKpis(rows, idx).inboundValue).toBe(21)
  })

  it('falls back to the nomenclature price when the movement has none', () => {
    const rows = [mv({ in_qty: 3, price: null })]
    const idx = items({ '0000001': { price: 4 } })
    expect(movementKpis(rows, idx).inboundValue).toBe(12)
  })

  it('falls back to 0 when neither price is known', () => {
    const rows = [mv({ in_qty: 3, price: 0 })]
    expect(movementKpis(rows, noItems).inboundValue).toBe(0)
  })

  it('returns zeroes for an empty set', () => {
    expect(movementKpis([], noItems)).toEqual({ count: 0, totalIn: 0, totalOut: 0, inboundValue: 0 })
  })
})

describe('movKeyOptions (M8-09)', () => {
  const rows = [
    mv({ id: '1', warehouse: 'Ələt', type: 'Satınalma', partner: 'Azpetrol' }),
    mv({ id: '2', warehouse: 'Ələt', type: 'Satınalma', partner: 'Bravo MMC' }),
    mv({ id: '3', warehouse: 'Ələt', type: 'Yerdəyişmə', partner: 'Astara anbarına', in_qty: 0, out_qty: 1 }),
    mv({ id: '4', warehouse: 'Ələt', type: 'Yerdəyişmə', partner: 'Naməlum yer', in_qty: 0, out_qty: 1 }),
    mv({ id: '5', warehouse: 'Astara', type: 'Satınalma', partner: 'Astara-only MMC' }),
  ]

  it('splits the keys into the three legacy groups', () => {
    const o = movKeyOptions(rows, f(), WHS)
    expect(o.routes.map(([k]) => k)).toEqual(['route:Ələt → Astara'])
    expect(o.partners.map(([k]) => k)).toEqual([
      'partner:Astara-only MMC',
      'partner:Azpetrol',
      'partner:Bravo MMC',
    ])
    expect(o.raws.map(([k]) => k)).toEqual(['raw:Naməlum yer'])
  })

  it('exposes the LABEL, not the prefixed key, as the option text', () => {
    const o = movKeyOptions(rows, f(), WHS)
    expect(o.routes[0][1]).toBe('Ələt → Astara')
    expect(o.raws[0][1]).toBe('Naməlum yer')
  })

  it('sorts each group by label', () => {
    const o = movKeyOptions(rows, f(), WHS)
    expect(o.partners.map(([, label]) => label)).toEqual(['Astara-only MMC', 'Azpetrol', 'Bravo MMC'])
  })

  it('deduplicates a key seen many times', () => {
    const dup = [...rows, mv({ id: '6', partner: 'Azpetrol' })]
    expect(movKeyOptions(dup, f(), WHS).partners.filter(([k]) => k === 'partner:Azpetrol')).toHaveLength(1)
  })

  it('narrows the list to the selected warehouse (requirement 5)', () => {
    const o = movKeyOptions(rows, f({ w: 'Astara' }), WHS)
    expect(o.partners.map(([k]) => k)).toEqual(['partner:Astara-only MMC'])
    expect(o.routes).toEqual([])
  })

  it('narrows the list by type and by date', () => {
    expect(movKeyOptions(rows, f({ t: 'Yerdəyişmə' }), WHS).partners).toEqual([])
    expect(movKeyOptions(rows, f({ d1: '2026-10-01' }), WHS).partners).toEqual([])
  })

  it('IGNORES the İstiqamət selection itself, so it cannot narrow its own list', () => {
    const o = movKeyOptions(rows, f({ p: 'partner:Azpetrol' }), WHS)
    expect(o.partners).toHaveLength(3)
    expect(o.routes).toHaveLength(1)
  })

  it('drops a key whose label is empty rather than offering a blank option', () => {
    const blank = [mv({ id: '9', partner: '' })]
    expect(movKeyOptions(blank, f(), WHS).partners).toEqual([])
  })

  it('never merges a raw transfer into the route group', () => {
    const o = movKeyOptions(rows, f(), WHS)
    expect(o.routes.some(([k]) => k.startsWith('raw:'))).toBe(false)
    expect(o.raws.some(([k]) => k.startsWith('route:'))).toBe(false)
  })
})

describe('resolveMovKeySelection (M8-09)', () => {
  const options = movKeyOptions(
    [
      mv({ id: '1', partner: 'Azpetrol' }),
      mv({ id: '2', type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara', in_qty: 0, out_qty: 1 }),
      mv({ id: '3', type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Naməlum', in_qty: 0, out_qty: 1 }),
    ],
    f(),
    WHS,
  )

  it('keeps a selection that is still present, in any group', () => {
    expect(resolveMovKeySelection('partner:Azpetrol', options)).toBe('partner:Azpetrol')
    expect(resolveMovKeySelection('route:Ələt → Astara', options)).toBe('route:Ələt → Astara')
    expect(resolveMovKeySelection('raw:Naməlum', options)).toBe('raw:Naməlum')
  })

  it('resets a selection that no longer exists, instead of showing an empty result', () => {
    expect(resolveMovKeySelection('partner:Yoxdur', options)).toBe('')
  })

  it('leaves an already-empty selection empty', () => {
    expect(resolveMovKeySelection('', options)).toBe('')
  })
})
