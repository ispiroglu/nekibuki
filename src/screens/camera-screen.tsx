import type { GeoPoint } from '@shared/types'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Camera as CameraIcon,
  Clock,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MapPinOff,
  RefreshCw,
  ShieldAlert,
  SwitchCamera,
  Zap,
  ZapOff,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Logo } from '@/components/brand/logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { captureVideoFrame, captureVideoStill, coverSourceRect } from '@/lib/image'
import { haptic } from '@/lib/haptics'
import { useAuth } from '@/lib/auth'
import { cn, clamp } from '@/lib/utils'
import { usePreferences } from '@/store/preferences'

type CameraStatus = 'idle' | 'starting' | 'ready' | 'denied' | 'error'

interface ZoomCapability {
  min: number
  max: number
  step: number
}

interface ExtendedCapabilities extends MediaTrackCapabilities {
  zoom?: ZoomCapability
  torch?: boolean
  focusMode?: string[]
}

interface AdvancedConstraint {
  zoom?: number
  torch?: boolean
  focusMode?: string
  exposureMode?: string
  pointsOfInterest?: { x: number; y: number }[]
}

function applyAdvanced(track: MediaStreamTrack, constraint: AdvancedConstraint) {
  return track
    .applyConstraints({ advanced: [constraint as unknown as MediaTrackConstraintSet] })
    .catch(() => undefined)
}

/**
 * Whether a tap can actually move focus. `getCapabilities()` is the honest signal:
 * iOS Safari exposes no `focusMode`, so tap-to-focus is a no-op there and we must
 * not draw the amber ring.
 */
function focusSupport(track: MediaStreamTrack): 'supported' | 'unsupported' | 'unknown' {
  if (typeof track.getCapabilities !== 'function') return 'unknown'
  try {
    const capabilities = (track.getCapabilities() ?? {}) as ExtendedCapabilities
    const modes = capabilities.focusMode
    if (!Array.isArray(modes)) return 'unsupported'
    return modes.some((mode) => mode === 'single-shot' || mode === 'continuous')
      ? 'supported'
      : 'unsupported'
  } catch {
    return 'unknown'
  }
}

/** Camera chrome sits in direct daylight, so it needs a stronger scrim than `glass-dark`. */
const cameraChromeStyle = { background: 'rgba(14, 14, 13, 0.62)' }

