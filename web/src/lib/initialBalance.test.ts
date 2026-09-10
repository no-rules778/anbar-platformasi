import { describe, expect, it } from 'vitest'
import {
  buildInitialBalanceRows,
  filterInitialBalanceRows,
  isOpeningMovement,
  modeLabel,
  modeQtyColumn,
  sortInitialBalanceRows,
  warehouseFromLabel,
} from './initialBalance'
import type { InitialBalanceMovement, InitialBalanceRow } from './initialBalance'
import type { WarehouseBalance } from './itemIndex'
import type { ItemRow } from '../api/items.api'

/* M9-70…M9-77, M9-79, M9-79a, M9-79b, M9-84 (D-J4) and M9-55 —
   index.html:1898-1952, 1959-2048, 2240-2253. */

const WHS = ['Elet', 'Astara', 'Xocahesen', 'Harmony', 'Ofis']

const mov = (over: Partial<InitialBalanceMovement> = {}): InitialBalanceMovement => ({
  item_code: '0000001',
  warehouse: 'Elet',
  date: '2026-01-01',
  in_qty: 0,
  out_qty: 0,
  partner: null,
  channel: null,
  type: 'Satınalma',
  doc_num: null,
  created_at: null,
  ...over,
})

/** An opening row marked the confirmed current way — type + partner. */
const opening = (over: Partial<InitialBalanceMovement> = {}): InitialBalanceMovement =>
  mov({ type: 'Əvvələ qalıq', partner: 'Anbar qalığı', in_qty: 100, ...over })

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null, ...over,
})

const bal = (over: Partial<WarehouseBalance> = {}): WarehouseBalance => ({
  w: 'Elet', c: '0000001', in: 0, out: 0, n: 0, q: 0,
  last: '2026-01-01', first: '2026-01-01', price: 10, val: 0,
  name: 'Sement', unit: 'kq', ...over,
})

const build = (
  movements: InitialBalanceMovement[],
  items: ItemRow[] = [item()],
  balances: WarehouseBalance[] = [],
) => buildInitialBalanceRows(movements, items, balances, WHS)

const row = (over: Partial<InitialBalanceRow> = {}): InitialBalanceRow => ({
  c: '0000001', name: 'Sement', w: 'Elet', unit: 'kq',
  initial_qty: 0, current_qty: 0, opening_date: '2026-01-01', last: '2026-01-01', ...over,
})

/* ---------------- M9-70 — strict type, tolerant marker ---------------- */

describe('opening-row recognition — M9-70', () => {
  it('matches the exact type with the confirmed partner marker', () => {
    expect(isOpeningMovement(opening())).toBe(true)
  })

  /* The TYPE half is strict: NFKC + trim + lowercase, but NO ğ/q folding.
     This fails against an implementation that folds ğ→q on the type too. */
  it('rejects a ğ/q variant of the TYPE — folding is partner-only', () => {
    expect(isOpeningMovement(opening({ type: 'Əvvələ qaliq' }))).toBe(false)
    expect(isOpeningMovement(opening({ type: 'Əvvələ qalığ' }))).toBe(false)
  })

  it('tolerates case and surrounding whitespace on the type', () => {
    expect(isOpeningMovement(opening({ type: '   Əvvələ qalıq   ' }))).toBe(true)
    expect(isOpeningMovement(opening({ type: 'Əvvələ Qalıq' }))).toBe(true)
  })

  /* The exact limit of that tolerance, pinned deliberately. `toLowerCase()` is
     locale-INDEPENDENT: Azerbaijani dotless «ı» uppercases to «I», which then
     lowercases back to dotted «i», so an all-caps «ƏVVƏLƏ QALIQ» normalises to
     «əvvələ qaliq» and does NOT match. The legacy `_normBase` (index.html:1907)
     has exactly this property — it is ported behaviour, not a port defect, and
     no all-caps type value exists in the data. */
  it('does NOT match an all-caps type — the dotless-I round-trip is lossy', () => {
    expect('Əvvələ qalıq'.toUpperCase().toLowerCase()).toBe('əvvələ qaliq')
    expect(isOpeningMovement(opening({ type: 'ƏVVƏLƏ QALIQ' }))).toBe(false)
  })

  it('rejects an ordinary movement type carrying the marker', () => {
    expect(isOpeningMovement(opening({ type: 'Satınalma' }))).toBe(false)
  })

  it('accepts all three historical partner spellings', () => {
    for (const p of ['Əvvələ anbar qalıqı', 'Əvvələ anbar qalığı', 'Anbar qalığı']) {
      expect(isOpeningMovement(opening({ partner: p }))).toBe(true)
    }
  })

  /* ğ/q normalisation boundary — the two legacy import spellings differ by
     exactly this letter and must both match. */
  it('folds ğ→q on the marker so both import spellings match', () => {
    expect(isOpeningMovement(opening({ partner: 'Əvvələ anbar qalığı' }))).toBe(true)
    expect(isOpeningMovement(opening({ partner: 'Əvvələ anbar qalıqı' }))).toBe(true)
  })

  it('requires BOTH halves — a marked partner with a wrong type is not opening', () => {
    expect(isOpeningMovement(mov({ type: 'Qaytarma', partner: 'Anbar qalığı' }))).toBe(false)
  })
})

