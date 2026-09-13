import { describe, expect, it } from 'vitest'
import {
  AZP_IMPORT_BLOCKED_MESSAGE, azLower, azpImportBlocked, azpNewCards,
  azpNorm, azpParseSheet, type AzpAoa,
} from './azpImportParse'

/* T4 — M17-90 … M17-94, plus M17-88's blocking predicate.

   SYNTHETIC FIXTURES ONLY. Every sheet below is built in this file. No real
   Azpetrol or Araz workbook is read, no TEST or production data is touched,
   and no import is executed — the parser is pure, so its whole contract is
   observable from an array of arrays.

   CODE VERIFIED evidence only. That the SERVER would accept a parsed batch is
   M17-88/M17-89, BLOCKED; nothing here can satisfy them. */

/** An Azpetrol sheet: no date column, blocks of Mədaxil / Y/D / Kart balansı. */
function azpetrolSheet(): AzpAoa {
  return [
    /* row 0 — holder, merged above the block                               */
    [null, 'Layihə A', null, null],
    /* row 1 — card number                                                  */
    [null, '0012', null, null],
    /* row 2 — the header row                                               */
    ['s/s', 'Mədaxil', 'Y/D', 'Kart balansı'],
    [1, 100, null, 70],
    [2, null, 30, null],
  ]
}

describe('azLower — the Azerbaijani lowercaser (M17-90)', () => {
  /* The defect this exists for: JS decomposes dotted İ, so the plain
     lowercase of «CƏMİ» does NOT match /^cəmi$/. Proven by contrast. */
  it('maps dotted İ to a plain i, which toLowerCase does not', () => {
    expect(azLower('CƏMİ')).toBe('cəmi')
    /* The control — without the replacement the string is two code points
       longer and the total pattern misses it. */
    expect('CƏMİ'.toLowerCase()).not.toBe('cəmi')
    expect('CƏMİ'.toLowerCase().length).toBeGreaterThan('cəmi'.length)
  })

  it('maps dotless I to ı, not to i', () => {
    expect(azLower('I')).toBe('ı')
    expect(azLower('KART BALANSI')).toBe('kart balansı')
  })

  it('treats null and undefined as an empty string', () => {
    expect(azLower(null)).toBe('')
    expect(azLower(undefined)).toBe('')
  })

  it('azpNorm additionally collapses and trims whitespace', () => {
    expect(azpNorm('  Kart   BALANSI  ')).toBe('kart balansı')
  })
})

