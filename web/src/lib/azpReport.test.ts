import { describe, expect, it } from 'vitest'
import {
  azpPeriodText, azpReportRows, buildAzpReport,
  type AzpReportCardInput, type AzpReportSelection,
} from './azpReport'
import type { AzpMovement } from './azpFilter'

/* T0 — M17-52, M17-54, M17-55, M17-57, M17-60, M17-61.
   Pure unit evidence only. */

const card = (over: Partial<AzpReportCardInput> = {}): AzpReportCardInput => ({
  card_id: 'c1', card_no: '0001', holder: 'Əliyev', project: 'Layihə A',
  active: true, balance: 60, ...over,
})

const mv = (over: Partial<AzpMovement> = {}): AzpMovement => ({
  id: 1, module: 'azpetrol', card_id: 'c1', kind: 'medaxil',
  amount: 100, op_date: '2026-08-10', doc_num: '', note: '', cancelled: false,
  ...over,
})

const sel = (over: Partial<AzpReportSelection> = {}): AzpReportSelection => ({
  mode: 'group', cards: [], kind: '', d1: '', d2: '', ...over,
})

describe('buildAzpReport — card selection', () => {
  const cards = [card(), card({ card_id: 'c2', card_no: '0002', active: false })]

  /* Empty selection = ACTIVE cards only. */
  it('covers only active cards when nothing is selected', () => {
    const rep = buildAzpReport('azpetrol', cards, [], sel())
    expect(rep.cards.map((c) => c.card_id)).toEqual(['c1'])
  })

  /* An explicit selection is honoured AS GIVEN, inactive cards included —
     the deliberate asymmetry with the empty-selection case. */
  it('honours an explicit selection that names an inactive card', () => {
    const rep = buildAzpReport('azpetrol', cards, [], sel({ cards: ['c2'] }))
    expect(rep.cards.map((c) => c.card_id)).toEqual(['c2'])
  })
})

describe('buildAzpReport — per-card figures', () => {
  const cards = [card()]
  const movs = [
    mv({ id: 1, kind: 'medaxil', amount: 100, op_date: '2026-08-01' }),
    mv({ id: 2, kind: 'mexaric', amount: 40, op_date: '2026-08-10' }),
    mv({ id: 3, kind: 'medaxil', amount: 500, op_date: '2026-08-20' }),
  ]

  it('computes opening, both totals and closing for a bounded period', () => {
    const rep = buildAzpReport('azpetrol', cards, movs, sel({ d1: '2026-08-05', d2: '2026-08-15' }))
    const c = rep.cards[0]
    expect(c.opening).toBe(100)
    expect(c.medaxil).toBe(0)
    expect(c.mexaric).toBe(40)
    expect(c.closing).toBe(60)
  })

  /* `current` is the card's own stored balance and is NOT the period's
     closing figure whenever the period excludes rows. The fixture makes them
     differ so a test cannot pass by conflating the two. */
  it('keeps the stored current balance distinct from the period closing', () => {
    const rep = buildAzpReport('azpetrol', [card({ balance: 560 })], movs,
      sel({ d1: '2026-08-05', d2: '2026-08-15' }))
    expect(rep.cards[0].closing).toBe(60)
    expect(rep.cards[0].current).toBe(560)
  })

  it('orders a card rows by date then id', () => {
    const unordered = [
      mv({ id: 9, op_date: '2026-08-20' }),
      mv({ id: 2, op_date: '2026-08-01' }),
      mv({ id: 1, op_date: '2026-08-01' }),
    ]
    const rep = buildAzpReport('azpetrol', cards, unordered, sel())
    expect(rep.cards[0].rows.map((r) => r.id)).toEqual([1, 2, 9])
  })

  it('reports cancelled rows without counting them in the totals', () => {
    const withCancelled = [
      mv({ id: 1, kind: 'medaxil', amount: 100 }),
      mv({ id: 2, kind: 'medaxil', amount: 999, cancelled: true }),
    ]
    const rep = buildAzpReport('azpetrol', cards, withCancelled, sel())
    expect(rep.cards[0].medaxil).toBe(100)
    expect(rep.cards[0].cancelled).toBe(1)
    expect(rep.totals.cancelled).toBe(1)
  })
})

describe('buildAzpReport — totals and undated rows', () => {
  it('accumulates every card into the totals', () => {
    const cards = [card(), card({ card_id: 'c2', card_no: '0002', balance: 10 })]
    const movs = [
      mv({ id: 1, card_id: 'c1', kind: 'medaxil', amount: 100 }),
      mv({ id: 2, card_id: 'c2', kind: 'mexaric', amount: 25 }),
    ]
    const rep = buildAzpReport('azpetrol', cards, movs, sel())
    expect(rep.totals.medaxil).toBe(100)
    expect(rep.totals.mexaric).toBe(25)
    expect(rep.totals.current).toBe(70)
  })

  it('counts undated rows only when a bound is set', () => {
    const movs = [mv({ id: 1, op_date: null }), mv({ id: 2, op_date: '2026-08-10' })]
    expect(buildAzpReport('azpetrol', [card()], movs, sel()).undatedHidden).toBe(0)
    expect(
      buildAzpReport('azpetrol', [card()], movs, sel({ d1: '2026-08-01' })).undatedHidden,
    ).toBe(1)
  })

  /* The undated count is scoped to the SELECTED cards, so another card's
     undated row must not inflate it. */
  it('scopes the undated count to the selected cards', () => {
    const movs = [mv({ id: 1, card_id: 'c2', op_date: null })]
    const rep = buildAzpReport('azpetrol', [card()], movs, sel({ d1: '2026-08-01' }))
    expect(rep.undatedHidden).toBe(0)
  })

  it('normalises the period bounds onto the report', () => {
    const rep = buildAzpReport('azpetrol', [card()], [], sel({ d1: '01.08.2026', d2: '2026-08-31' }))
    expect(rep.d1).toBe('2026-08-01')
    expect(rep.d2).toBe('2026-08-31')
  })

  it('carries the board labels', () => {
    expect(buildAzpReport('araz', [card()], [], sel()).outLabel).toBe('Məxaric')
    expect(buildAzpReport('azpetrol', [card()], [], sel()).outLabel).toBe('Y/D')
  })
})

