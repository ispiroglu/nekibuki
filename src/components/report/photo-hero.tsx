import type { VisualReference } from '@shared/types'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The captured photo with tappable annotations.
 * Annotations are laid out in the upper band of the photo — the report's
 * article rises over the bottom of the frame.
 */
const MARKER_BAND = 0.72

export function PhotoHero({
  imageUrl,
  references,
}: {
  imageUrl: string
  references: VisualReference[]
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hintVisible, setHintVisible] = useState(true)
  const markerRef = useRef<HTMLButtonElement | null>(null)
  const reduceMotion = useReducedMotion()
  const detailId = useId()
  const detailTitleId = useId()
  const active = references.find((reference) => reference.id === activeId) ?? null

  const close = useCallback(() => {
    setActiveId(null)
    const marker = markerRef.current
    if (marker) marker.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setHintVisible(false), 7000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, close])

  return (
    <>
      <div className="relative h-[60svh] min-h-[420px] w-full overflow-hidden bg-secondary">
        <img
          src={imageUrl}
          alt=""
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

        {references.map((reference, index) => {
          const isActive = reference.id === activeId
          return (
            <button
              key={reference.id}
              type="button"
              aria-label={reference.title}
              aria-expanded={isActive}
              aria-controls={isActive ? detailId : undefined}
              onClick={(event) => {
                setHintVisible(false)
                if (isActive) {
                  setActiveId(null)
                } else {
                  markerRef.current = event.currentTarget
                  setActiveId(reference.id)
                }
              }}
              style={{
                left: `${reference.x * 100}%`,
                top: `${reference.y * MARKER_BAND * 100}%`,
              }}
              className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center"
            >
              <span
                className={cn(
                  'relative grid size-9 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-all duration-300',
                  isActive
                    ? 'scale-110 bg-hud text-hud-fg ring-2 ring-black/25'
                    : 'border border-white/30 bg-black/55 text-white backdrop-blur-md',
                )}
              >
                {index + 1}
                {!isActive &&
                  (reduceMotion ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-full border border-white/40"
                    />
                  ) : (
                    <motion.span
                      aria-hidden
                      initial={{ scale: 1, opacity: 0.7 }}
                      animate={{ scale: 1.9, opacity: 0 }}
                      transition={{ duration: 1.4, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-0 rounded-full border border-white/40"
                    />
                  ))}
              </span>
            </button>
          )
        })}

        <AnimatePresence>
          {hintVisible && !active && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass-dark absolute left-1/2 top-20 -translate-x-1/2 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap text-white"
            >
              Tap the dots on your photo
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            key="annotation-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            aria-hidden
            onClick={close}
            className="fixed inset-0 z-[45]"
          />
        )}
        {active && (
          <motion.div
            key="annotation-panel"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={
              reduceMotion ? { duration: 0.01 } : { type: 'spring', bounce: 0.05, duration: 0.4 }
            }
            className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div
              id={detailId}
              role="dialog"
              aria-labelledby={detailTitleId}
              className="mx-auto max-w-md rounded-3xl border border-white/15 bg-black/65 p-4 text-white backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label-caps text-white/70">In the frame</p>
                  <h3 id={detailTitleId} className="display mt-1 text-xl">
                    {active.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white"
                  aria-label="Close detail"
                >
                  <X className="size-4" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/90">{active.body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