describe('azpParseSheet — structure (M17-91, M17-92)', () => {
  it('reads a single Azpetrol block', () => {
    const p = azpParseSheet('azpetrol', azpetrolSheet())
    expect(p.errs).toEqual([])
    expect(p.cards).toHaveLength(1)
    expect(p.cards[0].card_no).toBe('0012')
    expect(p.cards[0].holder).toBe('Layihə A')
    expect(p.cards[0].excel_balance).toBe(70)
    expect(p.cards[0].medaxil).toBe(100)
    expect(p.cards[0].mexaric).toBe(30)
    expect(p.cards[0].parsed_balance).toBe(70)
    expect(p.rows).toEqual([
      { card_no: '0012', kind: 'medaxil', amount: 100, op_date: null, vat_included: false },
      { card_no: '0012', kind: 'mexaric', amount: 30, op_date: null, vat_included: false },
    ])
  })

  /* M17-91 — the balance column is OPTIONAL; the Mədaxil+out pair is not. */
  it('accepts a block with no balance column', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D'], [1, 50, null],
    ])
    expect(p.cards).toHaveLength(1)
    expect(p.cards[0].excel_balance).toBeNull()
    expect(p.rows).toHaveLength(1)
  })

  /* A «Mədaxil» caption NOT followed by an out column opens no block. */
  it('throws when no Mədaxil+out pair exists', () => {
    expect(() => azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Qeyd'], [1, 50, null],
    ])).toThrow('Kart bloku tapılmadı (Mədaxil + Y/D cütü yoxdur).')
  })

  it('throws when there is no header row at all', () => {
    expect(() => azpParseSheet('azpetrol', [['a', 'b'], ['c', 'd']]))
      .toThrow('Başlıq sətri tapılmadı — “Mədaxil” sütunu yoxdur.')
  })

  it('names the module out label in the missing-block message', () => {
    expect(() => azpParseSheet('araz', [
      [null, 'Obyekt'], [null, 'A-1'], ['Tarix', 's/s', 'Mədaxil', 'Qeyd'],
    ])).toThrow('Kart bloku tapılmadı (Mədaxil + Məxaric cütü yoxdur).')
  })

  /* M17-92 — THE defect this boundary exists for. The second block's header
     cells are blank, so a naive leftward search walks back into the FIRST
     block and reports card 0012 twice. The boundary stops it at the previous
     block's out column, so the empty template block is dropped silently. */
  it('never searches past the previous block boundary for a card number', () => {
    const sheet: AzpAoa = [
      [null, 'Layihə A', null, null, null, null, null],
      [null, '0012', null, null, null, null, null],
      ['s/s', 'Mədaxil', 'Y/D', 'Kart balansı', 'Mədaxil', 'Y/D', 'Kart balansı'],
      [1, 100, null, 100, null, null, null],
    ]
    const p = azpParseSheet('azpetrol', sheet)
    /* One card, not two, and no duplicate error — the empty block vanished. */
    expect(p.cards.map((c) => c.card_no)).toEqual(['0012'])
    expect(p.errs).toEqual([])
  })

  /* The same empty block WITH data is an error, not a silent drop: real money
     with no card number must never be imported under a neighbour's card. */
  it('errors when an unnamed block carries data', () => {
    const sheet: AzpAoa = [
      [null, 'Layihə A', null, null, null, null, null],
      [null, '0012', null, null, null, null, null],
      ['s/s', 'Mədaxil', 'Y/D', 'Kart balansı', 'Mədaxil', 'Y/D', 'Kart balansı'],
      [1, 100, null, 100, 55, null, null],
    ]
    const p = azpParseSheet('azpetrol', sheet)
    expect(p.cards.map((c) => c.card_no)).toEqual(['0012'])
    expect(p.errs).toEqual(['Sütun 5: məlumat var, amma kart nömrəsi tapılmadı.'])
    expect(azpImportBlocked(p)).toBe(true)
  })

  it('reports a card that appears twice on the sheet', () => {
    const sheet: AzpAoa = [
      [null, 'Layihə A', null, null, 'Layihə B', null, null],
      [null, '0012', null, null, '0012', null, null],
      ['s/s', 'Mədaxil', 'Y/D', 'Kart balansı', 'Mədaxil', 'Y/D', 'Kart balansı'],
      [1, 100, null, 100, 20, null, 20],
    ]
    const p = azpParseSheet('azpetrol', sheet)
    expect(p.errs).toEqual(['Kart 0012 vərəqdə iki dəfə rast gəlinir.'])
  })

  it('falls back to the card number when the holder cell is empty', () => {
    const p = azpParseSheet('azpetrol', [
      [null, null], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D'], [1, 10, null],
    ])
    expect(p.cards[0].holder).toBe('0012')
  })
})

