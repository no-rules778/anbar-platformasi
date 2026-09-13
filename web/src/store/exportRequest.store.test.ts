import { beforeEach, describe, expect, it } from 'vitest'
import { useExportRequestStore } from './exportRequest.store'

/* M16-11 — the pending-export handoff itself. The store is the whole of the
   cross-page signal, so its one-shot rule is pinned here rather than being
   re-proved on each destination page. */

beforeEach(() => { useExportRequestStore.setState({ pending: null }) })

describe('exportRequest store (M16-11)', () => {
  it('is idle until Settings asks for an export', () => {
    expect(useExportRequestStore.getState().pending).toBeNull()
  })

  it('records the requested target', () => {
    useExportRequestStore.getState().request('bal')
    expect(useExportRequestStore.getState().pending).toBe('bal')
  })

  it('a later request replaces the earlier one rather than queueing', () => {
    useExportRequestStore.getState().request('mov')
    useExportRequestStore.getState().request('nom')
    expect(useExportRequestStore.getState().pending).toBe('nom')
  })

  /* The falsifiable core of the one-shot rule: if `consume()` did not clear
     the target, a remount of the destination page would export a second time
     without the user asking. */
  it('consume clears the target so a remount does not export again', () => {
    useExportRequestStore.getState().request('mov')
    useExportRequestStore.getState().consume()
    expect(useExportRequestStore.getState().pending).toBeNull()
  })
})
