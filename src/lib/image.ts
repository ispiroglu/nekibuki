/** Photo preparation helpers. Everything here keeps the upload small and pleasant. */

const MAX_UPLOAD_EDGE = 1800
const UPLOAD_QUALITY = 0.86
const PREVIEW_EDGE = 720
const PREVIEW_QUALITY = 0.72

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

/** Shrinks a photo to a friendly size for the vision model. */
export async function compressImage(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png' && blob.size < 900_000) return blob
  const compressed = await renderToBlob(blob, MAX_UPLOAD_EDGE, UPLOAD_QUALITY)
  return compressed ?? blob
}

/** A tiny base64 thumbnail used in history lists. */
export async function createPreviewDataUrl(blob: Blob): Promise<string | null> {
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
export function captureVideoFrame(video: HTMLVideoElement, quality = 0.92): Promise<Blob | null> {
  if (!video.videoWidth || !video.videoHeight) return Promise.resolve(null)

  const crop = cropForViewfinder(video)
  const width = crop?.width ?? video.videoWidth
  const height = crop?.height ?? video.videoHeight

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(null)
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
export function captureVideoStill(
  video: HTMLVideoElement,
  maxWidth = 640,
  quality = 0.62,
): string | null {
  if (!video.videoWidth || !video.videoHeight) return null

  const crop = cropForViewfinder(video)
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

