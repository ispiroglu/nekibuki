import { Grid3x3, Zap, ZapOff } from 'lucide-react'
import type { RefObject } from 'react'
import { cn } from '@/lib/utils'

/** Render a zoom factor the way a camera does: `1×`, `2×`, `0.5×`. */
export function formatZoom(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}×`
}

function Toggle({
  label,
  pressed,
  onToggle,
  icon: Icon,
}: {
  label: string
  pressed: boolean
  onToggle: () => void
  icon: typeof Zap
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80',
        pressed
          ? 'bg-hud text-hud-fg'
          : 'text-white/90 hover:bg-white/10 active:bg-white/15',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

/**
 * The camera's hidden control shelf: torch, composition grid and zoom live here
 * so the viewfinder itself only carries a shutter, a gallery and a lens switch.
 * Opened by holding the viewfinder or by focusing "Viewfinder settings".
 */
export function ViewfinderSettings({
  panelRef,
  panelId,
  torchAvailable,
  torch,
  onToggleTorch,
  grid,
  onToggleGrid,
  zoomPresets,
  activeZoom,
  zoomStep,
  onSelectZoom,
}: {
  panelRef: RefObject<HTMLDivElement | null>
  panelId: string
  torchAvailable: boolean
  torch: boolean
  onToggleTorch: () => void
  grid: boolean
  onToggleGrid: () => void
  zoomPresets: number[]
  activeZoom: number
  zoomStep: number
  onSelectZoom: (value: number) => void
}) {
  const hasZoom = zoomPresets.length > 1

  return (
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-label="Viewfinder settings"
      tabIndex={-1}
      className={cn(
        'glass-dark pointer-events-auto flex w-max max-w-[calc(100vw-1rem)] flex-col rounded-2xl p-1.5 text-white',
        'ring-1 ring-black/40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70',
        '[@media(max-height:460px)]:flex-row [@media(max-height:460px)]:items-center',
      )}
      style={{ background: 'rgba(14, 14, 13, 0.74)' }}
    >
      <div className="flex items-center justify-center gap-1">
        {torchAvailable && (
          <Toggle
            label="Torch"
            pressed={torch}
            onToggle={onToggleTorch}
            icon={torch ? Zap : ZapOff}
          />
        )}
        <Toggle label="Grid" pressed={grid} onToggle={onToggleGrid} icon={Grid3x3} />
      </div>

      {hasZoom && (
        <div
          className={cn(
            'mt-1 flex items-center justify-center border-t border-white/10 pt-2',
            '[@media(max-height:460px)]:mt-0 [@media(max-height:460px)]:ml-1 [@media(max-height:460px)]:border-t-0 [@media(max-height:460px)]:border-l [@media(max-height:460px)]:pl-2 [@media(max-height:460px)]:pt-0',
          )}
        >
          <div role="group" aria-label="Zoom" className="flex items-center gap-0.5">
            {zoomPresets.map((preset) => {
              const active = Math.abs(activeZoom - preset) < Math.max(0.06, zoomStep / 2)
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectZoom(preset)}
                  className={cn(
                    'grid min-h-11 min-w-11 place-items-center rounded-full px-1 text-xs font-semibold tabular-nums transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80',
                    active
                      ? 'bg-hud text-hud-fg'
                      : 'text-white/85 hover:bg-white/10 active:bg-white/15',
                  )}
                >
                  {formatZoom(preset)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
