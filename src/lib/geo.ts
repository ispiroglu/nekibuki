import type { GeoPoint } from '@shared/types'

export function getCurrentLocation(timeoutMs = 9000): Promise<GeoPoint | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)

  return new Promise((resolve) => {
    let settled = false
    const finish = (value: GeoPoint | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const timer = window.setTimeout(() => finish(null), timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timer)
        finish({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      () => {
        window.clearTimeout(timer)
        finish(null)
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}
