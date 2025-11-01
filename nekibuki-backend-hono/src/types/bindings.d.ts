/// <reference types="@cloudflare/workers-types" />

export interface CloudflareBindings {
  SESSIONS: KVNamespace
  PHOTOS: R2Bucket
  GEMINI_API_KEY: string
  QSTASH_TOKEN: string
  QSTASH_CURRENT_SIGNING_KEY: string
  QSTASH_NEXT_SIGNING_KEY: string
  QSTASH_URL?: string
  WORKER_URL: string
}

export interface QueueMessage {
  sessionId: string
  location?: LocationContext
  language?: string
}

export interface LocationContext {
  latitude: number
  longitude: number
  accuracy?: number
}

