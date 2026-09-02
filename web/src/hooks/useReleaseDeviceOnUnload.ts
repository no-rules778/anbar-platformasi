import { useEffect } from 'react'
import { releaseDeviceBeacon } from '../api/session.api'

/* Frees this device's session slot when the tab goes away, ported from the
   production platform's `pagehide` listener (index.html:7380-7393).

   Without it the slot stays taken until the server's 3-minute stale cutoff —
   painful for `anbardar` and `rehber`, whose device limit is 1, because
   closing the tab locks them out of signing in again for those 3 minutes.

   `pagehide` (not `beforeunload`) is what the original uses: it also fires
   when a mobile browser backgrounds the page, and it does not block the
   navigation. The beacon is best-effort by design — the heartbeat and the
   server-side cutoff remain the guarantees. */
export function useReleaseDeviceOnUnload(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const onPageHide = () => releaseDeviceBeacon()
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [enabled])
}
