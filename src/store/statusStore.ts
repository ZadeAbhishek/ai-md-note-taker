import { create } from 'zustand'

export type StatusKind = 'idle' | 'loading' | 'success' | 'error'

export interface Status {
  id: number
  kind: StatusKind
  message: string
}

interface StatusStoreState {
  status: Status
  setLoading: (message: string) => void
  setSuccess: (message: string) => void
  setError: (message: string) => void
}

let statusId = 0

export const useStatusStore = create<StatusStoreState>((set) => ({
  status: { id: 0, kind: 'idle', message: 'Ready' },
  setLoading: (message) => set({ status: { id: ++statusId, kind: 'loading', message } }),
  setSuccess: (message) => set({ status: { id: ++statusId, kind: 'success', message } }),
  setError: (message) => set({ status: { id: ++statusId, kind: 'error', message } }),
}))
