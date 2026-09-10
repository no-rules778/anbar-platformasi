import { describe, it, expect } from 'vitest'
import {
  sourceGroupWarehouses, allowedWarehouses, sourceWarehouses,
  transferSourceWarehouses, transferDestWarehouses, ANBARDAR_FORBIDDEN_DEST,
} from './warehouseScope'
import type { Me } from './roles'

const allWhs = ['Elet', 'Astara', 'Xocahesen', 'Harmony', 'Ofis']

const admin: Me = { id: '1', sbId: '1', email: 'a@x.com', name: 'A', role: 'admin', wh: '' }
const anbardarAstara: Me = { id: '2', sbId: '2', email: 'b@x.com', name: 'B', role: 'anbardar', wh: 'Astara' }
const anbardarElet: Me = { id: '3', sbId: '3', email: 'c@x.com', name: 'C', role: 'anbardar', wh: 'Elet' }

describe('sourceGroupWarehouses', () => {
  it('groups Astara and Harmony together', () => {
    expect(sourceGroupWarehouses('Astara')).toEqual(['Astara', 'Harmony'])
    expect(sourceGroupWarehouses('Harmony')).toEqual(['Astara', 'Harmony'])
  })
  it('every other warehouse is its own group', () => {
    expect(sourceGroupWarehouses('Elet')).toEqual(['Elet'])
  })
  it('empty warehouse returns empty group', () => {
    expect(sourceGroupWarehouses('')).toEqual([])
  })
})

describe('allowedWarehouses', () => {
  it('admin sees every warehouse', () => {
    expect(allowedWarehouses(admin, allWhs)).toEqual(allWhs)
  })
  it('anbardar sees only their own assigned warehouse, not the source group', () => {
    expect(allowedWarehouses(anbardarAstara, allWhs)).toEqual(['Astara'])
  })
  it('not-logged-in sees every warehouse (matches original: only isAnbardar gates it)', () => {
    expect(allowedWarehouses(null, allWhs)).toEqual(allWhs)
  })
})

describe('sourceWarehouses', () => {
  it('admin sees every warehouse', () => {
    expect(sourceWarehouses(admin, allWhs)).toEqual(allWhs)
  })
  it('Astara anbardar sees the whole Astara/Harmony source group', () => {
    expect(sourceWarehouses(anbardarAstara, allWhs)).toEqual(['Astara', 'Harmony'])
  })
  it('Elet anbardar sees only Elet', () => {
    expect(sourceWarehouses(anbardarElet, allWhs)).toEqual(['Elet'])
  })
})

/* ---------- D-H1 (Phase 7, Q3) ----------
   The transfer picker is narrowed to the LIVE server contract. Both halves are
   pinned: the anbardar is narrowed AND the admin is untouched. The legacy
   sourceWarehouses() above keeps its wider behaviour because Phase 6 and
   earlier depend on it. */
describe('transferSourceWarehouses — D-H1', () => {
  it('admin is UNCHANGED — every warehouse', () => {
    expect(transferSourceWarehouses(admin, allWhs)).toEqual(allWhs)
  })

  it('an Astara anbardar gets ONLY Astara, not the Astara/Harmony group', () => {
    expect(transferSourceWarehouses(anbardarAstara, allWhs)).toEqual(['Astara'])
  })

  it('differs from the legacy sourceWarehouses() for a group member', () => {
    expect(sourceWarehouses(anbardarAstara, allWhs)).toEqual(['Astara', 'Harmony'])
    expect(transferSourceWarehouses(anbardarAstara, allWhs)).toEqual(['Astara'])
  })

  it('agrees with the legacy rule for a non-group anbardar', () => {
    expect(transferSourceWarehouses(anbardarElet, allWhs))
      .toEqual(sourceWarehouses(anbardarElet, allWhs))
  })

  it('not-logged-in is not narrowed (only isAnbardar gates it)', () => {
    expect(transferSourceWarehouses(null, allWhs)).toEqual(allWhs)
  })
})

describe('transferDestWarehouses — D-H1', () => {
  it('admin is UNCHANGED — Ofis stays available', () => {
    expect(transferDestWarehouses(admin, allWhs)).toEqual(allWhs)
    expect(transferDestWarehouses(admin, allWhs)).toContain('Ofis')
  })

  it('an anbardar never sees Ofis as a destination', () => {
    const out = transferDestWarehouses(anbardarAstara, allWhs)
    expect(out).not.toContain('Ofis')
    expect(out).toEqual(['Elet', 'Astara', 'Xocahesen', 'Harmony'])
  })

  it('an anbardar keeps every other destination, including group siblings', () => {
    expect(transferDestWarehouses(anbardarElet, allWhs)).toContain('Harmony')
  })

  it('the forbidden destination is the live server value', () => {
    expect(ANBARDAR_FORBIDDEN_DEST).toBe('Ofis')
  })

  it('never mutates its input', () => {
    const src = [...allWhs]
    transferDestWarehouses(anbardarAstara, src)
    expect(src).toEqual(allWhs)
  })
})
