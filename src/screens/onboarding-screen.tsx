import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { Logo } from '@/components/brand/logo'
import { useAuth } from '@/lib/auth'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/store/preferences'

interface Slide {
  title: string
  body: string
  art: ReactNode
}

/** Four quarter-round brackets, the way a viewfinder frames a subject. */
function ViewfinderArt() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative grid size-52 place-items-center">
      <svg viewBox="0 0 120 120" fill="none" aria-hidden className="absolute inset-0 size-full">
        <g stroke="var(--brand)" strokeWidth="4" strokeLinecap="round">
          <path d="M10 40A30 30 0 0 1 40 10" />
          <path d="M80 10A30 30 0 0 1 110 40" />
          <path d="M110 80A30 30 0 0 1 80 110" />
          <path d="M40 110A30 30 0 0 1 10 80" />
        </g>
      </svg>
      <motion.span
        animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.05, 1] }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
        }
        className="text-foreground/15"
      >
        <Logo className="size-16" />
      </motion.span>
    </div>
  )
}

/** One discovery: the photo, then the facts that come back with it. */
function DiscoveryArt() {
  const reduceMotion = useReducedMotion()
  const facts = [
    { label: 'Opened', value: '80 AD' },
    { label: 'Capacity', value: '~50,000' },
  ]
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : spring}
      className="w-52 rounded-2xl bg-card p-2 shadow-[0_0_0_1px_var(--border)]"
    >
      <div className="relative h-28 overflow-hidden rounded-xl bg-secondary">
        <img
          src="https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80"
          alt=""
          className="size-full object-cover"
        />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-1.5">
        {facts.map((fact, index) => (
          <motion.div
            key={fact.label}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { ...spring, delay: 0.12 + index * 0.08 }}
            className="rounded-xl bg-secondary px-2.5 py-2"
          >
            <dt className="text-[0.6rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {fact.label}
            </dt>
            <dd className="display mt-0.5 text-base leading-snug">{fact.value}</dd>
          </motion.div>
        ))}
      </dl>
    </motion.div>
  )
}

/** The conversation that stays attached to a place. */
function ConversationArt() {
  const reduceMotion = useReducedMotion()
  return (
    <div className="w-64 space-y-3">
      <motion.p
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={reduceMotion ? { duration: 0 } : spring}
        className="ml-auto w-fit rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground"
      >
        Who built this?
      </motion.p>
      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { ...spring, delay: 0.16 }}
        className="font-serif text-[1.05rem] leading-relaxed"
      >
        Genoese merchants, in 1348 — as the crown of their walled colony.
      </motion.p>
      <motion.p
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={reduceMotion ? { duration: 0 } : { ...spring, delay: 0.3 }}
        className="ml-auto w-fit rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground"
      >
        Can I go up at night?
      </motion.p>
    </div>
  )
}

const SLIDES: Slide[] = [
  {
    title: 'Point at anything',
    body: 'A tower, a fountain, a carved doorway. Snap it or pick a photo — no typing, no searching.',
    art: <ViewfinderArt />,
  },
  {
    title: 'The story, not the plaque',
    body: 'Every place arrives with a short guide written for you, plus four things worth remembering.',
    art: <DiscoveryArt />,
  },
  {
    title: 'Ask, and come back later',
    body: 'Each discovery keeps its own conversation, so you can revisit the place and the question you left open.',
    art: <ConversationArt />,
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
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Traveler'

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between px-6 safe-top">
        <p className="display text-lg text-brand-ink">Welcome, {firstName}.</p>
        <button
          type="button"
          onClick={finish}
          className="-mr-2 inline-flex min-h-11 min-w-11 items-center justify-center px-2 py-2 text-sm text-muted-foreground transition-colors active:text-foreground"
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
        className="flex flex-1 flex-col px-6 pb-8"
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={spring}
            className="flex min-h-0 flex-1 flex-col justify-center"
          >
            <div className="flex flex-1 items-center justify-center py-6">{slide.art}</div>
            <h1 className="display text-[2.6rem] font-medium">{slide.title}</h1>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center justify-between px-6 safe-bottom">
        <div className="flex items-center gap-1">
          {SLIDES.map((item, dotIndex) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Slide ${dotIndex + 1}`}
              onClick={() => go(dotIndex)}
              className="grid min-h-11 min-w-11 place-items-center py-3.5"
            >
              <span
                className={cn(
                  'block h-2 rounded-full transition-all duration-300',
                  dotIndex === index ? 'w-7 bg-primary' : 'w-2 bg-border',
                )}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => (index === SLIDES.length - 1 ? finish() : go(index + 1))}
          className="h-14 rounded-full bg-primary px-7 font-medium text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          {index === SLIDES.length - 1 ? 'Start exploring' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
