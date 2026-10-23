import type { GeoPoint } from '@shared/types'
import { distanceMeters } from './geo'
import { ProviderError } from '../types'

/**
 * Real, named places around the photo. OpenStreetMap is the source of truth
 * for positions: the planner may pick these candidates, but it never writes a
 * coordinate of its own.
 */
export interface WalkPoi {
  /** Stable OSM element id, e.g. `node/123456`. */
  id: string
  name: string
  /** A short human label, e.g. `museum` or `historic building`. */
  kind: string
  latitude: number
  longitude: number
  distance: number
  tags: Record<string, string>
}

export const DEFAULT_OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
export const WALK_RADIUS_M = 800
export const MAX_POIS = 25

/**
 * A deliberately narrow query: named tourism, history and worship around the
 * traveller, plus parks. The anchor is the photo position. Keeping the radius
 * under a kilometre is what makes the route a walk rather than a day trip.
 */
export function buildOverpassQuery(location: GeoPoint, radius = WALK_RADIUS_M): string {
  const around = `(around:${Math.round(radius)},${location.latitude.toFixed(5)},${location.longitude.toFixed(5)})`
  return `[out:json][timeout:20];
(
  nwr["name"]["tourism"~"^(attraction|museum|viewpoint|gallery|artwork|zoo|theme_park)$"]${around};
  nwr["name"]["historic"]${around};
  nwr["name"]["amenity"="place_of_worship"]${around};
  nwr["name"]["leisure"~"^(park|garden)$"]${around};
);
out center 100;`
}

interface OverpassElement {
  type?: string
  id?: number
  lat?: number
  lon?: number
  center?: { lat?: number; lon?: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements?: OverpassElement[]
}

function kindOf(tags: Record<string, string>): string {
  if (tags.tourism) return tags.tourism
  if (tags.historic && tags.historic !== 'yes') return tags.historic
  if (tags.historic) return 'historic'
  if (tags.amenity === 'place_of_worship') return tags.religion ? `place_of_worship:${tags.religion}` : 'place_of_worship'
  if (tags.leisure) return tags.leisure
  return 'place'
}

const normaliseName = (value: string): string =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * Turn an Overpass payload into walk candidates. Pure, so the parsing rules
 * can be tested without the network.
 */
export function parseOverpass(
  payload: unknown,
  location: GeoPoint,
  limit = MAX_POIS,
): WalkPoi[] {
  const body = payload as OverpassResponse
  if (!Array.isArray(body?.elements)) return []

  const pois: WalkPoi[] = []
  const seenIds = new Set<string>()
  const seenNames = new Set<string>()

  for (const element of body.elements) {
    if (!element || !element.id) continue
    const tags = element.tags
    if (!tags) continue
    const name = (tags.name ?? tags['name:tr'] ?? tags['name:en'] ?? '').trim()
    if (!name) continue

    const latitude = element.lat ?? element.center?.lat
    const longitude = element.lon ?? element.center?.lon
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue

    const id = `${element.type ?? 'node'}/${element.id}`
    if (seenIds.has(id)) continue
    seenIds.add(id)

    // Two records for the same square (a node and its way) would tell the
    // traveller to visit the same place twice.
    const nameKey = normaliseName(name)
    if (!nameKey || seenNames.has(nameKey)) continue
    seenNames.add(nameKey)

    const distance = distanceMeters(location, { latitude, longitude })
    if (!Number.isFinite(distance) || distance > WALK_RADIUS_M * 1.5) continue

    pois.push({
      id,
      name,
      kind: kindOf(tags),
      latitude,
      longitude,
      distance: Math.round(distance),
      tags,
    })
  }

  return pois.sort((a, b) => a.distance - b.distance).slice(0, limit)
}

/**
 * Ask Overpass for named places near the photo. A failed map lookup is a
 * named error: the caller must not quietly build a tour from nothing.
 */
export async function fetchNearbyPois(
  location: GeoPoint,
  options: { url?: string; radius?: number } = {},
): Promise<WalkPoi[]> {
  const url =
    `${options.url?.trim() || DEFAULT_OVERPASS_URL}?data=` +
    encodeURIComponent(buildOverpassQuery(location, options.radius))

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        // Overpass asks for a descriptive User-Agent and accepts a plain one.
        'user-agent': 'Nekibuki/0.1 (https://nekibuki.thecrafter.io; walking guide)',
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(18_000),
      cf: { cacheTtl: 3_600, cacheEverything: true },
    })
  } catch {
    throw new ProviderError(
      'The map service could not be reached. Try the tour again in a moment.',
      'walk_map_unavailable',
      504,
    )
  }

  if (!response.ok) {
    throw new ProviderError(
      'The map service is busy right now. Try the tour again in a moment.',
      'walk_map_unavailable',
      502,
    )
  }

  const payload = (await response.json().catch(() => null)) as unknown
  const pois = parseOverpass(payload, location)

  if (pois.length < 5) {
    throw new ProviderError(
      'There are not enough mapped places around this photo to build a walk. Try a photo from a square, museum or old street.',
      'walk_too_few_places',
      422,
    )
  }

  return pois
}