describe('azpParseSheet — Araz, dates and VAT', () => {
  it('reads the shared date column and stamps vat_included', () => {
    const p = azpParseSheet('araz', [
      [null, null, 'Obyekt X', null, null],
      [null, null, 'A-1', null, null],
      ['Tarix', 's/s', 'Mədaxil', 'Məxaric', 'Kart balansı'],
      ['05.03.2026', 1, 200, null, 150],
      ['06.03.2026', 2, null, 50, null],
    ])
    expect(p.errs).toEqual([])
    expect(p.rows).toEqual([
      { card_no: 'A-1', kind: 'medaxil', amount: 200, op_date: '2026-03-05', vat_included: true },
      { card_no: 'A-1', kind: 'mexaric', amount: 50, op_date: '2026-03-06', vat_included: true },
    ])
  })

  /* An unparseable date is not an error: the row posts undated, exactly as
     legacy does (`dt || null`). Losing the amount would be worse. */
  it('posts a row with an unreadable date as undated', () => {
    const p = azpParseSheet('araz', [
      [null, null, 'Obyekt X', null],
      [null, null, 'A-1', null],
      ['Tarix', 's/s', 'Mədaxil', 'Məxaric'],
      ['nə vaxtsa', 1, 200, null],
    ])
    expect(p.errs).toEqual([])
    expect(p.rows[0].op_date).toBeNull()
    expect(p.rows[0].amount).toBe(200)
  })
})

describe('azpParseSheet — amounts', () => {
  it('reports a non-numeric amount with its 1-based sheet row', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D'], [1, 'abc', null],
    ])
    expect(p.errs).toEqual(['Sətir 4, kart 0012: “abc” rəqəm deyil.'])
    expect(p.rows).toEqual([])
  })

  it('accepts a comma decimal separator', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D'], [1, '10,50', null],
    ])
    expect(p.errs).toEqual([])
    expect(p.rows[0].amount).toBe(10.5)
  })

  /* Zero and negative amounts are skipped silently — not errors, not rows. */
  it('ignores zero and negative amounts without erroring', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D'],
      [1, 0, null], [2, -5, null], [3, 10, null],
    ])
    expect(p.errs).toEqual([])
    expect(p.rows).toHaveLength(1)
    expect(p.rows[0].amount).toBe(10)
  })

  it('warns, without blocking, when the Excel balance disagrees', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D', 'Kart balansı'],
      [1, 100, null, 999],
    ])
    expect(p.errs).toEqual([])
    expect(p.warns).toEqual([
      'Kart 0012: Excel “Kart balansı” = 999, oxunan sətirlərdən çıxan balans = 100.',
    ])
    /* A warning alone must NOT block — that distinction is the row. */
    expect(azpImportBlocked(p)).toBe(false)
  })

  /* The threshold is `>= 0.01` measured AFTER `azpR2` rounds the sheet's
     balance. 100.004 rounds to 100.00, so the difference is 0 and no warning
     is raised. (100.005 would round UP to 100.01 and therefore DOES warn —
     the rounding happens first, which is why the boundary is asserted on the
     rounded value rather than on the raw cell.) */
  it('does not warn when the rounded difference is under a cent', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D', 'Kart balansı'],
      [1, 100, null, 100.004],
    ])
    expect(p.cards[0].excel_balance).toBe(100)
    expect(p.warns).toEqual([])
  })

  /* The other side of that boundary, stated explicitly so the rounding-first
     order is pinned rather than implied. */
  it('warns once the rounded balance differs by a full cent', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D', 'Kart balansı'],
      [1, 100, null, 100.005],
    ])
    expect(p.cards[0].excel_balance).toBe(100.01)
    expect(p.warns).toHaveLength(1)
  })
})

