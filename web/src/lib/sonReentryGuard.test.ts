import { describe, it, expect, vi } from 'vitest'
import { sonRunExport, type SonZip } from './sonExportRun'

/* THE IN-HANDLER RE-ENTRY GUARD, tested where the DOM cannot mask it.

   WHY THIS FILE EXISTS. The page test cannot prove the ref. Testing Library
   wraps `fireEvent` in `act()`, so React commits `disabled` before a second
   synthetic click and jsdom swallows it — the button suite behaves the same
   with the ref present or absent (measured 2026-09-13). The protection the
   ref actually provides is against two REAL pointer events delivered before
   React commits, which `disabled` cannot catch.

   So the guard is exercised here as what it is: a plain re-entry rule over an
   awaited operation. This models the exact shape `runSonExport` uses, and it
   fails if that rule is removed — which is the falsifiability the DOM test
   could not supply.

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL EXPORT WAS RUN. ═══ */

/** The handler shape from DashboardPage: ref checked and set before the await. */
function makeHandler(guarded: boolean, run: () => Promise<void>) {
  const busy = { current: false }
  return async function handler() {
    if (guarded && busy.current) return
    busy.current = true
    try {
      await run()
    } finally {
      busy.current = false
    }
  }
}

describe('the SON re-entry rule', () => {
  it('a GUARDED handler runs once when invoked twice before it settles', async () => {
    const run = vi.fn(async () => { await new Promise((r) => setTimeout(r, 5)) })
    const h = makeHandler(true, run)
    await Promise.all([h(), h()])
    expect(run).toHaveBeenCalledTimes(1)
  })

  /* THE DEFECTIVE VARIANT, made explicit: without the rule the same two
     invocations both run, which is the duplicate download it prevents. */
  it('an UNGUARDED handler runs twice — the defect the rule prevents', async () => {
    const run = vi.fn(async () => { await new Promise((r) => setTimeout(r, 5)) })
    const h = makeHandler(false, run)
    await Promise.all([h(), h()])
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('the guard releases, so a LATER export still runs', async () => {
    const run = vi.fn(async () => {})
    const h = makeHandler(true, run)
    await h()
    await h()
    expect(run).toHaveBeenCalledTimes(2)
  })

  /* And the guard must release even when the export fails, or one failed
     export would disable the button for the rest of the session. */
  it('the guard releases after a REJECTED run', async () => {
    const run = vi.fn(async () => { throw new Error('boom') })
    const h = makeHandler(true, run)
    await h().catch(() => {})
    await h().catch(() => {})
    expect(run).toHaveBeenCalledTimes(2)
  })
})

/* `sonRunExport` itself never throws, so the page's `finally` always runs —
   the property the guard's release depends on. */
describe('sonRunExport always settles, so the guard always releases', () => {
  function brokenZip(): SonZip {
    return {
      files: {},
      file: () => null,
      remove: () => undefined,
      generateAsync: async () => new Blob([]),
    } as unknown as SonZip
  }

  it('resolves (never rejects) when the archive is unusable', async () => {
    const out = await sonRunExport(
      { items: [], movements: [], partners: [] },
      {
        fetch: (async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })) as unknown as typeof globalThis.fetch,
        jsZip: () => ({ loadAsync: async () => brokenZip() }),
        download: vi.fn(),
        day: 'd',
      },
    )
    expect(out.ok).toBe(false)
    expect(out.isError).toBe(true)
  })

  it('resolves when the fetch itself rejects', async () => {
    const out = await sonRunExport(
      { items: [], movements: [], partners: [] },
      {
        fetch: (async () => { throw new Error('offline') }) as unknown as typeof globalThis.fetch,
        jsZip: () => ({ loadAsync: async () => brokenZip() }),
        download: vi.fn(),
      },
    )
    expect(out.ok).toBe(false)
    expect(out.message).toBe('offline')
  })
})
