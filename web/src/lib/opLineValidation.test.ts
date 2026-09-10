import { describe, it, expect } from 'vitest'
import {
  validateOpLine, isInitialBalanceLine, editRestoreQty,
  INIT_BAL_ADMIN_ONLY_MSG, INIT_BAL_PARTNERS, INIT_BAL_TYPE,
  type ValidateContext, type OpLineInput,
} from './opLineValidation'
import { nf } from './format'

const item = { code: 'A', name: 'Kabel', unit: 'ədəd' }

const ctx = (o: Partial<ValidateContext> = {}): ValidateContext => ({
  itemBy: new Map([['A', item], ['B', { code: 'B', name: 'Boru', unit: 'm' }]]),
  balanceOf: () => 100,
  allowedWarehouses: ['Elet', 'Astara'],
  transferSources: ['Elet'],
  transferDests: ['Astara', 'Harmony'],
  lines: [],
  isAdmin: true,
  restore: null,
  ...o,
})

const line = (o: Partial<OpLineInput> = {}): OpLineInput =>
  ({ kind: 'out', t: 'Silinmə', w: 'Elet', c: 'A', q: 1, ...o })

describe('validateOpLine — check ORDER (M7-32)', () => {
  /* The order is the contract: the first failure decides the message. */
  it('a missing item beats a zero quantity', () => {
    const r = validateOpLine(line({ c: 'ZZZ', q: 0 }), ctx())
    expect(r.ok).toBe(false)
    expect((r as { code: string }).code).toBe('item')
  })

  it('a zero quantity beats an invalid type', () => {
    const r = validateOpLine(line({ q: 0, t: 'Satınalma' }), ctx())
    expect((r as { code: string }).code).toBe('qty')
  })

  it('an invalid type beats a forbidden warehouse', () => {
    const r = validateOpLine(line({ t: 'Satınalma', w: 'Yoxdur' }), ctx())
    expect((r as { code: string }).code).toBe('type')
  })

  it('a forbidden warehouse beats the stock check', () => {
    const r = validateOpLine(line({ w: 'Yoxdur' }), ctx({ balanceOf: () => 0 }))
    expect((r as { code: string }).code).toBe('wh')
  })

  it('the initbal gate beats the stock check', () => {
    const r = validateOpLine(
      line({ kind: 'in', t: 'Əvvələ qalıq', p: 'Anbar qalığı', w: 'Elet' }),
      ctx({ isAdmin: false }),
    )
    expect((r as { code: string }).code).toBe('initbal')
  })
})

describe('validateOpLine — messages', () => {
  it('item', () => {
    const r = validateOpLine(line({ c: 'ZZZ' }), ctx())
    expect((r as { error: string }).error).toBe('Əvvəlcə malı seçin.')
  })
  it('qty', () => {
    const r = validateOpLine(line({ q: 0 }), ctx())
    expect((r as { error: string }).error).toBe('Miqdar sıfırdan böyük olmalıdır.')
  })
  it('qty rejects a negative and a NaN', () => {
    expect(validateOpLine(line({ q: -1 }), ctx()).ok).toBe(false)
    expect(validateOpLine(line({ q: NaN }), ctx()).ok).toBe(false)
  })
  it('type', () => {
    const r = validateOpLine(line({ t: 'Satınalma' }), ctx())
    expect((r as { error: string }).error)
      .toBe('Bu tab üçün etibarsız əməliyyat növü: "Satınalma".')
  })
  it('wh', () => {
    const r = validateOpLine(line({ w: 'Ofis' }), ctx())
    expect((r as { error: string }).error)
      .toBe('"Ofis" anbarında əməliyyat aparmağa icazəniz yoxdur.')
  })
})

