import { describe, it, expect } from 'vitest'
import {
  CORE_READS, OPTIONAL_READS, isCoreRead, foldCoreReads, coreHealthy, retainsSnapshot,
  splitEligible, layerEligible, postBlockReason, canPost,
  EMPTY_READINESS, LOAD_FAILED_TITLE,
  type ReadResult, type CoreRead, type ReadinessState, type PostGateState,
} from './opReadiness'
import { condBuckets, condSplitPayload } from './condSplit'

const good = <T>(rows: T[] = []): ReadResult<T> => ({ rows, ok: true, error: null })
const bad = <T>(error = 'boom', partial = false): ReadResult<T> =>
  ({ rows: [], ok: false, error, partial })

const allGood = (): Partial<Record<CoreRead, ReadResult<unknown>>> =>
  Object.fromEntries(CORE_READS.map((n) => [n, good()]))

const ready = (o: Partial<ReadinessState> = {}): ReadinessState => ({
  ...EMPTY_READINESS, loaded: true, splitReady: true, ...o,
})

const gate = (o: Partial<PostGateState> = {}): PostGateState => ({
  readiness: ready(),
  lines: [{ kind: 'out' }],
  canAdd: true,
  inFlight: false,
  ...o,
})

describe('the matrix itself', () => {
  /* stock_conditions is CORE here although legacy treats it as optional — on
     this screen it is an input to a WRITE decision, not a display concern. */
  it('classifies the five core reads, stock_conditions included', () => {
    expect([...CORE_READS]).toEqual(
      ['items', 'movements', 'warehouses', 'partners', 'stock_conditions'],
    )
    expect(isCoreRead('stock_conditions')).toBe(true)
    expect(isCoreRead('reference_values')).toBe(false)
  })

  it('classifies the four optional probes/fallbacks', () => {
    expect([...OPTIONAL_READS]).toEqual([
      'reference_values', 'movement_split_supported',
      'stock_layers_supported', 'transfer_destinations',
    ])
  })

  it('no read is both core and optional', () => {
    for (const o of OPTIONAL_READS) expect(isCoreRead(o)).toBe(false)
  })
})

describe('foldCoreReads — M7-S1: every core read blocks posting on its own', () => {
  it('commits only when every core read succeeded', () => {
    expect(foldCoreReads(allGood())).toEqual({ loaded: true, coreError: null, failedCore: null })
  })

  /* MANDATORY: each core read failing INDEPENDENTLY blocks posting. */
  it.each([...CORE_READS])('a failed %s is fatal and blocks posting', (name) => {
    const results = { ...allGood(), [name]: bad(`${name} failed`) }
    const f = foldCoreReads(results)
    expect(f.loaded).toBe(false)
    expect(f.failedCore).toBe(name)
    expect(f.coreError).toBe(`${name} failed`)

    const blocked = postBlockReason(gate({ readiness: { ...ready(), ...f } }))
    expect(blocked).toBe('not-loaded')
    expect(canPost(gate({ readiness: { ...ready(), ...f } }))).toBe(false)
  })

  it('a missing result is fatal too', () => {
    const results = { ...allGood() }
    delete results.movements
    const f = foldCoreReads(results)
    expect(f.loaded).toBe(false)
    expect(f.failedCore).toBe('movements')
  })

  it('falls back to a generic message when the error text is empty', () => {
    const f = foldCoreReads({ ...allGood(), items: bad('') })
    expect(f.coreError).toBe('Naməlum xəta')
  })

  it('reports the FIRST failing core read', () => {
    const f = foldCoreReads({ ...allGood(), items: bad('a'), movements: bad('b') })
    expect(f.failedCore).toBe('items')
  })
})

