import { mockChatAnswer, mockReportForSeed } from '@shared/mock-reports'
import type {
  AnalyzeResponse,
  AttractionReport,
  ChatMessage,
  ChatResponse,
  GeoPoint,
  GuideLanguage,
} from '@shared/types'
import { sleep } from './utils'

const MOCK_FALLBACK = import.meta.env.VITE_MOCK_ANALYSIS === 'true'

export class ApiError extends Error {
  /** A stable machine-readable reason, e.g. `session_expired` or `network_error`. */
  code: string
  /** The HTTP status, when the failure came from the server. */
  status: number | null

  constructor(message: string, code = 'api_error', status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }

  /** True when the traveller has to sign in again before the guide can answer. */
  get isAuthFailure(): boolean {
    return this.code === 'session_expired' || this.status === 401
  }
}

function headers(token: string | null): HeadersInit {
  return token ? { authorization: `Bearer ${token}` } : {}
}

/** Reads the server's own message and reason, so the UI can name the cause. */
async function parseError(response: Response): Promise<{ message: string; code?: string }> {
  try {
    const body = (await response.json()) as { error?: string; code?: string }
    const message =
      typeof body.error === 'string' ? body.error : 'Something went wrong. Please try again.'
    return { message, code: typeof body.code === 'string' ? body.code : undefined }
  } catch {
    return { message: 'Something went wrong. Please try again.' }
  }
}

async function clientMockAnalysis(image: Blob, language: GuideLanguage): Promise<AttractionReport> {
  await sleep(2400 + Math.random() * 900)
  const seed = `${image.size}-${image.type}-${language}`
  return structuredClone(mockReportForSeed(seed).report)
}

export async function analyzePhoto(options: {
  image: Blob
  location?: GeoPoint
  language: GuideLanguage
  token: string | null
  signal?: AbortSignal
}): Promise<AnalyzeResponse> {
  const { image, location, language, token, signal } = options
  const form = new FormData()
  form.append('image', image, 'capture.jpg')
  if (location) form.append('location', JSON.stringify(location))
  form.append('language', language)

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: form,
      headers: headers(token),
      signal,
    })

    if (!response.ok) {
      const { message, code } = await parseError(response)
      // A missing local API is a dev-time situation; fall back to the built-in guide.
      if (MOCK_FALLBACK && response.status >= 500 && !import.meta.env.PROD) {
        const report = await clientMockAnalysis(image, language)
        return { report, meta: { provider: 'mock', model: 'local-demo' } }
      }
      throw new ApiError(message, code ?? `http_${response.status}`, response.status)
    }

    return (await response.json()) as AnalyzeResponse
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    if (error instanceof ApiError) throw error
    if (MOCK_FALLBACK && !import.meta.env.PROD) {
      const report = await clientMockAnalysis(image, language)
      return { report, meta: { provider: 'mock', model: 'local-demo' } }
    }
    throw new ApiError('Could not reach the guide. Check your connection.', 'network_error')
  }
}

export async function askGuide(options: {
  report: AttractionReport
  messages: ChatMessage[]
  question: string
  language: GuideLanguage
  token: string | null
  signal?: AbortSignal
}): Promise<string> {
  const { report, messages, question, language, token, signal } = options

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers(token) },
      body: JSON.stringify({ report, messages, question, language }),
      signal,
    })

    if (!response.ok) {
      const { message, code } = await parseError(response)
      if (MOCK_FALLBACK && response.status >= 500 && !import.meta.env.PROD) {
        await sleep(700)
        return mockChatAnswer(report, question)
      }
      throw new ApiError(message, code ?? `http_${response.status}`, response.status)
    }

    const body = (await response.json()) as ChatResponse
    return body.answer
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    if (error instanceof ApiError) throw error
    if (MOCK_FALLBACK && !import.meta.env.PROD) {
      await sleep(750)
      return mockChatAnswer(report, question)
    }
    throw new ApiError('Could not reach the guide. Check your connection.', 'network_error')
  }
}
