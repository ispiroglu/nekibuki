import type { GeoPoint, GuideLanguage } from '@shared/types'

const EARTH_RADIUS_M = 6_371_000

const toRad = (value: number): number => (value * Math.PI) / 180
const toDeg = (value: number): number => (value * 180) / Math.PI

/** Great-circle distance in metres. Small distances; no need for ellipsoids. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial bearing from `a` to `b`, in degrees (0 = north, clockwise). */
export function bearingDegrees(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

const DIRECTIONS_TR = [
  'kuzey',
  'kuzeydoğu',
  'doğu',
  'güneydoğu',
  'güney',
  'güneybatı',
  'batı',
  'kuzeybatı',
] as const

/** Turkish dative forms: "kuzeydoğuya", not "kuzeydoğuya" assembled blindly. */
const DIRECTIONS_TR_DATIVE = [
  'kuzeye',
  'kuzeydoğuya',
  'doğuya',
  'güneydoğuya',
  'güneye',
  'güneybatıya',
  'batıya',
  'kuzeybatıya',
] as const

const DIRECTIONS_EN = [
  'north',
  'northeast',
  'east',
  'southeast',
  'south',
  'southwest',
  'west',
  'northwest',
] as const

/** Eight-point compass label for a bearing. */
export function directionLabel(degrees: number, language: GuideLanguage): string {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8
  return language === 'tr' ? DIRECTIONS_TR[index] : DIRECTIONS_EN[index]
}

/** Round a walking distance so the instruction sounds like a person said it. */
export function walkableDistance(meters: number): number {
  if (meters < 100) return Math.max(10, Math.round(meters / 10) * 10)
  if (meters < 500) return Math.round(meters / 25) * 25
  return Math.round(meters / 50) * 50
}

/**
 * The app never calls a routing service. A straight-line distance and an
 * eight-point direction are enough for a walking instruction, and they stay
 * true even when the map service is down.
 */
export function arrivalInstruction(
  from: GeoPoint,
  to: GeoPoint,
  language: GuideLanguage,
  options: { start?: boolean } = {},
): string {
  const meters = walkableDistance(distanceMeters(from, to))
  const bearing = bearingDegrees(from, to)
  const direction = directionLabel(bearing, language)
  const dative =
    DIRECTIONS_TR_DATIVE[Math.round((((bearing % 360) + 360) % 360) / 45) % 8]

  if (language === 'tr') {
    if (options.start) {
      return `Tur buradan başlıyor. Yaklaşık ${meters} m ${dative} yürüyerek ilk durağa geç.`
    }
    return `Önceki duraktan yaklaşık ${meters} m ${dative} yürü.`
  }

  if (options.start) {
    return `The walk starts here. Walk about ${meters} m ${direction} to the first stop.`
  }
  return `Walk about ${meters} m ${direction} from the previous stop.`
}

/** A short two-endpoint GeoPoint, dropping coordinates that are not finite. */
export function geoPoint(
  latitude: unknown,
  longitude: unknown,
  accuracy?: unknown,
): GeoPoint | undefined {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return undefined
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return undefined
  return {
    latitude,
    longitude,
    ...(typeof accuracy === 'number' && Number.isFinite(accuracy) ? { accuracy } : {}),
  }
}
