import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.01em]',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/12 text-primary',
        muted: 'border-border bg-secondary/60 text-muted-foreground',
        glass: 'glass border-transparent text-foreground',
        success: 'border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
