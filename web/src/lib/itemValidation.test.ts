import { describe, it, expect } from 'vitest'
import { validateItem, nextCode, similarItems, type ItemDraft, type ValidationContext } from './itemValidation'
import type { ItemRow } from '../api/items.api'

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null, ...over,
})

const draft = (over: Partial<ItemDraft> = {}): ItemDraft =>
  ({ code: '0000009', name: 'Yeni mal', unit: 'kq', category: 'Filtrlər', ...over })

const ctx = (over: Partial<ValidationContext> = {}): ValidationContext => ({
  editing: false,
  existingCodes: new Set(['0000001']),
  canEditCategory: true,
  allowedUnits: ['kq', 'ədəd', 'metr'],
  ...over,
})

describe('validateItem — code (M5-25)', () => {
  it('requires exactly 7 digits', () => {
    expect(validateItem(draft({ code: '123' }), ctx())).toBe('Kod 7 rəqəmli olmalıdır')
    expect(validateItem(draft({ code: '12345678' }), ctx())).toBe('Kod 7 rəqəmli olmalıdır')
    expect(validateItem(draft({ code: 'abcdefg' }), ctx())).toBe('Kod 7 rəqəmli olmalıdır')
  })

  it('accepts a 7-digit code', () => {
    expect(validateItem(draft(), ctx())).toBeNull()
  })

  it('rejects a duplicate code when creating', () => {
    expect(validateItem(draft({ code: '0000001' }), ctx())).toBe('Bu kod artıq mövcuddur')
  })

  it('allows the existing code when editing', () => {
    expect(validateItem(draft({ code: '0000001' }), ctx({ editing: true }))).toBeNull()
  })
})

describe('validateItem — name (M5-26)', () => {
  it('requires at least 3 characters', () => {
    expect(validateItem(draft({ name: 'ab' }), ctx())).toBe('Malın adını yazın')
    expect(validateItem(draft({ name: '  ' }), ctx())).toBe('Malın adını yazın')
  })

  it('accepts exactly 3 characters', () => {
    expect(validateItem(draft({ name: 'abc' }), ctx())).toBeNull()
  })
})

/* M5-27 — the asymmetry is deliberate (index.html:5620 and its comment):
   mandatory on CREATE, optional on EDIT where empty means NULL. */
describe('validateItem — category', () => {
  it('is mandatory when creating and the user can edit categories', () => {
    expect(validateItem(draft({ category: '' }), ctx())).toBe('Yeni mal üçün kateqoriya seçin')
  })

  it('is OPTIONAL when editing — empty means "not set" (NULL)', () => {
    expect(validateItem(draft({ category: '' }), ctx({ editing: true }))).toBeNull()
  })

  it('is not required from a user who cannot edit categories', () => {
    expect(validateItem(draft({ category: '' }), ctx({ canEditCategory: false }))).toBeNull()
  })
})

describe('validateItem — unit (M5-28)', () => {
  it('requires a unit', () => {
    expect(validateItem(draft({ unit: '' }), ctx())).toBe('Ölçü vahidini seçin')
  })

  /* The unit may only come from the reference directory; the server enforces
     the same rule in guard_item_unit(). */
  it('rejects a unit that is not in the reference directory', () => {
    expect(validateItem(draft({ unit: 'ton' }), ctx())).toBe('Ölçü vahidini seçin')
  })
})

describe('nextCode (M5-33)', () => {
  it('returns max + 1, zero-padded to 7', () => {
    expect(nextCode([item({ code: '0000001' }), item({ code: '0000042' })])).toBe('0000043')
  })

  it('starts at 0000001 for an empty directory', () => {
    expect(nextCode([])).toBe('0000001')
  })

  it('ignores a non-numeric code rather than producing NaN', () => {
    expect(nextCode([item({ code: 'ABC' }), item({ code: '0000007' })])).toBe('0000008')
  })

  it('keeps 7-character padding past the ten-thousands', () => {
    expect(nextCode([item({ code: '0012345' })])).toBe('0012346')
  })
})

describe('similarItems (M5-35)', () => {
  const items = [
    item({ code: '0000001', name: 'Sement M400' }),
    item({ code: '0000002', name: 'Sement M500' }),
    item({ code: '0000003', name: 'Armatur d12' }),
  ]

  it('returns nothing below the 4-character threshold', () => {
    expect(similarItems('sem', '0000009', items)).toEqual([])
  })

  it('finds items sharing a normalised prefix', () => {
    const out = similarItems('Sement M400', '0000009', items)
    expect(out.map((i) => i.code)).toContain('0000001')
  })

  it('never returns the item being edited itself', () => {
    const out = similarItems('Sement M400', '0000001', items)
    expect(out.map((i) => i.code)).not.toContain('0000001')
  })

  it('caps the list at four suggestions', () => {
    const many = Array.from({ length: 10 }, (_, i) => item({ code: String(i).padStart(7, '0'), name: 'Sement M40' + i }))
    expect(similarItems('Sement M400', '9999999', many).length).toBeLessThanOrEqual(4)
  })
})
