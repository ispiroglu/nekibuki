/**
 * Brand presets for the colour lab.
 *
 * A preset only moves the hue: paper, serif, radii and layout stay put, so
 * variants can be compared fairly. Switch with `?brand=clay`, or leave it out
 * to keep the default petrol.
 */
export const BRANDS = ['petrol', 'clay', 'okra', 'lapis', 'saffron'] as const

export type Brand = (typeof BRANDS)[number]

const STORAGE_KEY = 'nekibuki.brand'

export function isBrand(value: string | null): value is Brand {
  return value !== null && (BRANDS as readonly string[]).includes(value)
}

export function readBrand(): Brand | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isBrand(stored) ? stored : null
  } catch {
    return null
  }
}

export function applyBrand(brand: Brand) {
  if (brand === 'petrol') {
    delete document.documentElement.dataset.brand
  } else {
    document.documentElement.dataset.brand = brand
  }

  try {
    localStorage.setItem(STORAGE_KEY, brand)
  } catch {
    // Private mode: the preset still applies for this page load.
  }
}

/** URL wins over the stored choice, so a shared link always shows its preset. */
export function initBrand() {
  const fromUrl = new URLSearchParams(window.location.search).get('brand')
  if (isBrand(fromUrl)) {
    applyBrand(fromUrl)
    return
  }

  const stored = readBrand()
  if (stored) {
    if (stored === 'petrol') delete document.documentElement.dataset.brand
    else document.documentElement.dataset.brand = stored
  }
}
