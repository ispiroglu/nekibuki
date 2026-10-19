import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn('size-6', className)}>
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <path
          key={angle}
          d="M16 4A12 12 0 0 1 23.71 6.81"
          transform={`rotate(${angle} 16 16)`}
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ))}
      <circle cx="16" cy="16" r="3.4" fill="currentColor" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-serif text-[17px] font-medium tracking-[-0.015em] text-foreground',
        className,
      )}
    >
      Nekibuki
    </span>
  )
}
