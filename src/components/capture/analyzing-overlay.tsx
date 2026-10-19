import { ANALYZING_MESSAGES } from '@shared/mock-reports'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#0e0d0b] px-6 text-white"
    >
      <img
        src={previewUrl}
        alt=""
        className="absolute inset-0 size-full scale-110 object-cover opacity-25 blur-2xl"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={spring}
          className="relative aspect-[3/4] w-[68vw] max-w-[320px] overflow-hidden rounded-[2rem] border border-white/12 shadow-[0_30px_80px_-30px_rgba(0,0,0,.9)]"
        >
          <img src={previewUrl} alt="" className="size-full object-cover" />
          {!error && !reduceMotion && (
            <span className="animate-scan pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-amber-200/45 to-transparent" />
          )}
          <span className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/15" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="animate-breathe size-16 rounded-full border border-white/40" />
          </div>
        </motion.div>

        <div className="mt-8 flex h-7 items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={error ? 'error' : messageIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="font-serif text-[19px] tracking-[-0.01em]"
            >
              {error ?? messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {!error ? (
          <>
            <div className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/12">
              <motion.div
                className="h-full w-1/3 rounded-full bg-amber-300"
                animate={{ x: ['-120%', '320%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="mt-8 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] text-white/60 transition-colors hover:text-white"
            >
              <X className="size-3.5" /> Cancel ({elapsed}s)
            </button>
          </>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-2.5">
            <Button className="h-12 bg-white px-6 text-black hover:bg-white/90" onClick={onRetry}>
              <RotateCcw className="size-4" /> Try again
            </Button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-4 py-2 text-[13px] text-white/60 transition-colors hover:text-white"
            >
              Back to the camera
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
