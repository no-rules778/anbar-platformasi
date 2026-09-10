import { describe, it, expect } from 'vitest'
import { parseCsvText, extractCategoryRows } from './csv'

/* M5-44 / M5-45 — parseCsvText (index.html:5808-5822). */

describe('parseCsvText', () => {
  it('splits plain rows and columns', () => {
    expect(parseCsvText('a,b\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('keeps a comma inside a quoted field', () => {
    expect(parseCsvText('"Boru, qara",Filtrlər')).toEqual([['Boru, qara', 'Filtrlər']])
  })

  it('unescapes a doubled quote inside a quoted field', () => {
    expect(parseCsvText('"Boru ""20""",X')).toEqual([['Boru "20"', 'X']])
  })

  it('tolerates CRLF line endings', () => {
    expect(parseCsvText('a,b\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('drops blank rows', () => {
    expect(parseCsvText('a,b\n\n\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('keeps a trailing row with no newline', () => {
    expect(parseCsvText('a,b\nc,d')).toHaveLength(2)
  })

  it('returns nothing for empty input', () => {
    expect(parseCsvText('')).toEqual([])
  })
})

describe('extractCategoryRows', () => {
  it('reads a header with code and category', () => {
    const rows = parseCsvText('code,category\n0000001,Filtrlər')
    expect(extractCategoryRows(rows)).toEqual([{ code: '0000001', category: 'Filtrlər' }])
  })

  it('accepts proposed_category as the category column', () => {
    const rows = parseCsvText('code,proposed_category\n0000003,Ehtiyat')
    expect(extractCategoryRows(rows)).toEqual([{ code: '0000003', category: 'Ehtiyat' }])
  })

  it('falls back to positional columns when there is no header', () => {
    const rows = parseCsvText('0000001,Filtrlər\n0000002,Ehtiyat')
    expect(extractCategoryRows(rows)).toHaveLength(2)
  })

  /* M5-45 — codes are identifiers. Parsing one as a number would turn
     0000001 into 1 and target the wrong item, or none. */
  it('PRESERVES leading zeros in codes', () => {
    const rows = parseCsvText('code,category\n0000001,Filtrlər')
    expect(extractCategoryRows(rows)[0].code).toBe('0000001')
  })

  /* A02: a blank code is KEPT, not skipped. The original pushes every body
     row into CATIMP and lets catImpPreview() fail it on the seven-digit test
     (index.html:5824-5827), which then blocks the whole file. Dropping it here
     made a malformed file look clean and let its other rows be written. */
  it('keeps a row with no code so the caller can fail it', () => {
    const rows = parseCsvText('code,category\n,Filtrlər\n0000002,Ehtiyat')
    expect(extractCategoryRows(rows)).toEqual([
      { code: '', category: 'Filtrlər' },
      { code: '0000002', category: 'Ehtiyat' },
    ])
  })

  it('trims surrounding whitespace', () => {
    const rows = parseCsvText('code,category\n  0000001  ,  Filtrlər  ')
    expect(extractCategoryRows(rows)[0]).toEqual({ code: '0000001', category: 'Filtrlər' })
  })

  it('returns nothing for empty input', () => {
    expect(extractCategoryRows([])).toEqual([])
  })
})
