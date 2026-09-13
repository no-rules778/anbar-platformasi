import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, act } from '@testing-library/react'

/* The SUBSCRIPTION-IDENTITY contract of `useRealtimeRefresh`.
   ══════════════════════════════════════════════════════════════════════════

   WHY THIS FILE EXISTS

   The original `useRealtimeRefresh.test.tsx` mounts one instance per test
   against a mock that hands out a FRESH channel for every
   `supabase.channel()` call. The real client does not behave that way, and
   that gap hid a genuine race.

   THREE REAL BEHAVIOURS OF @supabase/realtime-js

     1. `RealtimeClient.channel(topic)` DEDUPLICATES BY TOPIC — "If a channel
        with the same topic already exists it will be returned instead of
        creating a duplicate connection". Same topic ⇒ same object.

     2. `RealtimeChannel._on()` SILENTLY DROPS a duplicate `postgres_changes`
        binding ("duplicate `postgres_changes` binding for <topic> ignored"),
        because the server collapses identical filters. A second consumer's
        handler for an already-bound table is NEVER registered.

     3. `RealtimeClient.removeChannel()` is **async**:

             async removeChannel(channel) {
               const status = await channel.unsubscribe()   // ← suspends here
               if (status === 'ok') channel.teardown()      // ← _remove() runs
             }                                                 only afterwards

        The channel stays in the topic registry across that await.

   WHY THAT IS A REAL RACE, NOT A THEORETICAL ONE

   `main.tsx` renders the app inside `<StrictMode>`, and React replays every
   effect as setup → cleanup → setup. Because the cleanup's removal is async,
   the SECOND setup calls `channel(topic)` BEFORE the first removal has
   resolved. With a constant topic it therefore receives the SAME channel the
   dying cleanup is about to tear down:

     setup #1   channel('anbar_changes')  → A, binds tables, subscribes
     cleanup #1 removeChannel(A)          → suspends inside unsubscribe()
     setup #2   channel('anbar_changes')  → A again (still registered!)
                A.on(table, …)            → REFUSED as a duplicate binding
     …later     A.unsubscribe() resolves  → A.teardown(), A leaves registry

   The live page is then subscribed to nothing: its handler was refused, and
   the object it holds has been torn down. This needs no second page and no
   concurrent component — one ordinary mount under StrictMode is enough.

   THE FIX THIS FILE FENCES

   Each effect SETUP mints its own topic, `anbar_changes:<n>` from a
   monotonic counter, and its cleanup removes exactly that channel. A
   `useRef`/`useId`/`tableKey`/page-name topic would NOT work: those are
   stable across an effect replay, which is precisely the collision above.

   These tests reject the dangerous behaviour. They are not a description of
   it. */

interface FakeChannel {
  topic: string
  /** Table name per ACCEPTED binding, in order. */
  tables: string[]
  handlers: Array<() => void>
  statusCb: ((s: string) => void) | null
  /** Duplicate `postgres_changes` bindings refused on this channel. */
  rejected: number
  /** Set SYNCHRONOUSLY when `removeChannel()` is called: this channel has been
      retired by its owner and is no longer the active subscription, even
      though its async teardown has not resolved yet. */
  removalRequested: boolean
  /** Set when the async removal actually completes (teardown + _remove). */
  tornDown: boolean
  on: (event: string, filter: { table: string }, cb: () => void) => FakeChannel
  subscribe: (cb: (s: string) => void) => FakeChannel
}

/** Every channel handed out, including repeat hand-outs of the same object. */
const handedOut: FakeChannel[] = []
/** Topic → channel, exactly as RealtimeClient keeps it. */
const registry = new Map<string, FakeChannel>()
/** Resolvers for in-flight removals, so a test controls when each completes. */
let pendingRemovals: Array<() => void> = []
const removeChannel = vi.fn()

