import { useEffect } from 'react'
import { usePreferences } from '@/store/preferences'

/**
 * Keep the browser/PWA system-bar colour in step with the in-app appearance.
 *
 * `index.html` ships a media-query pair (paper / dark paper) so the status bar
 * is right before React mounts. An explicit light or dark choice is not the OS
 * preference, so it silences both media-scoped tags and pins the page
 * background; `system` restores the pair. The colour is read from the
 * `--background` token so the page and the system bar cannot drift apart.
 */
function syncThemeColor(explicit: 'light' | 'dark' | null) {
  const scoped = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[data-theme-color]'),
  ).filter((meta) => meta.dataset.themeColor !== 'explicit')

  for (const meta of scoped) {
    const scheme = meta.dataset.themeColor === 'dark' ? 'dark' : 'light'
    meta.media = explicit ? 'not all' : `(prefers-color-scheme: ${scheme})`
  }

  const pinned = document.querySelector<HTMLMetaElement>('meta[data-theme-color="explicit"]')

  if (!explicit) {
    pinned?.remove()
    return
  }

  const paper = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim()
  if (!paper) return

  const meta = pinned ?? document.createElement('meta')
  if (!pinned) {
    meta.name = 'theme-color'
    meta.dataset.themeColor = 'explicit'
    document.head.append(meta)
  }
  meta.content = paper
}

export function AppearanceSync() {
  const appearance = usePreferences((state) => state.appearance)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = appearance === 'dark' || (appearance === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
      syncThemeColor(appearance === 'system' ? null : appearance)
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [appearance])

  return null
}
