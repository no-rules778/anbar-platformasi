import { describe, it, expect } from 'vitest'
import {
  classifyNewRecords, extractNewRecords, parseNewText, isSimilar, simTokenize, isStrongToken,
} from './importItemParse'
import type { ItemRow } from '../api/items.api'

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement M400', unit: 'kq', price: 10, category: null, ...over,
})

/* index.html:5955-5973 — similarity is token-based, with category words
   stripped so two unrelated filters are not called similar. */

describe('simTokenize', () => {
  it('drops tokens shorter than three characters', () => {
    expect(simTokenize('ab cde')).toEqual(['cde'])
  })

  it('drops category words so they cannot create false similarity', () => {
    expect(simTokenize('yağ filtri')).toEqual([])
  })

  it('keeps a model token', () => {
    expect(simTokenize('Sement M400')).toContain('m400')
  })
})

describe('isStrongToken', () => {
  it('treats a token containing a digit as strong', () => {
    expect(isStrongToken('m400')).toBe(true)
  })

  it('treats a five-character word as strong', () => {
    expect(isStrongToken('bosch')).toBe(true)
  })

  it('treats a short alphabetic token as weak', () => {
    expect(isStrongToken('abc')).toBe(false)
  })
})

describe('isSimilar', () => {
  it('matches on a single strong shared token', () => {
    expect(isSimilar('Sement M400', 'Sement M400 torba')).toBe(true)
  })

  it('does NOT match two items sharing only a category word', () => {
    expect(isSimilar('yağ filtri Bosch', 'yağ filtri Mann')).toBe(false)
  })

  it('returns false when either side has no meaningful token', () => {
    expect(isSimilar('yağ', 'filtr')).toBe(false)
  })
})

describe('parseNewText / extractNewRecords (M5-40)', () => {
  it('splits on tab, semicolon and pipe', () => {
    expect(parseNewText('a\tb')).toEqual([['a', 'b']])
    expect(parseNewText('a;b')).toEqual([['a', 'b']])
    expect(parseNewText('a|b')).toEqual([['a', 'b']])
  })

  it('finds a header row and reads the named columns', () => {
    const recs = extractNewRecords([['Malın adı', 'Ölçü vahidi'], ['Sement', 'kq']])
    expect(recs).toEqual([{ name: 'Sement', unit: 'kq' }])
  })

  it('falls back to positional columns without a header', () => {
    expect(extractNewRecords([['Sement', 'kq']])).toEqual([{ name: 'Sement', unit: 'kq' }])
  })

  it('skips a fully empty row', () => {
    expect(extractNewRecords([['Malın adı', 'Ölçü'], ['', '']])).toEqual([])
  })
})

describe('classifyNewRecords (M5-42)', () => {
  it('marks a genuinely new name as new', () => {
    const [r] = classifyNewRecords([{ name: 'Tamam yeni şey', unit: 'kq' }], [])
    expect(r.st).toBe('new')
    expect(r.use).toBe(true)
  })

  it('marks an exact existing name as dup and does NOT select it', () => {
    const [r] = classifyNewRecords([{ name: 'Sement M400', unit: 'kq' }], [item()])
    expect(r.st).toBe('dup')
    expect(r.use).toBe(false)
  })

  it('marks a repeat within the same file as dup', () => {
    const rows = classifyNewRecords(
      [{ name: 'Tamam yeni şey', unit: 'kq' }, { name: 'Tamam yeni şey', unit: 'kq' }], [],
    )
    expect(rows[0].st).toBe('new')
    expect(rows[1].st).toBe('dup')
  })

  it('marks a similar name as sim but still selects it — the user decides', () => {
    const [r] = classifyNewRecords([{ name: 'Sement M400 torba', unit: 'kq' }], [item()])
    expect(r.st).toBe('sim')
    expect(r.use).toBe(true)
  })

  it('rejects a name shorter than three characters', () => {
    const [r] = classifyNewRecords([{ name: 'ab', unit: 'kq' }], [])
    expect(r.st).toBe('err')
    expect(r.use).toBe(false)
  })

  it('defaults a missing unit to ədəd and strips a trailing dot', () => {
    expect(classifyNewRecords([{ name: 'Tamam yeni şey', unit: '' }], [])[0].unit).toBe('ədəd')
    expect(classifyNewRecords([{ name: 'Tamam yeni şey', unit: 'kq.' }], [])[0].unit).toBe('kq')
  })

  /* Predicted codes are display-only; the server assigns the real ones. */
  it('predicts codes only for selected rows, continuing from the current max', () => {
    const rows = classifyNewRecords(
      [{ name: 'Tamam yeni şey', unit: 'kq' }, { name: 'ab', unit: 'kq' }],
      [item({ code: '0000041' })],
    )
    expect(rows[0].predCode).toBe('0000042')
    expect(rows[1].predCode).toBeUndefined()
  })
})
