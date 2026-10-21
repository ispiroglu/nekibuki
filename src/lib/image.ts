/** Photo preparation helpers. Everything here keeps the upload small and pleasant. */

import { useCallback, useState } from 'react'
import { encodeImage, hasImageWorker } from './image-worker-client'
import { cn } from './utils'

/** Widths offered to the report hero. The stored URL keeps its own crop and quality. */
export const HERO_PHOTO_WIDTHS = [640, 960, 1280, 1600] as const

/**
 * Rewrites a width-parameterised photo URL to a single requested width.
 *
 * Only Unsplash URLs are rewritten: captured photos are blob/data URLs, and an
 * arbitrary host has no contract for a `w` parameter. The original URL is left
 * untouched, so crop, fit, format and quality params are preserved and the
 * document CSP (`img-src https://images.unsplash.com`) still holds.
 */
export function photoAtWidth(url: string, width: number): string | undefined {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return undefined
  }

  if (parsed.hostname !== 'images.unsplash.com' || !parsed.searchParams.has('w')) return undefined

  parsed.searchParams.set('w', String(width))
  return parsed.toString()
}

/** Builds a responsive `srcset` for a stored photo URL. */
export function photoSrcSet(
  url: string,
  widths: readonly number[] = HERO_PHOTO_WIDTHS,
): string | undefined {
  const variants: string[] = []
  for (const width of widths) {
    const variant = photoAtWidth(url, width)
    if (!variant) return undefined
    variants.push(`${variant} ${width}w`)
  }
  return variants.join(', ')
}

const MAX_UPLOAD_EDGE = 1800
const UPLOAD_QUALITY = 0.86
const PREVIEW_EDGE = 720
const PREVIEW_QUALITY = 0.72
/**
 * The capture is scaled to the upload size straight away. Nothing in the app
 * ever shows the photo larger than that — the hero renders it at 1600px — so
 * encoding a 2560px frame only buys bytes nobody looks at.
 */
const CAPTURE_EDGE = MAX_UPLOAD_EDGE

async function decode(blob: Blob): Promise<{ width: number; height: number; draw: CanvasImageSource } | null> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
      return { width: bitmap.width, height: bitmap.height, draw: bitmap }
    } catch {
      // Fall through to the <img> path (older Safari, odd formats).
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight, draw: image })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    image.src = url
  })
}

async function renderToBlob(
  blob: Blob,
  maxEdge: number,
  quality: number,
  type = 'image/jpeg',
): Promise<Blob | null> {
  const decoded = await decode(blob)
  if (!decoded) return null

  const scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height))
  const width = Math.max(1, Math.round(decoded.width * scale))
  const height = Math.max(1, Math.round(decoded.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null

  context.imageSmoothingQuality = 'high'
  context.drawImage(decoded.draw, 0, 0, width, height)

  return new Promise((resolve) => canvas.toBlob((result) => resolve(result), type, quality))
}

/**
 * Encodes an image in the worker, or returns null when the worker cannot do
 * it — an old browser, a WebView without `OffscreenCanvas`, a decode the
 * device refused. The caller then takes the main-thread road.
 */
async function encodeInWorker(
  request: Parameters<typeof encodeImage>[0],
  transfer: Transferable[] = [],
): Promise<{ blob?: Blob; dataUrl?: string } | null> {
  try {
    return await encodeImage(request, transfer)
  } catch {
    return null
  }
}

/**
 * Grabs the current video frame as a bitmap.
 *
 * `createImageBitmap` of a video frame is a GPU-side copy: the main thread
 * hands over a handle to the decoded frame, never the pixels themselves.
 */
async function grabFrame(video: HTMLVideoElement): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== 'function') return null
  try {
    return await createImageBitmap(video)
  } catch {
    return null
  }
}

/** Shrinks a photo to a friendly size for the vision model. */
export async function compressImage(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png' && blob.size < 900_000) return blob
  const encoded = await encodeInWorker({
    source: blob,
    maxEdge: MAX_UPLOAD_EDGE,
    quality: UPLOAD_QUALITY,
    mime: 'image/jpeg',
    output: 'blob',
  })
  if (encoded?.blob) return encoded.blob
  const compressed = await renderToBlob(blob, MAX_UPLOAD_EDGE, UPLOAD_QUALITY)
  return compressed ?? blob
}

/** A tiny base64 thumbnail used in history lists. */
export async function createPreviewDataUrl(blob: Blob): Promise<string | null> {
  const encoded = await encodeInWorker({
    source: blob,
    maxEdge: PREVIEW_EDGE,
    quality: PREVIEW_QUALITY,
    mime: 'image/jpeg',
    output: 'dataUrl',
  })
  if (encoded?.dataUrl) return encoded.dataUrl
  const preview = await renderToBlob(blob, PREVIEW_EDGE, PREVIEW_QUALITY)
  if (!preview) return null
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(preview)
  })
}

/** Pixel rect of the video source that is actually visible under `object-cover`. */
export interface CoverSourceRect {
  /** Source space. */
  x: number
  y: number
  width: number
  height: number
  /** Intrinsic-to-display scale used for the cover fit. */
  scale: number
}

/**
 * Reproduces CSS `object-cover` math for a source painted into a target box.
 * The source is scaled by `max(target/source)` and the overflow is cropped evenly
 * on both axes, which is exactly what the viewfinder shows.
 */
export function coverSourceRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverSourceRect | null {
  if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) return null

  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const width = Math.min(sourceWidth, targetWidth / scale)
  const height = Math.min(sourceHeight, targetHeight / scale)

  return {
    x: (sourceWidth - width) / 2,
    y: (sourceHeight - height) / 2,
    width,
    height,
    scale,
  }
}

