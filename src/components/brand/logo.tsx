import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * The Nekibuki mark: an aperture ring with a brand-coloured core.
 * Pass `draw` to play the opening animation (login / splash).
 */
export function Logo({
  className,
  draw = false,
  delay = 0,
}: {
  className?: string
  draw?: boolean
  delay?: number
}) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden className={cn('size-6', className)}>
      <motion.circle
        cx="60"
        cy="60"
        r="44"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        initial={draw ? { strokeDashoffset: 1, opacity: 0.2 } : false}
        animate={draw ? { strokeDashoffset: 0, opacity: 1 } : undefined}
        transition={{ duration: 1.1, delay, ease: [0.32, 0.72, 0, 1] }}
      />
      <motion.circle
        cx="60"
        cy="60"
        r="17"
        className="fill-brand"
        initial={draw ? { scale: 0.4, opacity: 0 } : false}
        animate={draw ? { scale: 1, opacity: 1 } : undefined}
        style={{ transformOrigin: '50% 50%', transformBox: 'fill-box' }}
        transition={{ duration: 0.7, delay: delay + 0.25, ease: [0.32, 0.72, 0, 1] }}
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('display text-[17px] font-medium text-foreground', className)}>
      Nekibuki
    </span>
  )
}
