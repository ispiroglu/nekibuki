import type { VisualReference } from '@shared/types'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PhotoHero({
  imageUrl,
  references,
  children,
}: {
  imageUrl: string
  references: VisualReference[]
  children: ReactNode
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hintVisible, setHintVisible] = useState(true)
  const active = references.find((reference) => reference.id === activeId) ?? null

  useEffect(() => {
    const timer = window.setTimeout(() => setHintVisible(false), 7000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="relative h-[60svh] min-h-[380px] w-full overflow-hidden bg-secondary">
      <img
        src={imageUrl}
        alt=""
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/5 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {references.map((reference, index) => {
        const isActive = reference.id === activeId
        return (
          <button
            key={reference.id}
            type="button"
            aria-label={reference.title}
            onClick={() => {
              setHintVisible(false)
              setActiveId(isActive ? null : reference.id)
            }}
            style={{ left: `${reference.x * 100}%`, top: `${reference.y * 100}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <span
              className={cn(
                'relative grid size-7 place-items-center rounded-full border text-[11px] font-semibold backdrop-blur-md transition-all duration-300',
                isActive
                  ? 'scale-110 border-amber-100 bg-amber-300 text-black shadow-[0_0_0_6px_rgba(252,211,77,0.22)]'
                  : 'border-white/60 bg-black/40 text-white',
              )}
            >
              {index + 1}
              {!isActive && (
                <span className="absolute inset-0 animate-ping rounded-full border border-white/50 [animation-duration:2.6s]" />
              )}
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
            className="glass-dark absolute left-1/2 top-20 -translate-x-1/2 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-white/90"
          >
            Tap the dots on your photo
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <AnimatePresence mode="wait" initial={false}>
          {active ? (
            <motion.div
              key="reference"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', bounce: 0.05, duration: 0.4 }}
              className="glass-dark rounded-3xl p-4 text-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    In the frame
                  </p>
                  <h3 className="mt-1 font-serif text-[21px] leading-tight">{active.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-white/12 text-white/80"
                  aria-label="Close detail"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/85">{active.body}</p>
            </motion.div>
          ) : (
            <motion.div
              key="meta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
