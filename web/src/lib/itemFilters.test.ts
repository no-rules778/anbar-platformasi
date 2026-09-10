import { describe, it, expect } from 'vitest'
import { filterItems, duplicateCodes, dupNormalise, EMPTY_ITEM_FILTERS, type ItemListFilters } from './itemFilters'
import { refEq } from './refEq'
import type { ItemRow } from '../api/items.api'
import type { ItemTotals } from './itemIndex'

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null, ...over,
})

const totals = (over: Partial<ItemTotals> = {}): ItemTotals =>
  ({ in: 0, out: 0, n: 1, last: '', q: 0, price: 0, val: 0, ...over })

const f = (over: Partial<ItemListFilters> = {}): ItemListFilters => ({ ...EMPTY_ITEM_FILTERS, ...over })
const noIndex = new Map<string, ItemTotals>()

describe('search (M5-07)', () => {
  const items = [
    item({ code: '0000001', name: 'Sement M400' }),
    item({ code: '0000002', name: 'Armatur d12' }),
  ]

  it('matches on the name', () => {
    expect(filterItems(items, f({ q: 'armatur' }), noIndex).map((i) => i.code)).toEqual(['0000002'])
  })

  it('matches on the code', () => {
    expect(filterItems(items, f({ q: '0000001' }), noIndex).map((i) => i.code)).toEqual(['0000001'])
  })

  it('matches across the name+code join, as the original concatenates them', () => {
    expect(filterItems(items, f({ q: 'm400' }), noIndex)).toHaveLength(1)
  })

  it('returns everything for an empty query', () => {
    expect(filterItems(items, f(), noIndex)).toHaveLength(2)
  })
})

describe('nop — «Qiyməti yox» (M5-08)', () => {
  /* The original tests `if (i.price) return false`, a FALSY test, so 0 and
     null are both "no price". */
  it('includes both a null price and a zero price', () => {
    const items = [
      item({ code: '1', price: null }),
      item({ code: '2', price: 0 }),
      item({ code: '3', price: 5 }),
    ]
    expect(filterItems(items, f({ only: 'nop' }), noIndex).map((i) => i.code)).toEqual(['1', '2'])
  })
})

describe('nomv — «Hərəkəti yox» (M5-09)', () => {
  it('keeps only items absent from the movement index', () => {
    const items = [item({ code: '1' }), item({ code: '2' })]
    const byItem = new Map([['1', totals()]])
    expect(filterItems(items, f({ only: 'nomv' }), byItem).map((i) => i.code)).toEqual(['2'])
  })

  /* Ties M5-09 to M5-03: an all-cancelled item never enters byItem, so it
     must surface here. */
  it('includes an item whose movements were all cancelled (absent from the index)', () => {
    const items = [item({ code: '1' })]
    expect(filterItems(items, f({ only: 'nomv' }), new Map()).map((i) => i.code)).toEqual(['1'])
  })
})

describe('dup — «Oxşar adlar» (M5-10)', () => {
  it('flags EVERY code in a group, not just the later ones', () => {
    const items = [
      item({ code: '1', name: 'Sement M400' }),
      item({ code: '2', name: 'sement/m400' }),
      item({ code: '3', name: 'Armatur' }),
    ]
    expect(filterItems(items, f({ only: 'dup' }), noIndex).map((i) => i.code)).toEqual(['1', '2'])
  })

  it('does not flag a unique name', () => {
    const items = [item({ code: '1', name: 'Sement' }), item({ code: '2', name: 'Armatur' })]
    expect(duplicateCodes(items).size).toBe(0)
  })

  it('groups names differing only by whitespace and punctuation', () => {
    expect(dupNormalise('Sement M400')).toBe(dupNormalise('sement/m.400'))
    expect(dupNormalise("Boru 20'")).toBe(dupNormalise('boru-20'))
  })

  /* R-F4: the three normalisers are deliberately different. This pins a pair
     that `dup` groups but `refEq` does not — proof that reusing REF_EQ here
     would change which items are reported as duplicates. */
  it('groups a pair that REF_EQ would treat as different (R-F4)', () => {
    const a = 'Sement M400'
    const b = 'Sement/M400'
    expect(dupNormalise(a)).toBe(dupNormalise(b))
    expect(refEq(a, b)).toBe(false)
  })

  /* The bulk-import normaliser (NORM, index.html:5638) additionally strips
     parentheses, backtick, curly apostrophe and en/em dashes. `dup` does NOT,
     so this pair groups under NORM but stays distinct under dup. */
  it('does NOT group a parenthesised pair that the bulk NORM would merge (R-F4)', () => {
    expect(dupNormalise('Boru (qara)')).not.toBe(dupNormalise('Boru qara'))
  })
})

describe('filters combine with search', () => {
  it('applies the query and the segment together', () => {
    const items = [
      item({ code: '1', name: 'Sement', price: null }),
      item({ code: '2', name: 'Armatur', price: null }),
    ]
    expect(filterItems(items, f({ q: 'sement', only: 'nop' }), noIndex).map((i) => i.code)).toEqual(['1'])
  })
})
