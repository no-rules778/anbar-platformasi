import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useBatchCancelStore, scopeOf, __resetScope } from './batchCancel.store'

/* Store-level coverage for I-5 audit findings 3, 4 and 5:

     3. MULTIPLE unresolved batches must coexist, not overwrite one another.
     4. Pending-submission protection must survive a dialog remount (this is
        the store-level half; `BatchCancel.test.tsx` covers the dialog half).
     5. Reconciliation persistence: the unresolved list survives a simulated
        reload (a fresh `hydrate()` call reading the same storage key), stores
        no credential/session data, carries no expiry, and a storage failure
        is handled conservatively (never throws, never fabricates data). */

/** The storage key the store actually uses for a given account, now that the
    scope is PROJECT + ACCOUNT rather than the account alone. */
const keyFor = (userId: string) => 'anbar_batch_unresolved_' + scopeOf(userId)

beforeEach(() => {
  sessionStorage.clear()
  useBatchCancelStore.getState().reset()
  __resetScope()
})

/* Every record-creating call now requires an established scope: `beginAttempt`
   refuses to write an unscoped record. Tests that only exercise record
   bookkeeping hydrate a default account first. */
const hydrated = (userId = 'user-1') => {
  useBatchCancelStore.getState().hydrate(userId)
  return useBatchCancelStore.getState()
}

describe('batchCancel store — multiple unresolved batches (finding 3)', () => {
  it('markUnresolved never overwrites an existing record', () => {
    hydrated()
    useBatchCancelStore.getState().markUnresolved(['A', 'B'], false)
    useBatchCancelStore.getState().markUnresolved(['C'], false)
    const list = useBatchCancelStore.getState().unresolvedList
    expect(list).toHaveLength(2)
    expect(list.map((u) => u.docNums).flat().sort()).toEqual(['A', 'B', 'C'])
  })

  it('each record gets a distinct id', () => {
    hydrated()
    useBatchCancelStore.getState().markUnresolved(['A'], false)
    useBatchCancelStore.getState().markUnresolved(['B'], false)
    const [a, b] = useBatchCancelStore.getState().unresolvedList
    expect(a.id).not.toBe(b.id)
  })

  it('clearUnresolved removes exactly the named record and leaves the rest', () => {
    hydrated()
    useBatchCancelStore.getState().markUnresolved(['A'], false)
    const idB = useBatchCancelStore.getState().markUnresolved(['B'], false)!
    useBatchCancelStore.getState().clearUnresolved(idB)
    const list = useBatchCancelStore.getState().unresolvedList
    expect(list).toHaveLength(1)
    expect(list[0].docNums).toEqual(['A'])
  })

  it('clearUnresolved on an unknown id is a no-op, not a throw', () => {
    hydrated()
    useBatchCancelStore.getState().markUnresolved(['A'], false)
    expect(() => useBatchCancelStore.getState().clearUnresolved('no-such-id')).not.toThrow()
    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(1)
  })

  it('setRefreshFailed updates one record in place without creating a duplicate', () => {
    hydrated()
    const id = useBatchCancelStore.getState().markUnresolved(['A'], false)!
    useBatchCancelStore.getState().setRefreshFailed(id, true)
    const list = useBatchCancelStore.getState().unresolvedList
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id, docNums: ['A'], refreshFailed: true })
  })

  it('setRefreshFailed on an unknown id is a no-op', () => {
    expect(() => useBatchCancelStore.getState().setRefreshFailed('nope', true)).not.toThrow()
    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(0)
  })
})