vi.mock('../api/supabase', () => ({
  supabase: {
    /* RealtimeClient.channel(): reuse by topic, never duplicate. */
    channel: (topic: string) => {
      const existing = registry.get(topic)
      if (existing) {
        handedOut.push(existing)
        return existing
      }
      const ch: FakeChannel = {
        topic, tables: [], handlers: [], statusCb: null, rejected: 0,
        removalRequested: false, tornDown: false,
        on(_event, filter, cb) {
          /* _on()'s duplicate-filter refusal for postgres_changes. */
          if (ch.tables.includes(filter.table)) { ch.rejected++; return ch }
          ch.tables.push(filter.table)
          ch.handlers.push(cb)
          return ch
        },
        subscribe(cb) { ch.statusCb = cb; return ch },
      }
      registry.set(topic, ch)
      handedOut.push(ch)
      return ch
    },

    /* ASYNC removeChannel — the heart of the race. The channel remains in the
       registry until the caller drains `pendingRemovals`, reproducing the
       await inside the real implementation. */
    removeChannel: (ch: FakeChannel) => {
      removeChannel(ch)
      /* The owner has retired it NOW, synchronously — only the teardown is
         deferred. Without this flag a retired-but-not-yet-torn-down channel
         would still be counted as an active subscription. */
      ch.removalRequested = true
      return new Promise<'ok'>((resolve) => {
        pendingRemovals.push(() => {
          ch.tornDown = true
          /* teardown() → socket._remove(): the registry entry goes only now. */
          if (registry.get(ch.topic) === ch) registry.delete(ch.topic)
          resolve('ok')
        })
      })
    },
  },
}))

import { useRealtimeRefresh } from './useRealtimeRefresh'
import { useSyncStore } from '../store/sync.store'

function Harness({ enabled = true, tables, onChange, debounceMs }: {
  enabled?: boolean
  tables: readonly string[]
  onChange: () => void
  debounceMs?: number
}) {
  useRealtimeRefresh(enabled, tables, onChange, debounceMs)
  return null
}

/** Complete every in-flight removal, as the real await eventually does. */
function settleRemovals() {
  const queued = pendingRemovals
  pendingRemovals = []
  for (const done of queued) done()
}

/** The channels that are still an ACTIVE subscription: neither retired by
    their owner nor torn down. A channel whose removal is merely in flight is
    NOT active — that is the whole point of the race. */
const liveChannels = () =>
  [...registry.values()].filter((c) => !c.removalRequested && !c.tornDown)

/** Fire every accepted handler on a channel. */
const fireAll = (ch: FakeChannel) => { for (const h of ch.handlers) h() }

beforeEach(() => {
  vi.useFakeTimers()
  handedOut.length = 0
  registry.clear()
  pendingRemovals = []
  removeChannel.mockClear()
  useSyncStore.setState({ state: 'idle' })
})
afterEach(() => vi.useRealTimers())

/* ─────────────────────────────────────────────────────────────────────────
   1. THE STRICTMODE RACE — the regression this file exists for
   ───────────────────────────────────────────────────────────────────────── */

