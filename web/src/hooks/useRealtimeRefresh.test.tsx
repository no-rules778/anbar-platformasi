import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

/* A controllable stand-in for one Supabase realtime channel. `on()` records
   the table subscriptions and the handler; `subscribe()` captures the status
   callback so the test can drive SUBSCRIBED / CHANNEL_ERROR / TIMED_OUT. */
interface FakeChannel {
  name: string
  tables: string[]
  handlers: Array<() => void>
  statusCb: ((s: string) => void) | null
  on: (event: string, filter: { table: string }, cb: () => void) => FakeChannel
  subscribe: (cb: (s: string) => void) => FakeChannel
}
const channels: FakeChannel[] = []
const removeChannel = vi.fn()

vi.mock('../api/supabase', () => ({
  supabase: {
    channel: (name: string) => {
      const ch: FakeChannel = {
        name, tables: [], handlers: [], statusCb: null,
        on(_event, filter, cb) { ch.tables.push(filter.table); ch.handlers.push(cb); return ch },
        subscribe(cb) { ch.statusCb = cb; return ch },
      }
      channels.push(ch)
      return ch
    },
    removeChannel: (ch: unknown) => removeChannel(ch),
  },
}))

import { useRealtimeRefresh } from './useRealtimeRefresh'
import { useSyncStore } from '../store/sync.store'

/* M9-131, M9-132 and the D-J2 mechanics (M9-130/130a): one channel, the
   caller's table list, a 400 ms debounce that collapses a burst into ONE
   refresh, status → sync indicator, and a teardown after which nothing fires. */

const TABLES = ['movements', 'items', 'warehouses', 'stock_conditions'] as const

function Harness({ enabled, tables, onChange, debounceMs }: {
  enabled: boolean
  tables: readonly string[]
  onChange: () => void
  debounceMs?: number
}) {
  useRealtimeRefresh(enabled, tables, onChange, debounceMs)
  return null
}

/** Fire one postgres_changes event on the single live channel. */
function fire(ch: FakeChannel = channels[0]) {
  for (const h of ch.handlers) h()
}

beforeEach(() => {
  vi.useFakeTimers()
  channels.length = 0
  removeChannel.mockClear()
  useSyncStore.setState({ state: 'idle' })
})
afterEach(() => vi.useRealTimers())

describe('subscription shape (M9-131, D-J2)', () => {
  it('opens exactly ONE channel and subscribes to exactly the given tables, once each', () => {
    render(<Harness enabled tables={TABLES} onChange={() => {}} />)
    expect(channels).toHaveLength(1)
    expect(channels[0].name).toBe('anbar_changes')
    expect(channels[0].tables).toEqual([...TABLES])
    /* One handler per table — not one per render. */
    expect(channels[0].handlers).toHaveLength(4)
  })

  it('does not subscribe to any table it was not given', () => {
    render(<Harness enabled tables={TABLES} onChange={() => {}} />)
    expect(channels[0].tables).not.toContain('partners')
    expect(channels[0].tables).not.toContain('audit_log')
  })

  it('opens nothing while disabled', () => {
    render(<Harness enabled={false} tables={TABLES} onChange={() => {}} />)
    expect(channels).toHaveLength(0)
  })

  it('does not rebuild the channel when the same table list is passed as a new array', () => {
    const { rerender } = render(<Harness enabled tables={[...TABLES]} onChange={() => {}} />)
    rerender(<Harness enabled tables={[...TABLES]} onChange={() => {}} />)
    expect(channels).toHaveLength(1)
    expect(removeChannel).not.toHaveBeenCalled()
  })
})

