import type { AttractionReport, GuideLanguage } from '@shared/types'

export type AppEnv = Env & {
  GEMINI_API_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
}

/**
 * The frame the traveller was sent to take, when the guide is asking for a
 * second shot. It is what turns one analysis into a walk.
 */
export interface VisionContinuation {
  placeTitle: string
  placeName: string
  /** The shot the traveller was asked to take, in their words. */
  instruction: string
}

export interface VisionInput {
  image: ArrayBuffer
  mimeType: string
  location?: { latitude: number; longitude: number; accuracy?: number }
  language: GuideLanguage
  continuation?: VisionContinuation
}

export interface VisionProvider {
  readonly name: 'gemini' | 'mock'
  readonly model?: string
  analyze(input: VisionInput): Promise<AttractionReport>
  chat(input: {
    report: AttractionReport
    history: { role: 'user' | 'assistant'; content: string }[]
    question: string
    language: GuideLanguage
  }): Promise<string>
}

export class ProviderError extends Error {
  code: string
  status: number

  constructor(message: string, code = 'provider_error', status = 502) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
    this.status = status
  }
}