/* ---------------- M9-84 / D-J4 — marker in partner OR channel ---------------- */

describe('D-J4 — marker in partner or channel (M9-84)', () => {
  it('reconstructs a row whose marker is in the PARTNER (unchanged legacy behaviour)', () => {
    const rows = build([opening({ partner: 'Anbar qalığı', channel: null })])
    expect(rows).toHaveLength(1)
    expect(rows[0].initial_qty).toBe(100)
  })

  /* THE D-J4 CORRECTION. Legacy read (2001) tested the partner only, so this
     row was never reconstructed even though the write guard (1926-1928)
     recognises it. This test fails against the un-widened legacy read. */
  it('reconstructs a CHANNEL-ONLY opening row — the corrected read', () => {
    const rows = build([opening({ partner: null, channel: 'Anbar qalığı' })])
    expect(rows).toHaveLength(1)
    expect(rows[0].initial_qty).toBe(100)
    expect(rows[0].opening_warehouse ?? rows[0].w).toBe('Elet')
  })

  it('accepts the channel marker in every historical spelling', () => {
    for (const ch of ['Əvvələ anbar qalıqı', 'Əvvələ anbar qalığı', 'Anbar qalığı']) {
      expect(isOpeningMovement(opening({ partner: null, channel: ch }))).toBe(true)
    }
  })

  /* The negative control that makes the pair above non-vacuous: an
     implementation that accepted ANY partner/channel would fail here. */
  it('does not reconstruct an unrelated partner AND channel', () => {
    const rows = build([opening({ partner: 'Azərsun MMC', channel: 'Nağd alış' })])
    expect(rows).toHaveLength(0)
  })

  it('treats an absent channel field as simply carrying no marker', () => {
    const { channel: _omitted, ...withoutChannel } = opening({ partner: 'Azərsun MMC' })
    expect(isOpeningMovement(withoutChannel as InitialBalanceMovement)).toBe(false)
  })
})

/* ---------------- M9-71 — source ordering ---------------- */

