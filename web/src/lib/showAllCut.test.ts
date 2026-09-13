import { describe, expect, it } from 'vitest'
import { SHOW_MAX, applyCut } from './showAllCut'

/* `cut()` / `SHOW_MAX` — index.html:1678-1681. Pins the constant that
   WarehouseOverviewPage.test.tsx mocks to 3, so the page's cut behaviour and
   the real cap are each proved once. */
describe('applyCut — index.html:1678-1681', () => {
  it('SHOW_MAX is 3000', () => {
    expect(SHOW_MAX).toBe(3000)
  })

  it('returns exactly SHOW_MAX rows at SHOW_MAX + 1 (equality is NOT cut)', () => {
    const rows = Array.from({ length: SHOW_MAX + 1 }, (_, i) => i)
    expect(applyCut(rows, false)).toHaveLength(SHOW_MAX)
    expect(applyCut(rows.slice(0, SHOW_MAX), false)).toHaveLength(SHOW_MAX)
  })

  it('returns the same array untouched when showAll is set or the set fits', () => {
    const rows = Array.from({ length: SHOW_MAX + 1 }, (_, i) => i)
    expect(applyCut(rows, true)).toBe(rows)
    const small = [1, 2, 3]
    expect(applyCut(small, false)).toBe(small)
  })
})
