import type { GeoPoint } from '@shared/types'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import {
  Bookmark,
  Camera as CameraIcon,
  ChevronDown,
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
import { Button } from '@/components/ui/button'
import { captureVideoFrame, captureVideoStill, coverSourceRect } from '@/lib/image'
import { warmImageWorker } from '@/lib/image-worker-client'
import { haptic } from '@/lib/haptics'
import { cn, clamp } from '@/lib/utils'
import { useAppStore } from '@/store/app'
import { usePreferences } from '@/store/preferences'
import { useT } from '@/lib/ui-language'

type CameraStatus = 'idle' | 'starting' | 'ready' | 'denied' | 'error'

/**
 * The viewfinder opens in two beats. `warming` is the small window waiting
 * for the stream, `opening` is the pull to the edges of the frame, and
 * `locked` is the settled picture the chrome is allowed to sit on.
 */
type ViewPhase = 'warming' | 'opening' | 'locked'

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
 * not draw the focus reticle.
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

/**
 * A dark companion hairline under white chrome. Without it a white edge or a
 * HUD mark dissolves into a bright sky; the report's photo markers use the same
 * separation treatment.
 */
const hudEdge = 'ring-1 ring-black/35'

/**
 * A mark drawn over a photograph needs an edge of its own, or it dissolves
 * into a blown-out sky. The chrome gets that edge from a ring; a stroked mark
 * gets it from a hairline traced along the stroke, which is the same
 * separation the report's photo markers use.
 */
const markSeparation = 'drop-shadow(0 0 1px rgb(0 0 0 / 0.7)) drop-shadow(0 1px 2px rgb(0 0 0 / 0.4))'


/** Long enough to be deliberate, short enough not to feel stuck. */
const longPressMs = 420

/**
 * The four corners of a mark: thin HUD-mint arms with square ends. The same
 * arms draw the framing guide and the focus reticle, so the viewfinder speaks
 * one shape language; the separation that keeps them readable over a bright
 * sky is traced along them where they are drawn.
 */
const guideCorners = [
  { position: 'left-0 top-0', edges: 'border-l-[2px] border-t-[2px]' },
  { position: 'right-0 top-0', edges: 'border-r-[2px] border-t-[2px]' },
  { position: 'bottom-0 left-0', edges: 'border-b-[2px] border-l-[2px]' },
  { position: 'bottom-0 right-0', edges: 'border-b-[2px] border-r-[2px]' },
]

/**
 * The viewfinder is a window that opens. The picture stays at full size under
 * a black mat; the hole in the mat is the aperture, and it grows to the edges
 * of the frame once the stream is ready. Because the picture never changes
 * size, the frame opens without the picture jumping to a new framing.
 *
 * Everything is one scale of that hole, so the aperture is described by
 * numbers rather than by animating layout.
 */
const apertureArrival = 0.46 // the scale the window arrives at
const apertureRest = 0.54 // the scale it rests at while the stream warms
const apertureOpen = 1.87 // the scale that fills the frame
const apertureRadius = 56 // local px; 56 × 0.54 ≈ 30px on screen
const apertureEdge = 0.16 // the hairline around the open window

export function CameraScreen({
  active,
  onCapture,
  location,
  locationStatus,
  onRequestLocation,
  onClearLocation,
  onOpenHistory,
}: {
  active: boolean
  onCapture: (blob: Blob) => void
  location: GeoPoint | null
  locationStatus: 'idle' | 'requesting' | 'ready' | 'off' | 'disabled'
  onRequestLocation: () => void
  onClearLocation: () => void
  /**
   * The camera no longer renders a second profile control — "You" lives in the
   * bottom nav only, so one destination has one control. The prop stays in the
   * signature until the shell stops passing it.
   */
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
  const reduceMotion = useReducedMotion()
  const hapticsEnabled = usePreferences((state) => state.haptics)
  const t = useT()

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [restartToken, setRestartToken] = useState(0)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [zoomRange, setZoomRange] = useState<ZoomCapability | null>(null)
  const [zoom, setZoom] = useState(1)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torch, setTorch] = useState(false)
  const [grid, setGrid] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const setViewfinderSettingsOpen = useAppStore((state) => state.setViewfinderSettingsOpen)
  // The shot the guide proposed. While it waits, the camera says what it is
  // looking for instead of its own generic line.
  const pendingStep = useAppStore((state) => state.pendingStep)
  const setPendingStep = useAppStore((state) => state.setPendingStep)
  // What the camera is being asked to find, said once for a screen reader.
  const [announcement, setAnnouncement] = useState('')
  const [zoomNotice, setZoomNotice] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
  const [flash, setFlash] = useState(false)
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; id: number } | null>(null)
  const [stillUrl, setStillUrl] = useState<string | null>(null)
  const [locationMenuOpen, setLocationMenuOpen] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('prompt')
  // Where the viewfinder is in its two-beat opening. The chrome waits for
  // `locked`: a control that fades in over a moving edge is a control the
  // traveller cannot aim at.
  const [phase, setPhase] = useState<ViewPhase>('warming')
  // The opening is a single number so the pull can be interrupted and resumed
  // without the window ever being laid out twice.
  const openProgress = useMotionValue(0)
  const openControls = useRef<ReturnType<typeof animate> | null>(null)
  // The hint is a first-open affordance: switching lenses reuses the pull but
  // should not repeat the copy.
  const hasRevealed = useRef(false)
  // The brand pulse plays once, the first time the frame locks.
  const [pulseId, setPulseId] = useState(0)

  // The mat's hole: the window grows in two steps, a small arrival and then
  // the pull to the edges of the frame.
  const apertureScale = useTransform(openProgress, (progress) =>
    progress <= 0.5
      ? apertureArrival + (apertureRest - apertureArrival) * (progress / 0.5)
      : apertureRest + (apertureOpen - apertureRest) * ((progress - 0.5) / 0.5),
  )
  // The corner radius unwinds to nothing as the window reaches the edges.
  const apertureCorner = useTransform(openProgress, (progress) =>
    progress <= 0.5
      ? `${apertureRadius}px`
      : `${apertureRadius * (1 - (progress - 0.5) / 0.5)}px`,
  )
  // The hairline fades in with the arrival and dissolves with the pull, so the
  // frame ends on the picture rather than on a drawn edge.
  const apertureShadow = useTransform(openProgress, (progress) => {
    const arrival = clamp(progress / 0.25, 0, 1)
    const pull = progress <= 0.5 ? 0 : (progress - 0.5) / 0.5
    const alpha = apertureEdge * arrival * (1 - pull)
    return `0 0 0 3000px #000, 0 0 0 2px rgb(255 255 255 / ${alpha.toFixed(3)})`
  })
  // The picture comes up with the window instead of appearing all at once.
  const sceneOpacity = useTransform(openProgress, (progress) => clamp(progress / 0.25, 0, 1))

  useEffect(() => {
    const stop = () => {
      openControls.current?.stop()
      openControls.current = null
    }

    if (!active) {
      stop()
      setPhase('warming')
      openProgress.set(0)
      hasRevealed.current = false
      return
    }

    if (status !== 'ready') {
      // Beat one: the lens opens on a small window while the stream warms.
      stop()
      setPhase('warming')
      const controls = animate(
        openProgress,
        0.5,
        reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
      )
      openControls.current = controls
      return () => controls.stop()
    }

    // Beat two: the window pulls open to the edges of the frame and settles.
    // The beat lets the first-run copy leave the picture before anything
    // moves under it.
    stop()
    const timer = window.setTimeout(() => {
      setPhase('opening')
      const controls = animate(
        openProgress,
        1,
        reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.6 },
      )
      openControls.current = controls
      void controls.then(() => {
        if (openControls.current !== controls) return
        setPhase('locked')
        if (!hasRevealed.current) {
          hasRevealed.current = true
          setPulseId((value) => value + 1)
        }
      })
    }, reduceMotion ? 0 : 280)
    return () => window.clearTimeout(timer)
  }, [active, status, reduceMotion, openProgress])

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
            // 1080p is the point where the capture stops getting sharper: the
            // photo is scaled to 1800px for the model and the hero renders it
            // at 1600px. A 4K stream costs decode bandwidth and battery on a
            // mid-range phone and buys nothing the user can see.
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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

        // The photo pipeline lives in a worker. Start it while the viewfinder
        // is still opening, so the shutter press does not pay for it.
        warmImageWorker()

        // Keep the last painted frame so leaving and re-entering the camera never
        // drops back to a black overlay while the new stream warms up.
        const video = videoRef.current
        const snapshot = () => {
          if (cancelled || !video) return
          void captureVideoStill(video).then((still) => {
            if (cancelled || !still) return
            setStillUrl(still)
          })
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
    setViewfinderSettingsOpen(false)
    if (restoreFocus) {
      window.requestAnimationFrame(() => settingsTriggerRef.current?.focus())
    }
  }, [])

  const openSettings = useCallback(
    (source: 'pointer' | 'key') => {
      setLocationMenuOpen(false)
      setSettingsOpen(true)
      setViewfinderSettingsOpen(true)
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
    // The listener only watches; it never cancels the event, so the browser
    // is free to keep scrolling while it runs.
    document.addEventListener('pointerdown', closeOnOutsidePointer, { passive: true })
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
    setViewfinderSettingsOpen(false)
    setHelpOpen(false)
    clearLongPress()
    pressOrigin.current = null
  }, [active, status, clearLongPress])

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

  /**
   * The suggested step has been answered, so it must not answer the next
   * photo as well. The capture reads it first and hands it to the analysis,
   * and only then does it leave the store.
   */
  const consumePendingStep = useCallback(() => {
    if (useAppStore.getState().pendingStep) setPendingStep(null)
  }, [setPendingStep])

  const dismissPendingStep = useCallback(() => {
    setPendingStep(null)
    haptic('light', hapticsEnabled)
  }, [hapticsEnabled, setPendingStep])

  /**
   * A live region only speaks when its text changes, so the step is spoken a
   * frame after the camera mounts with it. Without the delay the words would
   * be in the region before any screen reader was listening.
   */
  useEffect(() => {
    if (!active || !pendingStep) {
      setAnnouncement('')
      return
    }
    const frame = window.requestAnimationFrame(() => {
      setAnnouncement(t(`Next shot: ${pendingStep.title}. ${pendingStep.instruction}`, `Sıradaki kare: ${pendingStep.title}. ${pendingStep.instruction}`))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [active, pendingStep])

  const handleShutter = useCallback(async () => {
    if (capturingRef.current) return
    const video = videoRef.current
    if (!video || status !== 'ready') return

    capturingRef.current = true
    setCapturing(true)
    try {
      const blob = await captureVideoFrame(video)
      if (!blob) {
        toast.error(t("Couldn't grab that frame — try again.", 'O kare alınamadı — tekrar dene.'))
        return
      }
      haptic('medium', hapticsEnabled)
      setFlash(true)
      window.setTimeout(() => setFlash(false), 190)
      onCapture(blob)
      consumePendingStep()
    } catch {
      toast.error(t("Couldn't grab that frame — try again.", 'O kare alınamadı — tekrar dene.'))
    } finally {
      capturingRef.current = false
      setCapturing(false)
    }
  }, [consumePendingStep, hapticsEnabled, onCapture, status, t])

  const handlePreviewTap = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // The picture has to be settled before a tap can mean anything: the
      // focus reticle is drawn on the frame the traveller actually sees.
      if (phase !== 'locked') return
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
    [facing, hapticsEnabled, phase],
  )

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'locked') return
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
    document.addEventListener('pointerdown', closeOnOutsidePointer, { passive: true })
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

  const locationLabel =
    locationStatus === 'requesting'
      ? t('Locating', 'Konum bulunuyor')
      : locationStatus === 'off' || locationStatus === 'disabled'
        ? t('Location off', 'Konum kapalı')
        : locationStatus === 'ready' && location
          ? t('Location on', 'Konum açık')
          : t('Add location', 'Konum ekle')

  const handleLocationChip = () => {
    if (locationStatus === 'requesting') return
    haptic('light', hapticsEnabled)
    if (locationStatus === 'ready') {
      setSettingsOpen(false)
      setViewfinderSettingsOpen(false)
      setLocationMenuOpen((value) => !value)
      return
    }
    setLocationMenuOpen(false)
    onRequestLocation()
  }

  return (
    <section className="relative h-full w-full overflow-hidden bg-black text-white">
      {/*
        The deck keeps every panel mounted, so the panel that owns the route
        must be the only heading on it. The camera has no visible title, so it
        carries a visually hidden one while it is the active panel.
      */}
      {active && <h1 className="sr-only">{t('Camera', 'Kamera')}</h1>}

      {/*
        The step arrives without anyone touching the camera, so it is
        announced rather than waited for: a screen reader hears what the
        camera is being asked to find.
      */}
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>

      {/*
        The viewfinder is a window that opens. The picture lies at full size
        under a black mat; the hole in the mat is the aperture, and it grows to
        the edges of the frame once the stream is ready. The picture itself
        never changes size, so the frame opens without the picture jumping to
        a different framing — the same geometry the tap mapping below assumes.
      */}
      <motion.div className="absolute inset-0" style={{ opacity: sceneOpacity }}>
        <motion.video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          initial={false}
          animate={{ opacity: phase === 'warming' ? 0 : 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut' }}
          className={cn(
            'absolute inset-0 size-full object-cover',
            facing === 'user' && '-scale-x-100',
          )}
        />

        {/*
          The last painted frame is held until the live picture has taken
          over, so leaving and re-entering the camera never drops back to a
          black frame while the new stream warms.
        */}
        {stillUrl && (
          <motion.img
            src={stillUrl}
            alt=""
            aria-hidden
            initial={false}
            animate={{ opacity: phase === 'warming' ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute inset-0 size-full object-cover',
              'transition-[filter] duration-300 ease-out',
              phase === 'warming' && 'blur-[4px]',
            )}
          />
        )}

        {/*
          The brand mark belongs to the opening beat. It leaves the picture
          before the window starts to move, and it does not come back when the
          traveller switches lenses.
        */}
        <AnimatePresence>
          {status !== 'ready' && !hasRevealed.current && (
            <motion.span
              key="intro-mark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-0 grid place-items-center"
            >
              <Logo className="size-8 animate-breathe text-white/40" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/*
        The mat. Its hole is the window the traveller looks through, and the
        hairline around that hole is the only edge the frame has while it is
        still small. The hairline dissolves with the pull, so the opening ends
        on the picture rather than on a drawn line.
      */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-[23%] top-[23%] h-[54%] w-[54%]"
        style={{ scale: apertureScale, borderRadius: apertureCorner, boxShadow: apertureShadow }}
      />

      {/* One brand pulse, the first time the window locks to the full frame. */}
      {pulseId > 0 && (
        <motion.span
          key={pulseId}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.9, times: [0, 0.35, 1], ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--hud) 65%, transparent)' }}
        />
      )}

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

      {/*
        The first-run copy belongs to the opening beat: it leaves the picture
        as soon as the stream is live, so nothing is written over a frame that
        is on the move. It is a first-open whisper, so switching lenses reuses
        the pull without repeating it.
      */}
      <AnimatePresence>
        {status !== 'ready' &&
          !hasRevealed.current &&
          status !== 'denied' &&
          status !== 'error' && (
            <motion.div
              key="intro-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-0"
            >
              <div
                className="absolute inset-x-0 flex flex-col items-center gap-1"
                style={{ top: 'calc(50% + 32%)' }}
              >
                <p className="label-caps text-white/50">{t('Pulling focus', 'Odaklanıyor')}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 text-sm text-white/55 [text-shadow:0_1px_2px_rgb(0_0_0_/_0.7)]"
                >
                  <ImageIcon className="size-3.5" /> {t('Choose from gallery', 'Galeriden seç')}
                </button>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* The grid belongs to the settled picture; it never rides a moving edge. */}
      {grid && phase === 'locked' && (
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="border border-white/35" />
          ))}
        </div>
      )}

      {/*
        There is no centre mark here, and that is the point: the framing guide
        below already answers "where does the photo sit", and the focus
        reticle answers "what am I pointing at". A third mark in the middle of
        the frame repeated the first one, breathed forever, and read as a
        smudge on the lens.
      */}
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
                'glass-dark-live inline-flex min-h-[44px] min-w-[56px] items-center justify-center rounded-full px-[12px] text-sm font-semibold tabular-nums text-white',
                hudEdge,
              )}
            >
              {formatZoom(zoom)}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span className="sr-only" role="status" aria-live="polite">
        {zoomNotice ? t(`Zoom ${formatZoom(zoom)}`, `Yakınlaştırma ${formatZoom(zoom)}`) : ''}
      </span>

      {/*
        The focus reticle speaks the same language as the framing guide: the
        same corner arms, the same 2px HUD-mint stroke, the same hairline
        separation, so a mark that appears over the photograph looks like it
        belongs to the frame rather than to the interface. The pop grows from
        the tapped point, not from the corner of the mark.
      */}
      {focusPoint && (
        <span
          key={focusPoint.id}
          className="pointer-events-none absolute size-[72px] -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${(focusPoint?.x ?? 0) * 100}%`,
            top: `${(focusPoint?.y ?? 0) * 100}%`,
            filter: markSeparation,
          }}
        >
          <motion.span
            aria-hidden
            className="absolute inset-0 block"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.5 }}
            animate={
              reduceMotion
                ? { opacity: [0, 1, 1, 0] }
                : { opacity: [0, 1, 1, 0], scale: [1.5, 1, 1, 0.95] }
            }
            transition={{ duration: 1.1, times: [0, 0.15, 0.7, 1] }}
            onAnimationComplete={() => setFocusPoint(null)}
          >
            {guideCorners.map((corner) => (
              <span
                key={corner.position}
                className={cn('absolute size-[18px] border-hud', corner.position, corner.edges)}
              />
            ))}
          </motion.span>
        </span>
      )}

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
        the capture row clear of the deck. It arrives only once the frame is
        locked — a control that fades in over a moving edge cannot be aimed at.
      */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        <header
          inert={phase !== 'locked'}
          className={cn(
            'flex flex-wrap items-start gap-[8px] px-[12px] safe-top',
            'transition-opacity duration-300 delay-100',
            phase === 'locked' ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          {/*
            The shelf the long press opens needs a visible trigger: the hint is
            a one-time, five-second whisper and the old control was `sr-only`.
            This is the real button — 44×44, glass, HUD mint — and the long
            press stays as the shortcut.
          */}
          <button
            ref={settingsTriggerRef}
            type="button"
            onClick={(event) => {
              if (settingsOpen) {
                closeSettings(true)
                return
              }
              openSettings(event.detail === 0 ? 'key' : 'pointer')
            }}
            aria-label={t('Viewfinder settings', 'Vizör ayarları')}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-controls={settingsOpen ? settingsPanelId : undefined}
            disabled={status !== 'ready'}
            className={cn(
              'glass-dark-live pointer-events-auto grid size-[44px] shrink-0 place-items-center rounded-full text-hud transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40',
              'aria-expanded:bg-white/15',
              hudEdge,
            )}
          >
            <SlidersHorizontal className="size-[18px]" />
          </button>

          <div className="pointer-events-auto flex min-w-0 flex-1 flex-col items-center gap-[4px]">
            <div className="relative flex w-full min-w-0 justify-center">
              <button
                ref={locationChipRef}
                type="button"
                onClick={handleLocationChip}
                aria-haspopup={locationStatus === 'ready' ? 'menu' : undefined}
                aria-expanded={locationStatus === 'ready' ? locationMenuOpen : undefined}
                aria-controls={locationStatus === 'ready' ? locationMenuId : undefined}
                className={cn(
                  'glass-dark-live flex min-h-[44px] min-w-0 max-w-full items-center gap-[6px] rounded-full px-[12px] py-[6px] text-xs font-medium text-white/95 transition-transform duration-150 ease-out active:scale-[0.98]',
                  hudEdge,
                )}
              >
                {locationStatus === 'requesting' ? (
                  <Loader2 className="size-[16px] shrink-0 animate-spin" />
                ) : location ? (
                  <MapPin className="size-[16px] shrink-0 text-hud" />
                ) : (
                  <MapPinOff className="size-[16px] shrink-0 text-white/85" />
                )}
                <span className="min-w-0 truncate">{locationLabel}</span>
              </button>

              <AnimatePresence>
                {locationMenuOpen && (
                  <motion.div
                    ref={locationMenuRef}
                    id={locationMenuId}
                    role="menu"
                    aria-label={t('Location options', 'Konum seçenekleri')}
                    onKeyDown={handleLocationMenuKeyDown}
                    initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
                    className={cn(
                      'glass-dark-live absolute left-1/2 top-full z-20 mt-2 flex -translate-x-1/2 flex-col overflow-hidden rounded-2xl text-left text-sm',
                      hudEdge,
                    )}
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
                      className="flex min-h-[44px] items-center gap-2 whitespace-nowrap px-[12px] text-white/90 transition-colors active:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70"
                    >
                      <RefreshCw className="size-4" />
                      {t('Refresh location', 'Konumu yenile')}
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
                      className="flex min-h-[44px] items-center gap-2 whitespace-nowrap border-t border-white/10 px-[12px] text-white/90 transition-colors active:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70"
                    >
                      <MapPinOff className="size-4 text-hud" />
                      {t('Turn off location', 'Konumu kapat')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenHistory}
            aria-label={t('Open places', 'Yerleri aç')}
            className={cn(
              'glass-dark-live pointer-events-auto grid size-[44px] shrink-0 place-items-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95',
              hudEdge,
            )}
          >
            <Bookmark className="size-[20px]" />
          </button>

          {/*
            One persistent line under the location chip. The frame used to
            offer nothing but chrome; a traveller needs to know what the
            camera wants before the first shutter press. It carries the same
            scrim as every other string drawn over the photograph. It sits on
            its own full-width row so a 200% root size cannot squeeze it into
            an ellipsis.

            When the guide has proposed a shot, that line becomes the shot: an
            overline names it, the title says what to look for, the
            instruction says how. The generic line leaves rather than competes
            with it.

            The words are the guide's, so they keep the guide's voice: the
            serif the report uses for a step is the serif used here, over the
            live frame. The instruction can be a full sentence, so it is
            clamped to two lines and the title to one: the block keeps a fixed
            height and the header above it never moves. The scrim and the
            hairline are the ones every other string over the photograph uses,
            so the text survives a blown-out sky.
          */}
          <div className="w-full basis-full">
            <AnimatePresence initial={false}>
              {pendingStep ? (
                <motion.div
                  key="pending-step"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                  className={cn(
                    'glass-dark-live pointer-events-auto mx-auto w-full max-w-[420px] rounded-2xl px-[12px] py-[6px]',
                    hudEdge,
                  )}
                >
                  <div className="flex items-start justify-between gap-[8px]">
                    <p className="label-caps min-w-0 flex-1 truncate pt-[14px] text-white/90">
                      {t('Next shot', 'Sıradaki kare')}
                    </p>
                    <button
                      type="button"
                      onClick={dismissPendingStep}
                      className="-mr-[4px] inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-white/25 px-[12px] text-ui text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                    >
                      {t('Not now', 'Şimdi değil')}
                    </button>
                  </div>
                  <p className="display mt-[2px] truncate text-lede text-white">
                    {pendingStep.title}
                  </p>
                  <p className="mt-[2px] line-clamp-2 break-words font-serif text-list leading-[1.5] text-white/90">
                    {pendingStep.instruction}
                  </p>
                </motion.div>
              ) : (
                <motion.p
                  key="point-hint"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                  className="glass-dark-live pointer-events-none mx-auto w-fit max-w-full truncate rounded-full px-[12px] py-[4px] text-xs font-medium text-white"
                >
                  {t('Point at one thing', 'Tek bir şeye tut')}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          {/*
            The framing guide: four thin HUD-mint corner arms at a 4:3 ratio —
            the shape the guide later points at inside the photograph. It is
            the only permanent mark in the picture, so it stays quiet: a
            hairline of separation traces each arm and keeps it readable
            against a blown-out sky. It arrives with the chrome, once the
            frame is locked.
          */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 grid place-items-center px-[16px]',
              'transition-opacity duration-300',
              phase === 'locked' ? 'opacity-100' : 'opacity-0',
            )}
          >
            <div
              className="relative aspect-[4/3] w-[min(78%,260px)]"
              style={{ filter: markSeparation }}
            >
              {guideCorners.map((corner) => (
                <span
                  key={corner.position}
                  className={cn(
                    'absolute size-[26px] border-hud',
                    corner.position,
                    corner.edges,
                  )}
                />
              ))}
            </div>
          </div>

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
            ) : null}
          </div>
        </div>

        <footer
          inert={phase !== 'locked'}
          className={cn(
            'flex flex-col items-center px-[16px]',
            'transition-opacity duration-300 delay-100',
            phase === 'locked' ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        >
          {/*
            The capture row is sized in pixels, not in rem: at 200% text a
            rem-sized shutter becomes a tall oval and the row no longer fits
            a 320px phone. The shutter stays a true circle.
          */}
          <div className="flex w-full max-w-[360px] items-center justify-between gap-[12px]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={t('Choose from gallery', 'Galeriden seç')}
              className={cn(
                'glass-dark-live pointer-events-auto grid size-[48px] shrink-0 place-items-center overflow-hidden rounded-xl text-white transition-transform duration-150 ease-out active:scale-95',
                hudEdge,
              )}
            >
              <ImageIcon className="size-[20px]" />
            </button>

            <motion.button
              type="button"
              onClick={handleShutter}
              whileTap={reduceMotion || capturing ? undefined : { scale: 0.92 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
              disabled={status !== 'ready' || capturing}
              aria-busy={capturing}
              aria-label={t('Take a photo', 'Fotoğraf çek')}
              data-shutter
              className={cn(
                'pointer-events-auto grid size-[80px] shrink-0 place-items-center rounded-full border-[3px] border-white/90 ring-2 ring-black/25',
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
              aria-label={t('Switch camera', 'Kamerayı değiştir')}
              className={cn(
                'glass-dark-live pointer-events-auto grid size-[48px] shrink-0 place-items-center rounded-xl text-white transition-transform duration-150 ease-out active:scale-95',
                hudEdge,
              )}
            >
              <SwitchCamera className="size-[20px]" />
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
            // An imported photo answers the camera as much as a shutter press
            // does, so the suggestion is spent either way.
            consumePendingStep()
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
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-black/85 px-6 py-10 text-center outline-none scrim-blur safe-top safe-bottom"
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
                {status === 'denied' ? t('Camera access is off', 'Kamera erişimi kapalı') : t('The camera did not start', 'Kamera başlatılamadı')}
              </h2>
              <p
                id="camera-status-body"
                className="mx-auto max-w-xs text-base leading-relaxed text-white/85"
              >
                {status === 'denied'
                  ? t('Nekibuki needs the camera to look at the place in front of you.', 'Nekibuki\'nin önündeki yere bakabilmesi için kameraya ihtiyacı var.')
                  : t('Something interrupted the camera before it could start.', 'Kamera başlamadan önce bir şey onu durdurdu.')}
              </p>
            </div>

            <div className="flex w-full max-w-xs flex-col items-stretch gap-1">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="size-4" />
                {t('Choose from gallery', 'Galeriden seç')}
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
                    {t('How to enable the camera', 'Kamera nasıl açılır')}
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
                          ? t('Open your browser’s site settings from the camera icon beside the address, set Camera to Allow, then ', 'Adres çubuğunun yanındaki kamera simgesinden tarayıcı site ayarlarını aç, Kamerayı İzin Ver yap, sonra ')
                          : t('Allow camera access when your browser asks. If no prompt appears, check the camera icon beside the address, then ', 'Tarayıcı sorduğunda kamera erişimine izin ver. İstem çıkmazsa adres çubuğunun yanındaki kamera simgesini kontrol et, sonra ')}
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
                          {cameraPermission === 'denied' ? t('reload the page', 'sayfayı yenile') : t('try again', 'tekrar dene')}
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
                  <RefreshCw className="size-3.5" /> {t('Retry camera', 'Kamerayı yeniden dene')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
