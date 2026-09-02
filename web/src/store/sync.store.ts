import { create } from 'zustand'

/* Realtime connection state, ported from the production platform's sync
   indicator: setSync(true) on SUBSCRIBED, setSync(false) on CHANNEL_ERROR or
   TIMED_OUT (index.html:1177-1180, 1184-1188).

   The old indicator was binary. Here `connecting` is kept separate from
   `synced` on purpose: the platform must not claim it is synchronised before
   the channel actually reports SUBSCRIBED. */
export type SyncState = 'idle' | 'connecting' | 'synced' | 'error'

interface SyncStore {
  state: SyncState
  setState: (state: SyncState) => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  state: 'idle',
  setState: (state) => set({ state }),
}))