describe('validateOpLine — route rules (M7-33)', () => {
  const mv = (o: Partial<OpLineInput> = {}) =>
    line({ kind: 'mv', t: 'Yerdəyişmə', w: 'Elet', w2: 'Astara', ...o })

  it('accepts a valid route', () => {
    expect(validateOpLine(mv(), ctx()).ok).toBe(true)
  })

  it('refuses a source outside the transfer sources', () => {
    const r = validateOpLine(mv({ w: 'Harmony' }), ctx())
    expect((r as { code: string }).code).toBe('route')
    expect((r as { error: string }).error)
      .toBe('"Harmony" anbarından yerdəyişmə etməyə icazəniz yoxdur.')
  })

  it('refuses a destination outside the transfer destinations', () => {
    const r = validateOpLine(mv({ w2: 'Ofis' }), ctx())
    expect((r as { code: string }).code).toBe('route')
    expect((r as { error: string }).error)
      .toBe('"Ofis" anbarına yerdəyişmə etməyə icazəniz yoxdur.')
  })

  it('refuses source = destination', () => {
    const r = validateOpLine(mv({ w: 'Elet', w2: 'Elet' }), ctx({ transferDests: ['Elet'] }))
    expect((r as { code: string }).code).toBe('same-wh')
    expect((r as { error: string }).error).toBe('Mənbə və təyinat anbarı eyni ola bilməz.')
  })

  /* D-H1: with the narrowed sources a group sibling is refused here too, so the
     validator agrees with the picker AND with the live server. */
  it('agrees with the D-H1 narrowing for an anbardar', () => {
    const narrowed = ctx({ transferSources: ['Astara'], transferDests: ['Elet', 'Harmony'] })
    expect(validateOpLine(mv({ w: 'Harmony', w2: 'Elet' }), narrowed).ok).toBe(false)
    expect(validateOpLine(mv({ w: 'Astara', w2: 'Harmony' }), narrowed).ok).toBe(true)
  })

  it('a transfer does NOT use allowedWarehouses', () => {
    const r = validateOpLine(mv(), ctx({ allowedWarehouses: [] }))
    expect(r.ok).toBe(true)
  })
})

describe('isInitialBalanceLine — M7-35 (H-D2, CLIENT-ONLY rule)', () => {
  it('matches type + partner', () => {
    expect(isInitialBalanceLine('Əvvələ qalıq', 'Anbar qalığı', '')).toBe(true)
  })

  /* The marker counts in BOTH fields — same meaning, two places. */
  it('matches type + CHANNEL as well', () => {
    expect(isInitialBalanceLine('Əvvələ qalıq', '', 'Anbar qalığı')).toBe(true)
  })

  it('accepts every historical partner spelling', () => {
    for (const p of INIT_BAL_PARTNERS) {
      expect(isInitialBalanceLine(INIT_BAL_TYPE, p, '')).toBe(true)
    }
  })

  it('tolerates the ğ/q variant in the PARTNER', () => {
    expect(isInitialBalanceLine('Əvvələ qalıq', 'Əvvələ anbar qalıqı', '')).toBe(true)
    expect(isInitialBalanceLine('Əvvələ qalıq', 'Əvvələ anbar qalığı', '')).toBe(true)
  })

  it('the TYPE stays strict — no ğ/q tolerance', () => {
    expect(isInitialBalanceLine('Əvvələ qalıq', 'Anbar qalığı', '')).toBe(true)
    expect(isInitialBalanceLine('Əvvələ qalıq'.replace('q', 'ğ'), 'Anbar qalığı', '')).toBe(false)
  })

  it('normalises surrounding whitespace and ASCII-safe case', () => {
    expect(isInitialBalanceLine(' Əvvələ qalıq ', ' Anbar Qalığı ', '')).toBe(true)
  })

  /* INHERITED Azerbaijani casing quirk, pinned so nobody "fixes" it into a
     divergence. JS toLowerCase() maps 'I' to dotted 'i', never to dotless 'ı',
     so an ALL-CAPS «ƏVVƏLƏ QALIQ» normalises to "əvvələ qaliq" and does NOT
     equal "əvvələ qalıq". The legacy _normBase() behaves identically
     (index.html:1907); the same quirk is already pinned for REF_EQ in
     Phase 3b. Real production values are stored in normal case, so this is a
     theoretical input, not an observed failure. */
  it('does NOT match an ALL-CAPS type — the dotless-ı quirk is inherited', () => {
    expect(isInitialBalanceLine('ƏVVƏLƏ QALIQ', 'Anbar qalığı', '')).toBe(false)
  })

  /* «Əvvələ qalıq» with an ORDINARY counterparty is not restricted — the rule
     is about this combination only (index.html:1922-1924). */
  it('«Əvvələ qalıq» with an ordinary counterparty is NOT restricted', () => {
    expect(isInitialBalanceLine('Əvvələ qalıq', 'Kontragent A', '')).toBe(false)
  })

  it('the marker alone, without the type, is not restricted', () => {
    expect(isInitialBalanceLine('Satınalma', 'Anbar qalığı', '')).toBe(false)
  })
})

