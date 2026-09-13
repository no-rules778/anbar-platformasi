import { describe, it, expect } from 'vitest'
import { blockedReason, isWrite, isLocalhost, localWriteStatusText, WRITE_ACTIONS } from './mutationGuard'

describe('mutationGuard — which actions the guard covers', () => {
  it.each(['create', 'update', 'delete', 'deactivate', 'activate'] as const)('treats %s as a write', (a) => {
    expect(isWrite(a)).toBe(true)
  })
  it('covers every reference action — none of them is read-only', () => {
    for (const a of ['create', 'update', 'delete', 'deactivate', 'activate'] as const) {
      expect(WRITE_ACTIONS).toContain(a)
      expect(isWrite(a)).toBe(true)
    }
  })

  /* Phase 5: item writes go directly to the `items` table, bypassing
     manage_reference(), so they need the same localhost guard. */
  it('also covers every Nomenklatura write path', () => {
    for (const a of [
      'item.create', 'item.update', 'item.bulk', 'item.import', 'item.category-import',
    ] as const) {
      expect(WRITE_ACTIONS).toContain(a)
      expect(isWrite(a)).toBe(true)
    }
  })

  it('blocks an item write on localhost unless explicitly allowed', () => {
    expect(blockedReason('item.create', { local: true, allowed: false })).toBeTruthy()
    expect(blockedReason('item.create', { local: true, allowed: true })).toBeNull()
    expect(blockedReason('item.create', { local: false, allowed: false })).toBeNull()
  })
})

describe('mutationGuard — host detection', () => {
  it.each(['localhost', '127.0.0.1', '::1', '[::1]'])('recognises %s as local', (h) => {
    expect(isLocalhost(h)).toBe(true)
  })
  it.each(['anbar-platformasi.vercel.app', '192.168.0.94', 'example.com'])('treats %s as not local', (h) => {
    expect(isLocalhost(h)).toBe(false)
  })
})

describe('mutationGuard — blocking policy', () => {
  it('blocks every write on localhost by default, create and update included', () => {
    for (const a of WRITE_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: false })).toMatch(/VITE_ALLOW_LOCAL_WRITES/)
    }
  })

  it('allows every write once the developer opts in', () => {
    for (const a of WRITE_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: true })).toBeNull()
    }
  })

  /* Production must behave exactly as before — the guard is localhost-only. */
  it('never blocks anything off localhost, opt-in or not', () => {
    for (const a of WRITE_ACTIONS) {
      expect(blockedReason(a, { local: false, allowed: false })).toBeNull()
      expect(blockedReason(a, { local: false, allowed: true })).toBeNull()
    }
  })
})

describe('mutationGuard — banner wording', () => {
  it('names the flag and lists the blocked actions when writes are shut', () => {
    const text = localWriteStatusText(false)
    expect(text).toMatch(/VITE_ALLOW_LOCAL_WRITES/)
    expect(text).toMatch(/bloklanıb/)
  })

  it('says writes are open when the developer opted in', () => {
    expect(localWriteStatusText(true)).toMatch(/AÇIQDIR/)
  })
})

/* ---------- Phase 7: the movement write paths (M7-122) ----------
   These are the first writes in the migration that create STOCK MOVEMENTS
   rather than directory rows, so a stray localhost post would be a real
   document in a real warehouse. */
