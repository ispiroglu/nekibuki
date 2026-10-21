import type { VisualReference } from '@shared/types'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { photoSrcSet } from '@/lib/image'
import { clamp, cn } from '@/lib/utils'

/**
 * The captured photo with tappable annotations.
 *
 * The report article rises over the bottom of the frame and the floating
 * actions sit over the top, so the markers live in the band of photograph that
 * is still visible between them. The report carries the reference
 * coordinates, which the annotation sheet uses to zoom into the region the
 * marker points at.
 */

/** The visible marker dot. */
const MARKER_DOT = 36
/** Minimum distance between the centres of two markers that share a column. */
const MARKER_GAP = 44
/** Markers closer than this (in px) share a column. */
const MARKER_COLUMN = 40
/** Above this frame width the top centre of the photo is free for the hint. */
const WIDE_FRAME = 640
/** The hint's clearance from the header row. */
const HINT_GAP = 10
/** The hint's height before it is measured, in px. */
const HINT_ESTIMATE = 40
/** The floating actions: one button on the left, three on the right. */
const HEADER_EDGE = 16
const HEADER_BUTTON = 44
const HEADER_CLUSTER = 3 * HEADER_BUTTON + 2 * 6
const HINT_TIMEOUT_MS = 5000
/** How far the annotation crop zooms into the photograph. */
const CROP_ZOOM = 2.2

/**
 * The muted surface that stands in for a photo that cannot be fetched, and the
 * 12px muted caption inside it. The same recipe as the shared photo fallback
 * (`PHOTO_FALLBACK_SURFACE_CLASS` / `PHOTO_FALLBACK_CAPTION_CLASS`).
 */
const FALLBACK_SURFACE_CLASS = 'bg-secondary'
const FALLBACK_CAPTION_CLASS = 'text-xs text-muted-foreground'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Marker {
  reference: VisualReference
  /** The centre of the dot, in px from the top of the photo. */
  top: number
}

/** A part of the photo that a marker has to stay clear of. */
interface BlockedZone {
  left: number
  right: number
  bottom: number
}

/**
 * Places the markers inside the band of photograph that is not covered by the
 * header or the article.
 *
 * Each marker keeps the vertical position the report gave it, but markers that
 * share a column (the same part of the photo) are kept apart so two dots never
 * overlap, and no marker lands under the floating actions or the hint. When
 * the band is too shallow for the photo's own positions, the column is spaced
 * evenly instead.
 */
function placeMarkers(
  references: VisualReference[],
  bandBottom: number,
  frameWidth: number,
  zones: BlockedZone[],
): Marker[] {
  const radius = MARKER_DOT / 2
  const minimumFor = (reference: VisualReference) => {
    const centre = reference.x * frameWidth
    let minimum = radius
    for (const zone of zones) {
      if (centre + radius > zone.left && centre - radius < zone.right) {
        minimum = Math.max(minimum, zone.bottom + radius)
      }
    }
    return minimum
  }

  const columns: VisualReference[][] = []
  for (const reference of [...references].sort((a, b) => a.x - b.x)) {
    const column = columns.find(
      (group) => Math.abs(group[0].x - reference.x) * frameWidth < MARKER_COLUMN,
    )
    if (column) column.push(reference)
    else columns.push([reference])
  }

  const tops = new Map<string, number>()
  for (const column of columns) {
    const sorted = [...column].sort((a, b) => a.y - b.y)
    const floor = Math.max(...sorted.map(minimumFor))
    const last = Math.max(floor, bandBottom - radius)
    const span = last - floor
    const topsInColumn = sorted.map((reference) => floor + reference.y * span)
    for (let index = 1; index < sorted.length; index += 1) {
      topsInColumn[index] = Math.max(topsInColumn[index], topsInColumn[index - 1] + MARKER_GAP)
    }
    if (topsInColumn[topsInColumn.length - 1] > last) {
      const step = sorted.length > 1 ? Math.max(MARKER_GAP, span / (sorted.length - 1)) : 0
      for (let index = 0; index < sorted.length; index += 1) {
        topsInColumn[index] = floor + index * step
      }
    }
    sorted.forEach((reference, index) => tops.set(reference.id, topsInColumn[index]))
  }

  return references.map((reference) => ({ reference, top: tops.get(reference.id) ?? radius }))
}