export function CameraScreen({
  active,
  onCapture,
  location,
  locationStatus,
  onRequestLocation,
  onClearLocation,
  onOpenProfile,
  onOpenHistory,
}: {
  active: boolean
  onCapture: (blob: Blob) => void
  location: GeoPoint | null
  locationStatus: 'idle' | 'requesting' | 'ready' | 'off'
  onRequestLocation: () => void
  onClearLocation: () => void
  onOpenProfile: () => void
  onOpenHistory: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reduceMotion = useReducedMotion()
  const hapticsEnabled = usePreferences((state) => state.haptics)
  const { user } = useAuth()

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [restartToken, setRestartToken] = useState(0)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [zoomRange, setZoomRange] = useState<ZoomCapability | null>(null)
  const [zoom, setZoom] = useState(1)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torch, setTorch] = useState(false)
  const [grid, setGrid] = useState(false)
  const [flash, setFlash] = useState(false)
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; id: number } | null>(null)
  const [stillUrl, setStillUrl] = useState<string | null>(null)
  const [locationMenuOpen, setLocationMenuOpen] = useState(false)

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setStatus('idle')
      setZoomRange(null)
      setTorchAvailable(false)
      setTorch(false)
      return
    }

    let cancelled = false

    async function start() {
      setStatus('starting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing === 'environment' ? { ideal: 'environment' } : 'user',
            width: { ideal: 2560 },
            height: { ideal: 1440 },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        const videoTrack = stream.getVideoTracks()[0]
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }

        const capabilities = (videoTrack?.getCapabilities?.() ?? {}) as ExtendedCapabilities
        setZoomRange(capabilities.zoom ?? null)
        setZoom(capabilities.zoom ? clamp(1, capabilities.zoom.min, capabilities.zoom.max) : 1)
        setTorchAvailable(Boolean(capabilities.torch))
        setStatus('ready')

        // Keep the last painted frame so leaving and re-entering the camera never
        // drops back to a black overlay while the new stream warms up.
        const video = videoRef.current
        const snapshot = () => {
          if (cancelled) return
          const still = video ? captureVideoStill(video) : null
          if (still) setStillUrl(still)
        }
        if (video && typeof video.requestVideoFrameCallback === 'function') {
          video.requestVideoFrameCallback(() => snapshot())
        } else {
          window.setTimeout(snapshot, 120)
        }
      } catch (error) {
        if (cancelled) return
        setStillUrl(null)
        setStatus(
          error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'error',
        )
      }
    }

    void start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [active, facing, restartToken])

  const currentTrack = () => streamRef.current?.getVideoTracks()[0] ?? null

  const applyZoom = useCallback(
    (value: number) => {
      if (!zoomRange) return
      const next = clamp(value, zoomRange.min, zoomRange.max)
      setZoom(next)
      const track = currentTrack()
      if (track) void applyAdvanced(track, { zoom: next })
    },
    [zoomRange],
  )

  const toggleTorch = useCallback(() => {
    const track = currentTrack()
    if (!track) return
    const next = !torch
    setTorch(next)
    haptic('light', hapticsEnabled)
    void applyAdvanced(track, { torch: next })
  }, [torch, hapticsEnabled])

  const handleShutter = useCallback(async () => {
    const video = videoRef.current
    if (!video || status !== 'ready') return
    haptic('medium', hapticsEnabled)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 190)
    const blob = await captureVideoFrame(video)
    if (blob) onCapture(blob)
  }, [hapticsEnabled, onCapture, status])

  const handlePreviewTap = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const track = currentTrack()
      const video = videoRef.current
      if (!track || !video) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      haptic('light', hapticsEnabled)

      const displayX = clamp((event.clientX - rect.left) / rect.width, 0, 1)
      const displayY = clamp((event.clientY - rect.top) / rect.height, 0, 1)

      // The track speaks sensor coordinates; the tap happened in the cover-cropped
      // viewfinder, so run it through the same geometry the photo capture uses.
      const crop = coverSourceRect(video.videoWidth, video.videoHeight, rect.width, rect.height)
      const point =
        crop && video.videoWidth && video.videoHeight
          ? {
              x: clamp((crop.x + displayX * crop.width) / video.videoWidth, 0, 1),
              y: clamp((crop.y + displayY * crop.height) / video.videoHeight, 0, 1),
            }
          : { x: displayX, y: displayY }

      const support = focusSupport(track)
      if (support === 'unsupported') return

      const showRing = () => setFocusPoint({ x: displayX, y: displayY, id: Date.now() })
      const constraint: AdvancedConstraint = {
        focusMode: 'single-shot',
        exposureMode: 'single-shot',
        pointsOfInterest: [point],
      }

      if (support === 'supported') {
        showRing()
        void applyAdvanced(track, constraint)
        return
      }

      // No capability metadata: let the constraint promise decide instead of
      // promising focus we cannot confirm.
      track
        .applyConstraints({ advanced: [constraint as unknown as MediaTrackConstraintSet] })
        .then(showRing)
        .catch(() => undefined)
    },
    [hapticsEnabled],
  )

  useEffect(() => {
    if (locationStatus !== 'ready') setLocationMenuOpen(false)
  }, [locationStatus])

  const zoomPresets = zoomRange
    ? [0.5, 1, 2, 3]
        .filter((value) => value >= zoomRange.min - 0.01 && value <= zoomRange.max + 0.01)
        .filter((value, index, all) => all.indexOf(value) === index)
    : []

  const initial = (user?.name?.trim() || user?.email || 'T').slice(0, 1).toUpperCase()
  const showStill = Boolean(stillUrl) && (status === 'idle' || status === 'starting')
  const locationLabel =
    locationStatus === 'requesting'
      ? 'Locating'
      : locationStatus === 'off'
        ? 'Location off'
        : locationStatus === 'ready' && location
          ? 'Location on'
          : 'Add location'

  const handleLocationChip = () => {
    if (locationStatus === 'requesting') return
    haptic('light', hapticsEnabled)
    if (locationStatus === 'ready') {
      setLocationMenuOpen((value) => !value)
      return
    }
    setLocationMenuOpen(false)
    onRequestLocation()
  }

  return (
    <section className="relative h-full w-full overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn(
          'absolute inset-0 size-full object-cover transition-opacity duration-500',
          status === 'ready' ? 'opacity-100' : 'opacity-0',
        )}
      />

      {stillUrl && (
        <motion.img
          src={stillUrl}
          alt=""
          aria-hidden
          initial={false}
          animate={{ opacity: status === 'ready' ? 0 : 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 size-full object-cover"
        />
      )}

      <div
        onClick={handlePreviewTap}
        className="absolute inset-0"
        style={{ touchAction: 'pan-y' }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/65 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/80 to-transparent" />

      {grid && status === 'ready' && (
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="border border-white/12" />
          ))}
        </div>
      )}

      {status === 'ready' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative size-[68%] max-w-[420px]">
            {(
              [
                'left-0 top-0 border-l border-t rounded-tl-2xl',
                'right-0 top-0 border-r border-t rounded-tr-2xl',
                'left-0 bottom-0 border-b border-l rounded-bl-2xl',
                'right-0 bottom-0 border-b border-r rounded-br-2xl',
              ] as const
            ).map((shape) => (
              <span key={shape} className={cn('absolute size-8 border-white/40', shape)} />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {focusPoint && (
          <motion.span
            key={focusPoint.id}
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [1.5, 1, 1, 0.95] }}
            transition={{ duration: 1.1, times: [0, 0.15, 0.7, 1] }}
            onAnimationComplete={() => setFocusPoint(null)}
            className="pointer-events-none absolute size-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-amber-300/90"
            style={{ left: `${(focusPoint?.x ?? 0) * 100}%`, top: `${(focusPoint?.y ?? 0) * 100}%` }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 bg-white"
          />
        )}
      </AnimatePresence>

      <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 safe-top">
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Your profile"
          className="glass-dark rounded-full p-0.5 transition-transform duration-150 ease-out active:scale-95"
          style={cameraChromeStyle}
        >
          <Avatar className="size-10">
            <AvatarFallback className="text-base leading-none">{initial}</AvatarFallback>
          </Avatar>
        </button>

        <div className="glass-dark flex items-center gap-1 rounded-full p-1" style={cameraChromeStyle}>
          {torchAvailable && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label="Torch"
              className={cn(
                'grid size-11 place-items-center rounded-full transition-colors active:bg-white/15',
                torch ? 'text-amber-300' : 'text-white',
              )}
            >
              {torch ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setGrid((value) => !value)
              haptic('light', hapticsEnabled)
            }}
            aria-label="Composition grid"
            className={cn(
              'grid size-11 place-items-center rounded-full transition-colors active:bg-white/15',
              grid ? 'text-white' : 'text-white/85',
            )}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor">
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeWidth="1.6" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenHistory}
          aria-label="Places you looked at"
          className="glass-dark grid size-11 place-items-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95"
          style={cameraChromeStyle}
        >
          <Clock className="size-5" />
        </button>
      </header>

      <footer className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-6 px-6 pb-24 safe-bottom">
        <button
          type="button"
          onClick={handleLocationChip}
          aria-haspopup={locationStatus === 'ready' ? 'menu' : undefined}
          aria-expanded={locationStatus === 'ready' ? locationMenuOpen : undefined}
          className="glass-dark flex min-h-11 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-white/95 transition-transform duration-150 ease-out active:scale-[0.98]"
          style={cameraChromeStyle}
        >
          {locationStatus === 'requesting' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : location ? (
            <MapPin className="size-4 text-amber-300" />
          ) : (
            <MapPinOff
              className={cn('size-4', locationStatus === 'off' ? 'text-amber-300' : 'text-white/85')}
            />
          )}
          {locationLabel}
        </button>

        <AnimatePresence>
          {locationMenuOpen && (
            <motion.div
              role="menu"
              aria-label="Location options"
              initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
              className="glass-dark flex flex-col overflow-hidden rounded-2xl text-left text-sm"
              style={cameraChromeStyle}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setLocationMenuOpen(false)
                  haptic('light', hapticsEnabled)
                  onRequestLocation()
                }}
                className="flex min-h-11 items-center gap-2 px-4 text-white/90 transition-colors active:bg-white/10"
              >
                <RefreshCw className="size-4" />
                Refresh location
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setLocationMenuOpen(false)
                  haptic('light', hapticsEnabled)
                  onClearLocation()
                }}
                className="flex min-h-11 items-center gap-2 border-t border-white/10 px-4 text-white/90 transition-colors active:bg-white/10"
              >
                <MapPinOff className="size-4 text-amber-300" />
                Turn off location
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {zoomPresets.length > 1 && (
          <div
            className="glass-dark flex items-center gap-1 rounded-full p-1"
            style={cameraChromeStyle}
          >
            {zoomPresets.map((preset) => {
              const activePreset =
                Math.abs(zoom - preset) < Math.max(0.06, (zoomRange?.step ?? 0.1) / 2)
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    applyZoom(preset)
                    haptic('light', hapticsEnabled)
                  }}
                  className={cn(
                    'relative grid h-11 min-w-11 place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors',
                    activePreset ? 'text-white' : 'text-white/85',
                  )}
                >
                  {activePreset && (
                    <motion.span
                      layoutId="zoom-pill"
                      className="absolute inset-0 rounded-full bg-white/15"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10">{preset}×</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex w-full max-w-sm items-center justify-between">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Choose from gallery"
            className="glass-dark grid size-12 place-items-center overflow-hidden rounded-xl text-white transition-transform duration-150 ease-out active:scale-95"
            style={cameraChromeStyle}
          >
            <ImageIcon className="size-5" />
          </button>

          <motion.button
            type="button"
            onClick={handleShutter}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
            disabled={status !== 'ready'}
            aria-label="Take a photo"
            className="grid size-20 place-items-center rounded-full border-[3px] border-white/90 disabled:opacity-40"
          >
            <span className="size-[62px] rounded-full bg-white" />
          </motion.button>

          <button
            type="button"
            onClick={() => {
              setFacing((value) => (value === 'environment' ? 'user' : 'environment'))
              haptic('light', hapticsEnabled)
            }}
            aria-label="Switch camera"
            className="glass-dark grid size-11 place-items-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95"
            style={cameraChromeStyle}
          >
            <SwitchCamera className="size-5" />
          </button>
        </div>
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-no-swipe
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            haptic('light', hapticsEnabled)
            onCapture(file)
          }
          event.target.value = ''
        }}
      />

      <AnimatePresence>
        {status !== 'ready' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center',
              showStill ? 'bg-black/45' : 'bg-black',
            )}
          >
            {status === 'starting' || status === 'idle' ? (
              <>
                <Logo className="size-16 animate-breathe text-white" />
                <p className="text-sm text-white/85">Waking up the camera…</p>
              </>
            ) : (
              <>
                <div className="grid size-14 place-items-center rounded-2xl bg-white/10">
                  {status === 'denied' ? (
                    <ShieldAlert className="size-6 text-amber-300" />
                  ) : (
                    <CameraIcon className="size-6 text-white/85" />
                  )}
                </div>
                <div className="space-y-2">
                  <h2 className="display text-2xl text-white">
                    {status === 'denied' ? 'Camera access is off' : 'The camera did not start'}
                  </h2>
                  <p className="mx-auto max-w-xs text-sm leading-relaxed text-white/85">
                    {status === 'denied'
                      ? 'Nekibuki needs the camera to look at the place in front of you. You can also pick a photo from your gallery.'
                      : 'Something interrupted the camera. You can retry, or choose a photo from your gallery instead.'}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <Button
                    size="lg"
                    className="bg-white text-black hover:bg-white/90"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="size-4" />
                    Choose from gallery
                  </Button>
                  <button
                    type="button"
                    onClick={() => setRestartToken((value) => value + 1)}
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm text-white/85"
                  >
                    <RefreshCw className="size-3.5" /> Retry camera
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
