import { motion } from 'motion/react'
import { Camera, History, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const SCREENS = [
  { index: 0, label: 'You', icon: UserRound },
  { index: 1, label: 'Camera', icon: Camera },
  { index: 2, label: 'Places', icon: History },
]

export function PageDots({
  index,
  onSelect,
  tone = 'light',
  className,
}: {
  index: number
  onSelect: (index: number) => void
  tone?: 'light' | 'dark'
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Screens"
      className={cn(
        'flex items-center gap-2 rounded-full p-1',
        tone === 'dark' ? 'glass-dark' : 'glass',
        className,
      )}
    >
      {SCREENS.map((screen) => {
        const active = screen.index === index
        return (
          <button
            key={screen.index}
            aria-current={active ? 'page' : undefined}
            aria-label={screen.label}
            onClick={() => onSelect(screen.index)}
            className={cn(
              'relative flex size-11 items-center justify-center rounded-full transition-colors duration-200',
              active
                ? tone === 'dark'
                  ? 'text-white'
                  : 'text-primary-foreground'
                : tone === 'dark'
                  ? 'text-white/70'
                  : 'text-muted-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId="page-dot-active"
                className={cn(
                  'absolute inset-0 rounded-full',
                  tone === 'dark' ? 'bg-white/15' : 'bg-primary',
                )}
                transition={{ type: 'spring', bounce: 0.14, duration: 0.42 }}
              />
            )}
            <screen.icon className="relative z-10 size-5" strokeWidth={1.8} />
          </button>
        )
      })}
    </div>
  )
}
