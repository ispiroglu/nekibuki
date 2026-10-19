import type { AttractionReport, GuideLanguage } from '@shared/types'

export type AppEnv = Env & {
  GEMINI_API_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
}

export interface VisionInput {
  image: ArrayBuffer
  mimeType: string
  location?: { latitude: number; longitude: number; accuracy?: number }
  language: GuideLanguage
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
