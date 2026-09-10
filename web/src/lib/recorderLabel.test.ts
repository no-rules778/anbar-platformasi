import { describe, it, expect } from 'vitest'
import { recorderLabel } from './recorderLabel'

/* I-2 AUDIT, finding 2 — «Qeyd edən» must render the FINAL legacy mapping
   (index.html:990), not the intermediate `created_by || 'sistem'` at 943.

     m.by = !m.by || m.by === 'sistem'
       ? 'Excel idxalı'
       : (uname.get(m.by) || (ME && m.by === ME.sbId ? ME.name : 'digər istifadəçi'))  */

const UUID = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const me = { sbId: UUID, name: 'Anar İbrahimov' }

describe('recorderLabel — the four legacy branches (index.html:990)', () => {
  /* Branch 1 — no recorder. */
  it('maps a null recorder to «Excel idxalı»', () => {
    expect(recorderLabel(null, new Map(), me)).toBe('Excel idxalı')
  })

  it('maps an undefined recorder to «Excel idxalı»', () => {
    expect(recorderLabel(undefined, new Map(), me)).toBe('Excel idxalı')
  })

  it('maps an empty recorder to «Excel idxalı»', () => {
    expect(recorderLabel('', new Map(), me)).toBe('Excel idxalı')
  })

  /* The legacy intermediate sentinel is folded into branch 1 by the original's
     own `m.by === 'sistem'` test — it must NOT reach the screen as «sistem». */
  it('maps the legacy «sistem» sentinel to «Excel idxalı», never to «sistem»', () => {
    const out = recorderLabel('sistem', new Map(), me)
    expect(out).toBe('Excel idxalı')
    expect(out).not.toBe('sistem')
  })

  /* Branch 2 — the directory wins. */
  it('renders the directory email for a known id', () => {
    const emails = new Map([[OTHER, 'user@example.com']])
    expect(recorderLabel(OTHER, emails, me)).toBe('user@example.com')
  })

  it('prefers the directory email over the current user name for the SAME id', () => {
    const emails = new Map([[UUID, 'anar@example.com']])
    expect(recorderLabel(UUID, emails, me)).toBe('anar@example.com')
  })

  /* Branch 3 — the signed-in user, absent from a directory of active users. */
  it('falls back to the current user NAME for their own id when not in the directory', () => {
    expect(recorderLabel(UUID, new Map(), me)).toBe('Anar İbrahimov')
  })

  it('treats an EMPTY directory email as absent, matching the legacy `||`', () => {
    const emails = new Map([[UUID, '']])
    expect(recorderLabel(UUID, emails, me)).toBe('Anar İbrahimov')
  })

  /* Branch 4 — anything else. */
  it('renders «digər istifadəçi» for an unknown other id', () => {
    expect(recorderLabel(OTHER, new Map(), me)).toBe('digər istifadəçi')
  })

  it('renders «digər istifadəçi» for an unknown id when `me` is not yet known', () => {
    expect(recorderLabel(OTHER, new Map(), null)).toBe('digər istifadəçi')
  })
})

/* The regression the audit named: `created_by` is a UUID column, so rendering
   the intermediate mapping put a raw UUID on screen. It never may. */
describe('recorderLabel — a raw UUID is never the label', () => {
  it('does not return the id itself for an unknown recorder', () => {
    expect(recorderLabel(OTHER, new Map(), me)).not.toBe(OTHER)
  })

  it('does not return the id itself for the current user missing from the directory', () => {
    expect(recorderLabel(UUID, new Map(), me)).not.toBe(UUID)
  })

  it('returns no UUID-shaped label across every branch, directory empty or not', () => {
    const uuidish = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const dirs = [new Map<string, string>(), new Map([[OTHER, 'k@e.com']])]
    for (const emails of dirs) {
      for (const id of [null, undefined, '', 'sistem', UUID, OTHER]) {
        expect(recorderLabel(id, emails, me)).not.toMatch(uuidish)
      }
    }
  })
})