describe('movement ordering — M9-71', () => {
  /* A same-date transfer must have its OUT leg processed first, or the IN leg
     finds no pending lot and the layer is misclassified as `later`. Feeding
     the legs in reverse input order proves the sort, not the input. */
  it('processes a transfer OUT leg before same-date rows, whatever the input order', () => {
    const rows = build([
      mov({ type: 'Yerdəyişmə', warehouse: 'Astara', in_qty: 40, partner: 'Elet anbarı', date: '2026-02-01', doc_num: 'D1' }),
      mov({ type: 'Yerdəyişmə', warehouse: 'Elet', out_qty: 40, partner: 'Astara anbarına', date: '2026-02-01', doc_num: 'D1' }),
      opening({ in_qty: 100, date: '2026-01-01' }),
    ])
    const astara = rows.find((r) => r.w === 'Astara')
    expect(astara?.current_qty).toBe(40)
    expect(astara?.initial_qty).toBe(0)
  })

  it('breaks a same-date, same-kind tie by created_at', () => {
    const rows = build([
      mov({ out_qty: 10, date: '2026-01-01', created_at: '2026-01-01T11:00:00Z' }),
      opening({ in_qty: 10, date: '2026-01-01', created_at: '2026-01-01T10:00:00Z' }),
    ])
    /* Input is deliberately reversed: the timestamp sort must restore the
       opening first, so the outbound consumes it. */
    expect(rows[0].initial_qty).toBe(10)
    expect(rows[0].current_qty).toBe(0)
  })

  it('orders by date before applying the same-date transfer-OUT priority', () => {
    const rows = build([
      mov({ type: 'Yerdəyişmə', out_qty: 10, date: '2026-02-01', doc_num: 'LATE' }),
      opening({ in_qty: 10, date: '2026-01-01' }),
    ])
    expect(rows[0].initial_qty).toBe(10)
    expect(rows[0].current_qty).toBe(0)
  })
})

/* ---------------- M9-72 — FIFO ---------------- */

describe('FIFO consumption — M9-72', () => {
  it('consumes the oldest lot first, so a later purchase does not shield the opening', () => {
    const rows = build([
      opening({ in_qty: 100, date: '2026-01-01' }),
      mov({ in_qty: 50, date: '2026-02-01' }),
      mov({ out_qty: 60, date: '2026-03-01' }),
    ])
    /* 60 comes off the 100 opening lot: 40 opening survives. */
    expect(rows[0].initial_qty).toBe(100)
    expect(rows[0].current_qty).toBe(40)
  })

  it('only opening-origin consumption reduces current_qty', () => {
    const rows = build([
      mov({ in_qty: 50, date: '2026-01-01' }),
      opening({ in_qty: 100, date: '2026-02-01' }),
      mov({ out_qty: 50, date: '2026-03-01' }),
    ])
    /* The earlier `later` lot is consumed first; the opening is untouched. */
    expect(rows[0].current_qty).toBe(100)
  })

  it('cannot drive current_qty below zero', () => {
    const rows = build([
      opening({ in_qty: 10, date: '2026-01-01' }),
      mov({ out_qty: 999, date: '2026-02-01' }),
    ])
    expect(rows[0].current_qty).toBe(0)
    expect(rows[0].initial_qty).toBe(10)
  })
})

/* ---------------- M9-73 / M9-74 / M9-75 — transfers ---------------- */