describe('mutationGuard — Phase 7 operation writes', () => {
  const OP_ACTIONS = ['op.post', 'op.post-transfer', 'op.layer-post', 'op.correct'] as const

  it.each(OP_ACTIONS)('treats %s as a write', (a) => {
    expect(isWrite(a)).toBe(true)
  })

  it('includes every operation action in WRITE_ACTIONS', () => {
    for (const a of OP_ACTIONS) expect(WRITE_ACTIONS).toContain(a)
  })

  it('blocks each of them on localhost without the opt-in', () => {
    for (const a of OP_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: false })).toMatch(/bloklanıb/)
    }
  })

  it('allows them on localhost once the developer opts in', () => {
    for (const a of OP_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: true })).toBeNull()
    }
  })

  it('never blocks them off localhost — production is unchanged', () => {
    for (const a of OP_ACTIONS) {
      expect(blockedReason(a, { local: false, allowed: false })).toBeNull()
    }
  })

  it('did not disturb the existing reference and item actions', () => {
    expect(WRITE_ACTIONS).toContain('create')
    expect(WRITE_ACTIONS).toContain('item.create')
    /* 21 through Phase 8; Phase 9 adds `cond.set` (M9-107); Phase 12 adds the
       four nomenclature-request writes (M12-97); Phase 13 adds the three
       Sərfiyyat document writes (M13-97); Phase 17 adds the seven Azpetrol /
       Araz writes (M17-107), taking 29 → 36. */
    expect(WRITE_ACTIONS).toHaveLength(36)
  })
})

/* Phase 9 / M9-107 — the stock-condition marker write. */
describe('mutationGuard — condition write action (M9-107)', () => {
  it('registers cond.set as a write', () => {
    expect(WRITE_ACTIONS).toContain('cond.set')
    expect(isWrite('cond.set')).toBe(true)
  })

  /* THE contract: VITE_ALLOW_LOCAL_WRITES=false blocks it on localhost. */
  it('blocks cond.set on localhost without the opt-in', () => {
    expect(blockedReason('cond.set', { local: true, allowed: false })).toBeTruthy()
  })

  it('allows cond.set on localhost with the opt-in, and always off localhost', () => {
    expect(blockedReason('cond.set', { local: true, allowed: true })).toBeNull()
    expect(blockedReason('cond.set', { local: false, allowed: false })).toBeNull()
  })
})

/* Phase 8 / I-4 — the cancellation family. */
const DOC_ACTIONS = [
  'doc.cancel', 'doc.cancel-transfer', 'doc.cancel-row', 'doc.replace-item',
  'doc.cancel-legacy', 'doc.cancel-legacy-transfer', 'doc.cancel-batch',
] as const

describe('mutationGuard — document cancellation actions (I-4)', () => {
  it('registers all seven', () => {
    expect(DOC_ACTIONS).toHaveLength(7)
    for (const a of DOC_ACTIONS) {
      expect(WRITE_ACTIONS).toContain(a)
      expect(isWrite(a)).toBe(true)
    }
  })

  /* The point of the extension. A cancellation posts a real reversal document;
     unlike a directory row it cannot be edited away afterwards, only countered
     by a further entry that also stays in the audit trail. */
  it('blocks each of them on localhost without the opt-in', () => {
    for (const a of DOC_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: false })).toMatch(/bloklanıb/)
    }
  })

  it('allows them on localhost once the developer opts in', () => {
    for (const a of DOC_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: true })).toBeNull()
    }
  })

  it('never blocks them off localhost — production is unchanged', () => {
    for (const a of DOC_ACTIONS) {
      expect(blockedReason(a, { local: false, allowed: false })).toBeNull()
    }
  })

  /* The extension is ADDITIVE: the fourteen pre-I-4 actions keep behaving
     exactly as before, so no earlier screen changes because of this milestone. */
  it('leaves every pre-existing action untouched', () => {
    for (const a of [
      'create', 'update', 'delete', 'deactivate', 'activate',
      'item.create', 'item.update', 'item.bulk', 'item.import', 'item.category-import',
      'op.post', 'op.post-transfer', 'op.layer-post', 'op.correct',
    ] as const) {
      expect(isWrite(a)).toBe(true)
      expect(blockedReason(a, { local: true, allowed: false })).toMatch(/bloklanıb/)
      expect(blockedReason(a, { local: false, allowed: false })).toBeNull()
    }
  })
})

/* Phase 13 / M13-97 — the three «Sərfiyyat Materialları» document writes. */
const SM_ACTIONS = ['sm.create', 'sm.edit', 'sm.delete'] as const

