import { create } from 'zustand'

/**
 * The shot the guide asked for, carried into the analysis. Three strings: the
 * place, and the instruction the traveller was given.
 */
export interface CaptureContinuation {
  placeTitle: string
  placeName: string
  instruction: string
}

export interface CaptureDraft {
  blob: Blob
  previewUrl: string
  /**
   * Present only when the photo answers a suggested step. Without it the
   * model writes a fresh guide; with it, the same walk continues.
   */
  continuation?: CaptureContinuation
}

/**
 * The shot the traveller was asked to take next, handed from the guide to the
 * viewfinder so the camera knows what it is looking for.
 */
export interface PendingStep {
  id: string
  /** What to look for, e.g. "The arch that frames the square". */
  title: string
  /** The camera instruction, e.g. "Stand in the middle of the road…". */
  instruction: string
  /** The place the traveller is standing in. */
  placeTitle: string
  placeName: string
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
  viewfinderSettingsOpen: boolean
  setViewfinderSettingsOpen: (open: boolean) => void
  /** The next shot the guide suggested, waiting for the camera. */
  pendingStep: PendingStep | null
  setPendingStep: (step: PendingStep | null) => void
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
  viewfinderSettingsOpen: false,
  setViewfinderSettingsOpen: (viewfinderSettingsOpen) => set({ viewfinderSettingsOpen }),
  pendingStep: null,
  setPendingStep: (pendingStep) => set({ pendingStep }),
}))
