import { useEffect, useRef } from 'react'
import { supabase } from '../api/supabase'

/* Ported from index.html subscribeRealtime() (lines 1163-1181): one channel,
   `postgres_changes` on the tables the screen's data comes from, and a 400 ms
   debounce so a burst of related changes triggers a single refresh.

   Rules the original enforces and this keeps:
     * exactly one subscription — the original guards with `if (REALTIME_CH) return`;
     * a debounce, not a refresh per event;
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
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
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

    const channel = supabase.channel('anbar_changes')
    for (const table of tableKey.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, bump)
    }
    channel.subscribe()

    return () => {
      alive = false
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [enabled, tableKey, debounceMs])
}
