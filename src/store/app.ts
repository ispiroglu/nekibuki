import { create } from 'zustand'

export interface CaptureDraft {
  blob: Blob
  previewUrl: string
}

interface AppState {
  historyRevision: number
  bumpHistory: () => void
  screenIndex: number
  setScreenIndex: (index: number) => void
  capture: CaptureDraft | null
  setCapture: (capture: CaptureDraft | null) => void
  analyzing: boolean
  setAnalyzing: (analyzing: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  historyRevision: 0,
  bumpHistory: () => set((state) => ({ historyRevision: state.historyRevision + 1 })),
  screenIndex: 1,
  setScreenIndex: (screenIndex) => set({ screenIndex }),
  capture: null,
  setCapture: (capture) => set({ capture }),
  analyzing: false,
  setAnalyzing: (analyzing) => set({ analyzing }),
}))
