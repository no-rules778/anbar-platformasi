import { describe, expect, it } from 'vitest'
import {
  azpFilterRows, azpOpeningBalance, azpTotals,
  type AzpCard, type AzpMovement,
} from './azpFilter'

/* T0 — M17-41 … M17-48. Pure unit evidence only. */

const mv = (over: Partial<AzpMovement> = {}): AzpMovement => ({
  id: 1, module: 'azpetrol', card_id: 'c1', kind: 'medaxil',
  amount: 100, op_date: '2026-08-08', doc_num: 'QM-1', note: '', cancelled: false,
  ...over,
})

const CARDS: AzpCard[] = [
  { card_id: 'c1', card_no: '0001', holder: 'Əliyev' },
  { card_id: 'c2', card_no: '0002', holder: 'Məmmədov' },
]

describe('azpFilterRows — module boundary', () => {
  /* The module test runs FIRST, before every other predicate, so a foreign
     row cannot survive by matching the card or the date. */
  it('drops a row belonging to the other board', () => {
    const rows = [mv({ module: 'azpetrol' }), mv({ id: 2, module: 'araz' })]
    expect(azpFilterRows('azpetrol', rows, {}, CARDS)).toHaveLength(1)
    expect(azpFilterRows('araz', rows, {}, CARDS)).toHaveLength(1)
    expect(azpFilterRows('araz', rows, {}, CARDS)[0].id).toBe(2)
  })

  /* Legacy tests `r.module && r.module !== m`, so a row with NO module is
     kept rather than dropped. Preserved verbatim. */
  it('keeps a row that carries no module at all', () => {
    expect(azpFilterRows('azpetrol', [mv({ module: null })], {}, CARDS)).toHaveLength(1)
    expect(azpFilterRows('araz', [mv({ module: undefined })], {}, CARDS)).toHaveLength(1)
  })
})

describe('azpFilterRows — card selection', () => {
  const rows = [mv({ card_id: 'c1' }), mv({ id: 2, card_id: 'c2' })]

  it('filters by the single-card selection', () => {
    expect(azpFilterRows('azpetrol', rows, { card: 'c2' }, CARDS)).toHaveLength(1)
  })

  it('filters by a multi-card selection', () => {
    expect(azpFilterRows('azpetrol', rows, { cards: ['c1', 'c2'] }, CARDS)).toHaveLength(2)
    expect(azpFilterRows('azpetrol', rows, { cards: ['c2'] }, CARDS)).toHaveLength(1)
  })

  /* Precedence: a non-empty `cards` wins over `card`. The fixture makes the
     two disagree, so a wrong precedence changes the result. */
  it('lets a non-empty cards list override the single card', () => {
    const out = azpFilterRows('azpetrol', rows, { card: 'c1', cards: ['c2'] }, CARDS)
    expect(out).toHaveLength(1)
    expect(out[0].card_id).toBe('c2')
  })

  it('falls back to the single card when the cards list is empty', () => {
    const out = azpFilterRows('azpetrol', rows, { card: 'c1', cards: [] }, CARDS)
    expect(out).toHaveLength(1)
    expect(out[0].card_id).toBe('c1')
  })
})

describe('azpFilterRows — kind, range and text', () => {
  it('filters by kind', () => {
    const rows = [mv({ kind: 'medaxil' }), mv({ id: 2, kind: 'mexaric' })]
    expect(azpFilterRows('azpetrol', rows, { kind: 'mexaric' }, CARDS)).toHaveLength(1)
  })

  it('applies the inclusive date range', () => {
    const rows = [mv({ op_date: '2026-08-08' }), mv({ id: 2, op_date: '2026-08-20' })]
    const f = { d1: '2026-08-08', d2: '2026-08-08' }
    expect(azpFilterRows('azpetrol', rows, f, CARDS)).toHaveLength(1)
  })

  it('matches doc_num, note, card_no and holder case-insensitively', () => {
    expect(azpFilterRows('azpetrol', [mv({ doc_num: 'QM-77' })], { q: 'qm-77' }, CARDS)).toHaveLength(1)
    expect(azpFilterRows('azpetrol', [mv({ note: 'Yanacaq' })], { q: 'yanacaq' }, CARDS)).toHaveLength(1)
    expect(azpFilterRows('azpetrol', [mv({ card_id: 'c2' })], { q: '0002' }, CARDS)).toHaveLength(1)
    expect(azpFilterRows('azpetrol', [mv({ card_id: 'c2' })], { q: 'məmmədov' }, CARDS)).toHaveLength(1)
  })

  it('rejects a row matching nothing', () => {
    expect(azpFilterRows('azpetrol', [mv()], { q: 'tapılmayan' }, CARDS)).toHaveLength(0)
  })

  /* A row whose card is missing from the map must still be searchable on its
     own fields rather than disappearing. */
  it('still matches on its own fields when the card is unknown', () => {
    const orphan = mv({ card_id: 'missing', doc_num: 'QM-9' })
    expect(azpFilterRows('azpetrol', [orphan], { q: 'qm-9' }, CARDS)).toHaveLength(1)
    expect(azpFilterRows('azpetrol', [orphan], { q: 'əliyev' }, CARDS)).toHaveLength(0)
  })

  it('tolerates an omitted card list entirely', () => {
    expect(azpFilterRows('azpetrol', [mv()], { q: 'qm-1' })).toHaveLength(1)
  })
})

