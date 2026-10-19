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

const TINTS = [
  'from-[#f6e3d2] to-[#f3ead9] dark:from-[#33261c] dark:to-[#2a2119]',
  'from-[#e6ebe1] to-[#eef0e6] dark:from-[#232a22] dark:to-[#20261f]',
  'from-[#ece2ee] to-[#f1e9ef] dark:from-[#2b2330] dark:to-[#241f28]',
  'from-[#e2e8f0] to-[#eceff3] dark:from-[#1f2730] dark:to-[#1d232a]',
]

export function TriviaCarousel({ trivia }: { trivia: Trivia[] }) {
  return (
    <div className="-mx-5 flex snap-row gap-3.5 overflow-x-auto px-5 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
      {trivia.map((item, index) => {
        const Icon = ICONS[item.icon] ?? Sparkles
        return (
          <motion.article
            key={item.id}
            variants={staggerItem}
            className={cn(
              'relative w-[78vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-[1.5rem] border border-border/60 bg-gradient-to-br p-5 shadow-ambient md:w-auto md:max-w-none',
              TINTS[index % TINTS.length],
            )}
          >
            <span className="pointer-events-none absolute -right-2 -top-6 font-serif text-[86px] leading-none text-foreground/[0.05]">
              {index + 1}
            </span>
            <span className="grid size-10 place-items-center rounded-full bg-background/70 text-primary shadow-sm">
              <Icon className="size-[18px]" strokeWidth={1.9} />
            </span>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <h3 className="mt-1 font-serif text-[23px] leading-[1.1] tracking-[-0.02em]">
              {item.title}
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/70">{item.body}</p>
          </motion.article>
        )
      })}
    </div>
  )
}
