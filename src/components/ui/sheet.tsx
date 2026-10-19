import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
  const reduceMotion = useReducedMotion()
  const dragControls = useDragControls()

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95]">
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 w-full cursor-default bg-black/35 backdrop-blur-[2px]"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            drag={reduceMotion ? false : 'y'}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 130 || info.velocity.y > 700) onOpenChange(false)
            }}
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', bounce: 0.06, duration: 0.5 }}
            className={cn(
              'absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-border/70 bg-background shadow-[0_-24px_60px_-30px_rgba(0,0,0,.4)]',
              className,
            )}
          >
            <div
              onPointerDown={(event) => dragControls.start(event)}
              className="flex shrink-0 cursor-grab touch-none flex-col items-center gap-3 px-5 pb-3 pt-3 active:cursor-grabbing"
            >
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
              {(title || description) && (
                <div className="w-full text-center">
                  {title && (
                    <h2 className="font-serif text-lg font-medium tracking-[-0.01em]">{title}</h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            {footer && <div className="shrink-0 safe-bottom">{footer}</div>}
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  )
}
