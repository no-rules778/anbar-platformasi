import { describe, it, expect } from 'vitest'
import {
  normWhName, resolveWh, routeOrPartner, transferRoute, whLabel,
  type RouteMovement,
} from './movementRoute'

/* A12 — whLabel (index.html:592-593) and the transfer route (1430-1454). */

const WHS = ['Ələt', 'Astara', 'Xocahəsən', 'Harmony']

const m = (over: Partial<RouteMovement> = {}): RouteMovement => ({
  type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara',
  in_qty: 0, out_qty: 5, ...over,
})

describe('whLabel', () => {
  /* The one configured alias. DISPLAY ONLY — the stored value stays
     'Xocahəsən', because that string is the key in warehouses.name,
     movements.warehouse, users.warehouse and the SQL text comparisons. */
  it('renders the Xocahəsən alias', () => {
    expect(whLabel('Xocahəsən')).toBe('Xocəsən')
  })

  it('passes every other name through untouched', () => {
    expect(whLabel('Ələt')).toBe('Ələt')
  })

  it('renders null and undefined as an empty string', () => {
    expect(whLabel(null)).toBe('')
    expect(whLabel(undefined)).toBe('')
  })
})

describe('normWhName', () => {
  /* The display-only suffixes the partner text historically carries. */
  it('strips the anbar / anbarı / anbarına suffixes', () => {
    expect(normWhName('Astara anbar')).toBe('astara')
    expect(normWhName('Astara anbarı')).toBe('astara')
    expect(normWhName('Astara anbarına')).toBe('astara')
  })

  it('canonicalises the dotless ı so casing cannot break a match', () => {
    expect(normWhName('ASTARA')).toBe('astara')
    expect(normWhName('Astarı')).toBe('astari')
  })

  it('is empty for a blank input', () => {
    expect(normWhName(null)).toBe('')
    expect(normWhName('   ')).toBe('')
  })
})

describe('resolveWh', () => {
  it('resolves all three spellings to the same configured warehouse', () => {
    for (const s of ['Astara', 'Astara anbar', 'Astara anbarına']) {
      expect(resolveWh(s, WHS)).toBe('Astara')
    }
  })

  /* An unrecognised name is never guessed at — the original returns null and
     the caller renders «—» for that side. */
  it('returns null for an unknown name rather than guessing', () => {
    expect(resolveWh('Naməlum yer', WHS)).toBeNull()
  })

  it('returns null for a blank name', () => {
    expect(resolveWh('', WHS)).toBeNull()
  })
})

describe('transferRoute', () => {
  /* Direction comes from the quantities: an OUTGOING row leaves this
     warehouse for the other one. */
  it('renders own → other for an outgoing transfer', () => {
    expect(transferRoute(m({ out_qty: 5, in_qty: 0 }), WHS)).toBe('Ələt → Astara')
  })

  it('renders other → own for an incoming transfer', () => {
    expect(transferRoute(m({ out_qty: 0, in_qty: 5 }), WHS)).toBe('Astara → Ələt')
  })

  /* The alias applies to either side of the route. */
  it('applies the display alias inside the route', () => {
    expect(transferRoute(m({ warehouse: 'Xocahəsən', partner: 'Astara' }), WHS))
      .toBe('Xocəsən → Astara')
    expect(transferRoute(m({ warehouse: 'Ələt', partner: 'Xocahəsən' }), WHS))
      .toBe('Ələt → Xocəsən')
  })

  it('renders an unresolvable side as an em dash, keeping the resolved one', () => {
    expect(transferRoute(m({ partner: 'Naməlum yer' }), WHS)).toBe('Ələt → —')
    expect(transferRoute(m({ warehouse: 'Naməlum yer', out_qty: 0, in_qty: 5 }), WHS))
      .toBe('Astara → —')
  })

  /* With NEITHER side recognised there is nothing to show, so the caller
     keeps the stored text instead of rendering «— → —». */
  it('returns null when neither side resolves', () => {
    expect(transferRoute(m({ warehouse: 'Naməlum', partner: 'Bilinməyən' }), WHS)).toBeNull()
  })

  /* No quantity in either direction means the direction is undecidable. */
  it('returns null when the row has neither an in nor an out quantity', () => {
    expect(transferRoute(m({ in_qty: 0, out_qty: 0 }), WHS)).toBeNull()
    expect(transferRoute(m({ in_qty: null, out_qty: null }), WHS)).toBeNull()
  })

  it('returns null for every non-transfer type', () => {
    for (const t of ['Satınalma', 'Silinmə', 'Sahəyə', 'Qaytarma', 'Əvvələ qalıq']) {
      expect(transferRoute(m({ type: t }), WHS)).toBeNull()
    }
  })
})

describe('routeOrPartner', () => {
  it('uses the route for a transfer', () => {
    expect(routeOrPartner(m(), WHS)).toBe('Ələt → Astara')
  })

  it('uses the stored partner text for every other type', () => {
    expect(routeOrPartner(m({ type: 'Satınalma', partner: 'ACME MMC' }), WHS)).toBe('ACME MMC')
  })

  /* A missing partner shows the em dash, not an empty cell. */
  it('renders an em dash when there is no partner', () => {
    expect(routeOrPartner(m({ type: 'Satınalma', partner: null }), WHS)).toBe('—')
    expect(routeOrPartner(m({ type: 'Satınalma', partner: '' }), WHS)).toBe('—')
  })

  /* A transfer whose route cannot be built falls back to the stored text,
     which is exactly what the `||` in the original buys. */
  it('falls back to the partner text when a transfer route cannot be built', () => {
    expect(routeOrPartner(m({ partner: 'Naməlum yer', warehouse: 'Başqa yer' }), WHS))
      .toBe('Naməlum yer')
  })

  /* With no warehouse list loaded, nothing resolves and every row keeps its
     stored text — the degraded mode a failed warehouse read leaves behind. */
  it('keeps the stored text when no warehouses are configured', () => {
    expect(routeOrPartner(m(), [])).toBe('Astara')
  })
})
