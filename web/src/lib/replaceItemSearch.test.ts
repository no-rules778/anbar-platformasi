import { describe, it, expect } from 'vitest'
import { searchReplacementItems, MIN_QUERY_LENGTH, MAX_RESULTS } from './replaceItemSearch'
import type { MovementFilterItem } from './movementFilters'

const items = (pairs: [string, string][]): Map<string, MovementFilterItem> =>
  new Map(pairs.map(([code, name]) => [code, { name, price: null }]))

const CATALOGUE = items([
  ['0000001', 'Nasos'],
  ['0000002', 'Boru'],
  ['0000003', 'Kabel'],
  ['0000004', 'Nasos qapağı'],
])

describe('searchReplacementItems — index.html:4977-4980', () => {
  it('matches on the name, case-insensitively', () => {
    expect(searchReplacementItems('nasos', CATALOGUE, '0000002').map((h) => h.code))
      .toEqual(['0000001', '0000004'])
    expect(searchReplacementItems('NASOS', CATALOGUE, '0000002').map((h) => h.code))
      .toEqual(['0000001', '0000004'])
  })

  it('matches on the code', () => {
    expect(searchReplacementItems('0000003', CATALOGUE, '0000001').map((h) => h.code))
      .toEqual(['0000003'])
  })

  /* Replacing an item with itself is not a correction: the server would write
     a counter line and an identical new line, changing the document while
     leaving the stock untouched. */
  it('EXCLUDES the current item', () => {
    const hits = searchReplacementItems('nasos', CATALOGUE, '0000001')
    expect(hits.map((h) => h.code)).toEqual(['0000004'])
    expect(hits.some((h) => h.code === '0000001')).toBe(false)
  })

  it('returns nothing below the minimum query length', () => {
    expect(MIN_QUERY_LENGTH).toBe(2)
    expect(searchReplacementItems('n', CATALOGUE, '0000002')).toEqual([])
    expect(searchReplacementItems('', CATALOGUE, '0000002')).toEqual([])
    expect(searchReplacementItems(' ', CATALOGUE, '0000002')).toEqual([])
  })

  it('caps the result list at twelve', () => {
    const many = items(
      Array.from({ length: 40 }, (_, i) => [String(i).padStart(7, '0'), 'Nasos ' + i] as [string, string]),
    )
    expect(searchReplacementItems('nasos', many, 'zzz')).toHaveLength(MAX_RESULTS)
  })

  it('trims the query', () => {
    expect(searchReplacementItems('  boru  ', CATALOGUE, '0000001').map((h) => h.code))
      .toEqual(['0000002'])
  })

  it('survives an item with no name', () => {
    const m = items([['0000009', '']])
    expect(searchReplacementItems('0000009', m, 'x').map((h) => h.code)).toEqual(['0000009'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(searchReplacementItems('tapılmayan', CATALOGUE, '0000001')).toEqual([])
  })
})
