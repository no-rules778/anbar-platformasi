import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCorrectionStore, READ_FAILED, RECORD_INVALID } from './correction.store'
import { scopeOf } from './batchCancel.store'
import { useBatchCancelStore } from './batchCancel.store'

/* I-6, decision `D6` — the unresolved-CORRECTION record.

   The same fail-closed properties I-5 established, verified independently
   here because this is a SEPARATE store: a bug fixed in one does not fix the
   other, and the two must not be able to clear each other's blocks. */

const USER = 'user-1'
const scope = () => scopeOf(USER)
const KEY = () => 'anbar_correction_unresolved_' + scope()

const stored = (): Record<string, unknown> =>
  JSON.parse(sessionStorage.getItem(KEY()) ?? '{}') as Record<string, unknown>

const seed = (records: Record<string, unknown>): void => {
  sessionStorage.setItem(KEY(), JSON.stringify(records))
}

const validRecord = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'uc-1',
  docNum: 'SND-1',
  newDocNum: null,
  phase: 'unknown',
  refreshFailed: false,
  scope: scope(),
  lineCount: 2,
  ...over,
})

beforeEach(() => {
  sessionStorage.clear()
  useCorrectionStore.getState().reset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hydrate — a read failure is never an empty history', () => {
  it('loads valid stored records', () => {
    seed({ 'uc-1': validRecord() })
    useCorrectionStore.getState().hydrate(USER)
    const s = useCorrectionStore.getState()
    expect(s.persistenceError).toBe(null)
    expect(s.unresolvedList).toHaveLength(1)
    expect(s.blockingFor('SND-1')).toMatchObject({ docNum: 'SND-1' })
  })

  it('an empty store is an empty history, not an error', () => {
    useCorrectionStore.getState().hydrate(USER)
    expect(useCorrectionStore.getState().persistenceError).toBe(null)
    expect(useCorrectionStore.getState().unresolvedList).toHaveLength(0)
  })

  it('unreadable storage BLOCKS rather than reading as empty', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    useCorrectionStore.getState().hydrate(USER)
    expect(useCorrectionStore.getState().persistenceError).toBe(READ_FAILED)
  })

  it('corrupt JSON is an unreadable history, not an empty one', () => {
    sessionStorage.setItem(KEY(), '{not json')
    useCorrectionStore.getState().hydrate(USER)
    expect(useCorrectionStore.getState().persistenceError).toBe(READ_FAILED)
  })

  it('a DAMAGED record of ours blocks, and valid siblings still survive', () => {
    seed({
      'uc-1': validRecord(),
      'uc-2': validRecord({ id: 'uc-2', docNum: 'SND-2', refreshFailed: 'CORRUPT' }),
    })
    useCorrectionStore.getState().hydrate(USER)
    const s = useCorrectionStore.getState()
    /* Valid JSON does not imply a readable attempt history — the I-5
       correction-2b lesson, verified independently for this store. */
    expect(s.persistenceError).toBe(RECORD_INVALID)
    expect(s.blockingFor('SND-1')).not.toBe(null)
  })

  it('hydration NEVER rewrites or prunes the stored value', () => {
    const raw = { 'uc-1': validRecord(), 'uc-2': validRecord({ id: 'uc-2', phase: 'nonsense' }) }
    seed(raw)
    useCorrectionStore.getState().hydrate(USER)
    expect(stored()).toEqual(raw)
  })

  it('another account\'s record is isolation, not damage', () => {
    seed({ 'uc-9': validRecord({ id: 'uc-9', scope: 'other|someone-else' }) })
    useCorrectionStore.getState().hydrate(USER)
    const s = useCorrectionStore.getState()
    expect(s.persistenceError).toBe(null)
    expect(s.unresolvedList).toHaveLength(0)
  })
})

describe('beginAttempt — persisted BEFORE dispatch', () => {
  it('records a pending attempt and persists it', () => {
    useCorrectionStore.getState().hydrate(USER)
    const id = useCorrectionStore.getState().beginAttempt('SND-1', 3)
    expect(id).toBeTruthy()
    expect(stored()[id as string]).toMatchObject({ docNum: 'SND-1', phase: 'pending', lineCount: 3 })
    /* A pending attempt already blocks: a reload mid-flight must not grant
       permission to resend. */
    expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
  })

  it('REFUSES while a persistence error stands', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x') })
    useCorrectionStore.getState().hydrate(USER)
    vi.restoreAllMocks()
    expect(useCorrectionStore.getState().beginAttempt('SND-1', 1)).toBe(null)
  })

  it('REFUSES when the record cannot be persisted', () => {
    useCorrectionStore.getState().hydrate(USER)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(useCorrectionStore.getState().beginAttempt('SND-1', 1)).toBe(null)
    expect(useCorrectionStore.getState().persistenceError).toBeTruthy()
  })

  it('refuses without an established scope', () => {
    expect(useCorrectionStore.getState().beginAttempt('SND-1', 1)).toBe(null)
  })
})

