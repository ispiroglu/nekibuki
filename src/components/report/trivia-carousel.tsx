import type { Trivia, TriviaIcon } from '@shared/types'
import {
  CalendarDays,
  ChevronRight,
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
import { useT } from '@/lib/ui-language'
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
  const t = useT()
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

  /** The right edge — fade and arrow — disappears once the row has nothing left to reveal. */
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
    <div>
      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={syncScroll}
          tabIndex={0}
          role="region"
          aria-label={t('Trivia cards', 'Bilgi kartları')}
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
                    {index + 1} {t('of', '/')} {trivia.length}
                  </span>
                </div>
                <p className="label-caps mt-4 text-muted-foreground">{item.label}</p>
                <h3 className="display mt-1 text-headline">{item.title}</h3>
                <p className="mt-2 text-body leading-relaxed text-muted-foreground">{item.body}</p>
              </motion.article>
            )
          })}
        </div>

        {/*
          The right edge of the row is one object: the fade that says "there is
          more this way" and the arrow that moves it. Both live in the same
          wrapper, so they share a single opacity transition — they arrive
          together and they leave together, and when the row has nothing left
          to reveal, the edge goes quiet and so does the arrow.
        */}
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 -right-6 w-28 transition-opacity duration-300 ease-out motion-reduce:transition-none md:hidden',
            'max-[399px]:-right-5 max-[359px]:-right-4',
            atEnd ? 'opacity-0' : 'opacity-100',
          )}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-l from-background via-background/85 to-transparent"
          />
          <button
            type="button"
            onClick={() => goTo(Math.min(activeIndex + 1, trivia.length - 1))}
            aria-label={t('Next card', 'Sonraki kart')}
            inert={atEnd ? true : undefined}
            className={cn(
              // The arrow sits on the column's right edge, the mirror of the
              // edge the next card snaps to.
              'pointer-events-auto absolute top-1/2 right-6 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-brand text-brand-fg',
              'max-[399px]:right-5 max-[359px]:right-4',
              'transition-transform duration-150 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink',
            )}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>

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
            {t('Card', 'Kart')} {activeIndex + 1} {t('of', '/')} {trivia.length}
          </p>
        </div>
      )}
    </div>
  )
}
