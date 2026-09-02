import type { SessionDevice } from '../api/session.api'

/* Presentation helpers for the device list returned by register_session()
   (SQL 026). Kept pure so they can be unit-tested without a DOM.
   Ported from index.html sessionDeviceRows() (lines 7364-7377). */

/** Original: `d.label || 'Naməlum cihaz'` (index.html:7371). */
export function deviceLabel(device: SessionDevice): string {
  return device.label || 'Naməlum cihaz'
}

/** Original marks the caller's own row with a «bu cihaz» tag (index.html:7371). */
export function isCurrentDevice(device: SessionDevice, currentDeviceId: string): boolean {
  return device.device_id === currentDeviceId
}

/** Original: '—' when unknown, 'indi' under 2 minutes, else 'N dəq əvvəl'
    (index.html:7368, 7374). */
export function formatLastSeen(lastSeen: string | null | undefined, now: number = Date.now()): string {
  if (!lastSeen) return '—'
  const seen = new Date(lastSeen)
  const ms = seen.getTime()
  if (!Number.isFinite(ms)) return '—'
  const minutes = Math.max(0, Math.round((now - ms) / 60000))
  return minutes < 2 ? 'indi' : `${minutes} dəq əvvəl`
}

/** Original shows the session start from `since`, '—' when absent (index.html:7373). */
export function formatSince(since: string | null | undefined): string {
  if (!since) return '—'
  const started = new Date(since)
  if (!Number.isFinite(started.getTime())) return '—'
  return started.toLocaleString()
}

/** Original prints only the first 12 chars of the device id (index.html:7372). */
export function shortDeviceId(deviceId: string | null | undefined): string {
  return String(deviceId ?? '').slice(0, 12)
}
