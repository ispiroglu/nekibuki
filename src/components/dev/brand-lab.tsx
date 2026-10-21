import { useState } from 'react'
import { BRANDS, DEFAULT_BRAND, applyBrand, isBrand, type Brand } from '@/lib/brand'

const LABELS: Record<Brand, string> = {
  petrol: 'Petrol (default)',
  clay: 'Clay (experiment)',
  okra: 'Okra',
  lapis: 'Lapis',
  saffron: 'Saffron',
}

function activeBrand(): Brand {
  const applied = document.documentElement.dataset.brand ?? null
  return isBrand(applied) ? applied : DEFAULT_BRAND
}

function BrandLabSwitcher() {
  const [active, setActive] = useState<Brand>(activeBrand)

  if (!new URLSearchParams(window.location.search).has('brandlab')) return null

  return (
    <div className="fixed bottom-4 left-4 z-[200] flex items-center gap-1.5 rounded-full bg-foreground/90 p-1.5 shadow-lg backdrop-blur">
      {BRANDS.map((brand) => (
        <button
          key={brand}
          type="button"
          // Each swatch carries the preset's own data-brand, so its fill comes
          // from that preset's --brand token instead of a hardcoded hex.
          data-brand={brand}
          onClick={() => {
            applyBrand(brand)
            setActive(brand)
          }}
          title={LABELS[brand]}
          aria-label={LABELS[brand]}
          aria-pressed={active === brand}
          className="size-7 rounded-full ring-2 ring-transparent transition-transform active:scale-90 data-[active=true]:ring-white"
          data-active={active === brand}
          style={{ backgroundColor: 'var(--brand)' }}
        />
      ))}
    </div>
  )
}

/**
 * Dev-only palette switcher. Mount it with `?brandlab=1` so it never shows up in
 * screenshots or a normal run. The export collapses to a no-op outside dev, so
 * the switcher and its preset labels are tree-shaken out of production builds.
 */
export const BrandLab = import.meta.env.DEV ? BrandLabSwitcher : () => null
