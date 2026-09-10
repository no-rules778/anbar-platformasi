import { describe, it, expect, beforeEach } from 'vitest'
import { useBatchCancelStore, scopeOf, __resetScope } from './batchCancel.store'
import { blockedByUnresolved } from '../lib/batchOutcome'

/* A CORRUPT BATCH RECORD FAILS CLOSED — the diagnostic that used to live in
   `web/probe/probe.test.ts`, converted into assertions.

   That file was a scratch probe from the I-5 session: it printed four values
   and asserted `expect(out).toEqual([])` against an array that always held
   four strings, so it was an unconditional failure and the only red test in
   the suite. Deleting it would have thrown away what it measured, and
   excluding it from discovery would have hidden a failing test rather than
   resolved it. What it actually measured is worth keeping, so it is stated
   here as the behaviour it was probing.

   THE SCENARIO. Storage holds two records for this scope: a well-formed one
   for document A, and one for document B whose `refreshFailed` is the string
   `'CORRUPT'` instead of a boolean.

   THE POINT. A damaged record means the attempt history is UNREADABLE, and an
   unreadable history is not an empty one. B's own record is lost — it cannot
   be validated, so `blockedByUnresolved` cannot name B — but that must NOT
   leave B dispatchable. The store instead raises `persistenceError`, which
   blocks EVERY dispatch including B's, so the protection B individually lost
   is recovered globally. `beginAttempt` returning null is the assertion that
   matters: it is the difference between failing closed and failing open.

   These are I-5 properties. This file only pins them; it changes nothing. */

beforeEach(() => {
  sessionStorage.clear()
  useBatchCancelStore.getState().reset()
  __resetScope()
})

describe('batchCancel: a corrupt record in this scope', () => {
  const seed = () => {
    const scope = scopeOf('u1')
    sessionStorage.setItem('anbar_batch_unresolved_' + scope, JSON.stringify({
      a: { id: 'a', docNums: ['A'], refreshFailed: false, phase: 'unknown', scope },
      b: { id: 'b', docNums: ['B'], refreshFailed: 'CORRUPT', phase: 'unknown', scope },
    }))
    useBatchCancelStore.getState().hydrate('u1')
    return useBatchCancelStore.getState()
  }

  it('raises the damaged-record error rather than reporting an empty history', () => {
    /* Asserted on the OBSERVABLE property rather than on the constant: the
       message is module-private in the I-5 store and exporting it just to be
       asserted would be a change to I-5 for a test's convenience. */
    const err = seed().persistenceError
    expect(err).not.toBeNull()
    expect(err).toContain('zədələnib')
  })

  it('keeps the records it COULD read instead of discarding the whole blob', () => {
    const st = seed()
    expect(st.unresolvedList).toHaveLength(1)
    expect(st.unresolvedList[0].docNums).toEqual(['A'])
  })

  it('loses B from the per-document block, because B’s record is unreadable', () => {
    /* The honest statement of the gap: nothing can name B as blocked, since
       the record that named it did not survive validation. The next assertion
       is what makes that safe. */
    expect(blockedByUnresolved(seed().unresolvedList, ['B'])).toEqual([])
  })

  it('still refuses to dispatch B — the persistence error blocks every attempt', () => {
    /* THE LOAD-BEARING ASSERTION. B is not individually blocked, yet it is not
       dispatchable: `beginAttempt` returns null while a persistence error
       stands, so a corrupt record can never fail OPEN. */
    expect(seed().beginAttempt(['B'])).toBeNull()
  })

  it('refuses an unrelated document too, since the whole history is suspect', () => {
    expect(seed().beginAttempt(['Z'])).toBeNull()
  })
})
