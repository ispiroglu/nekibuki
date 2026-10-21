/**
 * The image pipeline, off the main thread.
 *
 * Decoding a photo and encoding it again is the most expensive thing this app
 * does: a camera frame is millions of pixels, and `canvas.toBlob` runs a
 * software JPEG encoder. On the main thread that stalls the frame the user is
 * looking at — the shutter feels dead, the viewfinder freezes.
 *
 * So the pixels come here instead. The main thread hands over a frame as an
 * `ImageBitmap` (a GPU-backed handle, transferable without a copy) and gets
 * back an encoded blob. Nothing in this file touches the DOM.
 */

import type { EncodeRequest, EncodeResponse } from './image-worker-protocol'

/**
 * The worker's global scope. It is typed by hand because the DOM and
 * WebWorker type libraries cannot both be loaded in one program, and this file
 * only ever runs inside a dedicated worker.
 */
const scope = globalThis as unknown as {
  postMessage: (message: EncodeResponse, transfer?: Transferable[]) => void
  addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void
}

/** Encodes a blob as a base64 data URL, without `FileReader`. */
async function toDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return `data:${blob.type};base64,${btoa(binary)}`
}

/** Decodes a blob, honouring the EXIF orientation when the browser can. */
async function decode(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    return await createImageBitmap(blob)
  }
}

async function encode(request: EncodeRequest): Promise<EncodeResponse> {
  const source = request.source
  const bitmap = source instanceof ImageBitmap ? source : await decode(source)

  try {
    const crop = request.crop
    const sourceWidth = crop ? crop.width : bitmap.width
    const sourceHeight = crop ? crop.height : bitmap.height
    if (!sourceWidth || !sourceHeight) throw new Error('empty_source')

    let scale = 1
    if (request.width) {
      scale = Math.min(1, request.width / sourceWidth)
    } else if (request.maxEdge) {
      scale = Math.min(1, request.maxEdge / Math.max(sourceWidth, sourceHeight))
    }

    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))

    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('no_2d_context')

    context.imageSmoothingQuality = 'high'
    context.drawImage(
      bitmap,
      crop?.x ?? 0,
      crop?.y ?? 0,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    )

    const blob = await canvas.convertToBlob({ type: request.mime, quality: request.quality })

    if (request.output === 'dataUrl') {
      return { id: request.id, ok: true, dataUrl: await toDataUrl(blob), width, height }
    }
    return { id: request.id, ok: true, blob, width, height }
  } finally {
    if (source instanceof ImageBitmap) source.close()
  }
}

scope.addEventListener('message', (event: MessageEvent) => {
  const request = event.data as EncodeRequest
  void encode(request)
    .then((response) => scope.postMessage(response))
    .catch((error: unknown) => {
      scope.postMessage({
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.message : 'encode_failed',
      })
    })
})
