import { supabase } from './supabase'

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
