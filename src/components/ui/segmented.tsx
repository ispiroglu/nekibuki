import { motion } from 'motion/react'
import { useId, useRef } from 'react'
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
  label,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  label?: string
}) {
  const layoutId = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  const move = (index: number, direction: 1 | -1) => {
    const next = (index + direction + options.length) % options.length
    const option = options[next]
    if (!option) return
    onChange(option.value)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex items-center gap-1 rounded-full bg-secondary p-0', className)}
    >
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                move(index, 1)
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                move(index, -1)
              }
            }}
            className={cn(
              'relative inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors duration-200',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-0 inset-y-1 rounded-full bg-card shadow-[0_0_0_1px_var(--border)]"
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
