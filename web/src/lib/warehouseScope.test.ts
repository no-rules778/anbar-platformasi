import { describe, it, expect } from 'vitest'
import { sourceGroupWarehouses, allowedWarehouses, sourceWarehouses } from './warehouseScope'
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
