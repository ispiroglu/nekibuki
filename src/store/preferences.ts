import type { GuideLanguage } from '@shared/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Appearance = 'system' | 'light' | 'dark'

interface PreferencesState {
  guideLanguage: GuideLanguage
  appearance: Appearance
  haptics: boolean
  onboarded: Record<string, boolean>
  swipeHintSeen: boolean
  setGuideLanguage: (language: GuideLanguage) => void
  setAppearance: (appearance: Appearance) => void
  setHaptics: (enabled: boolean) => void
  completeOnboarding: (userId: string) => void
  markSwipeHintSeen: () => void
}

const defaultLanguage: GuideLanguage =
  typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en'

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      guideLanguage: defaultLanguage,
      appearance: 'system',
      haptics: true,
      onboarded: {},
      swipeHintSeen: false,
      setGuideLanguage: (guideLanguage) => set({ guideLanguage }),
      setAppearance: (appearance) => set({ appearance }),
      setHaptics: (haptics) => set({ haptics }),
      completeOnboarding: (userId) =>
        set((state) => ({ onboarded: { ...state.onboarded, [userId]: true } })),
      markSwipeHintSeen: () => set({ swipeHintSeen: true }),
    }),
    { name: 'nekibuki.preferences' },
  ),
)
