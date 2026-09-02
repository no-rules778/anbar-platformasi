import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const REMEMBER_KEY = 'anbar:remember'
const EMAIL_KEY = 'anbar:email'

/** Minimal storage shape supabase-js needs — matches the original authStore(). */
interface AuthStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/* Session lives in localStorage when "remember me" is on, otherwise only for
   this tab (sessionStorage). Ported from index.html authStore() (~line 761). */
export function authStorage(): AuthStorageLike {
  const pick = (): Storage => {
    try {
      return localStorage.getItem(REMEMBER_KEY) === '1' ? localStorage : sessionStorage
    } catch {
      return sessionStorage
    }
  }
  return {
    getItem(k) {
      try { return pick().getItem(k) } catch { return null }
    },
    setItem(k, v) {
      try { pick().setItem(k, v) } catch { /* ignore quota/denied errors, same as original */ }
    },
    removeItem(k) {
      try {
        localStorage.removeItem(k)
        sessionStorage.removeItem(k)
      } catch { /* ignore */ }
    },
  }
}

export function setRemember(on: boolean): void {
  try {
    if (on) localStorage.setItem(REMEMBER_KEY, '1')
    else localStorage.removeItem(REMEMBER_KEY)
  } catch { /* ignore */ }
}

export function rememberOn(): boolean {
  try { return localStorage.getItem(REMEMBER_KEY) === '1' } catch { return false }
}

export function savedEmail(): string {
  try { return localStorage.getItem(EMAIL_KEY) || '' } catch { return '' }
}

export function saveEmail(v: string): void {
  try {
    if (v) localStorage.setItem(EMAIL_KEY, v)
    else localStorage.removeItem(EMAIL_KEY)
  } catch { /* ignore */ }
}

export const SB_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SB_URL || !SB_KEY) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — copy web/.env.example to web/.env and fill them in.')
}

export const supabase = createClient<Database>(SB_URL, SB_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: authStorage(),
  },
})