describe('the 400 ms debounce (M9-131)', () => {
  it('defaults to 400 ms: no refresh at 399 ms, one refresh at 400 ms', () => {
    const onChange = vi.fn()
    render(<Harness enabled tables={TABLES} onChange={onChange} />)
    act(() => { fire() })
    act(() => { vi.advanceTimersByTime(399) })
    expect(onChange).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  /* THE contract: a burst of events inside the window produces ONE refresh.
     MUTATION: refreshing per event, or not clearing the previous timer. */
  it('collapses many events within the window into ONE refresh', () => {
    const onChange = vi.fn()
    render(<Harness enabled tables={TABLES} onChange={onChange} />)
    act(() => { fire(); fire(); fire() })
    act(() => { vi.advanceTimersByTime(200) })
    act(() => { fire(); fire() })
    act(() => { vi.advanceTimersByTime(399) })
    expect(onChange).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('a second burst after the window yields a second refresh', () => {
    const onChange = vi.fn()
    render(<Harness enabled tables={TABLES} onChange={onChange} />)
    act(() => { fire() })
    act(() => { vi.advanceTimersByTime(400) })
    act(() => { fire() })
    act(() => { vi.advanceTimersByTime(400) })
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('events on ANY of the four tables schedule the refresh', () => {
    const onChange = vi.fn()
    render(<Harness enabled tables={TABLES} onChange={onChange} />)
    for (let i = 0; i < 4; i++) {
      act(() => { channels[0].handlers[i]() })
      act(() => { vi.advanceTimersByTime(400) })
    }
    expect(onChange).toHaveBeenCalledTimes(4)
  })

  it('calls the LATEST onChange closure, not the one captured at mount', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<Harness enabled tables={TABLES} onChange={first} />)
    rerender(<Harness enabled tables={TABLES} onChange={second} />)
    act(() => { fire() })
    act(() => { vi.advanceTimersByTime(400) })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})

describe('subscription status drives the sync indicator (M9-132)', () => {
  it('is «connecting» until SUBSCRIBED, then «synced»', () => {
    render(<Harness enabled tables={TABLES} onChange={() => {}} />)
    expect(useSyncStore.getState().state).toBe('connecting')
    act(() => { channels[0].statusCb?.('SUBSCRIBED') })
    expect(useSyncStore.getState().state).toBe('synced')
  })

  it.each(['CHANNEL_ERROR', 'TIMED_OUT'])('%s → «error»', (status) => {
    render(<Harness enabled tables={TABLES} onChange={() => {}} />)
    act(() => { channels[0].statusCb?.('SUBSCRIBED') })
    act(() => { channels[0].statusCb?.(status) })
    expect(useSyncStore.getState().state).toBe('error')
  })

  it('an unknown status leaves the indicator alone', () => {
    render(<Harness enabled tables={TABLES} onChange={() => {}} />)
    act(() => { channels[0].statusCb?.('SUBSCRIBED') })
    act(() => { channels[0].statusCb?.('SOMETHING_ELSE') })
    expect(useSyncStore.getState().state).toBe('synced')
  })
})

describe('teardown (M9-131)', () => {
  it('removes the channel on unmount and resets the indicator', () => {
    const { unmount } = render(<Harness enabled tables={TABLES} onChange={() => {}} />)
    act(() => { channels[0].statusCb?.('SUBSCRIBED') })
    unmount()
    expect(removeChannel).toHaveBeenCalledTimes(1)
    expect(removeChannel).toHaveBeenCalledWith(channels[0])
    expect(useSyncStore.getState().state).toBe('idle')
  })

  /* THE contract: no refresh after unmount. An event that arrived and armed
     the timer BEFORE unmount must not fire it afterwards. */
  it('a pending debounce never fires after unmount', () => {
    const onChange = vi.fn()
    const { unmount } = render(<Harness enabled tables={TABLES} onChange={onChange} />)
    act(() => { fire() })
    unmount()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a status callback arriving after unmount does not touch the indicator', () => {
    const { unmount } = render(<Harness enabled tables={TABLES} onChange={() => {}} />)
    const cb = channels[0].statusCb
    unmount()
    act(() => { cb?.('SUBSCRIBED') })
    expect(useSyncStore.getState().state).toBe('idle')
  })

  it('an event on the OLD channel after teardown does not schedule a refresh', () => {
    const onChange = vi.fn()
    const { unmount } = render(<Harness enabled tables={TABLES} onChange={onChange} />)
    const old = channels[0]
    unmount()
    act(() => { fire(old) })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(onChange).not.toHaveBeenCalled()
  })
})
