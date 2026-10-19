import type { GeoPoint } from '@shared/types'
import { create } from 'zustand'
import { getCurrentLocation } from '@/lib/geo'

type LocationStatus = 'idle' | 'requesting' | 'ready' | 'off'

interface LocationState {
  location: GeoPoint | null
  status: LocationStatus
  request: () => Promise<void>
  reset: () => void
}

export const useLocationStore = create<LocationState>((set, get) => ({
  location: null,
  status: 'idle',
  request: async () => {
    if (get().status === 'requesting') return
    set({ status: 'requesting' })
    const result = await getCurrentLocation()
    set({ location: result, status: result ? 'ready' : 'off' })
  },
  reset: () => set({ location: null, status: 'idle' }),
}))
