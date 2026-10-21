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
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'
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
 * not draw the brand focus ring.
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

const captureFailedMessage = "Couldn't grab that frame — try again."

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
  locationStatus: 'idle' | 'requesting' | 'ready' | 'off' | 'disabled'
  onRequestLocation: () => void
  onClearLocation: () => void
  onOpenProfile: () => void
  onOpenHistory: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const capturingRef = useRef(false)
  const locationChipRef = useRef<HTMLButtonElement>(null)
  const locationMenuRef = useRef<HTMLDivElement>(null)
  const locationItemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const locationMenuId = useId()
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
  const [capturing, setCapturing] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('prompt')
  // A short beat between "stream is live" and "window pulls open" so the card
  // reads as a deliberate frame instead of a one-frame glitch.
  const [revealed, setRevealed] = useState(false)
  // The hint is a first-open affordance: switching lenses reuses the pull but
  // should not repeat the copy.
  const hasRevealed = useRef(false)

  useEffect(() => {
    if (!active) {
      hasRevealed.current = false
      setRevealed(false)
      return
    }
    if (status !== 'ready') {
      setRevealed(false)
      return
    }
    const timer = window.setTimeout(() => {
      hasRevealed.current = true
      setRevealed(true)
    }, reduceMotion ? 0 : 260)
    return () => window.clearTimeout(timer)
  }, [active, status, reduceMotion])

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
        // A freshly acquired track always starts with its torch off, so reset the
        // button state to match or the UI would claim a light that is not lit.
        setTorch(false)
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
    if (capturingRef.current) return
    const video = videoRef.current
    if (!video || status !== 'ready') return

    capturingRef.current = true
    setCapturing(true)
    try {
      const blob = await captureVideoFrame(video)
      if (!blob) {
        toast.error(captureFailedMessage)
        return
      }
      haptic('medium', hapticsEnabled)
      setFlash(true)
      window.setTimeout(() => setFlash(false), 190)
      onCapture(blob)
    } catch {
      toast.error(captureFailedMessage)
    } finally {
      capturingRef.current = false
      setCapturing(false)
    }
  }, [hapticsEnabled, onCapture, status])

  const handlePreviewTap = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!revealed) return
      const track = currentTrack()
      const video = videoRef.current
      if (!track || !video) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      haptic('light', hapticsEnabled)

      const displayX = clamp((event.clientX - rect.left) / rect.width, 0, 1)
      const displayY = clamp((event.clientY - rect.top) / rect.height, 0, 1)
      // A selfie preview is mirrored for the user but the sensor is not, so invert
      // the horizontal coordinate before mapping. The ring still uses displayX.
      const sensorX = facing === 'user' ? 1 - displayX : displayX

      // The track speaks sensor coordinates; the tap happened in the cover-cropped
      // viewfinder, so run it through the same geometry the photo capture uses.
      const crop = coverSourceRect(video.videoWidth, video.videoHeight, rect.width, rect.height)
      const point =
        crop && video.videoWidth && video.videoHeight
          ? {
              x: clamp((crop.x + sensorX * crop.width) / video.videoWidth, 0, 1),
              y: clamp((crop.y + displayY * crop.height) / video.videoHeight, 0, 1),
            }
          : { x: sensorX, y: displayY }

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
    [facing, hapticsEnabled, revealed],
  )

  useEffect(() => {
    if (locationStatus !== 'ready') setLocationMenuOpen(false)
  }, [locationStatus])

  // getUserMedia can stall (flaky device, a permission sheet dismissed without
  // resolving). Never leave the user trapped behind the starting overlay.
  useEffect(() => {
    if (status !== 'starting') return
    const timeout = window.setTimeout(() => {
      setStatus((current) => (current === 'starting' ? 'error' : current))
    }, 8000)
    return () => window.clearTimeout(timeout)
  }, [status])

  // A denied camera is often a site-level block that retrying can never clear,
  // so ask the Permissions API whether a retry is even worthwhile.
  useEffect(() => {
    if (status !== 'denied') return
    let cancelled = false
    setCameraPermission('prompt')

    let query: Promise<PermissionStatus> | null = null
    try {
      if (typeof navigator.permissions?.query === 'function') {
        query = navigator.permissions.query({ name: 'camera' as PermissionName })
      }
    } catch {
      query = null
    }
    if (!query) return

    query
      .then((result) => {
        if (!cancelled) setCameraPermission(result.state)
      })
      .catch(() => {
        if (!cancelled) setCameraPermission('prompt')
      })

    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    if (!locationMenuOpen) return
    locationItemRefs.current[0]?.focus()

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (locationChipRef.current?.contains(target) || locationMenuRef.current?.contains(target)) {
        return
      }
      setLocationMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [locationMenuOpen])

  const handleLocationMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setLocationMenuOpen(false)
      locationChipRef.current?.focus()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    event.preventDefault()
    const items = locationItemRefs.current.filter((item): item is HTMLButtonElement => Boolean(item))
    if (!items.length) return
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    const delta = event.key === 'ArrowDown' ? 1 : -1
    items[(current + delta + items.length) % items.length]?.focus()
  }

  const zoomPresets = zoomRange
    ? [0.5, 1, 2, 3]
        .filter((value) => value >= zoomRange.min - 0.01 && value <= zoomRange.max + 0.01)
        .filter((value, index, all) => all.indexOf(value) === index)
    : []

  const initial = (user?.name?.trim() || user?.email || 'T').slice(0, 1).toUpperCase()
  const locationLabel =
    locationStatus === 'requesting'
      ? 'Locating'
      : locationStatus === 'off' || locationStatus === 'disabled'
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
      {/*
        The viewfinder starts as a small, soft-edged window and pulls open to
        full bleed the moment the stream is ready. Same geometry as the tap
        mapping below, which assumes a full-screen preview once ready.
      */}
      <motion.div
        initial={false}
        animate={
          revealed
            ? {
                width: '100%',
                height: '100%',
                borderRadius: 0,
                boxShadow:
                  '0 0 0 0 rgba(255,255,255,0), 0 24px 50px -20px rgba(0,0,0,0)',
              }
            : {
                width: '54%',
                height: '62%',
                borderRadius: 30,
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.14), 0 24px 50px -20px rgba(0,0,0,0.75)',
              }
        }
        transition={
          reduceMotion
            ? { duration: 0.2, ease: 'easeOut' }
            : { type: 'spring', bounce: 0.06, duration: 0.8 }
        }
        className="absolute inset-0 m-auto overflow-hidden bg-black"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn(
            'absolute inset-0 size-full object-cover',
            'transition-[opacity,filter] duration-700 ease-out',
            facing === 'user' && '-scale-x-100',
            status === 'ready' ? 'opacity-100' : 'opacity-0',
            revealed ? 'blur-0' : 'blur-[14px]',
          )}
        />

        {stillUrl && (
          <motion.img
            src={stillUrl}
            alt=""
            aria-hidden
            initial={false}
            animate={{
              opacity: revealed ? 0 : 1,
              filter: revealed ? 'blur(0px)' : 'blur(4px)',
            }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 size-full object-cover"
          />
        )}

        <AnimatePresence>
          {!revealed && (
            <motion.span
              key="intro-mark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none absolute inset-0 grid place-items-center"
            >
              <Logo className="size-8 animate-breathe text-white/40" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* One brand pulse at the moment the window locks to full screen. */}
        <motion.span
          aria-hidden
          initial={false}
          animate={revealed ? { opacity: [0, 0.9, 0] } : { opacity: 0 }}
          transition={{ duration: 0.9, times: [0, 0.35, 1], ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--hud) 65%, transparent)' }}
        />
      </motion.div>

      <div
        onClick={handlePreviewTap}
        className="absolute inset-0"
        style={{ touchAction: 'pan-y' }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/65 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/80 to-transparent" />

      <AnimatePresence>
        {!revealed && !hasRevealed.current && status !== 'denied' && status !== 'error' && (
          <motion.div
            key="intro-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0"
          >
            <div
              className="absolute inset-x-0 flex flex-col items-center gap-1"
              style={{ top: 'calc(50% + 32%)' }}
            >
              <p className="label-caps text-white/50">Pulling focus</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="pointer-events-auto inline-flex min-h-10 items-center gap-1.5 text-sm text-white/55"
              >
                <ImageIcon className="size-3.5" /> Choose from gallery
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {grid && status === 'ready' && (
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 drop-shadow-[0_0_1px_rgba(0,0,0,0.7)]">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="border border-white/30" />
          ))}
        </div>
      )}

      {/* The only viewfinder guide: a hairline HUD ring that breathes. */}
      {revealed && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto size-[46px] rounded-full"
          style={{ boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--hud) 55%, transparent)' }}
          initial={false}
          animate={
            reduceMotion
              ? { opacity: 0.55 }
              : { opacity: [0.4, 0.75, 0.4], scale: [0.98, 1.03, 0.98] }
          }
          transition={
            reduceMotion ? { duration: 0.3 } : { duration: 4.4, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          <span className="absolute inset-0 m-auto size-[3px] rounded-full bg-white/75" />
        </motion.div>
      )}

      <AnimatePresence>
        {focusPoint && (
          <motion.span
            key={focusPoint.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.5 }}
            animate={
              reduceMotion
                ? { opacity: [0, 1, 1, 0] }
                : { opacity: [0, 1, 1, 0], scale: [1.5, 1, 1, 0.95] }
            }
            transition={{ duration: 1.1, times: [0, 0.15, 0.7, 1] }}
            onAnimationComplete={() => setFocusPoint(null)}
            className="pointer-events-none absolute size-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hud/90"
            style={{ left: `${(focusPoint?.x ?? 0) * 100}%`, top: `${(focusPoint?.y ?? 0) * 100}%` }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: reduceMotion ? 0.4 : 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 bg-white"
          />
        )}
      </AnimatePresence>

      <header
        className={cn(
          'absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 safe-top',
          'transition-opacity duration-300 delay-100',
          revealed ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
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
              aria-pressed={torch}
              className={cn(
                'grid size-11 place-items-center rounded-full transition-colors active:bg-white/15',
                torch ? 'text-hud' : 'text-white',
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
            aria-pressed={grid}
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

      <footer
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col items-center gap-6 px-6',
          'transition-opacity duration-300 delay-100',
          revealed ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="relative">
          <button
            ref={locationChipRef}
            type="button"
            onClick={handleLocationChip}
            aria-haspopup={locationStatus === 'ready' ? 'menu' : undefined}
            aria-expanded={locationStatus === 'ready' ? locationMenuOpen : undefined}
            aria-controls={locationStatus === 'ready' ? locationMenuId : undefined}
            className="glass-dark flex min-h-11 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-white/95 transition-transform duration-150 ease-out active:scale-[0.98]"
            style={cameraChromeStyle}
          >
            {locationStatus === 'requesting' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : location ? (
              <MapPin className="size-4 text-hud" />
            ) : (
              <MapPinOff className="size-4 text-white/85" />
            )}
            {locationLabel}
          </button>

          <AnimatePresence>
            {locationMenuOpen && (
              <motion.div
                ref={locationMenuRef}
                id={locationMenuId}
                role="menu"
                aria-label="Location options"
                onKeyDown={handleLocationMenuKeyDown}
                initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
                className="glass-dark absolute bottom-full left-0 z-20 mb-2 flex flex-col overflow-hidden rounded-2xl text-left text-sm"
                style={cameraChromeStyle}
              >
                <button
                  ref={(element) => {
                    locationItemRefs.current[0] = element
                  }}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setLocationMenuOpen(false)
                    haptic('light', hapticsEnabled)
                    onRequestLocation()
                  }}
                  className="flex min-h-11 items-center gap-2 px-4 text-white/90 transition-colors active:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70"
                >
                  <RefreshCw className="size-4" />
                  Refresh location
                </button>
                <button
                  ref={(element) => {
                    locationItemRefs.current[1] = element
                  }}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setLocationMenuOpen(false)
                    haptic('light', hapticsEnabled)
                    onClearLocation()
                  }}
                  className="flex min-h-11 items-center gap-2 border-t border-white/10 px-4 text-white/90 transition-colors active:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70"
                >
                  <MapPinOff className="size-4 text-hud" />
                  Turn off location
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
                      transition={
                        reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.4 }
                      }
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
            whileTap={reduceMotion || capturing ? undefined : { scale: 0.92 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
            disabled={status !== 'ready' || capturing}
            aria-busy={capturing}
            aria-label="Take a photo"
            className={cn(
              'grid size-20 place-items-center rounded-full border-[3px] border-white/90',
              capturing ? 'opacity-60' : 'disabled:opacity-40',
            )}
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
        {(status === 'denied' || status === 'error') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/85 px-8 text-center backdrop-blur-md"
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-white/10">
              {status === 'denied' ? (
                <ShieldAlert className="size-6 text-hud" />
              ) : (
                <CameraIcon className="size-6 text-white/85" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="display text-2xl text-white">
                {status === 'denied' ? 'Camera access is off' : 'The camera did not start'}
              </h2>
              <p role="status" className="mx-auto max-w-xs text-sm leading-relaxed text-white/85">
                {status === 'denied'
                  ? cameraPermission === 'denied'
                    ? 'Camera is blocked for this site — allow it in your browser’s address-bar settings, then reload.'
                    : 'Nekibuki needs the camera to look at the place in front of you. You can also pick a photo from your gallery.'
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
              {status === 'denied' && cameraPermission === 'denied' ? (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm text-white/85"
                >
                  <RefreshCw className="size-3.5" /> Reload
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRestartToken((value) => value + 1)}
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm text-white/85"
                >
                  <RefreshCw className="size-3.5" /> Retry camera
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
