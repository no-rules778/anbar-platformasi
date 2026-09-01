import { describe, it, expect } from 'vitest'
import { effectiveRole, can, isAdmin, isRehber, isAnbardar, permissionDeniedMessage, type Me } from './roles'

const admin: Me = { id: '1', sbId: '1', email: 'a@x.com', name: 'A', role: 'admin', wh: '' }
const anbardar: Me = { id: '2', sbId: '2', email: 'b@x.com', name: 'B', role: 'anbardar', wh: 'Astara' }
const rehber: Me = { id: '3', sbId: '3', email: 'c@x.com', name: 'C', role: 'rehber', wh: '' }
const legacyTechizat: Me = { id: '4', sbId: '4', email: 'd@x.com', name: 'D', role: 'techizat', wh: '' }
const legacyMuhasib: Me = { id: '5', sbId: '5', email: 'e@x.com', name: 'E', role: 'muhasib', wh: '' }
const legacyBaxis: Me = { id: '6', sbId: '6', email: 'f@x.com', name: 'F', role: 'baxis', wh: '' }
const unknownRole: Me = { id: '7', sbId: '7', email: 'g@x.com', name: 'G', role: 'nonsense', wh: '' }

describe('effectiveRole', () => {
  it('passes admin and anbardar through unchanged', () => {
    expect(effectiveRole('admin')).toBe('admin')
    expect(effectiveRole('anbardar')).toBe('anbardar')
  })
  it('collapses legacy and unknown roles to rehber', () => {
    expect(effectiveRole('techizat')).toBe('rehber')
    expect(effectiveRole('muhasib')).toBe('rehber')
    expect(effectiveRole('baxis')).toBe('rehber')
    expect(effectiveRole('rehber')).toBe('rehber')
    expect(effectiveRole('nonsense')).toBe('rehber')
    expect(effectiveRole(null)).toBe('rehber')
    expect(effectiveRole(undefined)).toBe('rehber')
  })
})

describe('isAdmin / isRehber / isAnbardar — never overlap', () => {
  it.each([
    ['admin', admin, true, false, false],
    ['anbardar', anbardar, false, false, true],
    ['rehber', rehber, false, true, false],
    ['legacy techizat', legacyTechizat, false, true, false],
    ['legacy muhasib', legacyMuhasib, false, true, false],
    ['legacy baxis', legacyBaxis, false, true, false],
    ['unknown role', unknownRole, false, true, false],
  ])('%s', (_label, me, wantAdmin, wantRehber, wantAnbardar) => {
    expect(isAdmin(me)).toBe(wantAdmin)
    expect(isRehber(me)).toBe(wantRehber)
    expect(isAnbardar(me)).toBe(wantAnbardar)
  })
  it('all three are false when not logged in', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isRehber(null)).toBe(false)
    expect(isAnbardar(null)).toBe(false)
  })
})

describe('can', () => {
  it('admin can do admin-only actions', () => {
    expect(can(admin, 'user.manage')).toBe(true)
    expect(can(admin, 'cancel')).toBe(true)
  })
  it('anbardar can only mv.add', () => {
    expect(can(anbardar, 'mv.add')).toBe(true)
    expect(can(anbardar, 'mv.edit')).toBe(false)
    expect(can(anbardar, 'user.manage')).toBe(false)
  })
  it('rehber (and legacy-mapped roles) can do nothing', () => {
    expect(can(rehber, 'mv.add')).toBe(false)
    expect(can(legacyTechizat, 'mv.add')).toBe(false)
  })
  it('nobody logged in can do nothing', () => {
    expect(can(null, 'mv.add')).toBe(false)
  })
})

describe('permissionDeniedMessage', () => {
  it('includes the role label', () => {
    expect(permissionDeniedMessage(rehber)).toBe('Bu əməliyyat üçün icazəniz yoxdur (Rəhbər)')
  })
})