function cropForViewfinder(video: HTMLVideoElement): CoverSourceRect | null {
  const source = coverSourceRect(
    video.videoWidth,
    video.videoHeight,
    video.clientWidth,
    video.clientHeight,
  )
  if (!source) return null

  // Integer source rect keeps drawImage edge handling predictable across browsers.
  const width = Math.max(1, Math.round(source.width))
  const height = Math.max(1, Math.round(source.height))
  return {
    x: Math.max(0, Math.round((video.videoWidth - width) / 2)),
    y: Math.max(0, Math.round((video.videoHeight - height) / 2)),
    width,
    height,
    scale: source.scale,
  }
}

/** Grabs the current video frame as a JPEG blob, cropped to the visible viewfinder. */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  quality = 0.92,
): Promise<Blob | null> {
  if (!video.videoWidth || !video.videoHeight) return null

  const crop = cropForViewfinder(video)

  // The fast path: the frame goes to the worker as a bitmap, the crop and the
  // encode happen there, and the main thread only ever sees the finished blob.
  if (hasImageWorker()) {
    const bitmap = await grabFrame(video)
    if (bitmap) {
      const encoded = await encodeInWorker(
        {
          source: bitmap,
          crop: crop
            ? { x: crop.x, y: crop.y, width: crop.width, height: crop.height }
            : undefined,
          maxEdge: CAPTURE_EDGE,
          quality,
          mime: 'image/jpeg',
          output: 'blob',
        },
        [bitmap],
      )
      if (encoded?.blob) return encoded.blob
    }
  }

  const width = crop?.width ?? video.videoWidth
  const height = crop?.height ?? video.videoHeight

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(
    video,
    crop?.x ?? 0,
    crop?.y ?? 0,
    width,
    height,
    0,
    0,
    width,
    height,
  )

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality))
}

/**
 * A small still of the current viewfinder, used to hide the black gap while the
 * camera restarts. Same crop as the saved photo, just at preview resolution.
 */
export async function captureVideoStill(
  video: HTMLVideoElement,
  maxWidth = 640,
  quality = 0.62,
): Promise<string | null> {
  if (!video.videoWidth || !video.videoHeight) return null

  const crop = cropForViewfinder(video)

  if (hasImageWorker()) {
    const bitmap = await grabFrame(video)
    if (bitmap) {
      const encoded = await encodeInWorker(
        {
          source: bitmap,
          crop: crop
            ? { x: crop.x, y: crop.y, width: crop.width, height: crop.height }
            : undefined,
          width: maxWidth,
          quality,
          mime: 'image/jpeg',
          output: 'dataUrl',
        },
        [bitmap],
      )
      if (encoded?.dataUrl) return encoded.dataUrl
    }
  }

  const sourceWidth = crop?.width ?? video.videoWidth
  const sourceHeight = crop?.height ?? video.videoHeight
  const scale = Math.min(1, maxWidth / sourceWidth)
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(
    video,
    crop?.x ?? 0,
    crop?.y ?? 0,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  )

  try {
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return null
  }
}

/*
 * The photo fallback recipe, shared by every surface that shows a photograph:
 * a muted surface (`bg-secondary` — the DESIGN.md "Muted Surface" token,
 * #f0eee6 by day and #30302e at night, the same colour as `bg-muted`)
 * carrying a 12px muted caption or glyph — never the browser's broken-image
 * glyph.
 */

/** The muted surface that stands in for a photo that cannot be fetched. */
export const PHOTO_FALLBACK_SURFACE_CLASS = 'bg-secondary'

/** The 12px muted caption that sits inside the fallback surface. */
export const PHOTO_FALLBACK_CAPTION_CLASS = 'text-xs text-muted-foreground'

const DEFAULT_FALLBACK_CAPTION = 'Photo unavailable'

export interface PhotoFallbackOptions {
  /** Description of the photo. It stays the image's alt and becomes the caption. */
  alt?: string
  /** Classes merged onto the `<img>`. */
  className?: string
}

export interface PhotoFallback {
  /** True once the photo has failed to load. */
  isFailed: boolean
  /** Props to spread onto the `<img>`. */
  imgProps: {
    onError: () => void
    alt: string
    'aria-hidden': true | undefined
    className: string
  }
  /** Classes for the muted surface that replaces the missing photo. Add the
   * photo's own size and radius to it. */
  surfaceClassName: string
  /** Classes for the 12px muted caption inside that surface. */
  captionClassName: string
  /** The caption to read when the photo is missing. */
  caption: string
}

/**
 * The shared photo-failure pattern: hide the broken `<img>` and show the muted
 * surface with a 12px muted caption instead of the browser's broken-image
 * glyph. The alt text stays put, so the description never changes with the
 * state, and the caption carries the same words for assistive technology.
 */
export function usePhotoFallback(options: PhotoFallbackOptions = {}): PhotoFallback {
  const [isFailed, setIsFailed] = useState(false)
  const onError = useCallback(() => setIsFailed(true), [])
  const alt = options.alt ?? ''

  return {
    isFailed,
    imgProps: {
      onError,
      alt,
      'aria-hidden': isFailed ? true : undefined,
      className: cn(options.className, isFailed && 'hidden'),
    },
    surfaceClassName: PHOTO_FALLBACK_SURFACE_CLASS,
    captionClassName: PHOTO_FALLBACK_CAPTION_CLASS,
    caption: alt.trim() ? alt : DEFAULT_FALLBACK_CAPTION,
  }
}

