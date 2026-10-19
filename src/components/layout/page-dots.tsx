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
      role="tablist"
      aria-label="Screens"
      className={cn('glass flex items-center gap-1 rounded-full p-1', className)}
    >
      {SCREENS.map((screen) => {
        const active = screen.index === index
        return (
          <button
            key={screen.index}
            role="tab"
            aria-selected={active}
            aria-label={screen.label}
            onClick={() => onSelect(screen.index)}
            className={cn(
              'relative flex h-8 items-center justify-center rounded-full px-2.5 transition-colors duration-200',
              active
                ? 'text-primary-foreground'
                : tone === 'dark'
                  ? 'text-white/70 hover:text-white'
                  : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId="page-dot-active"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: 'spring', bounce: 0.14, duration: 0.42 }}
              />
            )}
            <screen.icon className="relative z-10 size-4" strokeWidth={1.9} />
          </button>
        )
      })}
    </div>
  )
}
