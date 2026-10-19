import type { GeoPoint } from '@shared/types'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Camera as CameraIcon,
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
import { Button } from '@/components/ui/button'
import { captureVideoFrame } from '@/lib/image'
import { haptic } from '@/lib/haptics'
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

export function CameraScreen({
  active,
  onCapture,
  location,
  locationStatus,
  onRequestLocation,
}: {
  active: boolean
  onCapture: (blob: Blob) => void
  location: GeoPoint | null
  locationStatus: 'idle' | 'requesting' | 'ready' | 'off'
  onRequestLocation: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reduceMotion = useReducedMotion()
  const hapticsEnabled = usePreferences((state) => state.haptics)

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
      } catch (error) {
        if (cancelled) return
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
      if (!track) return
      const rect = event.currentTarget.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      setFocusPoint({ x, y, id: Date.now() })
      haptic('light', hapticsEnabled)
      void applyAdvanced(track, {
        focusMode: 'single-shot',
        exposureMode: 'single-shot',
        pointsOfInterest: [{ x, y }],
      })
    },
    [hapticsEnabled],
  )

  const zoomPresets = zoomRange
    ? [0.5, 1, 2, 3]
        .filter((value) => value >= zoomRange.min - 0.01 && value <= zoomRange.max + 0.01)
        .filter((value, index, all) => all.indexOf(value) === index)
    : []

  return (
    <section className="relative h-full w-full overflow-hidden bg-[#0e0d0b] text-white">
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

      <div
        onClick={handlePreviewTap}
        className="absolute inset-0"
        style={{ touchAction: 'pan-y' }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/60" />

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
              <span key={shape} className={cn('absolute size-8 border-white/45', shape)} />
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

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 safe-top">
        <div className="glass-dark flex items-center gap-2 rounded-full py-2 pl-2.5 pr-3.5">
          <Logo className="size-5 text-white" />
          <span className="font-serif text-[15px] tracking-[-0.01em]">Nekibuki</span>
        </div>

        <button
          type="button"
          onClick={locationStatus === 'ready' ? undefined : onRequestLocation}
          className="glass-dark flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium text-white/90"
        >
          {locationStatus === 'requesting' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : location ? (
            <MapPin className="size-3.5 text-amber-300" />
          ) : (
            <MapPinOff className="size-3.5 text-white/60" />
          )}
          {locationStatus === 'requesting'
            ? 'Locating'
            : location
              ? 'Location on'
              : 'Add location'}
        </button>

        <div className="flex items-center gap-2">
          {torchAvailable && (
            <button
              type="button"
              onClick={toggleTorch}
              className={cn(
                'glass-dark grid size-10 place-items-center rounded-full transition-colors',
                torch ? 'text-amber-300' : 'text-white/80',
              )}
            >
              {torch ? <Zap className="size-4" /> : <ZapOff className="size-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setGrid((value) => !value)
              haptic('light', hapticsEnabled)
            }}
            className={cn(
              'glass-dark grid size-10 place-items-center rounded-full transition-colors',
              grid ? 'text-white' : 'text-white/70',
            )}
            aria-label="Composition grid"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor">
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-5 pb-24">
        <p className="text-[12.5px] font-medium tracking-[0.01em] text-white/70">
          {status === 'ready' ? 'Frame a place, then tap the shutter' : ' '}
        </p>

        {zoomPresets.length > 1 && (
          <div className="glass-dark flex items-center gap-1 rounded-full p-1">
            {zoomPresets.map((preset) => {
              const activePreset = Math.abs(zoom - preset) < Math.max(0.06, (zoomRange?.step ?? 0.1) / 2)
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    applyZoom(preset)
                    haptic('light', hapticsEnabled)
                  }}
                  className={cn(
                    'relative grid h-8 min-w-11 place-items-center rounded-full text-[12px] font-semibold transition-colors',
                    activePreset ? 'text-black' : 'text-white/75',
                  )}
                >
                  {activePreset && (
                    <motion.span
                      layoutId="zoom-pill"
                      className="absolute inset-0 rounded-full bg-amber-300"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10">{preset}x</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="glass-dark grid size-13 place-items-center rounded-2xl text-white/90 active:scale-95"
            aria-label="Choose from gallery"
          >
            <ImageIcon className="size-5" />
          </button>

          <motion.button
            type="button"
            onClick={handleShutter}
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
            disabled={status !== 'ready'}
            className="relative grid size-[74px] place-items-center rounded-full disabled:opacity-40"
            aria-label="Take a photo"
          >
            <span className="absolute inset-0 rounded-full border-[3px] border-white/85" />
            <span className="size-[58px] rounded-full bg-white shadow-[0_2px_18px_rgba(0,0,0,.4)]" />
          </motion.button>

          <button
            type="button"
            onClick={() => {
              setFacing((value) => (value === 'environment' ? 'user' : 'environment'))
              haptic('light', hapticsEnabled)
            }}
            className="glass-dark grid size-13 place-items-center rounded-2xl text-white/90 active:scale-95"
            aria-label="Switch camera"
          >
            <SwitchCamera className="size-5" />
          </button>
        </div>
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
        {status !== 'ready' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#0e0d0b] px-8 text-center"
          >
            {status === 'starting' || status === 'idle' ? (
              <>
                <Logo className="size-10 animate-breathe text-white/80" />
                <p className="text-sm text-white/60">Waking up the camera…</p>
              </>
            ) : (
              <>
                <div className="grid size-14 place-items-center rounded-2xl bg-white/8">
                  {status === 'denied' ? (
                    <ShieldAlert className="size-6 text-amber-300" />
                  ) : (
                    <CameraIcon className="size-6 text-white/70" />
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl text-white">
                    {status === 'denied' ? 'Camera access is off' : 'The camera did not start'}
                  </h3>
                  <p className="mx-auto max-w-xs text-sm leading-relaxed text-white/60">
                    {status === 'denied'
                      ? 'Nekibuki needs the camera to look at the place in front of you. You can also pick a photo from your gallery.'
                      : 'Something interrupted the camera. You can retry, or choose a photo from your gallery instead.'}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    className="bg-white text-black hover:bg-white/90"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="size-4" />
                    Choose from gallery
                  </Button>
                  <button
                    type="button"
                    onClick={() => setRestartToken((value) => value + 1)}
                    className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-white/60"
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
