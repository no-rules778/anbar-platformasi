import { describe, it, expect } from 'vitest'
import { movKey, movKeyKind, movKeyLabel, movKeyText } from './movementKey'
import type { RouteMovement } from './movementRoute'

const WHS = ['Ələt', 'Astara', 'Xocahəsən', 'Harmony', 'Ofis']

const mv = (over: Partial<RouteMovement> = {}): RouteMovement => ({
  type: 'Satınalma',
  warehouse: 'Ələt',
  partner: 'Kontragent A',
  in_qty: 5,
  out_qty: 0,
  ...over,
})

describe('movKey (M8-54)', () => {
  it('prefixes a non-transfer with partner:', () => {
    expect(movKey(mv({ partner: 'Azpetrol' }), WHS)).toBe('partner:Azpetrol')
  })

  it('yields partner: with an empty tail when the partner is blank', () => {
    expect(movKey(mv({ partner: '' }), WHS)).toBe('partner:')
    expect(movKey(mv({ partner: null }), WHS)).toBe('partner:')
  })

  it('returns partner: for a null movement rather than throwing', () => {
    expect(movKey(null, WHS)).toBe('partner:')
    expect(movKey(undefined, WHS)).toBe('partner:')
  })

  it('collapses a resolved transfer to route:<source → destination>', () => {
    const out = mv({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', in_qty: 0, out_qty: 3 })
    expect(movKey(out, WHS)).toBe('route:Ələt → Astara')
  })

  it('collapses the three spellings of one warehouse onto ONE key', () => {
    const keys = ['Astara anbar', 'Astara anbarı', 'Astara anbarına'].map((p) =>
      movKey(mv({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: p, in_qty: 0, out_qty: 1 }), WHS),
    )
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toBe('route:Ələt → Astara')
  })

  it('keeps an inbound transfer leg on the same route as its outbound pair', () => {
    const inbound = mv({ type: 'Yerdəyişmə', warehouse: 'Astara', partner: 'Ələt anbarı', in_qty: 3, out_qty: 0 })
    expect(movKey(inbound, WHS)).toBe('route:Ələt → Astara')
  })

  it('uses raw: — NOT route: — when one side is unrecognised', () => {
    const half = mv({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Naməlum yer', in_qty: 0, out_qty: 2 })
    /* transferRoute() renders «Ələt → —»; a half-resolved route must never be
       merged into the route bucket, or distinct routes become invisible. */
    expect(movKey(half, WHS)).toBe('raw:Naməlum yer')
  })

  it('uses raw: when the transfer has neither an in nor an out quantity', () => {
    const neither = mv({ type: 'Yerdəyişmə', partner: 'Astara anbarı', in_qty: 0, out_qty: 0 })
    expect(movKey(neither, WHS)).toBe('raw:Astara anbarı')
  })

  it('never lets a counterparty whose text looks like a route collide with one', () => {
    const looksLikeRoute = mv({ type: 'Satınalma', partner: 'Ələt → Astara' })
    const realRoute = mv({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara', in_qty: 0, out_qty: 1 })
    expect(movKey(looksLikeRoute, WHS)).toBe('partner:Ələt → Astara')
    expect(movKey(realRoute, WHS)).toBe('route:Ələt → Astara')
    expect(movKey(looksLikeRoute, WHS)).not.toBe(movKey(realRoute, WHS))
  })

  it('uses the DISPLAY alias in the route label', () => {
    const m = mv({ type: 'Yerdəyişmə', warehouse: 'Xocahəsən', partner: 'Astara', in_qty: 0, out_qty: 1 })
    expect(movKey(m, WHS)).toBe('route:Xocəsən → Astara')
  })
})

describe('movKeyKind / movKeyLabel', () => {
  it('splits at the FIRST colon only', () => {
    expect(movKeyKind('route:Ələt → Astara')).toBe('route')
    expect(movKeyLabel('route:Ələt → Astara')).toBe('Ələt → Astara')
  })

  it('keeps a label that itself contains a colon intact', () => {
    expect(movKeyKind('partner:MMC: Baku')).toBe('partner')
    expect(movKeyLabel('partner:MMC: Baku')).toBe('MMC: Baku')
  })

  it('treats a value with no colon as kind "" and label = the whole value', () => {
    expect(movKeyKind('Azpetrol')).toBe('')
    expect(movKeyLabel('Azpetrol')).toBe('Azpetrol')
  })

  it('handles null/undefined without throwing', () => {
    expect(movKeyKind(null)).toBe('')
    expect(movKeyLabel(null)).toBe('')
    expect(movKeyLabel(undefined)).toBe('')
  })

  it('returns an empty label for the empty-partner key', () => {
    expect(movKeyLabel('partner:')).toBe('')
  })
})

describe('movKeyText', () => {
  it('shows the route label for a resolved transfer', () => {
    const m = mv({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', in_qty: 0, out_qty: 1 })
    expect(movKeyText(m, WHS)).toBe('Ələt → Astara')
  })

  it('falls back to routeOrPartner for a raw transfer — the stored text, not the key', () => {
    const m = mv({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Naməlum yer', in_qty: 0, out_qty: 1 })
    /* routeOrPartner renders the half-route «Ələt → —» here, which is what the
       screen cell shows — so the search text matches the visible cell. */
    expect(movKeyText(m, WHS)).toBe('Ələt → —')
  })

  it('shows the partner text for every non-transfer type', () => {
    expect(movKeyText(mv({ partner: 'Azpetrol' }), WHS)).toBe('Azpetrol')
  })

  it('shows an em dash when there is no partner at all', () => {
    expect(movKeyText(mv({ partner: '' }), WHS)).toBe('—')
  })
})
