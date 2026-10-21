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
import { cn } from '@/lib/utils'

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
/** The scroll padding of the row, in px, at the widest gutter. */
const SCROLL_PADDING = 24

export function TriviaCarousel({ trivia }: { trivia: Trivia[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [atEnd, setAtEnd] = useState(false)
  const [isCarousel, setIsCarousel] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)

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

    const cards = Array.from(scroller.querySelectorAll<HTMLElement>('[data-trivia-card]'))
    if (cards.length === 0) return
    const scrollerLeft = scroller.getBoundingClientRect().left
    let closest = 0
    let distance = Number.POSITIVE_INFINITY
    cards.forEach((card, index) => {
      const offset = Math.abs(card.getBoundingClientRect().left - scrollerLeft - SCROLL_PADDING)
      if (offset < distance) {
        distance = offset
        closest = index
      }
    })
    setActiveIndex(closest)
  }, [])

  useEffect(() => {
    syncScroll()
    window.addEventListener('resize', syncScroll)
    return () => window.removeEventListener('resize', syncScroll)
  }, [syncScroll, trivia.length])

  /** Brings a card to the front of the row, so the carousel is not swipe-only. */
  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const card = scroller.querySelectorAll<HTMLElement>('[data-trivia-card]')[index]
    if (!card) return
    const offset = card.getBoundingClientRect().left - scroller.getBoundingClientRect().left
    const left = scroller.scrollLeft + offset - SCROLL_PADDING
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [])

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={syncScroll}
        tabIndex={0}
        role="region"
        aria-label="Trivia cards"
        aria-roledescription={isCarousel ? 'carousel' : undefined}
        className="-mx-6 flex snap-row gap-3 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-2 no-scrollbar max-[399px]:-mx-5 max-[399px]:scroll-px-5 max-[399px]:px-5 max-[359px]:-mx-4 max-[359px]:scroll-px-4 max-[359px]:px-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0"
      >
        {trivia.map((item, index) => {
          const Icon = ICONS[item.icon] ?? Sparkles
          return (
            <motion.article
              key={item.id}
              data-trivia-card
              variants={staggerItem}
              className="w-[78vw] max-w-[320px] shrink-0 snap-start rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--border)] md:w-auto md:max-w-none"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-secondary text-foreground/80">
                  <Icon className="size-4" strokeWidth={1.9} />
                </span>
                <span className="pt-1.5 text-label font-medium text-muted-foreground tabular-nums">
                  {index + 1} of {trivia.length}
                </span>
              </div>
              <p className="label-caps mt-4 text-muted-foreground">{item.label}</p>
              <h3 className="display mt-1 text-headline">{item.title}</h3>
              <p className="mt-2 text-body leading-relaxed text-muted-foreground">{item.body}</p>
            </motion.article>
          )
        })}
      </div>

      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 -right-6 w-28 bg-gradient-to-l from-background via-background/85 to-transparent max-[399px]:-right-5 max-[359px]:-right-4 md:hidden ${
          atEnd ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {isCarousel && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-hidden>
            {trivia.map((item, index) => (
              <span
                key={item.id}
                className={cn(
                  // Width and colour only: `transition-all` would animate the
                  // layout of every dot in the row.
                  'h-1.5 rounded-full transition-[width,background-color]',
                  index === activeIndex ? 'w-5 bg-brand' : 'w-1.5 bg-border',
                )}
              />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            Card {activeIndex + 1} of {trivia.length}
          </p>
          <button
            type="button"
            onClick={() => goTo((activeIndex + 1) % trivia.length)}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-ui font-medium text-brand-ink"
          >
            Next
            <span aria-hidden>›</span>
          </button>
        </div>
      )}
    </div>
  )
}
