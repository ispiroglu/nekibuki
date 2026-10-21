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
        'inline-flex min-h-[44px] items-center gap-[6px] rounded-full px-[12px] text-xs font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80',
        pressed
          ? 'bg-hud text-hud-fg'
          : 'text-white/90 hover:bg-white/10 active:bg-white/15',
      )}
    >
      <Icon className="size-[16px]" />
      {label}
    </button>
  )
}

/**
 * The camera's control shelf: torch, composition grid and zoom live here so
 * the viewfinder itself only carries a shutter, a gallery and a lens switch.
 * Opened by holding the viewfinder or from the "Viewfinder settings" button
 * in the camera HUD. This panel is the single implementation of that UI.
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
        'glass-dark-live pointer-events-auto flex w-max max-w-[calc(100vw-16px)] flex-col rounded-2xl p-[6px] text-white',
        'ring-1 ring-black/40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70',
        '[@media(max-height:460px)]:flex-row [@media(max-height:460px)]:items-center',
      )}
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
            'mt-[6px] flex items-center justify-center border-t border-white/10 pt-[8px]',
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
                    'grid min-h-[44px] min-w-[44px] place-items-center rounded-full px-1 text-xs font-semibold tabular-nums transition-colors',
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
