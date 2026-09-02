import { useSyncStore } from '../store/sync.store'
import { cn } from '../lib/utils'

/* The production header shows a live sync dot: green when the Realtime channel
   is subscribed, amber when it errored or timed out (index.html setSync,
   1184-1188). Wording matches the original: «sinxron» / «xəta». */
const LABELS: Record<string, string> = {
  idle: 'bağlı deyil',
  connecting: 'qoşulur…',
  synced: 'sinxron',
  error: 'xəta',
}

export function SyncIndicator() {
  const state = useSyncStore((s) => s.state)

  return (
    <span className="flex items-center gap-2 text-xs text-slate-500" data-sync-state={state}>
      <span
        aria-hidden
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          state === 'synced' ? 'bg-emerald-500'
            : state === 'error' ? 'bg-amber-500'
            : state === 'connecting' ? 'bg-slate-400'
            : 'bg-slate-300',
        )}
      />
      {LABELS[state]}
    </span>
  )
}