export function PhotoHero({
  imageUrl,
  references,
  alt = '',
  topInset = 56,
  bottomInset = 96,
}: {
  imageUrl: string
  references: VisualReference[]
  /** Describes the photograph for assistive technology. */
  alt?: string
  /** Height of the floating action bar that sits over the photo. */
  topInset?: number
  /** How far the report article rises over the bottom of the photo. */
  bottomInset?: number
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hintVisible, setHintVisible] = useState(true)
  const [failed, setFailed] = useState(false)
  const [frame, setFrame] = useState({ width: 0, height: 0 })
  const [crop, setCrop] = useState({ width: 0, height: 0 })
  const [hintSize, setHintSize] = useState({ left: 0, right: 0, bottom: HINT_ESTIMATE })
  const frameRef = useRef<HTMLDivElement>(null)
  const cropRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()
  const detailId = useId()
  const detailTitleId = useId()
  const detailBodyId = useId()
  const active = references.find((reference) => reference.id === activeId) ?? null
  const srcSet = photoSrcSet(imageUrl)

  // The photo frame is measured so the markers can be placed in the band that
  // is neither covered by the header nor by the article, and so the annotation
  // crop can zoom into the region a marker points at.
  useEffect(() => {
    const element = frameRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      setFrame({ width: box.width, height: box.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!activeId) return
    const element = cropRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      setCrop({ width: box.width, height: box.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [activeId])

  // The hint sits under the floating actions on a narrow photo and in the free
  // top centre of a wide one; either way the markers keep clear of it.
  useEffect(() => {
    const element = hintRef.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      setHintSize({
        left: element.offsetLeft,
        right: element.offsetLeft + element.offsetWidth,
        bottom: element.offsetTop + element.offsetHeight,
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [hintVisible])

  const wide = frame.width >= WIDE_FRAME
  const hintTop = wide
    ? 'calc(env(safe-area-inset-top, 0px) + 8px)'
    : `${topInset + HINT_GAP}px`

  const zones = useMemo<BlockedZone[]>(() => {
    if (!frame.width) return []
    const list: BlockedZone[] = [
      { left: 0, right: HEADER_EDGE + HEADER_BUTTON, bottom: topInset },
      {
        left: frame.width - HEADER_EDGE - HEADER_CLUSTER,
        right: frame.width,
        bottom: topInset,
      },
    ]
    if (hintSize.right > hintSize.left) {
      list.push({ left: hintSize.left, right: hintSize.right, bottom: hintSize.bottom })
    }
    return list
  }, [frame.width, topInset, hintSize])

  const bandBottom = Math.max(MARKER_DOT, frame.height - bottomInset)
  const markers = useMemo(
    () => placeMarkers(references, bandBottom, frame.width, zones),
    [references, bandBottom, frame.width, zones],
  )
  const activeMarker = markers.find((marker) => marker.reference.id === activeId) ?? null

  const close = useCallback(() => {
    setActiveId(null)
    const marker = markerRef.current
    if (marker) marker.focus({ preventScroll: true })
  }, [])

  /** Sends the reader to the numbered item that explains the marker. */
  const readInGuide = useCallback(() => {
    const id = active?.id
    close()
    if (!id) return
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`reference-${id}`)
      if (!target) return
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
      target.focus({ preventScroll: true })
    })
  }, [active, close, reduceMotion])

  useEffect(() => {
    const timer = window.setTimeout(() => setHintVisible(false), HINT_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  // The panel is a real modal: lock the page, move focus into it, trap Tab,
  // close on Escape, and hand focus back to the marker that opened it.
  useEffect(() => {
    if (!activeId) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      closeRef.current?.focus({ preventScroll: true })
    }, 60)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
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
      const current = document.activeElement
      if (!panel.contains(current)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (current === first || current === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [activeId, close])

  // The crop shows the part of the photograph the marker points at, magnified.
  const cropStyle = useMemo(() => {
    if (!active || !activeMarker || !frame.width || !frame.height || !crop.width) return null
    const wrapperWidth = frame.width * CROP_ZOOM
    const wrapperHeight = frame.height * CROP_ZOOM
    const centreX = active.x * frame.width
    const centreY = activeMarker.top
    return {
      width: `${wrapperWidth}px`,
      height: `${wrapperHeight}px`,
      transform: `translate(${clamp(crop.width / 2 - CROP_ZOOM * centreX, crop.width - wrapperWidth, 0)}px, ${clamp(crop.height / 2 - CROP_ZOOM * centreY, crop.height - wrapperHeight, 0)}px)`,
    }
  }, [active, activeMarker, frame.width, frame.height, crop.width, crop.height])

  return (
    <>
      <div
        ref={frameRef}
        className="relative h-[60svh] min-h-[min(420px,60svh)] w-full overflow-hidden bg-secondary [@media(max-height:480px)]:h-[70svh]"
      >
        {failed ? (
          <div
            className={cn(
              'absolute inset-0 grid place-items-center px-8 text-center',
              FALLBACK_SURFACE_CLASS,
            )}
          >
            <p className={cn('max-w-[18rem] leading-relaxed', FALLBACK_CAPTION_CLASS)}>
              The photo could not be loaded. The guide below is still complete.
            </p>
          </div>
        ) : (
          <>
            <img
              src={imageUrl}
              srcSet={srcSet}
              sizes="100vw"
              alt={alt}
              width={1600}
              height={1200}
              fetchPriority="high"
              decoding="async"
              onError={() => setFailed(true)}
              className="absolute inset-0 size-full object-cover"
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
          </>
        )}

        {!failed &&
          markers.map((marker, index) => {
            const reference = marker.reference
            const isActive = reference.id === activeId
            return (
              <button
                key={reference.id}
                type="button"
                aria-label={reference.title}
                aria-expanded={isActive}
                aria-controls={isActive ? detailId : undefined}
                onClick={(event) => {
                  setHintVisible(false)
                  if (isActive) {
                    setActiveId(null)
                  } else {
                    markerRef.current = event.currentTarget
                    setActiveId(reference.id)
                  }
                }}
                style={{
                  left: `${reference.x * 100}%`,
                  top: `${marker.top}px`,
                }}
                className="absolute grid size-[44px] -translate-x-1/2 -translate-y-1/2 place-items-center"
              >
                <span
                  className={cn(
                    // Only the cheap properties transition. `transition-all`
                    // would also animate the frost in and out of the marker,
                    // and animating a blur is a repaint of the backdrop on
                    // every frame of the animation.
                    'relative grid size-[36px] place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-[transform,background-color,color,box-shadow,border-color] duration-300',
                    isActive
                      ? 'scale-110 bg-hud text-hud-fg ring-2 ring-black/25'
                      : 'border border-white/30 bg-black/55 text-white backdrop-blur-md',
                  )}
                >
                  {index + 1}
                  {!isActive &&
                    (reduceMotion ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-full border border-white/40"
                      />
                    ) : (
                      <motion.span
                        aria-hidden
                        initial={{ scale: 1, opacity: 0.7 }}
                        animate={{ scale: 1.9, opacity: 0 }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        className="pointer-events-none absolute inset-0 rounded-full border border-white/40"
                      />
                    ))}
                </span>
              </button>
            )
          })}

        <AnimatePresence>
          {hintVisible && !active && !failed && references.length > 0 && (
            <motion.div
              ref={hintRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ top: hintTop }}
              className="pointer-events-none absolute inset-x-0 z-20 mx-auto w-fit max-w-[calc(100%-1.5rem)] rounded-full bg-black/70 px-3.5 py-1 text-center text-xs font-medium text-white ring-1 ring-white/25"
            >
              Tap the dots on your photo
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            key="annotation-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            aria-hidden
            onClick={close}
            className="fixed inset-0 z-[45]"
          />
        )}
        {active && (
          <motion.div
            key="annotation-panel"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={
              reduceMotion ? { duration: 0.01 } : { type: 'spring', bounce: 0.05, duration: 0.4 }
            }
            className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div
              id={detailId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={detailTitleId}
              aria-describedby={detailBodyId}
              tabIndex={-1}
              className="mx-auto max-w-md rounded-3xl border border-white/15 bg-black/65 p-4 text-white backdrop-blur-xl focus:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="label-caps text-white/70">In the frame</p>
                  <h3 id={detailTitleId} className="display mt-1 text-headline">
                    {active.title}
                  </h3>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white transition-transform duration-150 ease-out active:scale-95"
                  aria-label="Close detail"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div
                ref={cropRef}
                className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/40"
              >
                {cropStyle && (
                  <div className="absolute left-0 top-0" style={cropStyle}>
                    <img
                      src={imageUrl}
                      alt=""
                      decoding="async"
                      className="size-full object-cover"
                      draggable={false}
                    />
                  </div>
                )}
              </div>

              <p id={detailBodyId} className="mt-3 line-clamp-1 text-body leading-relaxed text-white/90">
                {active.body}
              </p>

              <button
                type="button"
                onClick={readInGuide}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-white underline-offset-4 hover:underline"
              >
                Read in the guide
                <span aria-hidden>→</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