describe('transfers — M9-73, M9-74, M9-75', () => {
  const transferPair = (over: { doc?: string | null; date?: string } = {}) => [
    opening({ in_qty: 100, date: '2026-01-01' }),
    mov({
      type: 'Yerdəyişmə', warehouse: 'Elet', out_qty: 30, partner: 'Astara anbarına',
      date: over.date ?? '2026-02-01', doc_num: over.doc ?? 'DOC-1',
    }),
    mov({
      type: 'Yerdəyişmə', warehouse: 'Astara', in_qty: 30, partner: 'Elet anbarı',
      date: over.date ?? '2026-02-01', doc_num: over.doc ?? 'DOC-1',
    }),
  ]

  it('moves the layer without creating a second initial_qty — M9-73', () => {
    const rows = build(transferPair())
    const elet = rows.find((r) => r.w === 'Elet')
    const astara = rows.find((r) => r.w === 'Astara')
    expect(elet?.initial_qty).toBe(100)
    expect(elet?.current_qty).toBe(70)
    /* The destination is «Cari qalıq» only — no duplicated İlkin miqdar. */
    expect(astara?.initial_qty).toBe(0)
    expect(astara?.current_qty).toBe(30)
    /* Total opening quantity is conserved across the two warehouses. */
    expect((elet?.current_qty ?? 0) + (astara?.current_qty ?? 0)).toBe(100)
  })

  it('carries the ORIGIN warehouse and opening date to the destination — M9-75', () => {
    const rows = build(transferPair())
    const astara = rows.find((r) => r.w === 'Astara')
    expect(astara?.opening_warehouse).toBe('Elet')
    expect(astara?.opening_date).toBe('2026-01-01')
  })

  it('pairs document-less legacy legs by date + item + from + to — M9-74', () => {
    const rows = build(transferPair({ doc: null }))
    const astara = rows.find((r) => r.w === 'Astara')
    expect(astara?.current_qty).toBe(30)
    expect(astara?.opening_warehouse).toBe('Elet')
  })

  /* The control for the legacy key: legs that disagree on the date do not pair,
     so the destination receives a `later` lot and never appears as an opening
     position. This fails against a key that ignores the date. */
  it('does not pair document-less legs whose dates differ', () => {
    const rows = build([
      opening({ in_qty: 100, date: '2026-01-01' }),
      mov({ type: 'Yerdəyişmə', warehouse: 'Elet', out_qty: 30, partner: 'Astara anbarına', date: '2026-02-01', doc_num: null }),
      mov({ type: 'Yerdəyişmə', warehouse: 'Astara', in_qty: 30, partner: 'Elet anbarı', date: '2026-03-05', doc_num: null }),
    ])
    expect(rows.find((r) => r.w === 'Astara')).toBeUndefined()
    expect(rows.find((r) => r.w === 'Elet')?.current_qty).toBe(70)
  })

  it('does not pair documented legs whose document numbers differ', () => {
    const rows = build([
      opening({ in_qty: 100, date: '2026-01-01' }),
      mov({ type: 'Yerdəyişmə', warehouse: 'Elet', out_qty: 30, partner: 'Astara anbarına', date: '2026-02-01', doc_num: 'DOC-A' }),
      mov({ type: 'Yerdəyişmə', warehouse: 'Astara', in_qty: 30, partner: 'Elet anbarı', date: '2026-02-01', doc_num: 'DOC-B' }),
    ])
    expect(rows.find((r) => r.w === 'Astara')).toBeUndefined()
  })

  it('keeps item code load-bearing even when document numbers match', () => {
    const rows = build([
      opening({ item_code: '0000001', in_qty: 100, date: '2026-01-01' }),
      mov({ type: 'Yerdəyişmə', item_code: '0000001', warehouse: 'Elet', out_qty: 30, partner: 'Astara anbarına', date: '2026-02-01', doc_num: 'DOC-1' }),
      mov({ type: 'Yerdəyişmə', item_code: '0000002', warehouse: 'Astara', in_qty: 30, partner: 'Elet anbarı', date: '2026-02-01', doc_num: 'DOC-1' }),
    ])
    expect(rows.find((r) => r.w === 'Astara' && r.c === '0000002')).toBeUndefined()
  })

  /* The last unvaried component of the document-less key. `date`, `from` and
     `to` each have their own control above; without this one, a key built as
     `legacy|<date>|<from>|<to>` (item code omitted) would still pass them all. */
  it('keeps the item code load-bearing in a document-less key', () => {
    const rows = build([
      opening({ item_code: '0000001', in_qty: 100, date: '2026-01-01' }),
      mov({ type: 'Yerdəyişmə', item_code: '0000001', warehouse: 'Elet', out_qty: 30, partner: 'Astara anbarına', date: '2026-02-01', doc_num: null }),
      mov({ type: 'Yerdəyişmə', item_code: '0000002', warehouse: 'Astara', in_qty: 30, partner: 'Elet anbarı', date: '2026-02-01', doc_num: null }),
    ])
    expect(rows.find((r) => r.w === 'Astara' && r.c === '0000002')).toBeUndefined()
  })

  it('keeps source and destination load-bearing in a document-less key', () => {
    const rows = build([
      opening({ in_qty: 100, date: '2026-01-01' }),
      mov({ type: 'Yerdəyişmə', warehouse: 'Elet', out_qty: 30, partner: 'Astara anbarına', date: '2026-02-01', doc_num: null }),
      mov({ type: 'Yerdəyişmə', warehouse: 'Harmony', in_qty: 30, partner: 'Elet anbarı', date: '2026-02-01', doc_num: null }),
    ])
    expect(rows.find((r) => r.w === 'Harmony')).toBeUndefined()
  })

  it('recovers the warehouse from any declension of the label — M9-75', () => {
    expect(warehouseFromLabel('Astara anbarına', WHS)).toBe('Astara')
    expect(warehouseFromLabel('Elet anbarı', WHS)).toBe('Elet')
    expect(warehouseFromLabel('Xocahesen anbarından', WHS)).toBe('Xocahesen')
  })

  it('resolves a label to the canonical DB.whs spelling regardless of case', () => {
    expect(warehouseFromLabel('  ASTARA ANBARINA ', WHS)).toBe('Astara')
  })

  it('falls back to the stripped label when no warehouse matches', () => {
    expect(warehouseFromLabel('Naməlum anbarına', WHS)).toBe('Naməlum')
  })
})

