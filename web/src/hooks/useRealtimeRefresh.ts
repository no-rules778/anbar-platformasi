import { useEffect, useRef } from 'react'
import { supabase } from '../api/supabase'
import { useSyncStore } from '../store/sync.store'

/* The topic PREFIX every subscription of this hook shares. The suffix after
   the colon is unique per effect setup — see `nextTopic()`. */
export const REALTIME_TOPIC_PREFIX = 'anbar_changes'

/* A process-wide monotonic counter, deliberately module-level rather than a
   ref or a `useId`.

   WHY NOT a ref / useId / tableKey / page name: all of those are STABLE
   ACROSS A STRICTMODE EFFECT REPLAY, and that replay is exactly the collision
   this guards against. React runs setup → cleanup → setup, while
   `supabase.removeChannel()` is async and leaves the channel in the client's
   topic registry until `unsubscribe()` resolves. A stable topic therefore
   hands the SECOND setup the very channel the first cleanup is about to tear
   down — its `postgres_changes` bindings are refused as duplicates and the
   object is destroyed moments later, leaving the live page subscribed to
   nothing.

   A counter incremented INSIDE each setup cannot collide with itself. */
let subscriptionSeq = 0
const nextTopic = (): string => `${REALTIME_TOPIC_PREFIX}:${++subscriptionSeq}`

/* Ported from index.html subscribeRealtime() (lines 1163-1181): one channel,
   `postgres_changes` on the tables the screen's data comes from, and a 400 ms
   debounce so a burst of related changes triggers a single refresh.

   Rules the original enforces and this keeps:
     * exactly one subscription — the original guards with `if (REALTIME_CH) return`;
     * a debounce, not a refresh per event;
     * subscription status drives the sync indicator: SUBSCRIBED means
       synchronised, CHANNEL_ERROR/TIMED_OUT mean not synchronised
       (index.html:1177-1180);
     * the channel is torn down on unmount/logout, and a pending timer with it,
       so nothing refreshes a screen that is gone.

   The original subscribes to a fixed list (movements, items, partners,
   warehouses). Here the caller passes the tables its own view depends on —
   for the warehouses screen that is `warehouses` plus the two tables the usage
   counters read (`movements`, `users`). `items`/`partners` are not subscribed
   because nothing on this screen reads them yet. */
export function useRealtimeRefresh(
  enabled: boolean,
  tables: readonly string[],
  onChange: () => void,
  debounceMs = 400,
) {
  /* Held in a ref so a caller passing an inline closure does not tear the
     subscription down and rebuild it on every render. */
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const setSyncState = useSyncStore((s) => s.setState)
  const tableKey = tables.join(',')

  useEffect(() => {
    if (!enabled) return

    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined

    const bump = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (alive) onChangeRef.current()
      }, debounceMs)
    }

    /* Not "synced" yet — only the SUBSCRIBED callback may claim that. */
    setSyncState('connecting')

    /* A FRESH topic per setup. The cleanup below closes over this exact
       channel, so it can only ever remove the one this setup created. */
    const channel = supabase.channel(nextTopic())
    for (const table of tableKey.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, bump)
    }
    channel.subscribe((status: string) => {
      if (!alive) return
      if (status === 'SUBSCRIBED') setSyncState('synced')
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSyncState('error')
      else if (status === 'CLOSED') setSyncState('idle')
    })

    return () => {
      alive = false
      clearTimeout(timer)
      supabase.removeChannel(channel)
      setSyncState('idle')
    }
  }, [enabled, tableKey, debounceMs, setSyncState])
}
