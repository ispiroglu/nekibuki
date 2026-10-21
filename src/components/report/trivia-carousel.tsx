import type { Trivia, TriviaIcon } from '@shared/types'
import {
  CalendarDays,
  Compass,
  Crown,
  Hammer,
  Layers,
  Leaf,
  Map as MapIcon,
  Palette,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { staggerItem } from '@/lib/motion'

const ICONS: Record<TriviaIcon, typeof Sparkles> = {
  calendar: CalendarDays,
  user: UserRound,
  sparkles: Sparkles,
  layers: Layers,
  map: MapIcon,
  palette: Palette,
  hammer: Hammer,
  crown: Crown,
  compass: Compass,
  leaf: Leaf,
}

const EDGE_TOLERANCE = 2
const CAROUSEL_QUERY = '(max-width: 767px)'

export function TriviaCarousel({ trivia }: { trivia: Trivia[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [atEnd, setAtEnd] = useState(false)
  const [isCarousel, setIsCarousel] = useState(true)

  useEffect(() => {
    const media = window.matchMedia(CAROUSEL_QUERY)
    const sync = () => setIsCarousel(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  /** The right-edge fade disappears once the row has nothing left to reveal. */
  const syncScroll = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    setAtEnd(scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - EDGE_TOLERANCE)
  }, [])

  useEffect(() => {
    syncScroll()
    window.addEventListener('resize', syncScroll)
    return () => window.removeEventListener('resize', syncScroll)
  }, [syncScroll, trivia.length])

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={syncScroll}
        tabIndex={0}
        role="region"
        aria-label="Trivia cards"
        aria-roledescription={isCarousel ? 'carousel' : undefined}
        className="-mx-6 flex snap-row gap-3 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0"
      >
        {trivia.map((item, index) => {
          const Icon = ICONS[item.icon] ?? Sparkles
          return (
            <motion.article
              key={item.id}
              variants={staggerItem}
              className="w-[78vw] max-w-[320px] shrink-0 snap-start rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--border)] md:w-auto md:max-w-none"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-secondary text-foreground/80">
                  <Icon className="size-4" strokeWidth={1.9} />
                </span>
                <span className="pt-1.5 text-xs font-medium text-muted-foreground tabular-nums">
                  {index + 1} of {trivia.length}
                </span>
              </div>
              <p className="label-caps mt-4 text-muted-foreground">{item.label}</p>
              <h3 className="display mt-1 text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </motion.article>
          )
        })}
      </div>

      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 -right-6 w-16 bg-gradient-to-l from-background via-background/70 to-transparent md:hidden ${
          atEnd ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  )
}