describe('validateOpLine — initbal gate', () => {
  const initLine = line({ kind: 'in', t: 'Əvvələ qalıq', p: 'Anbar qalığı', w: 'Elet' })

  it('a non-admin is refused with the exact message', () => {
    const r = validateOpLine(initLine, ctx({ isAdmin: false }))
    expect((r as { code: string }).code).toBe('initbal')
    expect((r as { error: string }).error).toBe(INIT_BAL_ADMIN_ONLY_MSG)
  })

  it('an admin may create it', () => {
    expect(validateOpLine(initLine, ctx({ isAdmin: true })).ok).toBe(true)
  })
})

describe('validateOpLine — stock check (M7-36)', () => {
  it('inbound lines skip the stock check entirely', () => {
    const r = validateOpLine(
      line({ kind: 'in', t: 'Satınalma', q: 999 }),
      ctx({ balanceOf: () => 0 }),
    )
    expect(r.ok).toBe(true)
    expect((r as { q: number }).q).toBe(999)
  })

  it('refuses when nothing is available', () => {
    const r = validateOpLine(line(), ctx({ balanceOf: () => 0 }))
    expect((r as { code: string }).code).toBe('stock')
    expect((r as { error: string }).error)
      .toBe('Elet anbarında "Kabel" üzrə mövcud qalıq yoxdur')
  })

  it('clamps an over-quantity and returns a warning', () => {
    const r = validateOpLine(line({ q: 50 }), ctx({ balanceOf: () => 10 }))
    expect(r.ok).toBe(true)
    expect((r as { q: number }).q).toBe(10)
    expect((r as { warn: string }).warn)
      .toBe('Elet anbarında maksimum 10,00 ədəd mövcuddur — miqdar bu maksimuma endirildi.')
  })

  it('formats the clamp figure exactly as nf(v, 2)', () => {
    const r = validateOpLine(line({ q: 9999 }), ctx({ balanceOf: () => 1234.5 }))
    expect((r as { warn: string }).warn).toContain(nf(1234.5, 2))
  })

  it('subtracts other pending outbound lines on the same warehouse+item', () => {
    const lines = [line({ q: 8 })]
    const r = validateOpLine(line({ q: 5 }), ctx({ balanceOf: () => 10, lines }))
    expect((r as { q: number }).q).toBe(2)
  })

  it('does NOT subtract inbound, other-warehouse or other-item pending lines', () => {
    const lines = [
      line({ kind: 'in', t: 'Satınalma', q: 8 }),
      line({ w: 'Astara', q: 8 }),
      line({ c: 'B', q: 8 }),
    ]
    const r = validateOpLine(line({ q: 10 }), ctx({ balanceOf: () => 10, lines }))
    expect(r.ok).toBe(true)
    expect((r as { q: number }).q).toBe(10)
  })

  /* skipIndex excludes the line being edited from its OWN availability. */
  it('skipIndex excludes the edited line', () => {
    const lines = [line({ q: 10 })]
    const c = ctx({ balanceOf: () => 10, lines })
    expect(validateOpLine(line({ q: 10 }), c).ok).toBe(false)
    const r = validateOpLine(line({ q: 10 }), c, { skipIndex: 0 })
    expect(r.ok).toBe(true)
    expect((r as { q: number }).q).toBe(10)
  })

  it('a transfer line consumes source stock like any outbound line', () => {
    const r = validateOpLine(
      line({ kind: 'mv', t: 'Yerdəyişmə', w2: 'Astara', q: 50 }),
      ctx({ balanceOf: () => 10 }),
    )
    expect((r as { q: number }).q).toBe(10)
  })
})

describe('editRestoreQty — M7-37', () => {
  it('is 0 outside edit mode', () => {
    expect(editRestoreQty(null, 'Elet', 'A')).toBe(0)
    expect(editRestoreQty(undefined, 'Elet', 'A')).toBe(0)
  })

  it('returns the stored quantity for the warehouse|code key', () => {
    const m = new Map([['Elet|A', 4]])
    expect(editRestoreQty(m, 'Elet', 'A')).toBe(4)
    expect(editRestoreQty(m, 'Astara', 'A')).toBe(0)
  })

  /* The original document's outbound quantity is still deducted from the
     balance until the server cancels it inside the correction transaction —
     so it is added back, or the document would cut its own line. */
  it('the restore is added to availability during a correction', () => {
    const c = ctx({ balanceOf: () => 0, restore: new Map([['Elet|A', 6]]) })
    const r = validateOpLine(line({ q: 6 }), c)
    expect(r.ok).toBe(true)
    expect((r as { q: number }).q).toBe(6)
  })

  it('without the restore the same line is refused', () => {
    const r = validateOpLine(line({ q: 6 }), ctx({ balanceOf: () => 0 }))
    expect((r as { code: string }).code).toBe('stock')
  })
})
