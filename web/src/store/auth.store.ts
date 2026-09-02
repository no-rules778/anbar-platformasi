import { create } from 'zustand'
import type { Me } from '../lib/roles'

export type AuthStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AuthState {
  me: Me | null
  status: AuthStatus
  error: string | null
  setMe: (me: Me | null) => void
  setStatus: (status: AuthStatus) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  me: null,
  /* Boots in `loading`, not `idle`: on the very first paint we do not yet know
     whether a stored session exists, and the original never shows an
     interactive gate during that window (index.html:7589). Starting in `idle`
     flashed the login form for one frame before the restore effect ran.
     `idle` means "checked, and nobody is signed in" — reached when a restore
     finds no session, or after logout via reset(). */
  status: 'loading',
  error: null,
  setMe: (me) => set({ me }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  reset: () => set({ me: null, status: 'idle', error: null }),
}))
