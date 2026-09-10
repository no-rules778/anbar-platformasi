import { describe, it, expect } from 'vitest'
import {
  KIND_RULES,
  WIRED_KINDS,
  kindLabel,
  kindRule,
  isKindReady,
  usageKey,
  entityUsageKey,
  type ReferenceReadiness,
} from './referenceDirectory'

/* REF_KINDS, verbatim from index.html:2934-2943, in the original's order. The
   labels are user-visible Azerbaijani text; a divergence here is a parity bug,
   so they are asserted literally rather than derived. */
const REF_KINDS: readonly [string, string][] = [
  ['warehouse', 'Anbar'],
  ['location', 'Ünvan / layihə'],
  ['partner', 'Kontragent'],
  ['channel', 'Alınma kanalı'],
  ['unit', 'Ölçü vahidi'],
  ['category', 'Mal kateqoriyası'],
  ['project', 'Layihə (Sərfiyyat Materialları)'],
  ['serfiyyat_channel', 'Alınma kanalı (Sərfiyyat Materialları)'],
]

const ready: ReferenceReadiness = { referenceValues: true, serfiyyat: true }
const noRefs: ReferenceReadiness = { referenceValues: false, serfiyyat: true }
const noSm: ReferenceReadiness = { referenceValues: true, serfiyyat: false }

describe('KIND_RULES — completeness and labels', () => {
  it('covers all eight REF_KINDS in the original order', () => {
    expect(KIND_RULES.map((r) => r.kind)).toEqual(REF_KINDS.map(([k]) => k))
  })

  it('carries every label verbatim from REF_KINDS', () => {
    for (const [kind, label] of REF_KINDS) {
      expect(kindLabel(kind)).toBe(label)
    }
  })

  it('has exactly one rule per kind', () => {
    const kinds = KIND_RULES.map((r) => r.kind)
    expect(new Set(kinds).size).toBe(kinds.length)
  })

  it('falls back to the raw kind for an unknown value', () => {
    expect(kindLabel('nope')).toBe('nope')
    expect(kindRule('nope')).toBeUndefined()
  })
})

/* refServerReady (index.html:2949-2953). The grouping below is the whole point
   of the readiness field: it follows the original's probe, not the data source. */
describe('isKindReady — readiness follows the probe, not the data source', () => {
  it('treats warehouse, location and partner as always available', () => {
    for (const kind of ['warehouse', 'location', 'partner']) {
      expect(isKindReady(kind, { referenceValues: false, serfiyyat: false })).toBe(true)
    }
  })

  it('gates channel, unit and category on referenceValues', () => {
    for (const kind of ['channel', 'unit', 'category']) {
      expect(isKindReady(kind, ready)).toBe(true)
      expect(isKindReady(kind, noRefs)).toBe(false)
      /* Sərfiyyat has no bearing on these three. */
      expect(isKindReady(kind, noSm)).toBe(true)
    }
  })

  it('gates project AND serfiyyat_channel on serfiyyat, not on referenceValues', () => {
    for (const kind of ['project', 'serfiyyat_channel']) {
      expect(isKindReady(kind, ready)).toBe(true)
      expect(isKindReady(kind, noSm)).toBe(false)
    }
  })

  it('keeps serfiyyat_channel unavailable when Sərfiyyat is down even though its rows come from get_reference_values()', () => {
    /* M3-02a: its source (referenceValues) is up, its gate (serfiyyat) is not.
       Deriving readiness from the source would wrongly make it available. */
    expect(isKindReady('serfiyyat_channel', noSm)).toBe(false)
    expect(isKindReady('channel', noSm)).toBe(true)
  })

  it('returns false for an unknown kind', () => {
    expect(isKindReady('nope', ready)).toBe(false)
  })
})

describe('WIRED_KINDS — all eight kinds after Phase 3b', () => {
  it('wires every REF_KINDS entry, in the original order', () => {
    expect(WIRED_KINDS.map((k) => k.kind)).toEqual(REF_KINDS.map(([k]) => k))
  })

  it('leaves no kind unwired — D-12 closes here', () => {
    expect(KIND_RULES.filter((r) => !r.wired)).toEqual([])
  })
})

/* index.html:3085 — the name is the accounting and access key for warehouse
   and location, so it is frozen once used. The other six cascade instead. */
describe('nameLockedWhenUsed', () => {
  it('is set for warehouse and location only', () => {
    const locked = KIND_RULES.filter((r) => r.nameLockedWhenUsed).map((r) => r.kind)
    expect(locked).toEqual(['warehouse', 'location'])
  })
})

/* index.html:2984 — refUsage matches serfiyyat_documents.project_id. */
describe('usageById and entityUsageKey', () => {
  it('is set for project only', () => {
    const byId = KIND_RULES.filter((r) => r.usageById).map((r) => r.kind)
    expect(byId).toEqual(['project'])
  })

  it('keys a project by id and everything else by name', () => {
    expect(entityUsageKey({ kind: 'project', id: 'pj-1', name: 'Layihə A' })).toBe('project|pj-1')
    expect(entityUsageKey({ kind: 'unit', id: 'u-1', name: 'ədəd' })).toBe('unit|ədəd')
    expect(entityUsageKey({ kind: 'location', id: '9', name: 'Sahə' })).toBe('location|Sahə')
  })

  it('keeps two same-named projects apart', () => {
    const a = entityUsageKey({ kind: 'project', id: 'pj-1', name: 'Eyni' })
    const b = entityUsageKey({ kind: 'project', id: 'pj-2', name: 'Eyni' })
    expect(a).not.toBe(b)
  })
})

describe('usageKey', () => {
  it('scopes a name to its kind', () => {
    expect(usageKey('unit', 'ədəd')).toBe('unit|ədəd')
    expect(usageKey('unit', 'x')).not.toBe(usageKey('category', 'x'))
  })
})
