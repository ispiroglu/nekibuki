import { motion } from 'motion/react'
import { Bookmark, Camera, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/ui-language'

const SCREENS = [
  { index: 0, label: ['You', 'Sen'] as const, icon: UserRound },
  { index: 1, label: ['Camera', 'Kamera'] as const, icon: Camera },
  { index: 2, label: ['Places', 'Yerler'] as const, icon: Bookmark },
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
  const t = useT()
  return (
    <div
      role="group"
      aria-label={t('Screens', 'Ekranlar')}
      className={cn(
        'flex items-center gap-2 rounded-full p-1',
        // The dark tone only ever sits over the live viewfinder, so it takes
        // the cheaper glass: a backdrop filter over moving video is redrawn
        // on every frame.
        tone === 'dark' ? 'glass-dark-live' : 'glass',
        className,
      )}
    >
      {SCREENS.map((screen) => {
        const active = screen.index === index
        return (
          <button
            key={screen.index}
            aria-current={active ? 'page' : undefined}
            aria-label={t(screen.label[0], screen.label[1])}
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
