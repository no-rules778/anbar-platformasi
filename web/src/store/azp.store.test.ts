import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchAzpSnapshot = vi.fn()
vi.mock('../api/azpSnapshot.api', () => ({
  fetchAzpSnapshot: (m: string) => fetchAzpSnapshot(m),
}))

import { useAzpStore, __resetAzpRequestSeq, EMPTY_AZP_FILTER } from './azp.store'

/* Phase 17 — M17-24, M17-26, M17-27, and the two-board isolation of §2.

   The snapshot API is MOCKED. Nothing here is live evidence, and nothing here
   says anything about what the server permits. */

const CARD = { card_id: 'c1', card_no: '0012', holder: 'Anar', module: 'azpetrol' }
const MOV = { id: 5, card_id: 'c1', kind: 'medaxil', amount: 30 }
const LOG = { id: 9, entity: 'card', action: 'create' }

function snap(over: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    snapshot: { cards: [CARD], movs: [MOV], log: [LOG], appBalance: 100, ...over },
  }
}

/** A promise this test controls the resolution of. */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  __resetAzpRequestSeq()
  useAzpStore.getState().reset()
  fetchAzpSnapshot.mockResolvedValue(snap())
})

describe('the two boards are never merged', () => {
  it('starts on azpetrol with both boards empty and unready', () => {
    const s = useAzpStore.getState()
    expect(s.board).toBe('azpetrol')
    expect(s.data.azpetrol.ready).toBe(false)
    expect(s.data.araz.ready).toBe(false)
  })

  it('loading one board leaves the other untouched', async () => {
    await useAzpStore.getState().load('azpetrol')
    const s = useAzpStore.getState()
    expect(s.data.azpetrol.ready).toBe(true)
    expect(s.data.azpetrol.cards).toEqual([CARD])
    expect(s.data.araz.ready).toBe(false)
    expect(s.data.araz.cards).toEqual([])
  })

  it('passes the module through to the read', async () => {
    await useAzpStore.getState().load('araz')
    expect(fetchAzpSnapshot).toHaveBeenCalledWith('araz')
  })

  it('keeps a separate filter per board', () => {
    useAzpStore.getState().setFilter('azpetrol', { q: 'abc' })
    const s = useAzpStore.getState()
    expect(s.filter.azpetrol.q).toBe('abc')
    expect(s.filter.araz.q).toBe('')
  })

  it('clearFilter resets only its own board', () => {
    useAzpStore.getState().setFilter('azpetrol', { q: 'abc', kind: 'medaxil' })
    useAzpStore.getState().setFilter('araz', { q: 'zzz' })
    useAzpStore.getState().clearFilter('azpetrol')
    const s = useAzpStore.getState()
    expect(s.filter.azpetrol).toEqual(EMPTY_AZP_FILTER)
    expect(s.filter.araz.q).toBe('zzz')
  })
})

/* M17-26 — the two load guards, index.html:8174-8175. */
describe('the load guards (M17-26)', () => {
  it('does not reload a ready board without force', async () => {
    await useAzpStore.getState().load('azpetrol')
    expect(fetchAzpSnapshot).toHaveBeenCalledTimes(1)
    await useAzpStore.getState().load('azpetrol')
    expect(fetchAzpSnapshot).toHaveBeenCalledTimes(1)
  })

  it('DOES reload a ready board when forced', async () => {
    await useAzpStore.getState().load('azpetrol')
    await useAzpStore.getState().load('azpetrol', true)
    expect(fetchAzpSnapshot).toHaveBeenCalledTimes(2)
  })

  it('refuses a concurrent second load of the same board', async () => {
    const d = deferred<ReturnType<typeof snap>>()
    fetchAzpSnapshot.mockReturnValueOnce(d.promise)
    const first = useAzpStore.getState().load('azpetrol')
    /* The board is now in flight — a second call must issue no read. */
    await useAzpStore.getState().load('azpetrol')
    expect(fetchAzpSnapshot).toHaveBeenCalledTimes(1)
    d.resolve(snap())
    await first
    expect(fetchAzpSnapshot).toHaveBeenCalledTimes(1)
  })

  /* The guard is PER BOARD: an in-flight Azpetrol must not block Araz. */
  it('an in-flight load of one board does not block the other', async () => {
    const d = deferred<ReturnType<typeof snap>>()
    fetchAzpSnapshot.mockReturnValueOnce(d.promise)
    const first = useAzpStore.getState().load('azpetrol')
    await useAzpStore.getState().load('araz')
    expect(fetchAzpSnapshot).toHaveBeenCalledTimes(2)
    expect(useAzpStore.getState().data.araz.ready).toBe(true)
    d.resolve(snap())
    await first
  })
})