describe('azpPeriodText', () => {
  it('is «bütün dövr» with no bounds', () => {
    expect(azpPeriodText({ d1: '', d2: '' })).toBe('bütün dövr')
  })

  it('formats both bounds, and uses … for a missing side', () => {
    expect(azpPeriodText({ d1: '2026-08-01', d2: '2026-08-31' })).toBe('01.08.2026 — 31.08.2026')
    expect(azpPeriodText({ d1: '2026-08-01', d2: '' })).toBe('01.08.2026 — …')
    expect(azpPeriodText({ d1: '', d2: '2026-08-31' })).toBe('… — 31.08.2026')
  })
})

describe('azpReportRows', () => {
  const cards = [card()]

  it('opens with the title, period, kind and mode rows', () => {
    const rep = buildAzpReport('azpetrol', cards, [], sel())
    const rows = azpReportRows(rep)
    expect(rows[0]).toEqual(['Azpetrol — hesabat'])
    expect(rows[1]).toEqual(['Dövr', 'bütün dövr'])
    expect(rows[2]).toEqual(['Əməliyyat növü', 'Hamısı'])
    expect(rows[3]).toEqual(['Hesabatın növü', 'Qrup'])
  })

  it('names the selected kind with the board label', () => {
    const rep = buildAzpReport('araz', cards, [], sel({ kind: 'mexaric' }))
    expect(azpReportRows(rep)[2]).toEqual(['Əməliyyat növü', 'Məxaric'])
  })

  it('adds the undated-row line only when there are undated rows', () => {
    const none = azpReportRows(buildAzpReport('azpetrol', cards, [], sel()))
    expect(none.some((r) => r[0] === 'Tarixsiz qeydlər (dövrə daxil edilməyib)')).toBe(false)

    const movs = [mv({ op_date: null })]
    const some = azpReportRows(
      buildAzpReport('azpetrol', cards, movs, sel({ d1: '2026-08-01' })),
    )
    expect(some.some((r) => r[0] === 'Tarixsiz qeydlər (dövrə daxil edilməyib)')).toBe(true)
  })

  it('emits the group header and a Yekun row in group mode', () => {
    const rep = buildAzpReport('azpetrol', cards, [mv()], sel())
    const rows = azpReportRows(rep)
    expect(rows).toContainEqual([
      'Kart №', 'Sahib / Obyekt', 'Layihə', 'Əvvələ qalıq',
      'Mədaxil', 'Y/D', 'Dövrün sonuna', 'Cari balans',
    ])
    expect(rows.some((r) => r[0] === 'Yekun')).toBe(true)
  })

  it('emits the per-movement ledger in single mode', () => {
    const rep = buildAzpReport('azpetrol', cards, [mv()], sel({ mode: 'single', cards: ['c1'] }))
    const rows = azpReportRows(rep)
    expect(rows).toContainEqual(['Kart №', '0001'])
    expect(rows).toContainEqual(['Tarix', 'Növ', 'Məbləğ (₼)', 'Qaimə №', 'Qeyd', 'Status'])
    expect(rows.some((r) => r[0] === 'Dövrün əvvəlinə qalıq')).toBe(true)
    expect(rows.some((r) => r[0] === 'Cari kart balansı')).toBe(true)
  })

  /* Cancelled rows appear in the single-mode ledger with the exact literal
     status, while already being excluded from the totals. */
  it('marks a cancelled row LƏĞV EDİLİB and an active one aktiv', () => {
    const movs = [
      mv({ id: 1, amount: 100 }),
      mv({ id: 2, amount: 50, cancelled: true }),
    ]
    const rep = buildAzpReport('azpetrol', cards, movs, sel({ mode: 'single', cards: ['c1'] }))
    const rows = azpReportRows(rep)
    const statuses = rows.filter((r) => r.length === 6 && typeof r[2] === 'number').map((r) => r[5])
    expect(statuses).toContain('aktiv')
    expect(statuses).toContain('LƏĞV EDİLİB')
  })

  it('closes with the cancelled-rows note', () => {
    const rows = azpReportRows(buildAzpReport('azpetrol', cards, [], sel()))
    expect(rows[rows.length - 1]).toEqual([
      'Qeyd', 'Ləğv edilmiş sətirlər göstərilir, lakin cəmlərə daxil edilmir.',
    ])
  })
})
