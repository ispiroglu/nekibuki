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

/** Grabs the current video frame as a JPEG blob. */
export function captureVideoFrame(video: HTMLVideoElement, quality = 0.92): Promise<Blob | null> {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return Promise.resolve(null)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(null)
  context.drawImage(video, 0, 0, width, height)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality))
}