describe('M7-S2 — a partial page failure is FATAL, never a smaller dataset', () => {
  /* VERIFIED TO FAIL against a straight port of the legacy fetchAll(), which
     breaks out of paging and RETURNS the rows gathered so far (index.html:855)
     while the screen's refresh callers ignore the returned ok flag (4768,
     4863). Committing those rows builds balances from a truncated dataset and
     OVERSTATES available stock. */
  it('a mid-pagination movements failure does not commit truncated rows', () => {
    const truncated: ReadResult<{ id: string }> = {
      rows: [{ id: 'page1-row' }],   // one page did arrive
      ok: false,
      error: 'network dropped on page 3',
      partial: true,
    }
    const f = foldCoreReads({ ...allGood(), movements: truncated })

    expect(f.loaded).toBe(false)
    expect(f.failedCore).toBe('movements')
    expect(canPost(gate({ readiness: { ...ready(), ...f } }))).toBe(false)
  })

  it('a partial read is treated exactly like a total failure', () => {
    const total = foldCoreReads({ ...allGood(), items: bad('x', false) })
    const partial = foldCoreReads({ ...allGood(), items: { rows: [1, 2], ok: false, error: 'x', partial: true } })
    expect(partial.loaded).toBe(total.loaded)
    expect(partial.failedCore).toBe(total.failedCore)
  })

  it('rows present on a failed result never make it healthy', () => {
    const f = foldCoreReads({
      ...allGood(),
      partners: { rows: [{ name: 'A' }], ok: false, error: 'half', partial: true },
    })
    expect(coreHealthy({ ...ready(), ...f })).toBe(false)
  })
})

describe('M7-S3 — a failed stock_conditions read cannot degrade quantities to normal', () => {
  /* VERIFIED TO FAIL against a straight legacy port. In the original,
     condsReady gates only canEditCond() (2149) and NOT condBuckets() (2087):
     with the map empty every bucket reads 0, `marked` is false, the split UI
     never appears, and the whole quantity posts as `normal` — silently moving
     rented stock as if it were free. */
  it('an empty conditions map really would look unmarked (the hazard)', () => {
    const bucketsWithData = condBuckets({ unfit: 0, repair: 0, onsite: 0, icare: 5 }, 10)
    const bucketsWhenReadFailed = condBuckets(null, 10)

    expect(bucketsWithData.marked).toBe(true)
    expect(bucketsWithData.icare).toBe(5)

    // the hazard, demonstrated: no marker, everything looks normal
    expect(bucketsWhenReadFailed.marked).toBe(false)
    expect(bucketsWhenReadFailed.normal).toBe(10)
    expect(condSplitPayload({ normal: 10 })).toBeNull()
  })

  it('so the read is CORE and its failure blocks the post outright', () => {
    const f = foldCoreReads({ ...allGood(), stock_conditions: bad('rls denied') })
    expect(f.loaded).toBe(false)
    expect(f.failedCore).toBe('stock_conditions')
    expect(postBlockReason(gate({ readiness: { ...ready(), ...f } }))).toBe('not-loaded')
  })

  it('an outbound post is impossible while stock_conditions is unavailable', () => {
    const f = foldCoreReads({ ...allGood(), stock_conditions: bad('timeout') })
    const s = gate({
      readiness: { ...ready(), ...f },
      lines: [{ kind: 'out', cond: null }],
    })
    expect(canPost(s)).toBe(false)
  })

  it('a partial stock_conditions read is fatal as well', () => {
    const f = foldCoreReads({
      ...allGood(),
      stock_conditions: { rows: [{ warehouse: 'Elet' }], ok: false, error: 'half', partial: true },
    })
    expect(f.loaded).toBe(false)
  })
})

describe('M7-S4 — optional probes degrade, they never block the screen', () => {
  it('a failed split probe still allows lines that carry NO split', () => {
    const s = ready({ splitReady: false })
    expect(splitEligible([{ kind: 'out', cond: null }], false)).toBe(true)
    expect(canPost(gate({ readiness: s, lines: [{ kind: 'out', cond: null }] }))).toBe(true)
  })

  it('a failed split probe refuses a line that DOES carry a split', () => {
    const s = ready({ splitReady: false })
    const lines = [{ kind: 'out' as const, cond: { icare: 2 } }]
    expect(splitEligible(lines, false)).toBe(false)
    expect(postBlockReason(gate({ readiness: s, lines }))).toBe('split-unsupported')
  })

  it('a working split probe allows a split line', () => {
    expect(splitEligible([{ kind: 'out', cond: { icare: 2 } }], true)).toBe(true)
  })

  it('an inbound line is never blocked by the split gate', () => {
    expect(splitEligible([{ kind: 'in', cond: { icare: 2 } }], false)).toBe(true)
  })

  it('an all-zero split does not count as a split', () => {
    expect(splitEligible([{ kind: 'out', cond: { normal: 5, icare: 0 } }], false)).toBe(true)
  })

  it('layers inactive → allocations are irrelevant', () => {
    expect(layerEligible([{ kind: 'out', allocations: null }], false)).toBe(true)
  })

  it('layers active → every outbound line needs allocations', () => {
    expect(layerEligible([{ kind: 'out', allocations: null }], true)).toBe(false)
    expect(layerEligible([{ kind: 'out', allocations: [] }], true)).toBe(false)
    expect(layerEligible([{ kind: 'out', allocations: [{}] }], true)).toBe(true)
  })

  it('layers active → an inbound line needs none', () => {
    expect(layerEligible([{ kind: 'in', allocations: null }], true)).toBe(true)
  })

  it('refsReady and transferDestsReady never gate posting', () => {
    const s = ready({ refsReady: false, transferDestsReady: false })
    expect(canPost(gate({ readiness: s }))).toBe(true)
  })
})

