import { describe, expect, it } from 'vitest'
import { partnerExportMatrix, sourceCounts } from './settings'

describe('settings helpers', () => {
  it('builds the exact four-column partner matrix without coercing nulls', () => {
    expect(partnerExportMatrix([{ id: '1', name: 'P', voen: null, contract: 'C', contract_date: '2026-01-01', active: true, created_at: null, created_by: null }])).toEqual([
      ['Kontragent', 'VÖEN', 'Müqavilə', 'Tarix'], ['P', null, 'C', '2026-01-01'],
    ])
  })
  it('counts the supplied operational set rather than raw movements', () => {
    expect(sourceCounts([1, 2], [1], [1, 2, 3])).toEqual({ items: 2, partners: 1, movements: 3 })
  })
})
