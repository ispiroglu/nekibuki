import { useState } from 'react'
import { BRANDS, applyBrand, isBrand, type Brand } from '@/lib/brand'

const SWATCH: Record<Brand, string> = {
  petrol: '#0f5f57',
  clay: '#d97757',
  okra: '#9c6116',
  lapis: '#2a4c8f',
  saffron: '#c98a1c',
}

/**
 * Dev-only palette switcher. Mount it with `?brandlab=1` so it never shows up in
 * screenshots or a normal run.
 */
export function BrandLab() {
  const [active, setActive] = useState<Brand>(() => {
    const current = new URLSearchParams(window.location.search).get('brand')
    return isBrand(current) ? current : 'petrol'
  })

  if (!import.meta.env.DEV) return null
  if (!new URLSearchParams(window.location.search).has('brandlab')) return null

  return (
    <div className="fixed bottom-4 left-4 z-[200] flex items-center gap-1.5 rounded-full bg-foreground/90 p-1.5 shadow-lg backdrop-blur">
      {BRANDS.map((brand) => (
        <button
          key={brand}
          type="button"
          onClick={() => {
            applyBrand(brand)
            setActive(brand)
          }}
          title={brand}
          aria-label={brand}
          aria-pressed={active === brand}
          className="size-7 rounded-full ring-2 ring-transparent transition-transform active:scale-90 data-[active=true]:ring-white"
          data-active={active === brand}
          style={{ backgroundColor: SWATCH[brand] }}
        />
      ))}
    </div>
  )
}
