import { describe, expect, it } from 'vitest'
import { canEditCond } from './canEditCond'
import type { Me } from './roles'

const me = (role: string, wh = ''): Me => ({ id: role, sbId: role, email: '', name: '', role, wh })

describe('canEditCond — M9-90/M9-91', () => {
  it('refuses before conditions load and for aggregate/synthetic warehouses', () => {
    expect(canEditCond(me('admin'), 'Ələt', false)).toBe(false)
    expect(canEditCond(me('admin'), '', true)).toBe(false)
    expect(canEditCond(me('admin'), 'bütün anbarlar', true)).toBe(false)
    expect(canEditCond(me('admin'), '—', true)).toBe(false)
  })

  it('allows an admin for any concrete warehouse', () => {
    expect(canEditCond(me('admin'), 'Ələt', true)).toBe(true)
    expect(canEditCond(me('admin'), 'Astara', true)).toBe(true)
  })

  it('allows an anbardar only for their exact assigned warehouse', () => {
    expect(canEditCond(me('anbardar', 'Ələt'), 'Ələt', true)).toBe(true)
    expect(canEditCond(me('anbardar', 'Ələt'), 'Astara', true)).toBe(false)
    expect(canEditCond(me('anbardar'), 'Ələt', true)).toBe(false)
  })

  it('refuses rehber and legacy read-only roles', () => {
    expect(canEditCond(me('rehber'), 'Ələt', true)).toBe(false)
    expect(canEditCond(me('techizat'), 'Ələt', true)).toBe(false)
    expect(canEditCond(null, 'Ələt', true)).toBe(false)
  })
})