/* ---------------- M9-76 — dates ---------------- */

describe('dates — M9-76', () => {
  it('keeps the EARLIEST opening date across several opening rows', () => {
    const rows = build([
      opening({ in_qty: 10, date: '2026-05-01' }),
      opening({ in_qty: 10, date: '2026-01-15' }),
      opening({ in_qty: 10, date: '2026-03-01' }),
    ])
    expect(rows[0].opening_date).toBe('2026-01-15')
    expect(rows[0].initial_qty).toBe(30)
  })

  it('raises `last` from IX.bal when the balance is more recent', () => {
    const rows = build(
      [opening({ in_qty: 10, date: '2026-01-01' })],
      [item()],
      [bal({ w: 'Elet', c: '0000001', last: '2026-08-30' })],
    )
    expect(rows[0].last).toBe('2026-08-30')
  })

  /* `last` is RAISED, never lowered — the control for the comparison direction. */
  it('does not lower `last` when IX.bal is older', () => {
    const rows = build(
      [opening({ in_qty: 10, date: '2026-06-01' })],
      [item()],
      [bal({ w: 'Elet', c: '0000001', last: '2026-01-01' })],
    )
    expect(rows[0].last).toBe('2026-06-01')
  })
})

/* ---------------- catalogue lookup ---------------- */

describe('catalogue lookup', () => {
  it('takes name and unit from the item record', () => {
    const rows = build([opening()], [item({ name: 'Mismar', unit: 'ədəd' })])
    expect(rows[0].name).toBe('Mismar')
    expect(rows[0].unit).toBe('ədəd')
  })

  it('marks an item missing from the catalogue with the legacy placeholder', () => {
    const rows = build([opening({ item_code: '9999999' })], [])
    expect(rows[0].name).toBe('(nomenklaturada yoxdur: 9999999)')
    expect(rows[0].unit).toBe('')
  })

  it('maps a null unit to an empty string', () => {
    const rows = build([opening()], [item({ unit: null })])
    expect(rows[0].unit).toBe('')
  })

  it('uses the legacy missing-item label when a catalogue name is empty', () => {
    const rows = build([opening()], [item({ name: '' })])
    expect(rows[0].name).toBe('(nomenklaturada yoxdur: 0000001)')
  })
})

/* ---------------- M9-77 / M9-79 / M9-79a / M9-79b — the view filter ---------------- */

