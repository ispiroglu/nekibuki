import { ANALYZING_MESSAGES } from '@shared/mock-reports'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { RotateCcw, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/store/preferences'
import { spring } from '@/lib/motion'

export function AnalyzingOverlay({
  previewUrl,
  error,
  onCancel,
  onRetry,
}: {
  previewUrl: string
  error: string | null
  onCancel: () => void
  onRetry: () => void
}) {
  const language = usePreferences((state) => state.guideLanguage)
  const messages = ANALYZING_MESSAGES[language]
  const [messageIndex, setMessageIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const reduceMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (error) return
    const interval = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % messages.length)
    }, 1600)
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => {
      window.clearInterval(interval)
      window.clearInterval(timer)
    }
  }, [error, messages.length])

  // The overlay owns the screen while a photo is analysed. Focus the dialog
  // itself, not the rotating copy, so a screen reader hears the context once and
  // Tab lands on Cancel.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onCancel()
    }
    document.addEventListener('keydown', cancelOnEscape)
    return () => document.removeEventListener('keydown', cancelOnEscape)
  }, [onCancel])

  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-black px-6 text-white outline-none"
    >
      <h2 id={titleId} className="sr-only">
        Analyzing photo
      </h2>
      {/* Rotating copy is decorative on screen but the live region keeps the
          steps audible without re-announcing the animation exit. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {error ? '' : messages[messageIndex]}
      </p>
      {error && (
        <p role="alert" className="sr-only">
          {error}
        </p>
      )}

      <img
        src={previewUrl}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full scale-110 object-cover opacity-25 blur-2xl"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={spring}
          className="relative aspect-[3/4] w-[68vw] max-w-[320px] overflow-hidden rounded-3xl"
        >
          <img src={previewUrl} alt="" className="size-full object-cover" />
          {!error && !reduceMotion && (
            <span
              aria-hidden
              className="animate-scan pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-hud/50 to-transparent"
            />
          )}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/15 ring-inset"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="animate-breathe size-16 rounded-full border border-white/40" />
          </div>
        </motion.div>

        <div className="mt-8 flex min-h-7 items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={error ? 'error' : messageIndex}
              aria-hidden
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="display max-w-xs text-center text-xl text-balance"
            >
              {error ?? messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {!error ? (
          <>
            <div aria-hidden className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full w-1/3 rounded-full bg-hud"
                animate={{ x: ['-120%', '320%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel analysis"
              className="mt-8 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm text-white/65 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              <X className="size-3.5" /> Cancel
              <span aria-hidden className="tabular-nums">
                ({elapsed}s)
              </span>
            </button>
          </>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-2.5">
            <Button size="lg" className="bg-white text-black hover:bg-white/90" onClick={onRetry}>
              <RotateCcw className="size-4" /> Try again
            </Button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-white/65 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              Back to the camera
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
