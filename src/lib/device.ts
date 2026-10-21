/**
 * What the device can afford.
 *
 * A phone with four cores and four gigabytes of memory cannot frost a
 * backdrop over a live camera feed at sixty frames a second. It can do it,
 * but it drops frames doing it, and the traveller feels that as a camera
 * that does not move smoothly.
 *
 * The tier is read once, at startup, and written to the document as
 * `data-power`. The stylesheet acts on it from there, so no component has to
 * ask, and nothing has to be re-measured when the answer changes.
 */

export type PowerTier = 'full' | 'lean'

interface NavigatorHints {
  /** Chromium reports the device memory in gigabytes. */
  deviceMemory?: number
  /** The connection reports whether the user asked for less data. */
  connection?: { saveData?: boolean }
}

/**
 * Reads the hints the browser offers. Every one of them is optional: a
 * browser that says nothing is treated as a capable one, because the tier
 * only ever removes decoration, never information.
 */
export function detectPowerTier(): PowerTier {
  if (typeof navigator === 'undefined') return 'full'

  const hints = navigator as Navigator & NavigatorHints

  // The traveller asked for less data. A frost is not worth the battery.
  if (hints.connection?.saveData) return 'lean'

  const cores = hints.hardwareConcurrency ?? 8
  const memory = hints.deviceMemory ?? 8
  if (cores <= 4 || memory <= 4) return 'lean'

  return 'full'
}

/** Writes the tier to the document so the stylesheet can act on it. */
export function applyPowerTier(): PowerTier {
  const tier = detectPowerTier()
  document.documentElement.dataset.power = tier
  return tier
}

let cached: PowerTier | null = null

/**
 * The tier, read once.
 *
 * The answer cannot change while the app is running, so this is safe to call
 * during a render: every call returns the same value.
 */
export function powerTier(): PowerTier {
  if (cached === null) cached = detectPowerTier()
  return cached
}
