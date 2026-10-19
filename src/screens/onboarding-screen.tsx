import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/store/preferences'

interface Slide {
  eyebrow: string
  title: string
  body: string
  art: ReactNode
}

function CameraArt() {
  return (
    <div className="relative grid size-56 place-items-center">
      <span className="absolute size-56 rounded-full border border-primary/15" />
      <span className="absolute size-44 rounded-full border border-primary/25" />
      <span className="absolute size-32 rounded-full bg-primary/10 blur-xl" />
      <motion.span
        animate={{ rotate: [0, 6, -6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="relative grid size-24 place-items-center rounded-[2rem] bg-primary text-primary-foreground shadow-ambient"
      >
        <Logo className="size-12" />
      </motion.span>
      <span className="absolute bottom-6 size-3 rounded-full bg-amber-400" />
    </div>
  )
}

function TriviaArt() {
  const cards = [
    { label: 'Completed in', value: '1889', rotate: -3 },
    { label: 'Designed by', value: 'Gustave Eiffel', rotate: 2.5 },
    { label: 'Meant to be', value: 'Temporary', rotate: 2 },
    { label: 'Repainted', value: 'Every 7 years', rotate: -2.5 },
  ]
  return (
    <div className="grid size-56 grid-cols-2 grid-rows-2 gap-2.5">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 14, rotate: 0, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, rotate: card.rotate, scale: 1 }}
          transition={{ ...spring, delay: 0.07 * index }}
          className={cn(
            'flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-3 text-left shadow-ambient',
            index % 2 === 0 ? 'origin-bottom-right' : 'origin-bottom-left',
          )}
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {card.label}
          </p>
          <p className="mt-1 font-serif text-[15px] leading-tight">{card.value}</p>
        </motion.div>
      ))}
    </div>
  )
}

function ChatArt() {
  return (
    <div className="relative grid size-56 place-items-center">
      <div className="absolute left-1/2 top-4 h-36 w-40 -translate-x-1/2 overflow-hidden rounded-[1.5rem] border border-border/60 shadow-ambient">
        <img
          src="https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80"
          alt=""
          className="size-full object-cover"
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        className="absolute bottom-14 left-3 max-w-[70%] rounded-2xl rounded-bl-md border border-border/70 bg-card px-3 py-2 text-[11px] shadow-ambient"
      >
        Why was it almost demolished?
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.34 }}
        className="absolute bottom-4 right-2 max-w-[74%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-[11px] text-primary-foreground shadow-ambient"
      >
        Radio antennas saved it. ✨
      </motion.div>
    </div>
  )
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Point · Shoot · Understand',
    title: 'Look at a place. Really look at it.',
    body: 'Nekibuki watches what your camera sees — a monument, a landscape, a quiet street — and tells you what it is in seconds.',
    art: <CameraArt />,
  },
  {
    eyebrow: 'Four small surprises',
    title: 'Stories, not a textbook.',
    body: 'Every place arrives with four cards: who built it, when, why, and the detail most people walk straight past.',
    art: <TriviaArt />,
  },
  {
    eyebrow: 'A guide that remembers',
    title: 'Ask, and come back later.',
    body: 'Each discovery is saved with its conversation, so you can revisit the place — and the question you never finished asking.',
    art: <ChatArt />,
  },
]

export function OnboardingScreen() {
  const { user } = useAuth()
  const completeOnboarding = usePreferences((state) => state.completeOnboarding)
  const reduceMotion = useReducedMotion()
  const [[index, direction], setIndex] = useState<[number, number]>([0, 1])

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, next))
    if (clamped === index) return
    setIndex([clamped, clamped > index ? 1 : -1])
  }

  const finish = () => {
    if (user) completeOnboarding(user.id)
  }

  const slide = SLIDES[index]

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-24 top-0 size-[22rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-[22rem] rounded-full bg-amber-500/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 safe-top">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Logo className="size-5" />
          </span>
          <span className="font-serif text-[18px] tracking-[-0.02em]">Nekibuki</span>
        </div>
        <button
          type="button"
          onClick={finish}
          className="rounded-full px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip
        </button>
      </header>

      <motion.div
        drag={reduceMotion ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragEnd={(_, info) => {
          if (info.offset.x < -70 || info.velocity.x < -520) go(index + 1)
          else if (info.offset.x > 70 || info.velocity.x > 520) go(index - 1)
        }}
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-7 pb-6"
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={spring}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-2">{slide.art}</div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-primary">
              {slide.eyebrow}
            </p>
            <h1 className="mt-3 max-w-sm font-serif text-[33px] leading-[1.06] tracking-[-0.025em]">
              {slide.title}
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-7 safe-bottom">
        <div className="flex items-center gap-2">
          {SLIDES.map((item, dotIndex) => (
            <button
              key={item.eyebrow}
              type="button"
              aria-label={`Slide ${dotIndex + 1}`}
              onClick={() => go(dotIndex)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                dotIndex === index ? 'w-7 bg-primary' : 'w-2 bg-border',
              )}
            />
          ))}
        </div>
        <Button
          size="lg"
          className="h-13 w-full max-w-sm"
          onClick={() => (index === SLIDES.length - 1 ? finish() : go(index + 1))}
        >
          {index === SLIDES.length - 1 ? 'Start exploring' : 'Continue'}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
