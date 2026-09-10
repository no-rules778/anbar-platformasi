import { describe, it, expect } from 'vitest'
import { suggestCategory } from './suggestCategory'
import { ITEM_CATEGORIES } from './referenceFallbacks'

/* M5-36 / A09 — suggestCategory(), index.html:677-680. */

describe('suggestCategory', () => {
  it('matches a keyword anywhere in the name', () => {
    expect(suggestCategory('Yağ filtri 12x40', ITEM_CATEGORIES)).toBe('Filtrlər')
  })

  it('is case-insensitive', () => {
    expect(suggestCategory('NASOS 3kW', ITEM_CATEGORIES)).toBe('Nasoslar')
  })

  it('matches a Russian keyword too', () => {
    expect(suggestCategory('Масло 10W40', ITEM_CATEGORIES)).toBe('Yağlar')
  })

  it('returns an empty string when nothing matches', () => {
    expect(suggestCategory('Qeyri-müəyyən şey', ITEM_CATEGORIES)).toBe('')
  })

  it('returns an empty string for an empty name', () => {
    expect(suggestCategory('', ITEM_CATEGORIES)).toBe('')
  })

  /* The loop runs over the CATEGORY LIST, not the keyword map, so the
     directory's own order decides which of two matching categories wins.
     «Yağ filtri» contains both a Filtrlər and a Yağlar keyword; Filtrlər
     comes first in the list, so it wins. Reversing the list reverses the
     answer — pinned so a reordering is a visible decision, not a surprise. */
  it('lets the category list order break a tie between two matches', () => {
    const name = 'Yağ filtri'
    expect(suggestCategory(name, ['Filtrlər', 'Yağlar'])).toBe('Filtrlər')
    expect(suggestCategory(name, ['Yağlar', 'Filtrlər'])).toBe('Yağlar')
  })

  /* A category the Admin has hidden is not in the list passed in, so it can
     never be suggested — the suggestion cannot reintroduce a hidden value. */
  it('never suggests a category outside the list it is given', () => {
    expect(suggestCategory('Yağ filtri', ['Nasoslar'])).toBe('')
  })

  /* ' rəf' and ' oil' carry a LEADING SPACE in the original's keyword map,
     and the name is padded with a space at both ends before matching. That
     is what makes them match as words rather than inside a longer one. */
  it('matches a space-prefixed keyword at the start of a name', () => {
    expect(suggestCategory('oil filter', ['Yağlar'])).toBe('Yağlar')
  })

  it('does not match a space-prefixed keyword inside a longer word', () => {
    /* «broil» contains "oil" but not " oil". */
    expect(suggestCategory('broil', ['Yağlar'])).toBe('')
  })
})
