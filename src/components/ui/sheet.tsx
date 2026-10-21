import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
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

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
  const titleId = useId()
  const panelRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Capture the opener and move focus into the panel when it opens.
  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement as HTMLElement | null
    const timer = window.setTimeout(() => {
      const target = closeRef.current ?? panelRef.current
      target?.focus({ preventScroll: true })
    }, 60)
    return () => window.clearTimeout(timer)
  }, [open])

  // Trap Tab/Shift+Tab inside the panel and close on Escape.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onOpenChange(false)
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === panel,
      )
      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const restoreFocus = () => {
    const opener = openerRef.current
    openerRef.current = null
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
  }

  return (
    <AnimatePresence onExitComplete={restoreFocus}>
      {open && (
        <div className="fixed inset-0 z-[95]">
          <motion.div
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 cursor-default bg-black/35 scrim-blur"
          />
          <motion.section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : 'Conversation'}
            tabIndex={-1}
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
              'absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-background focus:outline-none',
              className,
            )}
          >
            <div
              onPointerDown={(event) => dragControls.start(event)}
              className="relative flex shrink-0 cursor-grab touch-none flex-col items-center gap-3 px-5 pt-3 pb-3 active:cursor-grabbing"
            >
              <span className="pointer-events-none h-1.5 w-10 rounded-full bg-muted-foreground/25" />
              <button
                ref={closeRef}
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="absolute right-4 top-3 grid size-11 place-items-center rounded-full bg-secondary text-foreground transition-transform duration-150 ease-out active:scale-95"
              >
                <X className="size-4" />
              </button>
              {(title || description) && (
                <div className="w-full px-10 text-center">
                  {title && (
                    <h2 id={titleId} className="display text-xl font-medium">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
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
