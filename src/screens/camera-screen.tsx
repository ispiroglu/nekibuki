import type { GeoPoint } from '@shared/types'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Camera as CameraIcon,
  ChevronDown,
  Clock,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MapPinOff,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  SwitchCamera,
} from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Logo } from '@/components/brand/logo'
import { formatZoom, ViewfinderSettings } from '@/components/capture/viewfinder-settings'
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
const cameraChromeStyle = { background: 'rgba(14, 14, 13, 0.66)' }

/**
 * A dark companion hairline under white chrome. Without it a white edge or a
 * HUD mark dissolves into a bright sky; the report's photo markers use the same
 * separation treatment.
 */
const hudEdge = 'ring-1 ring-black/35'

const captureFailedMessage = "Couldn't grab that frame — try again."

/** Long enough to be deliberate, short enough not to feel stuck. */
const longPressMs = 420

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
  const settingsTriggerRef = useRef<HTMLButtonElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const settingsPanelId = useId()
  const statusDialogRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<number | null>(null)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const suppressTap = useRef(false)
  const zoomNoticeTimer = useRef<number | null>(null)
  const settingsHintSeen = useRef(false)
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showSettingsHint, setShowSettingsHint] = useState(false)
  const [zoomNotice, setZoomNotice] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
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

  const announceZoom = useCallback(() => {
    if (zoomNoticeTimer.current) window.clearTimeout(zoomNoticeTimer.current)
    setZoomNotice(Date.now())
    zoomNoticeTimer.current = window.setTimeout(() => setZoomNotice(0), 1500)
  }, [])

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const closeSettings = useCallback((restoreFocus = false) => {
    setSettingsOpen(false)
    if (restoreFocus) {
      window.requestAnimationFrame(() => settingsTriggerRef.current?.focus())
    }
  }, [])

  const openSettings = useCallback(
    (source: 'pointer' | 'key') => {
      setLocationMenuOpen(false)
      setShowSettingsHint(false)
      setSettingsOpen(true)
      if (source === 'pointer') haptic('light', hapticsEnabled)
    },
    [hapticsEnabled],
  )

  useEffect(() => {
    if (!settingsOpen) return
    const frame = window.requestAnimationFrame(() => settingsPanelRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [settingsOpen])

  useEffect(() => {
    if (!settingsOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (settingsPanelRef.current?.contains(target)) return
      if (settingsTriggerRef.current?.contains(target)) return
      closeSettings()
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [closeSettings, settingsOpen])

  useEffect(() => {
    if (!settingsOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeSettings(true)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [closeSettings, settingsOpen])

  // Viewfinder settings only make sense over a live frame; leaving the camera or
  // losing the stream closes the shelf instead of leaving a floating menu behind.
  useEffect(() => {
    if (active && status === 'ready') return
    setSettingsOpen(false)
    setShowSettingsHint(false)
    setHelpOpen(false)
    clearLongPress()
    pressOrigin.current = null
  }, [active, status, clearLongPress])

  // One quiet instruction per session, since the controls it hides have no
  // visible trigger of their own.
  useEffect(() => {
    if (!revealed || settingsHintSeen.current) return
    settingsHintSeen.current = true
    setShowSettingsHint(true)
    const timer = window.setTimeout(() => setShowSettingsHint(false), 5200)
    return () => window.clearTimeout(timer)
  }, [revealed])

  useEffect(() => {
    if (status !== 'denied') setHelpOpen(false)
  }, [status])

  // The permission surface replaces the camera, so hand it focus rather than
  // leaving a keyboard user on controls that are now hidden.
  useEffect(() => {
    if (status !== 'denied' && status !== 'error') return
    const frame = window.requestAnimationFrame(() => statusDialogRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [status])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
      if (zoomNoticeTimer.current) window.clearTimeout(zoomNoticeTimer.current)
    }
  }, [])

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
      // A long press opens the settings shelf; the click that follows it must not
      // also move focus.
      if (suppressTap.current) {
        suppressTap.current = false
        return
      }
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

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!revealed) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    suppressTap.current = false
    clearLongPress()
    // The tap that dismisses the shelf should not immediately reopen it.
    if (settingsOpen) return
    pressOrigin.current = { x: event.clientX, y: event.clientY }
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null
      pressOrigin.current = null
      suppressTap.current = true
      setFocusPoint(null)
      openSettings('pointer')
    }, longPressMs)
  }

  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = pressOrigin.current
    if (!origin) return
    // A horizontal swipe belongs to the deck, not to the settings shelf.
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10) {
      clearLongPress()
      pressOrigin.current = null
    }
  }

  const handlePreviewPointerEnd = () => {
    clearLongPress()
    pressOrigin.current = null
  }

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
      setSettingsOpen(false)
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
        onPointerDown={handlePreviewPointerDown}
        onPointerMove={handlePreviewPointerMove}
        onPointerUp={handlePreviewPointerEnd}
        onPointerCancel={handlePreviewPointerEnd}
        onContextMenu={(event) => event.preventDefault()}
        className="absolute inset-0"
        style={{ touchAction: 'pan-y' }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/65 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/80 to-transparent [@media(max-height:560px)]:h-40" />

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
                className="pointer-events-auto inline-flex min-h-10 items-center gap-1.5 text-sm text-white/55 [text-shadow:0_1px_2px_rgb(0_0_0_/_0.7)]"
              >
                <ImageIcon className="size-3.5" /> Choose from gallery
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {grid && status === 'ready' && (
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="border border-white/35" />
          ))}
        </div>
      )}

      {/* The only viewfinder guide: a hairline HUD ring that breathes. It gives
          way to the zoom readout for a moment, then returns. */}
      {revealed && !zoomNotice && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto size-[46px] rounded-full [@media(max-height:420px)]:hidden"
          style={{
            boxShadow:
              'inset 0 0 0 1px color-mix(in srgb, var(--hud) 70%, transparent), 0 0 0 2px rgb(0 0 0 / 0.3)',
          }}
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
          <span className="absolute inset-0 m-auto size-[3px] rounded-full bg-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]" />
        </motion.div>
      )}

      <AnimatePresence>
        {zoomNotice ? (
          <motion.div
            key={zoomNotice}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 grid place-items-center [@media(max-height:420px)]:hidden"
          >
            <span
              className={cn(
                'glass-dark inline-flex min-h-11 min-w-14 items-center justify-center rounded-full px-3 text-sm font-semibold tabular-nums text-white',
                hudEdge,
              )}
              style={cameraChromeStyle}
            >
              {formatZoom(zoom)}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span className="sr-only" role="status" aria-live="polite">
        {zoomNotice ? `Zoom ${formatZoom(zoom)}` : ''}
      </span>

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
            className="pointer-events-none absolute size-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hud/90 ring-2 ring-black/20"
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

      {/*
        Chrome is one flex column so a safe area can never push a control into
        another one: header (identity, location, places), open viewfinder, then
        the capture row clear of the deck.
      */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        <header
          inert={!revealed}
          className={cn(
            'grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 safe-top',
            'transition-opacity duration-300 delay-100',
            revealed ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Your profile"
            className={cn(
              'glass-dark pointer-events-auto rounded-full p-0.5 transition-transform duration-150 ease-out active:scale-95',
              hudEdge,
            )}
            style={cameraChromeStyle}
          >
            <Avatar className="size-10">
              <AvatarFallback className="text-base leading-none">{initial}</AvatarFallback>
            </Avatar>
          </button>

          <div className="pointer-events-auto relative flex justify-center">
            <button
              ref={locationChipRef}
              type="button"
              onClick={handleLocationChip}
              aria-haspopup={locationStatus === 'ready' ? 'menu' : undefined}
              aria-expanded={locationStatus === 'ready' ? locationMenuOpen : undefined}
              aria-controls={locationStatus === 'ready' ? locationMenuId : undefined}
              className={cn(
                'glass-dark flex min-h-11 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-white/95 transition-transform duration-150 ease-out active:scale-[0.98]',
                hudEdge,
              )}
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
                  initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
                  className={cn(
                    'glass-dark absolute left-1/2 top-full z-20 mt-2 flex -translate-x-1/2 flex-col overflow-hidden rounded-2xl text-left text-sm',
                    hudEdge,
                  )}
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
                    className="flex min-h-11 items-center gap-2 whitespace-nowrap px-4 text-white/90 transition-colors active:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70"
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
                    className="flex min-h-11 items-center gap-2 whitespace-nowrap border-t border-white/10 px-4 text-white/90 transition-colors active:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70"
                  >
                    <MapPinOff className="size-4 text-hud" />
                    Turn off location
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={onOpenHistory}
            aria-label="Places you looked at"
            className={cn(
              'glass-dark pointer-events-auto grid size-11 place-items-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95',
              hudEdge,
            )}
            style={cameraChromeStyle}
          >
            <Clock className="size-5" />
          </button>
        </header>

        <div className="group relative min-h-0 flex-1">
          {/* Keyboard path to the shelf the long press opens. Invisible at rest,
              so the viewfinder still carries only six controls. */}
          <button
            ref={settingsTriggerRef}
            type="button"
            aria-haspopup="dialog"
            disabled={status !== 'ready'}
            aria-expanded={settingsOpen}
            aria-controls={settingsOpen ? settingsPanelId : undefined}
            onClick={() => {
              if (settingsOpen) closeSettings(true)
              else openSettings('key')
            }}
            className={cn(
              'sr-only rounded-full text-xs font-medium text-white',
              'focus:not-sr-only focus:pointer-events-auto focus:absolute focus:left-1/2 focus:top-2 focus:z-20 focus:inline-flex focus:min-h-11 focus:-translate-x-1/2 focus:items-center focus:gap-1.5 focus:px-4',
              'glass-dark',
              hudEdge,
            )}
            style={cameraChromeStyle}
          >
            <SlidersHorizontal className="size-4" />
            Viewfinder settings
          </button>

          {/*
            The first-run copy has to share the top of the frame with the
            global swipe pill (safe-area top + 4.75rem, ~2.2rem tall). This
            column starts below the header, so 4.75rem here lands the hint
            just under that pill instead of covering it, and pointer-events
            stay off so the long-press target under it is never blocked. The
            settings shelf keeps its own top offset.
          */}
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 flex justify-center px-2',
              settingsOpen ? 'top-2' : 'top-[4.75rem]',
            )}
          >
            {settingsOpen ? (
              <ViewfinderSettings
                panelRef={settingsPanelRef}
                panelId={settingsPanelId}
                torchAvailable={torchAvailable}
                torch={torch}
                onToggleTorch={toggleTorch}
                grid={grid}
                onToggleGrid={() => {
                  setGrid((value) => !value)
                  haptic('light', hapticsEnabled)
                }}
                zoomPresets={zoomPresets}
                activeZoom={zoom}
                zoomStep={zoomRange?.step ?? 0.1}
                onSelectZoom={(preset) => {
                  applyZoom(preset)
                  haptic('light', hapticsEnabled)
                  announceZoom()
                }}
              />
            ) : (
              <AnimatePresence>
                {showSettingsHint && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3 }}
                    className="pointer-events-none inline-flex items-center gap-1.5 text-xs font-medium text-white/80 [text-shadow:0_1px_3px_rgb(0_0_0_/_0.9)] group-focus-within:opacity-0"
                  >
                    <SlidersHorizontal className="size-3.5" />
                    Hold for settings
                  </motion.p>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        <footer
          inert={!revealed}
          className={cn(
            'flex flex-col items-center px-5',
            'transition-opacity duration-300 delay-100',
            revealed ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex w-full max-w-sm items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Choose from gallery"
              className={cn(
                'glass-dark pointer-events-auto grid size-12 place-items-center overflow-hidden rounded-xl text-white transition-transform duration-150 ease-out active:scale-95',
                hudEdge,
              )}
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
                'pointer-events-auto grid size-20 place-items-center rounded-full border-[3px] border-white/90 ring-2 ring-black/25',
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
              className={cn(
                'glass-dark pointer-events-auto grid size-12 place-items-center rounded-xl text-white transition-transform duration-150 ease-out active:scale-95',
                hudEdge,
              )}
              style={cameraChromeStyle}
            >
              <SwitchCamera className="size-5" />
            </button>
          </div>
        </footer>
      </div>

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
            ref={statusDialogRef}
            tabIndex={-1}
            role="alertdialog"
            aria-labelledby="camera-status-title"
            aria-describedby="camera-status-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-black/85 px-6 py-10 text-center outline-none backdrop-blur-md safe-top safe-bottom"
          >
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              {status === 'denied' ? (
                <ShieldAlert className="size-6 text-hud" />
              ) : (
                <CameraIcon className="size-6 text-white/85" />
              )}
            </div>

            <div className="space-y-2">
              <h2 id="camera-status-title" className="display text-2xl text-white">
                {status === 'denied' ? 'Camera access is off' : 'The camera did not start'}
              </h2>
              <p
                id="camera-status-body"
                className="mx-auto max-w-xs text-base leading-relaxed text-white/85"
              >
                {status === 'denied'
                  ? 'Nekibuki needs the camera to look at the place in front of you.'
                  : 'Something interrupted the camera before it could start.'}
              </p>
            </div>

            <div className="flex w-full max-w-xs flex-col items-stretch gap-1">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="size-4" />
                Choose from gallery
              </Button>

              {status === 'denied' ? (
                <>
                  <button
                    type="button"
                    aria-expanded={helpOpen}
                    aria-controls="camera-help"
                    onClick={() => setHelpOpen((value) => !value)}
                    className="inline-flex min-h-11 items-center justify-center gap-1 text-sm text-white/85 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                  >
                    How to enable the camera
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        'size-4 transition-transform duration-200',
                        helpOpen && 'rotate-180',
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {helpOpen && (
                      <motion.div
                        id="camera-help"
                        initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                        className="rounded-2xl bg-white/10 px-4 py-3 text-left text-sm leading-relaxed text-white/85"
                      >
                        {cameraPermission === 'denied'
                          ? 'Open your browser’s site settings from the camera icon beside the address, set Camera to Allow, then '
                          : 'Allow camera access when your browser asks. If no prompt appears, check the camera icon beside the address, then '}
                        <button
                          type="button"
                          onClick={() => {
                            if (cameraPermission === 'denied') {
                              window.location.reload()
                            } else {
                              setRestartToken((value) => value + 1)
                            }
                          }}
                          className="font-medium text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                        >
                          {cameraPermission === 'denied' ? 'reload the page' : 'try again'}
                        </button>
                        .
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setRestartToken((value) => value + 1)}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm text-white/85 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
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
