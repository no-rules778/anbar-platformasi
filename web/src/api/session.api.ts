import { supabase, SB_URL, SB_KEY } from './supabase'

const DEVICE_ID_KEY = 'anbar_device_id'

function createDeviceId(): string {
  return 'dev_' + Math.random().toString(36).slice(2, 12)
}

export function getDeviceId(): string {
  try {
    let d = localStorage.getItem(DEVICE_ID_KEY)
    if (!d) {
      d = createDeviceId()
      localStorage.setItem(DEVICE_ID_KEY, d)
    }
    return d
  } catch {
    return createDeviceId()
  }
}

function buildDeviceLabel(): string {
  try {
    const ua = navigator.userAgent || ''
    const os = /Windows/i.test(ua) ? 'Windows'
      : /Android/i.test(ua) ? 'Android'
      : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
      : /Mac OS X/i.test(ua) ? 'macOS'
      : /Linux/i.test(ua) ? 'Linux'
      : 'Naməlum'
    const br = /Edg\//i.test(ua) ? 'Edge'
      : /OPR\//i.test(ua) ? 'Opera'
      : /Chrome\//i.test(ua) ? 'Chrome'
      : /Safari\//i.test(ua) ? 'Safari'
      : /Firefox\//i.test(ua) ? 'Firefox'
      : 'brauzer'
    return (br + ' · ' + os).slice(0, 120)
  } catch {
    return 'Naməlum cihaz'
  }
}

export const DEVICE_ID = getDeviceId()
export const DEVICE_LABEL = buildDeviceLabel()

/* Exact contract of one entry in register_session()'s `devices` array, as
   built by SQL 026: jsonb_build_object('device_id', device_id, 'label',
   device_label, 'since', created_at, 'last_seen', updated_at). Verified
   against the live function definition — the server sends `label`/`since`,
   NOT `device_label`/`started_at`. */
export interface SessionDevice {
  device_id: string
  label: string | null
  since: string
  last_seen: string
}

export interface RegisterSessionResult {
  allowed: boolean
  degraded?: boolean
  devices?: SessionDevice[]
  limit?: number
  active?: number
}

/* Limit is role-based (admin: 3 devices, others: 1), enforced SERVER-SIDE by
   register_session() under an advisory lock — this client code is only the
   interface. If SQL 026 (register_session) isn't applied yet, the app is
   not blocked: the limit is simply not enforced (degraded: true). Ported
   from index.html registerSession (line 7320). */
export async function registerSession(): Promise<RegisterSessionResult> {
  try {
    const { data, error } = await supabase.rpc('register_session', {
      p_device_id: DEVICE_ID,
      p_device_label: DEVICE_LABEL,
    })
    if (error) throw error
    return (data as unknown as RegisterSessionResult) ?? { allowed: true }
  } catch (err) {
    console.warn('register_session', err)
    return { allowed: true, degraded: true }
  }
}

export async function unregisterSession(): Promise<void> {
  try {
    await supabase.rpc('end_session', { p_device_id: DEVICE_ID })
  } catch { /* ignore, matches original */ }
}

export async function touchSession(): Promise<{ alive: boolean } | null> {
  try {
    const { data, error } = await supabase.rpc('touch_session', { p_device_id: DEVICE_ID })
    if (error) throw error
    return (data as unknown as { alive: boolean }) ?? null
  } catch {
    return null
  }
}

export async function endOtherSessions() {
  return supabase.rpc('end_other_sessions', { p_keep_device_id: DEVICE_ID })
}

export async function endSession(deviceId: string) {
  return supabase.rpc('end_session', { p_device_id: deviceId })
}

/* ---------- device release on tab close (index.html:7380-7393) ----------
   The RPC call issued from a `pagehide` handler must survive the page going
   away, which supabase-js cannot promise — the original therefore posts to
   PostgREST directly with `keepalive: true`. Two rules are load-bearing and
   ported verbatim:
     * only THIS device's row is closed (end_session takes auth.uid() + the
       device id), never the user's other devices;
     * nothing is sent without a real access token. Sending `Bearer null` was
       the old behaviour and, under weak RLS, could delete somebody else's
       row — BUG_REGISTRY C-07, already fixed in the production platform. */

let accessToken: string | null = null

/** Keeps the token available synchronously, the way the original cached SB_TOKEN. */
export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

/** Fire-and-forget release of THIS device's session row. Safe to call on unload. */
export function releaseDeviceBeacon(): void {
  if (!accessToken) return
  try {
    /* Fire-and-forget, but the rejection must still be absorbed: an unload
       usually aborts the request, and an unconsumed rejected promise would
       surface as an unhandled rejection. */
    void fetch(`${SB_URL}/rest/v1/rpc/end_session`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_device_id: DEVICE_ID }),
    })?.catch(() => {})
  } catch {
    /* the tab is going away; nothing useful to do here — the 3-minute
       stale-session cutoff on the server is the backstop */
  }
}

export interface MySessionsResult {
  limit?: number
  active?: number
  devices?: SessionDevice[]
}

/** Device list for the «Sessiya» window (index.html loadSessionDevices, 7452+). */
export async function listMySessions(): Promise<MySessionsResult | null> {
  const { data, error } = await supabase.rpc('list_my_sessions')
  if (error) throw error
  return (data as unknown as MySessionsResult) ?? null
}
