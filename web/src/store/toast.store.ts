import { create } from 'zustand'

export interface ToastMessage {
  id: number
  text: string
  isError: boolean
}

interface ToastState {
  messages: ToastMessage[]
  show: (text: string, isError?: boolean) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  messages: [],
  show: (text, isError = false) =>
    set((s) => ({ messages: [...s.messages, { id: nextId++, text, isError }] })),
  dismiss: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
}))
