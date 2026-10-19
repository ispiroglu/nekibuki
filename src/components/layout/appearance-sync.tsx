import { useEffect } from 'react'
import { usePreferences } from '@/store/preferences'

export function AppearanceSync() {
  const appearance = usePreferences((state) => state.appearance)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = appearance === 'dark' || (appearance === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [appearance])

  return null
}
