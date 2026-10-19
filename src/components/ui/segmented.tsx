import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  const layoutId = useId()
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-secondary p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-card shadow-[0_0_0_1px_var(--border)]"
                transition={{ type: 'spring', bounce: 0.12, duration: 0.42 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