describe('batchCancel store — pending-submission tracking (finding 4)', () => {
  it('isPending is true only for reserved documents', () => {
    useBatchCancelStore.getState().beginPending(['D-1', 'D-2'])
    expect(useBatchCancelStore.getState().isPending(['D-1'])).toBe(true)
    expect(useBatchCancelStore.getState().isPending(['D-3'])).toBe(false)
    expect(useBatchCancelStore.getState().isPending(['D-3', 'D-2'])).toBe(true)
  })

  it('endPending releases exactly the given documents', () => {
    useBatchCancelStore.getState().beginPending(['D-1', 'D-2'])
    useBatchCancelStore.getState().endPending(['D-1'])
    expect(useBatchCancelStore.getState().isPending(['D-1'])).toBe(false)
    expect(useBatchCancelStore.getState().isPending(['D-2'])).toBe(true)
  })

  it('endPending is idempotent — calling it twice does not throw or affect others', () => {
    useBatchCancelStore.getState().beginPending(['D-1'])
    useBatchCancelStore.getState().endPending(['D-1'])
    expect(() => useBatchCancelStore.getState().endPending(['D-1'])).not.toThrow()
    expect(useBatchCancelStore.getState().isPending(['D-1'])).toBe(false)
  })

  /* The pending set is module-level, not component state — it must survive a
     `reset()` of the unresolved records without leaking into a NEW test, but
     `reset()` itself must clear it too so tests stay isolated (proven by
     `beforeEach` above never seeing stale pending docs across files). */
  it('reset() clears pending reservations too', () => {
    useBatchCancelStore.getState().beginPending(['D-1'])
    useBatchCancelStore.getState().reset()
    expect(useBatchCancelStore.getState().isPending(['D-1'])).toBe(false)
  })
})

