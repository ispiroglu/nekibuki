import type { GuideLanguage } from '@shared/types'
import { useCallback, useEffect } from 'react'
import { usePreferences } from '@/store/preferences'

/**
 * The app has one language switch. It already chose the language the guide is
 * written in; it also has to choose the language of the chrome around it, or
 * a Turkish guide ends up under English headings.
 */
export function useUiLanguage(): GuideLanguage {
  return usePreferences((state) => state.guideLanguage)
}

/**
 * Inline translation for a single string: `t('English', 'Türkçe')`. The two
 * strings sit next to the markup that renders them, which keeps a small app
 * from growing a separate catalogue that drifts from its screens.
 */
export function useT() {
  const language = useUiLanguage()
  return useCallback(
    (english: string, turkish: string) => (language === 'tr' ? turkish : english),
    [language],
  )
}

/** The same choice outside React, e.g. in a helper that formats a date. */
export function pickLanguage<T>(language: GuideLanguage, english: T, turkish: T): T {
  return language === 'tr' ? turkish : english
}

export function LanguageSync() {
  const language = useUiLanguage()

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return null
}
