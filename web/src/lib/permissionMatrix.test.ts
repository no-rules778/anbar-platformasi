import { describe, expect, it } from 'vitest'
import { PERMISSION_COLUMNS, PERMISSION_ROWS, hasPermission } from './permissionMatrix'
import { ROLE_PERMS } from './roles'

describe('permission matrix', () => {
  it('shows the ten legacy rows in order, not the twelve permission keys', () => {
    expect(PERMISSION_ROWS.map((r) => r.key)).toEqual([
      'mv.add', 'mv.edit', 'mv.del', 'item.add', 'item.edit',
      'partner.edit', 'price.edit', 'import', 'user.manage', 'cancel',
    ])
    /* M16-03 — the two admin keys legacy deliberately does not display. */
    expect(ROLE_PERMS.admin).toHaveLength(12)
    expect(PERMISSION_ROWS.map((r) => r.key)).not.toContain('loc.edit')
    expect(PERMISSION_ROWS.map((r) => r.key)).not.toContain('category.edit')
  })

  it('uses all six role keys as columns', () => {
    expect(PERMISSION_COLUMNS).toEqual(['admin', 'rehber', 'anbardar', 'techizat', 'muhasib', 'baxis'])
  })

  it('resolves cells through effectiveRole', () => {
    expect(hasPermission('admin', 'cancel')).toBe(true)
    expect(hasPermission('anbardar', 'mv.add')).toBe(true)
    expect(hasPermission('anbardar', 'mv.edit')).toBe(false)
    expect(hasPermission('rehber', 'mv.add')).toBe(false)
  })

  /* M16-06 — techizat/muhasib/baxis map to rehber, so every cell is `yox`. */
  it('renders the three legacy role columns as fully empty', () => {
    for (const role of ['techizat', 'muhasib', 'baxis']) {
      for (const row of PERMISSION_ROWS) {
        expect(hasPermission(role, row.key)).toBe(false)
      }
    }
  })
})