describe('StrictMode effect replay (setup → cleanup → setup)', () => {
  /* THE test. Under a constant topic the second setup reuses the dying
     channel, its binding is refused, and the page ends up subscribed to
     nothing. */
  it('keeps delivering events after the replay, with the first removal still in flight', () => {
    const onChange = vi.fn()
    render(
      <StrictMode>
        <Harness tables={['movements']} onChange={onChange} />
      </StrictMode>,
    )

    /* The first cleanup has run but its removal has NOT resolved yet — the
       exact window in which the second setup asked for a channel. */
    expect(pendingRemovals.length).toBeGreaterThan(0)

    const live = liveChannels()
    expect(live).toHaveLength(1)
    /* The surviving subscription owns a real, accepted binding. */
    expect(live[0].tables).toEqual(['movements'])
    expect(live[0].rejected).toBe(0)

    act(() => { fireAll(live[0]) })
    act(() => { vi.advanceTimersByTime(400) })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  /* The delayed completion of cleanup #1 must not reach into the live
     subscription that setup #2 created. */
  it('a late-resolving first cleanup does not tear down the active subscription', () => {
    const onChange = vi.fn()
    render(
      <StrictMode>
        <Harness tables={['movements']} onChange={onChange} />
      </StrictMode>,
    )
    const active = liveChannels()[0]

    /* The first removal finally completes, long after setup #2 ran. */
    act(() => { settleRemovals() })

    expect(active.tornDown).toBe(false)
    expect(registry.get(active.topic)).toBe(active)

    act(() => { fireAll(active) })
    act(() => { vi.advanceTimersByTime(400) })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('gives each setup its own channel object, so the replay cannot collide', () => {
    render(
      <StrictMode>
        <Harness tables={['movements']} onChange={() => {}} />
      </StrictMode>,
    )
    const distinct = new Set(handedOut)
    expect(distinct.size).toBe(handedOut.length)
    expect(handedOut.every((c) => c.rejected === 0)).toBe(true)
  })

  it('removes exactly the channel its own setup created', () => {
    render(
      <StrictMode>
        <Harness tables={['movements']} onChange={() => {}} />
      </StrictMode>,
    )
    const removed = removeChannel.mock.calls.map((c) => c[0] as FakeChannel)
    const active = liveChannels()
    expect(removed).toHaveLength(1)
    expect(active).toHaveLength(1)
    expect(removed[0]).not.toBe(active[0])
  })

  it('unmounting after a replay leaves NO live channel behind', () => {
    const view = render(
      <StrictMode>
        <Harness tables={['movements']} onChange={() => {}} />
      </StrictMode>,
    )
    view.unmount()
    act(() => { settleRemovals() })
    expect(liveChannels()).toHaveLength(0)
    expect(registry.size).toBe(0)
  })

  it('a pending debounce never refreshes a page unmounted after the replay', () => {
    const onChange = vi.fn()
    const view = render(
      <StrictMode>
        <Harness tables={['movements']} onChange={onChange} />
      </StrictMode>,
    )
    const active = liveChannels()[0]
    act(() => { fireAll(active) })
    view.unmount()
    act(() => { settleRemovals() })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(onChange).not.toHaveBeenCalled()
  })
})

/* ─────────────────────────────────────────────────────────────────────────
   2. TWO CONCURRENT CONSUMERS
   ───────────────────────────────────────────────────────────────────────── */

describe('two concurrent hook instances', () => {
  it('get DISTINCT channel objects', () => {
    render(<Harness tables={['movements']} onChange={() => {}} />)
    render(<Harness tables={['items']} onChange={() => {}} />)
    expect(handedOut).toHaveLength(2)
    expect(handedOut[0]).not.toBe(handedOut[1])
    expect(handedOut[0].topic).not.toBe(handedOut[1].topic)
  })

  /* The inversion of the old SHARP EDGE: watching the SAME table must now
     refresh BOTH consumers, because neither binding is refused. */
  it('BOTH receive events even when watching the SAME table', () => {
    const first = vi.fn()
    const second = vi.fn()
    render(<Harness tables={['movements']} onChange={first} />)
    render(<Harness tables={['movements']} onChange={second} />)

    expect(handedOut[0].rejected).toBe(0)
    expect(handedOut[1].rejected).toBe(0)

    act(() => { handedOut.forEach(fireAll) })
    act(() => { vi.advanceTimersByTime(400) })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('unmounting one does NOT remove the other', () => {
    const survivor = vi.fn()
    const a = render(<Harness tables={['movements']} onChange={() => {}} />)
    render(<Harness tables={['items']} onChange={survivor} />)
    const other = handedOut[1]

    a.unmount()
    act(() => { settleRemovals() })

    expect(other.tornDown).toBe(false)
    expect(registry.get(other.topic)).toBe(other)
    act(() => { fireAll(other) })
    act(() => { vi.advanceTimersByTime(400) })
    expect(survivor).toHaveBeenCalledTimes(1)
  })

  it('each consumer binds only ITS OWN tables', () => {
    render(<Harness tables={['movements']} onChange={() => {}} />)
    render(<Harness tables={['items', 'warehouses']} onChange={() => {}} />)
    expect(handedOut[0].tables).toEqual(['movements'])
    expect(handedOut[1].tables).toEqual(['items', 'warehouses'])
  })
})

/* ─────────────────────────────────────────────────────────────────────────
   3. SEQUENTIAL PAGE SWITCHING — the shipped App.tsx path
   ───────────────────────────────────────────────────────────────────────── */

describe('sequential page switching', () => {
  it('gives the incoming page a clean channel with only its tables', () => {
    render(<Harness tables={['movements']} onChange={() => {}} />).unmount()
    render(<Harness tables={['items', 'stock_conditions']} onChange={() => {}} />)

    const live = liveChannels()
    expect(live).toHaveLength(1)
    expect(live[0].tables).toEqual(['items', 'stock_conditions'])
    expect(live[0].rejected).toBe(0)
  })

  /* The outgoing page's removal resolving LATE must not disturb the page the
     user is now looking at. */
  it('survives the outgoing page’s removal resolving after the switch', () => {
    const onChange = vi.fn()
    render(<Harness tables={['movements']} onChange={() => {}} />).unmount()
    render(<Harness tables={['movements']} onChange={onChange} />)
    const incoming = liveChannels()[0]

    act(() => { settleRemovals() })

    expect(incoming.tornDown).toBe(false)
    act(() => { fireAll(incoming) })
    act(() => { vi.advanceTimersByTime(400) })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('reaches a clean state after the second page also unmounts', () => {
    render(<Harness tables={['movements']} onChange={() => {}} />).unmount()
    render(<Harness tables={['items']} onChange={() => {}} />).unmount()
    act(() => { settleRemovals() })
    expect(liveChannels()).toHaveLength(0)
    expect(registry.size).toBe(0)
  })
})

/* ─────────────────────────────────────────────────────────────────────────
   4. PRESERVED BEHAVIOUR — the accepted M9-131 / M9-132 contracts
   ───────────────────────────────────────────────────────────────────────── */

describe('debounce and sync state survive the topic change', () => {
  it('still collapses a burst into ONE refresh at 400 ms', () => {
    const onChange = vi.fn()
    render(<Harness tables={['movements', 'items']} onChange={onChange} />)
    const ch = liveChannels()[0]

    act(() => { fireAll(ch); fireAll(ch); fireAll(ch) })
    act(() => { vi.advanceTimersByTime(399) })
    expect(onChange).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('still honours a custom debounce window', () => {
    const onChange = vi.fn()
    render(<Harness tables={['movements']} onChange={onChange} debounceMs={900} />)
    act(() => { fireAll(liveChannels()[0]) })
    act(() => { vi.advanceTimersByTime(899) })
    expect(onChange).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('still drives the sync indicator from the subscription status', () => {
    render(<Harness tables={['movements']} onChange={() => {}} />)
    const ch = liveChannels()[0]
    expect(useSyncStore.getState().state).toBe('connecting')
    act(() => { ch.statusCb?.('SUBSCRIBED') })
    expect(useSyncStore.getState().state).toBe('synced')
    act(() => { ch.statusCb?.('CHANNEL_ERROR') })
    expect(useSyncStore.getState().state).toBe('error')
  })

  it('still opens nothing while disabled', () => {
    render(<Harness enabled={false} tables={['movements']} onChange={() => {}} />)
    expect(handedOut).toHaveLength(0)
  })

  it('still does not rebuild when the same table list arrives as a new array', () => {
    const { rerender } = render(<Harness tables={['movements']} onChange={() => {}} />)
    rerender(<Harness tables={['movements']} onChange={() => {}} />)
    expect(handedOut).toHaveLength(1)
    expect(removeChannel).not.toHaveBeenCalled()
  })

  it('still calls the LATEST onChange closure', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<Harness tables={['movements']} onChange={first} />)
    rerender(<Harness tables={['movements']} onChange={second} />)
    act(() => { fireAll(liveChannels()[0]) })
    act(() => { vi.advanceTimersByTime(400) })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('still never fires a pending debounce after a plain unmount', () => {
    const onChange = vi.fn()
    const view = render(<Harness tables={['movements']} onChange={onChange} />)
    act(() => { fireAll(liveChannels()[0]) })
    view.unmount()
    act(() => { settleRemovals() })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(onChange).not.toHaveBeenCalled()
  })
})
