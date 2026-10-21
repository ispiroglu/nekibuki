import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Apple's momentum projection (Designing Fluid Interfaces). */
function project(velocity: number, decelerationRate = 0.998) {
  return (velocity / 1000) * (decelerationRate / (1 - decelerationRate))
}

/** Soft boundary resistance instead of a hard stop. */
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

interface GestureState {
  pointerId: number
  locked: 'x' | 'y' | null
  active: boolean
  moved: boolean
  startX: number
  startY: number
  lastX: number
  lastT: number
  velocity: number
  startValue: number
}

const emptyGesture = (): GestureState => ({
  pointerId: -1,
  locked: null,
  active: false,
  moved: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastT: 0,
  velocity: 0,
  startValue: 0,
})

function DeckPage({
  x,
  width,
  index,
  active,
  children,
}: {
  x: MotionValue<number>
  width: number
  index: number
  active: boolean
  children: ReactNode
}) {
  const offset = useTransform(x, (value) => value + index * width)
  const progress = useTransform(offset, [-width, 0, width], [1, 0, 1])
  const scale = useTransform(progress, [0, 1], [1, 0.945])
  const opacity = useTransform(progress, [0, 1], [1, 0.5])

  return (
    // Off-screen panels stay mounted (the deck animates them) but must not
    // accept focus or be announced while the user cannot see them.
    <motion.div
      style={{ scale, opacity, width }}
      className="h-full shrink-0"
      inert={!active}
      aria-hidden={active ? undefined : true}
    >
      {children}
    </motion.div>
  )
}

export function SwipeDeck({
  index,
  onIndexChange,
  children,
  className,
}: {
  index: number
  onIndexChange: (index: number) => void
  children: ReactNode[]
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hintId = useId()
  const x = useMotionValue(0)
  const reduceMotion = useReducedMotion()
  const [width, setWidth] = useState(0)
  const [dragging, setDragging] = useState(false)

  const gesture = useRef<GestureState>(emptyGesture())
  const animation = useRef<ReturnType<typeof animate> | null>(null)
  const pendingVelocity = useRef(0)
  const suppressClick = useRef(false)

  const count = children.length

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const update = () => {
      const next = element.clientWidth
      setWidth(next)
      if (!gesture.current.active) x.set(-index * next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
    // Re-measure only on mount; index changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!width || gesture.current.active) return
    const targetX = -index * width
    animation.current?.stop()
    const velocity = pendingVelocity.current
    pendingVelocity.current = 0
    animation.current = animate(
      x,
      targetX,
      reduceMotion
        ? { duration: 0.18, ease: 'easeOut' }
        : { type: 'spring', bounce: 0.08, duration: 0.48, velocity },
    )
    return () => {
      animation.current?.stop()
    }
  }, [index, width, reduceMotion, x])

  const release = useCallback((pointerId: number) => {
    const element = containerRef.current
    if (element && element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId)
    }
  }, [])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      if (!width) return
      const target = event.target as HTMLElement
      if (target.closest('[data-no-swipe]')) return

      animation.current?.stop()
      suppressClick.current = false
      gesture.current = {
        ...emptyGesture(),
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastT: performance.now(),
        startValue: x.get(),
      }
      // No setPointerCapture here on purpose: capturing on pointerdown retargets
      // pointerup to this container, so the browser dispatches `click` on the
      // deck instead of the tapped button. We capture only once a horizontal
      // drag is confirmed (see onPointerMove).
    },
    [width, x],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = gesture.current
      if (state.pointerId !== event.pointerId) return

      const dx = event.clientX - state.startX
      const dy = event.clientY - state.startY

      if (!state.locked) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        state.locked = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : 'y'
        state.active = state.locked === 'x'
        if (state.locked === 'y') {
          release(event.pointerId)
          return
        }
        containerRef.current?.setPointerCapture(event.pointerId)
        setDragging(true)
      }

      if (state.locked !== 'x') return
      event.preventDefault()

      const now = performance.now()
      const dt = now - state.lastT
      if (dt > 0) {
        const instantaneous = ((event.clientX - state.lastX) / dt) * 1000
        state.velocity = state.velocity * 0.55 + instantaneous * 0.45
        state.lastX = event.clientX
        state.lastT = now
      }
      state.moved = true

      const min = -width * (count - 1)
      let next = state.startValue + dx
      if (next > 0) next = rubberband(next, width)
      else if (next < min) next = min - rubberband(min - next, width)
      x.set(next)
    },
    [count, release, width, x],
  )

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = gesture.current
      if (state.pointerId !== event.pointerId) return
      release(event.pointerId)

      const wasActive = state.active
      const velocity = state.velocity
      const moved = state.moved

      gesture.current = { ...state, active: false, locked: null, pointerId: -1 }
      if (!wasActive) return

      setDragging(false)
      suppressClick.current = moved

      const current = x.get()
      const projected = current + project(velocity)
      const targetIndex = Math.max(0, Math.min(count - 1, Math.round(-projected / width)))

      if (targetIndex === index) {
        animation.current?.stop()
        animation.current = animate(
          x,
          -index * width,
          reduceMotion
            ? { duration: 0.18, ease: 'easeOut' }
            : { type: 'spring', bounce: 0.1, duration: 0.46, velocity },
        )
        return
      }

      pendingVelocity.current = velocity
      onIndexChange(targetIndex)
    },
    [count, index, onIndexChange, reduceMotion, release, width, x],
  )

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = gesture.current
      if (state.pointerId !== event.pointerId) return
      release(event.pointerId)
      gesture.current = { ...state, active: false, locked: null, pointerId: -1 }
      setDragging(false)
      animation.current?.stop()
      animation.current = animate(x, -index * width, { type: 'spring', bounce: 0, duration: 0.4 })
    },
    [index, release, x],
  )

  const onClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false
      event.preventDefault()
      event.stopPropagation()
    }
  }, [])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return
      if (event.key === 'ArrowRight' && index < count - 1) {
        event.preventDefault()
        onIndexChange(index + 1)
      }
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault()
        onIndexChange(index - 1)
      }
    },
    [count, index, onIndexChange],
  )

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="Main screens"
      aria-describedby={hintId}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
      onKeyDown={onKeyDown}
      style={{ touchAction: 'pan-y' }}
      className={cn(
        // The deck is full bleed, so the focus ring is drawn inside the frame:
        // a brand-ink edge with a paper band under it stays visible over the
        // camera as well as over the paper panels.
        'relative h-full w-full overflow-hidden select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-ink focus-visible:shadow-[inset_0_0_0_4px_var(--background)]',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
    >
      <span id={hintId} className="sr-only">
        Use the left and right arrow keys to change screen.
      </span>
      <motion.div style={{ x, width: width * count }} className="flex h-full">
        {children.map((child, childIndex) => (
          <DeckPage
            key={childIndex}
            x={x}
            width={width}
            index={childIndex}
            active={childIndex === index}
          >
            {child}
          </DeckPage>
        ))}
      </motion.div>
    </div>
  )
}