describe('blockingFor — which phases block a repeat correction', () => {
  beforeEach(() => { useCorrectionStore.getState().hydrate(USER) })

  it.each(['pending', 'unknown'] as const)('%s blocks', (phase) => {
    const id = useCorrectionStore.getState().beginAttempt('SND-1', 1) as string
    useCorrectionStore.getState().setPhase(id, phase)
    expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
  })

  it('a reconciled success does NOT block — the outcome is established', () => {
    const id = useCorrectionStore.getState().beginAttempt('SND-1', 1) as string
    useCorrectionStore.getState().setPhase(id, 'success', {
      newDocNum: 'SND-2', reconciled: true,
    })
    expect(useCorrectionStore.getState().blockingFor('SND-1')).toBe(null)
  })

  it('a success NOT yet reconciled still blocks — I-6 finding 2', () => {
    /* This is the window the store is moved into BEFORE the post-write reload
       is awaited. Reading `refreshFailed:false` as "established" released the
       block for the whole of that reload — and, if the reload threw, forever.
       Only positive reconciliation releases it. */
    const id = useCorrectionStore.getState().beginAttempt('SND-1', 1) as string
    useCorrectionStore.getState().setPhase(id, 'success', { newDocNum: 'SND-2' })
    const rec = useCorrectionStore.getState().blockingFor('SND-1')
    expect(rec).not.toBe(null)
    expect(rec?.reconciled).toBe(false)
  })

  it('a success whose REFRESH failed still blocks — the screen cannot prove it', () => {
    const id = useCorrectionStore.getState().beginAttempt('SND-1', 1) as string
    useCorrectionStore.getState().setPhase(id, 'success', { newDocNum: 'SND-2', refreshFailed: true })
    expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
  })

  it('blocks only the document it was recorded for', () => {
    const id = useCorrectionStore.getState().beginAttempt('SND-1', 1) as string
    useCorrectionStore.getState().setPhase(id, 'unknown')
    expect(useCorrectionStore.getState().blockingFor('SND-2')).toBe(null)
  })

  it('the block SURVIVES a reload (a fresh store hydrating the same storage)', () => {
    const id = useCorrectionStore.getState().beginAttempt('SND-1', 1) as string
    useCorrectionStore.getState().setPhase(id, 'unknown')
    /* Simulate a reload: in-memory state gone, sessionStorage intact. */
    useCorrectionStore.getState().reset()
    expect(useCorrectionStore.getState().blockingFor('SND-1')).toBe(null)
    useCorrectionStore.getState().hydrate(USER)
    expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
  })
})

describe('clearUnresolved and scope discipline', () => {
  beforeEach(() => { useCorrectionStore.getState().hydrate(USER) })

  it('clears one record and persists the removal', () => {
    const id = useCorrectionStore.getState().beginAttempt('SND-1', 1) as string
    useCorrectionStore.getState().clearUnresolved(id)
    expect(useCorrectionStore.getState().blockingFor('SND-1')).toBe(null)
    expect(stored()[id]).toBeUndefined()
  })

  it('setPhase is a no-op for an unknown id', () => {
    useCorrectionStore.getState().setPhase('nope', 'unknown')
    expect(useCorrectionStore.getState().unresolvedList).toHaveLength(0)
  })

  it('never changes the docNum or the scope of a record', () => {
    const id = useCorrectionStore.getState().beginAttempt('SND-1', 1) as string
    useCorrectionStore.getState().setPhase(id, 'unknown')
    const rec = useCorrectionStore.getState().unresolvedById[id]
    expect(rec).toMatchObject({ docNum: 'SND-1', scope: scope() })
  })
})

describe('in-flight reservation — the same-page double dispatch', () => {
  beforeEach(() => { useCorrectionStore.getState().hydrate(USER) })

  it('reports a document as pending between begin and end', () => {
    const s = useCorrectionStore.getState()
    expect(s.isPending('SND-1')).toBe(false)
    s.beginPending('SND-1')
    expect(s.isPending('SND-1')).toBe(true)
    s.endPending('SND-1')
    expect(s.isPending('SND-1')).toBe(false)
  })

  it('reset clears the reservation', () => {
    useCorrectionStore.getState().beginPending('SND-1')
    useCorrectionStore.getState().reset()
    expect(useCorrectionStore.getState().isPending('SND-1')).toBe(false)
  })
})

describe('the two stores are independent — I-5 is not disturbed', () => {
  it('a correction record does not appear in the batch store, or vice versa', () => {
    useCorrectionStore.getState().hydrate(USER)
    useBatchCancelStore.getState().hydrate(USER)
    useCorrectionStore.getState().beginAttempt('SND-1', 1)

    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(0)
    expect(useBatchCancelStore.getState().persistenceError).toBe(null)
    /* Different storage keys — neither store can read or clear the other. */
    expect(sessionStorage.getItem('anbar_batch_unresolved_' + scope())).toBe(null)
    expect(sessionStorage.getItem(KEY())).not.toBe(null)
  })
})