describe('view filter — M9-77, M9-79, M9-79a, M9-79b', () => {
  const rows = [
    row({ c: '0000001', name: 'Sement', w: 'Elet', initial_qty: 100, current_qty: 0 }),
    row({ c: '0000002', name: 'Mismar', w: 'Astara', initial_qty: 0, current_qty: 40 }),
    row({ c: '0000003', name: 'Boya', w: 'Elet', initial_qty: 5, current_qty: 5 }),
  ]

  it('«İlkin miqdar» keeps only initial_qty > 1e-9 — M9-77', () => {
    const out = filterInitialBalanceRows(rows, { q: '', w: '', mode: 'initial' })
    expect(out.map((r) => r.c)).toEqual(['0000001', '0000003'])
  })

  it('«Cari qalıq» keeps only current_qty > 1e-9 — M9-77', () => {
    const out = filterInitialBalanceRows(rows, { q: '', w: '', mode: 'current' })
    expect(out.map((r) => r.c)).toEqual(['0000002', '0000003'])
  })

  /* Strictly greater than the epsilon — the equality case is EXCLUDED, unlike
     the current view's `zero` segment. Below / equal / above. */
  it('excludes a quantity exactly at the epsilon, and below it', () => {
    const edge = [
      row({ c: 'BELOW', initial_qty: 1e-12 }),
      row({ c: 'EQUAL', initial_qty: 1e-9 }),
      row({ c: 'ABOVE', initial_qty: 1.0000000000000003e-9 }),
    ]
    const out = filterInitialBalanceRows(edge, { q: '', w: '', mode: 'initial' })
    expect(out.map((r) => r.c)).toEqual(['ABOVE'])
  })

  it('excludes a NEGATIVE quantity from both modes', () => {
    const neg = [row({ c: 'NEG', initial_qty: -5, current_qty: -5 })]
    expect(filterInitialBalanceRows(neg, { q: '', w: '', mode: 'initial' })).toHaveLength(0)
    expect(filterInitialBalanceRows(neg, { q: '', w: '', mode: 'current' })).toHaveLength(0)
  })

  it('a named warehouse filters by exact match — M9-79a', () => {
    const out = filterInitialBalanceRows(rows, { q: '', w: 'Elet', mode: 'initial' })
    expect(out.map((r) => r.c)).toEqual(['0000001', '0000003'])
  })

  /* `__sum` is NOT a merge here — it means "no warehouse filter". This fails
     against an implementation that treats it as a literal warehouse name
     (which would match nothing) or that merges rows by code. */
  it('treats `__sum` as no warehouse filter, not as a merge — M9-79', () => {
    const twoWarehouses = [
      row({ c: 'SAME', w: 'Elet', initial_qty: 2 }),
      row({ c: 'SAME', w: 'Astara', initial_qty: 3 }),
    ]
    const out = filterInitialBalanceRows(twoWarehouses, { q: '', w: '__sum', mode: 'initial' })
    expect(out).toHaveLength(2)
    expect(out.map((r) => `${r.w}|${r.c}|${r.initial_qty}`))
      .toEqual(['Elet|SAME|2', 'Astara|SAME|3'])
  })

  it('searches the `name + " " + code` haystack — M9-79b', () => {
    expect(filterInitialBalanceRows(rows, { q: 'sement', w: '', mode: 'initial' }).map((r) => r.c))
      .toEqual(['0000001'])
    expect(filterInitialBalanceRows(rows, { q: '0000003', w: '', mode: 'initial' }).map((r) => r.c))
      .toEqual(['0000003'])
    expect(filterInitialBalanceRows(rows, { q: 'sement 0000001', w: '', mode: 'initial' }))
      .toHaveLength(1)
  })

  it('an empty query filters nothing', () => {
    expect(filterInitialBalanceRows(rows, { q: '', w: '', mode: 'initial' })).toHaveLength(2)
  })

  it('applies search, warehouse and mode together', () => {
    const out = filterInitialBalanceRows(rows, { q: 'boya', w: 'Elet', mode: 'current' })
    expect(out.map((r) => r.c)).toEqual(['0000003'])
  })

  it('returns an empty array for empty input', () => {
    expect(filterInitialBalanceRows([], { q: '', w: '', mode: 'initial' })).toEqual([])
  })
})

/* ---------------- M9-55 — the opening-view sort ---------------- */

