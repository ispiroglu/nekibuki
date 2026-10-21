/**
 * The contract between the app and the image worker.
 *
 * Types only: both sides import this file for the shape of a message, and
 * nothing is executed from it.
 */

/** A region of the source, in source pixels. */
export interface SourceCrop {
  x: number
  y: number
  width: number
  height: number
}

export interface EncodeRequest {
  /** Correlates the reply with the request. */
  id: number
  /** The pixels to encode: a decoded video frame, or the raw blob. */
  source: ImageBitmap | Blob
  /** The region of the source to keep. The whole source when omitted. */
  crop?: SourceCrop
  /** Scale so the longest edge is at most this many pixels. */
  maxEdge?: number
  /** Scale so the width is exactly this many pixels. The height follows. */
  width?: number
  /** Encoder quality, 0–1. */
  quality: number
  /** The output type, e.g. `image/jpeg`. */
  mime: string
  /** Whether the worker replies with a blob or with a data URL. */
  output: 'blob' | 'dataUrl'
}

export interface EncodeResponse {
  id: number
  ok: boolean
  /** The encoded image, when the reply is a blob. */
  blob?: Blob
  /** The encoded image as a data URL, when the reply asks for one. */
  dataUrl?: string
  /** The width of the encoded image, in pixels. */
  width?: number
  /** The height of the encoded image, in pixels. */
  height?: number
  /** Why the encode failed. */
  error?: string
}