describe('azpTotals', () => {
  it('sums each direction and nets them', () => {
    const rows = [
      mv({ kind: 'medaxil', amount: 100 }),
      mv({ id: 2, kind: 'mexaric', amount: 30 }),
    ]
    expect(azpTotals(rows)).toEqual({
      medaxil: 100, mexaric: 30, net: 70, live: 2, cancelled: 0,
    })
  })

  /* Cancelled rows are counted but excluded from every sum — the rule that
     holds everywhere in this module. A cancelled row here is large enough
     that including it would visibly change all three figures. */
  it('excludes cancelled rows from the sums while still counting them', () => {
    const rows = [
      mv({ kind: 'medaxil', amount: 100 }),
      mv({ id: 2, kind: 'medaxil', amount: 999, cancelled: true }),
      mv({ id: 3, kind: 'mexaric', amount: 888, cancelled: true }),
    ]
    expect(azpTotals(rows)).toEqual({
      medaxil: 100, mexaric: 0, net: 100, live: 1, cancelled: 2,
    })
  })

  it('rounds each side to two decimals', () => {
    const rows = [
      mv({ kind: 'medaxil', amount: 0.1 }),
      mv({ id: 2, kind: 'medaxil', amount: 0.2 }),
    ]
    expect(azpTotals(rows).medaxil).toBe(0.3)
  })

  it('is all zeroes for an empty set', () => {
    expect(azpTotals([])).toEqual({
      medaxil: 0, mexaric: 0, net: 0, live: 0, cancelled: 0,
    })
  })
})

describe('azpOpeningBalance', () => {
  const rows = [
    mv({ id: 1, kind: 'medaxil', amount: 100, op_date: '2026-08-01' }),
    mv({ id: 2, kind: 'mexaric', amount: 40, op_date: '2026-08-02' }),
    mv({ id: 3, kind: 'medaxil', amount: 500, op_date: '2026-08-10' }),
  ]

  /* No start date means no "before", so the opening balance is 0 even though
     the fixture is full of rows. */
  it('is zero without a start date', () => {
    expect(azpOpeningBalance('azpetrol', rows, 'c1', '')).toBe(0)
    expect(azpOpeningBalance('azpetrol', rows, 'c1', null)).toBe(0)
  })

  /* Boundary: STRICTLY before. A row dated exactly on the start date belongs
     to the period, not to the opening balance. */
  it('sums strictly before the start date, excluding the boundary day', () => {
    expect(azpOpeningBalance('azpetrol', rows, 'c1', '2026-08-02')).toBe(100)
    expect(azpOpeningBalance('azpetrol', rows, 'c1', '2026-08-03')).toBe(60)
    expect(azpOpeningBalance('azpetrol', rows, 'c1', '2026-08-01')).toBe(0)
  })

  it('signs medaxil positive and everything else negative', () => {
    const out = [mv({ kind: 'mexaric', amount: 25, op_date: '2026-08-01' })]
    expect(azpOpeningBalance('azpetrol', out, 'c1', '2026-08-05')).toBe(-25)
  })

  it('skips cancelled rows', () => {
    const withCancelled = [
      ...rows,
      mv({ id: 4, kind: 'medaxil', amount: 999, op_date: '2026-08-01', cancelled: true }),
    ]
    expect(azpOpeningBalance('azpetrol', withCancelled, 'c1', '2026-08-03')).toBe(60)
  })

  it('skips rows of the other board', () => {
    const mixed = [
      ...rows,
      mv({ id: 5, module: 'araz', kind: 'medaxil', amount: 777, op_date: '2026-08-01' }),
    ]
    expect(azpOpeningBalance('azpetrol', mixed, 'c1', '2026-08-03')).toBe(60)
  })

  it('skips undated rows, which cannot be placed before the boundary', () => {
    const withUndated = [
      ...rows,
      mv({ id: 6, kind: 'medaxil', amount: 333, op_date: null }),
    ]
    expect(azpOpeningBalance('azpetrol', withUndated, 'c1', '2026-08-03')).toBe(60)
  })

  it('filters by card, and spans every card when none is given', () => {
    const twoCards = [
      mv({ id: 1, card_id: 'c1', kind: 'medaxil', amount: 100, op_date: '2026-08-01' }),
      mv({ id: 2, card_id: 'c2', kind: 'medaxil', amount: 50, op_date: '2026-08-01' }),
    ]
    expect(azpOpeningBalance('azpetrol', twoCards, 'c1', '2026-08-05')).toBe(100)
    expect(azpOpeningBalance('azpetrol', twoCards, 'c2', '2026-08-05')).toBe(50)
    expect(azpOpeningBalance('azpetrol', twoCards, null, '2026-08-05')).toBe(150)
  })
})