describe('azpParseSheet — subtotals (M17-93, M17-94)', () => {
  /* M17-93 — THE defect: two equal CONSECUTIVE amounts. With a one-row
     condition the second 200 equals the running sum and a real movement is
     eaten. The `cnt >= 2` guard is what keeps both. */
  it('keeps two equal consecutive amounts', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D'],
      [1, 200, null], [2, 200, null],
    ])
    expect(p.rows.map((r) => r.amount)).toEqual([200, 200])
    expect(p.skippedTotals).toBe(0)
    expect(p.cards[0].medaxil).toBe(400)
  })

  /* Once TWO rows are counted, a third equal to their sum IS a subtotal. */
  it('skips a running-sum subtotal after at least two counted rows', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D'],
      [1, 100, null], [2, 50, null], [3, 150, null],
    ])
    expect(p.rows.map((r) => r.amount)).toEqual([100, 50])
    expect(p.skippedTotals).toBe(1)
    expect(p.cards[0].medaxil).toBe(150)
  })

  /* The counters are per kind: a Mədaxil subtotal must not suppress an out
     amount that happens to equal the out running sum after one row. */
  it('tracks the running sum separately per kind', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D'],
      [1, 100, 40], [2, 50, 40],
    ])
    /* Out has only counted 1 row when the second 40 arrives, so it is kept. */
    expect(p.rows.filter((r) => r.kind === 'mexaric').map((r) => r.amount)).toEqual([40, 40])
    expect(p.skippedTotals).toBe(0)
  })

  /* M17-94 — a LABELLED total is dropped immediately, without waiting for
     `cnt >= 2`. This is what makes export → import exact for a one-movement
     card, which the running-sum heuristic alone cannot reach. */
  it('skips a labelled CƏMİ row even for a single-movement card', () => {
    const p = azpParseSheet('azpetrol', [
      [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D'],
      [1, 200, null], ['CƏMİ', 200, null],
    ])
    expect(p.rows.map((r) => r.amount)).toEqual([200])
    expect(p.skippedTotals).toBe(1)
    expect(p.cards[0].medaxil).toBe(200)
  })

  it('recognises every labelled total spelling', () => {
    for (const label of ['CƏMİ', 'cemi', 'Yekun', 'TOTAL', 'toplam']) {
      const p = azpParseSheet('azpetrol', [
        [null, 'Layihə A'], [null, '0012'], ['s/s', 'Mədaxil', 'Y/D'],
        [1, 200, null], [label, 200, null],
      ])
      expect(p.rows, label).toHaveLength(1)
      expect(p.skippedTotals, label).toBe(1)
    }
  })

  /* A labelled total row is also excluded from the `hasData` probe, so it
     cannot make an unnamed block look like it carries real data. */
  it('does not count a labelled total as block data', () => {
    const sheet: AzpAoa = [
      [null, 'Layihə A', null, null, null, null],
      [null, '0012', null, null, null, null],
      ['s/s', 'Mədaxil', 'Y/D', null, 'Mədaxil', 'Y/D'],
      [1, 100, null, null, null, null],
      ['CƏMİ', 100, null, null, 100, null],
    ]
    const p = azpParseSheet('azpetrol', sheet)
    expect(p.errs).toEqual([])
  })
})

describe('azpImportBlocked — M17-88', () => {
  const ok = { cards: [], rows: [{ card_no: 'x', kind: 'medaxil' as const, amount: 1, op_date: null, vat_included: false }], errs: [], warns: [], skippedTotals: 0 }

  it('allows a clean parse with rows', () => {
    expect(azpImportBlocked(ok)).toBe(false)
  })

  /* A SINGLE error blocks everything — never a partial import. */
  it('blocks on one error even when hundreds of rows parsed', () => {
    expect(azpImportBlocked({ ...ok, errs: ['one'] })).toBe(true)
  })

  it('blocks an empty parse and a null parse', () => {
    expect(azpImportBlocked({ ...ok, rows: [] })).toBe(true)
    expect(azpImportBlocked(null)).toBe(true)
  })

  it('exposes the exact legacy refusal string', () => {
    expect(AZP_IMPORT_BLOCKED_MESSAGE).toBe('İdxal bloklanıb.')
  })
})

describe('azpNewCards', () => {
  const p = azpParseSheet('azpetrol', azpetrolSheet())

  it('matches existing cards case-insensitively and trimmed', () => {
    expect(azpNewCards(p, [{ card_no: ' 0012 ' }])).toEqual([])
    expect(azpNewCards(p, [{ card_no: '9999' }]).map((c) => c.card_no)).toEqual(['0012'])
  })

  it('treats a null existing card number as no match', () => {
    expect(azpNewCards(p, [{ card_no: null }]).map((c) => c.card_no)).toEqual(['0012'])
  })
})