describe('a successful load', () => {
  it('applies all four parts of the snapshot', async () => {
    fetchAzpSnapshot.mockResolvedValue(snap({ appBalance: 42.5 }))
    await useAzpStore.getState().load('azpetrol')
    const b = useAzpStore.getState().data.azpetrol
    expect(b.cards).toEqual([CARD])
    expect(b.movs).toEqual([MOV])
    expect(b.log).toEqual([LOG])
    expect(b.appBalance).toBe(42.5)
    expect(b.ready).toBe(true)
    expect(b.loading).toBe(false)
    expect(b.err).toBeNull()
  })

  it('a load that succeeds with NO rows is ready, not an error', async () => {
    fetchAzpSnapshot.mockResolvedValue(snap({ cards: [], movs: [], log: [], appBalance: 0 }))
    await useAzpStore.getState().load('azpetrol')
    const b = useAzpStore.getState().data.azpetrol
    expect(b.ready).toBe(true)
    expect(b.err).toBeNull()
    expect(b.cards).toEqual([])
  })

  it('clears a previous error', async () => {
    fetchAzpSnapshot.mockResolvedValue({ ok: false as const, error: 'boom' })
    await useAzpStore.getState().load('azpetrol')
    expect(useAzpStore.getState().data.azpetrol.err).toBe('boom')
    fetchAzpSnapshot.mockResolvedValue(snap())
    await useAzpStore.getState().load('azpetrol', true)
    expect(useAzpStore.getState().data.azpetrol.err).toBeNull()
  })
})

/* M17-24 — a failed FIRST load versus a failed REFRESH. */
describe('failure handling (M17-24)', () => {
  it('a failed first load leaves the board unready with the error', async () => {
    fetchAzpSnapshot.mockResolvedValue({ ok: false as const, error: 'Modul bazası əlçatan deyil' })
    const r = await useAzpStore.getState().load('azpetrol')
    expect(r).toEqual({ ok: false, error: 'Modul bazası əlçatan deyil' })
    const b = useAzpStore.getState().data.azpetrol
    expect(b.ready).toBe(false)
    expect(b.loading).toBe(false)
    expect(b.err).toBe('Modul bazası əlçatan deyil')
    expect(b.cards).toEqual([])
  })

  /* Legacy index.html:8192-8195 always clears `ready` on failure. The arrays
     remain in memory, but the error state replaces them on screen. */
  it('a failed REFRESH clears ready while retaining the previous arrays in memory', async () => {
    await useAzpStore.getState().load('azpetrol')
    fetchAzpSnapshot.mockResolvedValue({ ok: false as const, error: 'şəbəkə yoxdur' })
    await useAzpStore.getState().load('azpetrol', true)
    const b = useAzpStore.getState().data.azpetrol
    expect(b.cards).toEqual([CARD])
    expect(b.movs).toEqual([MOV])
    expect(b.log).toEqual([LOG])
    expect(b.appBalance).toBe(100)
    expect(b.ready).toBe(false)
    expect(b.err).toBe('şəbəkə yoxdur')
    expect(b.loading).toBe(false)
  })
})

/* The stale-reply rule, per board. */
describe('out-of-order replies', () => {
  it('a stale reply does not overwrite a newer snapshot', async () => {
    const slow = deferred<ReturnType<typeof snap>>()
    fetchAzpSnapshot.mockReturnValueOnce(slow.promise)
    const first = useAzpStore.getState().load('azpetrol')

    /* A lifecycle reset clears the loading flag, allowing a newer load while
       the old promise is still pending. This creates a genuinely overlapping
       pair; the previous version of this test resolved the first request
       before issuing the second and therefore exercised no stale reply. */
    useAzpStore.getState().reset()
    fetchAzpSnapshot.mockResolvedValue(snap({ cards: [CARD] }))
    await useAzpStore.getState().load('azpetrol', true)
    slow.resolve(snap({ cards: [] }))
    await first
    expect(useAzpStore.getState().data.azpetrol.cards).toEqual([CARD])
  })
})

describe('the store exposes no write path', () => {
  it('has only read and filter actions', () => {
    const keys = Object.keys(useAzpStore.getState()).sort()
    expect(keys).toEqual(
      ['board', 'clearFilter', 'data', 'filter', 'load', 'reset', 'setBoard', 'setFilter'].sort(),
    )
  })
})
