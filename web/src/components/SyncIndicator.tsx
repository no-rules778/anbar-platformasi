import { useSyncStore } from '../store/sync.store'
import { cn } from '../lib/utils'

/* The platform's topbar sync chip: a pulsing green dot when subscribed, amber
   when the channel errored or timed out (index.html setSync, 1184-1188).
   Wording is the original's: «sinxron» / «xəta». */
const LABELS: Record<string, string> = {
  idle: 'bağlı deyil',
  connecting: 'qoşulur…',
  synced: 'sinxron',
  error: 'xəta',
}

export function SyncIndicator() {
  const state = useSyncStore((s) => s.state)

  return (
    <div className="sync" data-sync-state={state}>
      <span
        aria-hidden
        className={cn('dot', state === 'error' && 'off', (state === 'idle' || state === 'connecting') && 'wait')}
      />
      <span>{LABELS[state]}</span>
    </div>
  )
}
