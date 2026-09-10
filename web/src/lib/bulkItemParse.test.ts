import { describe, it, expect } from 'vitest'
import { parseItemList, NORM, type BulkParseContext } from './bulkItemParse'
import { dupNormalise } from './itemFilters'
import type { ItemRow } from '../api/items.api'

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null, ...over,
})

const ctx = (over: Partial<BulkParseContext> = {}): BulkParseContext => ({
  items: [],
  allowedUnits: ['ədəd', 'kq', 'metr'],
  updateExisting: false,
  ...over,
})

/* M5-37 / M5-38 — parseItemList (index.html:5640-5688). */

describe('parseItemList — column shapes', () => {
  it('treats a single column as a name and applies the default unit', () => {
    const [r] = parseItemList('Sement M400', ctx())
    expect(r.name).toBe('Sement M400')
    expect(r.unit).toBe('ədəd')
    expect(r.st).toBe('new')
  })

  it('reads code / name / unit / price when the first column is numeric', () => {
    const [r] = parseItemList('12\tSement\tkq\t9.5', ctx())
    expect(r.code).toBe('0000012')
    expect(r.name).toBe('Sement')
    expect(r.unit).toBe('kq')
    expect(r.price).toBe(9.5)
  })

  it('reads name / unit / price when the first column is not a code', () => {
    const [r] = parseItemList('Sement\tkq\t9.5', ctx())
    expect(r.code).toBe('0000001')
    expect(r.price).toBe(9.5)
  })

  it('accepts a decimal comma', () => {
    const [r] = parseItemList('Sement\tkq\t9,5', ctx())
    expect(r.price).toBe(9.5)
  })

  it('accepts semicolon and pipe delimiters', () => {
    expect(parseItemList('Sement;kq;5', ctx())[0].price).toBe(5)
    expect(parseItemList('Sement|kq|5', ctx())[0].price).toBe(5)
  })

  it('strips a trailing dot from the unit', () => {
    expect(parseItemList('Sement\tkq.', ctx())[0].unit).toBe('kq')
  })

  it('skips a heading line', () => {
    const rows = parseItemList('Kod\tMalın adı\n12\tSement\tkq', ctx())
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Sement')
  })

  it('assigns sequential codes from the current maximum', () => {
    const rows = parseItemList('Bir\nİki', ctx({ items: [item({ code: '0000041' })] }))
    expect(rows.map((r) => r.code)).toEqual(['0000042', '0000043'])
    expect(rows.every((r) => r.auto)).toBe(true)
  })
})

describe('parseItemList — classification', () => {
  it('rejects a name shorter than 2 characters', () => {
    const [r] = parseItemList('A', ctx())
    expect(r.st).toBe('err')
    expect(r.use).toBe(false)
  })

  it('rejects a unit that is not in the reference directory', () => {
    const [r] = parseItemList('Sement\tton', ctx())
    expect(r.st).toBe('err')
    expect(r.msg).toContain('Soraqçalarda yoxdur')
  })

  it('marks an existing code as dup when not updating', () => {
    const [r] = parseItemList('1\tSement\tkq', ctx({ items: [item()] }))
    expect(r.st).toBe('dup')
    expect(r.use).toBe(false)
  })

  it('marks an existing code as upd when updating is on', () => {
    const [r] = parseItemList('1\tSement\tkq', ctx({ items: [item()], updateExisting: true }))
    expect(r.st).toBe('upd')
    expect(r.use).toBe(true)
  })

  it('detects an existing NAME and reports the stored code', () => {
    const [r] = parseItemList('Sement\tkq', ctx({ items: [item({ code: '0000077' })] }))
    expect(r.st).toBe('dup')
    expect(r.msg).toContain('0000077')
  })

  it('updates a name match to the stored code when price or unit differs', () => {
    const [r] = parseItemList('Sement\tmetr', ctx({ items: [item({ code: '0000077' })], updateExisting: true }))
    expect(r.st).toBe('upd')
    expect(r.code).toBe('0000077')
  })

  it('flags a repeated name inside the pasted list', () => {
    const rows = parseItemList('Sement\nSement', ctx())
    expect(rows[0].st).toBe('new')
    expect(rows[1].st).toBe('rep')
    expect(rows[1].use).toBe(false)
  })

  it('only marks new and upd rows for application', () => {
    const rows = parseItemList('A\nSement\nSement', ctx())
    for (const r of rows) {
      if (r.use) expect(['new', 'upd']).toContain(r.st)
    }
  })
})

/* R-F4 — NORM is NOT the duplicate-filter normaliser. */
describe('NORM vs dupNormalise', () => {
  it('NORM strips parentheses; dupNormalise does not', () => {
    expect(NORM('Boru (qara)')).toBe(NORM('Boru qara'))
    expect(dupNormalise('Boru (qara)')).not.toBe(dupNormalise('Boru qara'))
  })

  it('NORM strips a curly apostrophe and en-dash; dupNormalise does not', () => {
    expect(NORM('Boru’20')).toBe(NORM('Boru20'))
    expect(dupNormalise('Boru’20')).not.toBe(dupNormalise('Boru20'))
  })

  it('both collapse plain whitespace and hyphens', () => {
    expect(NORM('Boru - 20')).toBe(NORM('boru20'))
    expect(dupNormalise('Boru - 20')).toBe(dupNormalise('boru20'))
  })
})