describe('M7-S6 — a failed refresh retains the previous snapshot', () => {
  /* Phase 6 M6-S3/A01: rows are kept and the error is shown in the footer; the
     empty-result state must NOT be rendered. */
  it('keeps loaded=true when a refresh fails after a good load', () => {
    const f = foldCoreReads({ ...allGood(), movements: bad('refresh failed') }, true)
    expect(f.loaded).toBe(true)
    expect(f.coreError).toBe('refresh failed')
  })

  it('retainsSnapshot distinguishes a failed refresh from a failed first load', () => {
    const refresh = { ...ready(), ...foldCoreReads({ ...allGood(), items: bad('x') }, true) }
    const first = { ...ready(), ...foldCoreReads({ ...allGood(), items: bad('x') }, false) }
    expect(retainsSnapshot(refresh)).toBe(true)
    expect(retainsSnapshot(first)).toBe(false)
  })

  /* Retaining rows is NOT permission to post on them — the stale-response
     re-check owns that, and the gate refuses meanwhile. */
  it('a retained snapshot still blocks posting while the error stands', () => {
    const s = { ...ready(), ...foldCoreReads({ ...allGood(), items: bad('x') }, true) }
    expect(coreHealthy(s)).toBe(false)
    expect(postBlockReason(gate({ readiness: s }))).toBe('core-error')
  })

  it('a successful refresh clears the error', () => {
    const f = foldCoreReads(allGood(), true)
    expect(f).toEqual({ loaded: true, coreError: null, failedCore: null })
  })
})

describe('M7-S5 — canPost is the single gate and cannot be bypassed', () => {
  it('allows a healthy, permitted, non-empty document', () => {
    expect(postBlockReason(gate())).toBeNull()
    expect(canPost(gate())).toBe(true)
  })

  it.each([
    ['not-loaded', gate({ readiness: ready({ loaded: false }) })],
    ['core-error', gate({ readiness: ready({ coreError: 'x' }) })],
    ['no-permission', gate({ canAdd: false })],
    ['no-lines', gate({ lines: [] })],
    ['in-flight', gate({ inFlight: true })],
    ['split-unsupported', gate({
      readiness: ready({ splitReady: false }),
      lines: [{ kind: 'out', cond: { icare: 1 } }],
    })],
    ['layers-required', gate({
      readiness: ready({ layerActive: true }),
      lines: [{ kind: 'out', allocations: null }],
    })],
  ])('blocks with reason %s', (reason, state) => {
    expect(postBlockReason(state as PostGateState)).toBe(reason)
    expect(canPost(state as PostGateState)).toBe(false)
  })

  /* Order matters: an unloaded screen must not report a permission problem. */
  it('reports readiness before permission and content', () => {
    const s = gate({ readiness: ready({ loaded: false }), canAdd: false, lines: [] })
    expect(postBlockReason(s)).toBe('not-loaded')
  })

  it('reports permission before emptiness', () => {
    expect(postBlockReason(gate({ canAdd: false, lines: [] }))).toBe('no-permission')
  })

  it('canPost is exactly the inverse of postBlockReason', () => {
    const states = [gate(), gate({ lines: [] }), gate({ inFlight: true })]
    for (const s of states) expect(canPost(s)).toBe(postBlockReason(s) === null)
  })

  /* A handler cannot legitimately post by checking a subset of conditions:
     every blocking state is refused by this one predicate. */
  it('no single condition alone is sufficient to post', () => {
    const loadedOnly = gate({ canAdd: false, lines: [] })
    expect(canPost(loadedOnly)).toBe(false)
    const permittedButUnloaded = gate({ readiness: ready({ loaded: false }) })
    expect(canPost(permittedButUnloaded)).toBe(false)
  })

  it('exposes the load-failure heading', () => {
    expect(LOAD_FAILED_TITLE).toBe('Məlumat yüklənmədi')
  })
})
