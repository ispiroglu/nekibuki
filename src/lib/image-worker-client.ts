/**
 * The client side of the image worker.
 *
 * The worker is created on first use, not at import time: the app opens on the
 * profile screen, and a camera pipeline has no business starting before the
 * camera does. If the browser cannot run it — no `OffscreenCanvas`, no module
 * workers, a locked-down WebView — the caller falls back to the main thread.
 */

import type { EncodeRequest, EncodeResponse } from './image-worker-protocol'

export interface EncodeResult {
  /** The encoded image, when the reply was a blob. */
  blob?: Blob
  /** The encoded image as a data URL, when the reply asked for one. */
  dataUrl?: string
  /** The width of the encoded image, in pixels. */
  width?: number
  /** The height of the encoded image, in pixels. */
  height?: number
}

interface Pending {
  resolve: (result: EncodeResult) => void
  reject: (error: Error) => void
}

let instance: Worker | null = null
let unavailable = false
let nextId = 1
const pending = new Map<number, Pending>()

function failAll(error: Error) {
  for (const [, entry] of pending) entry.reject(error)
  pending.clear()
}

function getWorker(): Worker | null {
  if (unavailable) return null
  if (instance) return instance

  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    unavailable = true
    return null
  }

  try {
    instance = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' })
  } catch {
    unavailable = true
    instance = null
    return null
  }

  instance.addEventListener('message', (event: MessageEvent<EncodeResponse>) => {
    const response = event.data
    const entry = pending.get(response.id)
    if (!entry) return
    pending.delete(response.id)
    if (!response.ok) {
      entry.reject(new Error(response.error ?? 'encode_failed'))
      return
    }
    entry.resolve({
      blob: response.blob,
      dataUrl: response.dataUrl,
      width: response.width,
      height: response.height,
    })
  })

  instance.addEventListener('error', () => {
    // A worker that dies takes every job with it. Say so, and let the next
    // caller take the main-thread road instead.
    instance?.terminate()
    instance = null
    unavailable = true
    failAll(new Error('image_worker_failed'))
  })

  return instance
}

/**
 * Encodes an image in the worker.
 *
 * `transfer` carries the sources that must not be copied — an `ImageBitmap`
 * is handed over rather than cloned, which is the difference between a
 * zero-copy handoff and a multi-megabyte copy.
 */
export function encodeImage(
  request: Omit<EncodeRequest, 'id'>,
  transfer: Transferable[] = [],
): Promise<EncodeResult> {
  const worker = getWorker()
  if (!worker) return Promise.reject(new Error('image_worker_unavailable'))

  const id = nextId++
  return new Promise<EncodeResult>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    try {
      worker.postMessage({ ...request, id } as EncodeRequest, transfer)
    } catch (error) {
      pending.delete(id)
      reject(error instanceof Error ? error : new Error('image_worker_post_failed'))
    }
  })
}

/** True when the worker pipeline is available in this browser. */
export function hasImageWorker(): boolean {
  return getWorker() !== null
}

/**
 * Starts the worker before it is needed.
 *
 * The first capture would otherwise pay for fetching and compiling the
 * worker chunk; warming it while the camera is still opening moves that cost
 * off the shutter press.
 */
export function warmImageWorker(): void {
  getWorker()
}
