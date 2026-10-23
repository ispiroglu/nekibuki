import type { GuideLanguage } from '@shared/types'
import type { NearbyPlace } from '../types'

/**
 * Free, no-key place candidates from Wikipedia's geosearch. They are handed
 * to the vision model as hypotheses, never as facts: the model still has to
 * find the thing in the photograph before it uses a name.
 *
 * A failure here must never fail the photo, so every error becomes an empty
 * list. The whole lookup is cached by Cloudflare for a day per coordinate.
 */
export async function nearbyPlaces(
  location: { latitude: number; longitude: number; accuracy?: number } | undefined,
  language: GuideLanguage,
): Promise<NearbyPlace[]> {
  if (!location) return []

  const lang = language === 'tr' ? 'tr' : 'en'
  // A coarse fix should not pull the whole city into the prompt.
  const radius = Math.min(1000, Math.max(250, Math.round((location.accuracy ?? 250) * 1.5)))
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch` +
    `&gscoord=${location.latitude.toFixed(5)}%7C${location.longitude.toFixed(5)}` +
    `&gsradius=${radius}&gslimit=8&format=json&formatversion=2&origin=*`

  try {
    const response = await fetch(url, {
      headers: {
        // Wikimedia asks for a descriptive User-Agent on API traffic.
        'user-agent': 'Nekibuki/0.1 (https://nekibuki.thecrafter.io; guide app)',
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(2500),
      cf: { cacheTtl: 86_400, cacheEverything: true },
    })

    if (!response.ok) return []

    const body = (await response.json()) as {
      query?: { geosearch?: { ns?: number; title?: string; dist?: number }[] }
    }

    return (body.query?.geosearch ?? [])
      .filter((item) => item.ns === 0 && typeof item.title === 'string' && item.title.trim())
      .slice(0, 8)
      .map((item) => ({
        title: item.title!.trim(),
        distance: typeof item.dist === 'number' ? Math.round(item.dist) : undefined,
      }))
  } catch {
    return []
  }
}