describe('batchCancel store — persistence across a reload (finding 5)', () => {
  it('hydrate() restores records written by an earlier attempt for the same account', () => {
    hydrated('user-1')
    useBatchCancelStore.getState().markUnresolved(['A', 'B'], false)

    /* Simulate a reload: reset in-memory state, then hydrate again from the
       same storage the first "session" wrote to. */
    useBatchCancelStore.setState({ unresolvedById: {}, unresolvedList: [] })
    useBatchCancelStore.getState().hydrate('user-1')

    const list = useBatchCancelStore.getState().unresolvedList
    expect(list).toHaveLength(1)
    expect(list[0].docNums).toEqual(['A', 'B'])
  })

  it('records are scoped per account — a different account does not see them', () => {
    hydrated('user-1')
    useBatchCancelStore.getState().markUnresolved(['A'], false)

    useBatchCancelStore.setState({ unresolvedById: {}, unresolvedList: [] })
    useBatchCancelStore.getState().hydrate('user-2')

    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(0)
  })

  /* THE SCOPE IS PROJECT + ACCOUNT, not the account alone — correction 2. */
  it('the storage key includes a project component, not just the account id', () => {
    expect(scopeOf('user-1')).toContain('|user-1')
    expect(scopeOf('user-1')).not.toBe('user-1')
  })

  it('a record written under another scope is not adopted by this scope', () => {
    /* A record that is well-formed in every respect EXCEPT that its `scope`
       names a different project+account. Writing it under THIS account's key
       must not make it this account's record. */
    sessionStorage.setItem(keyFor('user-1'), JSON.stringify({
      'ub-x': {
        id: 'ub-x',
        docNums: ['A'],
        refreshFailed: false,
        phase: 'unknown',
        scope: 'other-project|user-1',
      },
    }))
    useBatchCancelStore.getState().hydrate('user-1')
    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(0)
  })

  it('a late setPhase cannot redirect its record after the account changed', () => {
    hydrated('user-1')
    const id = useBatchCancelStore.getState().markUnresolved(['A'], false)!
    /* The user signs into a different account while the response is still
       outstanding. */
    useBatchCancelStore.getState().hydrate('user-2')
    useBatchCancelStore.getState().setPhase(id, 'success', false)
    /* Nothing from user-1's attempt leaked into user-2's scope. */
    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(0)
    const raw = sessionStorage.getItem(keyFor('user-2'))
    expect(raw === null || raw === '{}').toBe(true)
  })

  /* The record stores ONLY the submitted list, phase, refresh flag and the
     opaque scope string — never a token, session id, or credential. */
  it('the persisted payload carries no credential-like field', () => {
    hydrated('user-1')
    useBatchCancelStore.getState().markUnresolved(['A'], false)
    const raw = sessionStorage.getItem(keyFor('user-1'))
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    const [record] = Object.values(parsed) as Array<Record<string, unknown>>
    expect(Object.keys(record).sort()).toEqual(
      ['docNums', 'id', 'phase', 'refreshFailed', 'scope'],
    )
    expect(raw).not.toMatch(/token|password|secret|apikey|access/i)
  })

  /* No expiry field is written, and no TTL logic exists to silently drop a
     record after time passes — ageing is not evidence about the database, so
     an old record must remain exactly as blocking as a fresh one. */
  it('a record has no timestamp or expiry field', () => {
    hydrated('user-1')
    useBatchCancelStore.getState().markUnresolved(['A'], false)
    const [record] = useBatchCancelStore.getState().unresolvedList
    expect(record).not.toHaveProperty('ts')
    expect(record).not.toHaveProperty('expiresAt')
    expect(record).not.toHaveProperty('createdAt')
  })

  /* ---- FAIL CLOSED. These four reverse the old "conservative" fallback. -- */

  it('a storage WRITE failure refuses the attempt instead of pretending it holds', () => {
    hydrated('user-1')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const id = useBatchCancelStore.getState().beginAttempt(['A'])
    expect(id).toBeNull()
    expect(useBatchCancelStore.getState().persistenceError).toBeTruthy()
    spy.mockRestore()
  })

  it('a storage READ failure on hydrate is an ERROR, not an empty history', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => useBatchCancelStore.getState().hydrate('user-1')).not.toThrow()
    expect(useBatchCancelStore.getState().persistenceError).toBeTruthy()
    spy.mockRestore()
  })

  it('a read failure PRESERVES records already held in memory', () => {
    hydrated('user-1')
    useBatchCancelStore.getState().markUnresolved(['A'], false)
    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(1)

    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    useBatchCancelStore.getState().hydrate('user-1')
    /* The block that was already held is STILL held — the old code assigned
       `{}` here and silently destroyed it. */
    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(1)
    expect(useBatchCancelStore.getState().persistenceError).toBeTruthy()
    spy.mockRestore()
  })

  it('corrupted JSON is an unreadable history, not an empty one', () => {
    sessionStorage.setItem(keyFor('user-1'), '{not valid json')
    expect(() => useBatchCancelStore.getState().hydrate('user-1')).not.toThrow()
    expect(useBatchCancelStore.getState().persistenceError).toBeTruthy()
  })

  /* SUPERSEDED CONTRACT. This test previously asserted that a malformed
     record was DROPPED and `persistenceError` stayed null. That was the
     defect: a stored attempt for document B with one damaged field vanished,
     B stopped being blocked, and `beginAttempt(['B'])` succeeded — the same
     fail-open hole the read-error path was closed against, one level down.
     Valid JSON does not imply a readable attempt history. */
  it('a malformed RECORD raises a blocking error AND keeps valid siblings', () => {
    const scope = scopeOf('user-1')
    sessionStorage.setItem(keyFor('user-1'), JSON.stringify({
      good: { id: 'good', docNums: ['A'], refreshFailed: false, phase: 'unknown', scope },
      bad1: { id: 'bad1', docNums: [], refreshFailed: false, phase: 'unknown', scope },
      bad2: { id: 'bad2', docNums: ['B'], refreshFailed: 'no', phase: 'unknown', scope },
      bad3: { id: 'bad3', docNums: ['C'], refreshFailed: false, phase: 'nonsense', scope },
      bad4: 'garbage',
    }))
    useBatchCancelStore.getState().hydrate('user-1')

    /* The readable block is PRESERVED — raising the error must not cost us
       protection we could actually read. */
    const list = useBatchCancelStore.getState().unresolvedList
    expect(list).toHaveLength(1)
    expect(list[0].docNums).toEqual(['A'])
    /* And the unreadable ones BLOCK, rather than silently freeing B and C. */
    expect(useBatchCancelStore.getState().persistenceError).toBeTruthy()
  })

  it('the damaged stored value is LEFT INTACT for diagnosis', () => {
    const scope = scopeOf('user-1')
    const stored = JSON.stringify({
      good: { id: 'good', docNums: ['A'], refreshFailed: false, phase: 'unknown', scope },
      bad: { id: 'bad', docNums: ['B'], refreshFailed: 'no', phase: 'unknown', scope },
    })
    sessionStorage.setItem(keyFor('user-1'), stored)
    useBatchCancelStore.getState().hydrate('user-1')
    /* Hydration never rewrites or prunes storage. */
    expect(sessionStorage.getItem(keyFor('user-1'))).toBe(stored)
  })

  it('an ENTIRELY invalid record map blocks and yields no records', () => {
    const scope = scopeOf('user-1')
    sessionStorage.setItem(keyFor('user-1'), JSON.stringify({
      bad1: { id: 'bad1', docNums: ['B'], refreshFailed: 'no', phase: 'unknown', scope },
      bad2: 'garbage',
    }))
    useBatchCancelStore.getState().hydrate('user-1')
    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(0)
    expect(useBatchCancelStore.getState().persistenceError).toBeTruthy()
    /* THE POINT: dispatch is refused even though no record survived. */
    expect(useBatchCancelStore.getState().beginAttempt(['B'])).toBeNull()
  })

  /* THE GATE IS IN THE STORE, not only in the rendered button. */
  it('beginAttempt refuses while a persistence error stands', () => {
    hydrated('user-1')
    expect(useBatchCancelStore.getState().beginAttempt(['A'])).not.toBeNull()
    useBatchCancelStore.setState({ persistenceError: 'unreadable' })
    expect(useBatchCancelStore.getState().beginAttempt(['B'])).toBeNull()
  })

  it('a refused beginAttempt writes nothing and leaves the error standing', () => {
    hydrated('user-1')
    useBatchCancelStore.setState({ persistenceError: 'unreadable' })
    const before = sessionStorage.getItem(keyFor('user-1'))
    expect(useBatchCancelStore.getState().beginAttempt(['B'])).toBeNull()
    expect(sessionStorage.getItem(keyFor('user-1'))).toBe(before)
    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(0)
    expect(useBatchCancelStore.getState().persistenceError).toBe('unreadable')
  })

  /* A damaged record belonging to ANOTHER scope is ordinary isolation, not
     damage to ours — it must not block this account. */
  it('another scope\'s record does not raise an error for this scope', () => {
    sessionStorage.setItem(keyFor('user-1'), JSON.stringify({
      other: {
        id: 'other', docNums: ['Z'], refreshFailed: false, phase: 'unknown',
        scope: 'other-project|user-9',
      },
    }))
    useBatchCancelStore.getState().hydrate('user-1')
    expect(useBatchCancelStore.getState().persistenceError).toBeNull()
    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(0)
    expect(useBatchCancelStore.getState().beginAttempt(['A'])).not.toBeNull()
  })

  /* A clean re-hydration is the ONLY thing that clears the error. */
  it('a clean hydrate clears a standing persistence error', () => {
    hydrated('user-1')
    useBatchCancelStore.setState({ persistenceError: 'unreadable' })
    useBatchCancelStore.getState().hydrate('user-1')
    expect(useBatchCancelStore.getState().persistenceError).toBeNull()
    expect(useBatchCancelStore.getState().beginAttempt(['A'])).not.toBeNull()
  })

  it('beginAttempt refuses when no scope has been established at all', () => {
    __resetScope()
    expect(useBatchCancelStore.getState().beginAttempt(['A'])).toBeNull()
  })

  it('a pending attempt survives a reload as uncertainty, not a clean slate', () => {
    hydrated('user-1')
    /* Dispatch begins and the page reloads before any response arrives. */
    useBatchCancelStore.getState().beginAttempt(['A', 'B'])
    useBatchCancelStore.setState({ unresolvedById: {}, unresolvedList: [] })

    useBatchCancelStore.getState().hydrate('user-1')
    const list = useBatchCancelStore.getState().unresolvedList
    expect(list).toHaveLength(1)
    expect(list[0].phase).toBe('pending')
    expect(list[0].docNums).toEqual(['A', 'B'])
  })

  it('reset() clears the persisted storage for the current scope too', () => {
    hydrated('user-1')
    useBatchCancelStore.getState().markUnresolved(['A'], false)
    useBatchCancelStore.getState().reset()
    const raw = sessionStorage.getItem(keyFor('user-1'))
    expect(raw === null || raw === '{}').toBe(true)
  })
})