describe('opening-view sort — M9-55', () => {
  const rows = [
    row({ c: 'A', name: 'Ağac', initial_qty: 10, current_qty: 90, last: '2025-01-01' }),
    row({ c: 'B', name: 'Çınqıl', initial_qty: 90, current_qty: 10, last: '2026-06-30' }),
  ]

  /* BOTH `val` and `q` read the ACTIVE quantity column — there is no value
     figure in this view. The two modes must therefore order oppositely. */
  it('`val` sorts by the active quantity column, descending', () => {
    expect(sortInitialBalanceRows(rows, 'val', 'initial').map((r) => r.c)).toEqual(['B', 'A'])
    expect(sortInitialBalanceRows(rows, 'val', 'current').map((r) => r.c)).toEqual(['A', 'B'])
  })

  it('`q` behaves identically to `val` here', () => {
    expect(sortInitialBalanceRows(rows, 'q', 'initial').map((r) => r.c)).toEqual(['B', 'A'])
    expect(sortInitialBalanceRows(rows, 'q', 'current').map((r) => r.c)).toEqual(['A', 'B'])
  })

  it('`name` sorts ascending under the az collation', () => {
    const localeRows = [row({ c: 'Z', name: 'Zəfər' }), row({ c: 'Ə', name: 'Ərik' })]
    expect(localeRows.slice().sort((a, b) => a.name < b.name ? -1 : 1).map((r) => r.c))
      .toEqual(['Z', 'Ə'])
    expect(sortInitialBalanceRows(localeRows, 'name', 'initial').map((r) => r.c))
      .toEqual(['Ə', 'Z'])
  })

  it('`last` sorts by date descending', () => {
    expect(sortInitialBalanceRows(rows, 'last', 'initial').map((r) => r.c)).toEqual(['B', 'A'])
  })

  /* THE fallback difference from the current view: `name`, NOT `val`. This
     fails against a copy of `balanceFilters`'s `cmp[sort] || cmp.val`. */
  it('falls back to NAME for an unknown sort key, not to the quantity', () => {
    expect(sortInitialBalanceRows(rows, 'nonsense', 'initial').map((r) => r.c)).toEqual(['A', 'B'])
    /* Under a val fallback this would be ['B','A'] in initial mode. */
    expect(sortInitialBalanceRows(rows, '', 'initial').map((r) => r.c)).toEqual(['A', 'B'])
  })

  it('does not mutate the caller’s array', () => {
    const input = rows.slice()
    sortInitialBalanceRows(input, 'val', 'initial')
    expect(input.map((r) => r.c)).toEqual(['A', 'B'])
  })
})

/* ---------------- mode helpers (M9-78 supplies this label) ---------------- */

describe('mode helpers', () => {
  it('maps each mode to its quantity column and label', () => {
    expect(modeQtyColumn('initial')).toBe('initial_qty')
    expect(modeQtyColumn('current')).toBe('current_qty')
    expect(modeLabel('initial')).toBe('İlkin miqdar')
    expect(modeLabel('current')).toBe('Cari qalıq')
  })
})

/* ---------------- empty and malformed input ---------------- */

describe('empty and malformed input', () => {
  it('returns no rows for no movements', () => {
    expect(build([])).toEqual([])
  })

  it('returns no rows when nothing is marked as an opening balance', () => {
    expect(build([mov({ in_qty: 50 }), mov({ out_qty: 10 })])).toEqual([])
  })

  it('treats null quantities as zero', () => {
    const rows = build([opening({ in_qty: null, out_qty: null })])
    /* The row is still recognised, but contributes nothing. */
    expect(rows).toHaveLength(1)
    expect(rows[0].initial_qty).toBe(0)
    expect(rows[0].current_qty).toBe(0)
  })

  it('leaves the opening date empty for an undated opening row', () => {
    const rows = build([opening({ date: null })])
    expect(rows[0].opening_date).toBe('')
  })

  it('ignores an unparseable created_at rather than poisoning the sort', () => {
    const rows = build([
      opening({ in_qty: 10, date: '2026-01-01', created_at: 'not-a-date' }),
      mov({ out_qty: 4, date: '2026-01-01', created_at: 'also-bad' }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].initial_qty).toBe(10)
  })

  it('handles an opening row for an item with no catalogue and no balance', () => {
    const rows = buildInitialBalanceRows([opening({ item_code: '5555555' })], [], [], WHS)
    expect(rows).toHaveLength(1)
    expect(rows[0].c).toBe('5555555')
    expect(rows[0].last).toBe('2026-01-01')
  })
})