describe('mutationGuard — Sərfiyyat document actions (M13-97)', () => {
  it('registers all three as writes', () => {
    expect(SM_ACTIONS).toHaveLength(3)
    for (const a of SM_ACTIONS) {
      expect(WRITE_ACTIONS).toContain(a)
      expect(isWrite(a)).toBe(true)
    }
  })

  /* THE contract: VITE_ALLOW_LOCAL_WRITES=false blocks each on localhost.
     `sm.delete` matters most — the document row is DELETEd and its lines
     cascade, with no reversal document and only an audit_log row surviving. */
  it('blocks each of them on localhost without the opt-in', () => {
    for (const a of SM_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: false })).toMatch(/bloklanıb/)
    }
  })

  it('allows each on localhost with the explicit opt-in', () => {
    for (const a of SM_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: true })).toBeNull()
    }
  })

  it('never blocks them off localhost — production is unchanged', () => {
    for (const a of SM_ACTIONS) {
      expect(blockedReason(a, { local: false, allowed: false })).toBeNull()
    }
  })

  /* Negative control: the extension is ADDITIVE. Nothing existing changed. */
  it('leaves every previously registered action registered', () => {
    for (const a of ['create', 'item.create', 'op.post', 'doc.cancel', 'cond.set', 'nreq.create'] as const) {
      expect(WRITE_ACTIONS).toContain(a)
    }
  })
})

/* Phase 17 / M17-107 — the Azpetrol / Araz write family. Before this phase
   the guard had NO `azp.*` action at all; these arrive WITH the first write
   callers, never after them. */
const AZP_ACTIONS = [
  'azp.card-save', 'azp.card-delete', 'azp.post', 'azp.cancel',
  'azp.correct', 'azp.app-balance', 'azp.import',
] as const

describe('mutationGuard — Azpetrol / Araz write actions (M17-107)', () => {
  it('registers all seven as writes', () => {
    expect(AZP_ACTIONS).toHaveLength(7)
    for (const a of AZP_ACTIONS) {
      expect(WRITE_ACTIONS).toContain(a)
      expect(isWrite(a)).toBe(true)
    }
  })

  it('blocks each of them on localhost without the opt-in', () => {
    for (const a of AZP_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: false })).toMatch(/bloklanıb/)
    }
  })

  it('allows each on localhost with the explicit opt-in', () => {
    for (const a of AZP_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: true })).toBeNull()
    }
  })

  it('never blocks them off localhost — production is unchanged', () => {
    for (const a of AZP_ACTIONS) {
      expect(blockedReason(a, { local: false, allowed: false })).toBeNull()
    }
  })

  /* `azp.card-delete` is the only irreversible one: no reversal row, no
     document, recoverable only from a backup. It gets its own assertion so a
     future edit cannot quietly drop it from the guarded set. */
  it('guards the hard delete by its own name', () => {
    expect(isWrite('azp.card-delete')).toBe(true)
    expect(blockedReason('azp.card-delete', { local: true, allowed: false })).toBeTruthy()
  })

  /* The import is guarded SEPARATELY from the post it ends in, because the
     orchestration is not atomic as a whole (M17-89): blocking it by its own
     name stops the card-creation loop before its first write. */
  it('guards the import orchestration separately from the post', () => {
    expect(isWrite('azp.import')).toBe(true)
    expect(isWrite('azp.post')).toBe(true)
    expect(WRITE_ACTIONS.filter((a) => a === 'azp.import')).toHaveLength(1)
  })

  /* Negative control: the extension is ADDITIVE. */
  it('leaves every previously registered action registered', () => {
    for (const a of ['create', 'item.create', 'op.post', 'doc.cancel', 'cond.set', 'nreq.create', 'sm.create'] as const) {
      expect(WRITE_ACTIONS).toContain(a)
    }
  })
})
