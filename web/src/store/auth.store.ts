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
  status: 'idle',
  error: null,
  setMe: (me) => set({ me }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  reset: () => set({ me: null, status: 'idle', error: null }),
}))
