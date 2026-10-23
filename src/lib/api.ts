import { mockChatAnswer, mockReportForSeed } from '@shared/mock-reports'
import type {
  Analysis,
  AnalyzeResponse,
  AttractionReport,
  ChatMessage,
  ChatResponse,
  GuideLanguage,
  GeoPoint,
} from '@shared/types'
import type {
  WalkMessageResult,
  WalkPlanSummary,
  WalkRecord,
  WalkSnapshot,
} from '@shared/walks'
import type { CaptureContinuation } from '@/store/app'
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

export interface AnalyzePhotoOptions {
  image: Blob
  /** 720px copy kept for follow-up questions. Omit in demo mode. */
  chatImage?: Blob
  /**
   * Client-generated idempotency key. Sending it asks the Worker to archive
   * the capture; omitting it keeps the request stateless (demo mode).
   */
  captureId?: string
  location?: GeoPoint
  /** Compass heading in degrees, when the device reports one. */
  heading?: number
  /** A candidate the traveller picked after a low-confidence answer. */
  hint?: string
  language: GuideLanguage
  signal?: AbortSignal
  /** The shot the guide asked for, when this photo answers it. */
  continuation?: CaptureContinuation
}

export async function analyzePhoto(options: AnalyzePhotoOptions): Promise<AnalyzeResponse> {
  const { image, chatImage, captureId, location, heading, hint, language, signal, continuation } =
    options
  const form = new FormData()
  form.append('image', image, 'capture.jpg')
  if (chatImage) form.append('chatImage', chatImage, 'chat.jpg')
  if (captureId) form.append('captureId', captureId)
  if (location) form.append('location', JSON.stringify(location))
  if (typeof heading === 'number' && Number.isFinite(heading)) {
    form.append('heading', String(heading))
  }
  if (hint) form.append('hint', hint)
  form.append('language', language)
  if (continuation) form.append('continuation', JSON.stringify(continuation))

  try {
    const response = await fetch('/api/analyze', { method: 'POST', body: form, signal })

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

/** Demo-mode chat: the report travels with the request and nothing is stored. */
export async function askGuide(options: {
  report: AttractionReport
  messages: ChatMessage[]
  question: string
  language: GuideLanguage
  signal?: AbortSignal
}): Promise<string> {
  const { report, messages, question, language, signal } = options

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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

/**
 * Remote chat. The Worker already has the photo, the report and the history,
 * so the client only sends the question. The whole analysis comes back with
 * the two new messages appended.
 */
export async function askGuideForAnalysis(options: {
  analysisId: string
  question: string
  signal?: AbortSignal
}): Promise<Analysis> {
  const { analysisId, question, signal } = options
  try {
    const response = await fetch(`/api/analyses/${encodeURIComponent(analysisId)}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question }),
      signal,
    })

    if (!response.ok) {
      const { message, code } = await parseError(response)
      throw new ApiError(message, code ?? `http_${response.status}`, response.status)
    }

    const body = (await response.json()) as { analysis: Analysis }
    return body.analysis
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    if (error instanceof ApiError) throw error
    throw new ApiError('Could not reach the guide. Check your connection.', 'network_error')
  }
}

// ─────────────────────────────────────────────────────────────
// Guided walks (Pi Durable)
// ─────────────────────────────────────────────────────────────

export async function listWalkPlans(signal?: AbortSignal): Promise<WalkPlanSummary[]> {
  const response = await fetch('/api/walks/plans', { signal })
  const body = await expectJson<{ plans: WalkPlanSummary[] }>(response)
  return body.plans
}

export interface StartWalkOptions {
  /** Curated route (the backwards-compatible path). */
  planId?: string
  /** Photo report that seeds an on-the-fly tour. */
  analysisId?: string
  place?: string
  title?: string
  country?: string
  location?: GeoPoint
  language: GuideLanguage
  signal?: AbortSignal
}

/**
 * Two modes behind one call: a curated `planId`, or a photo context that asks
 * the Worker to build a fresh route from real places around the location.
 */
export async function startWalk(options: StartWalkOptions): Promise<WalkSnapshot> {
  const response = await fetch('/api/walks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      planId: options.planId,
      analysisId: options.analysisId,
      place: options.place,
      title: options.title,
      country: options.country,
      location: options.location,
      language: options.language,
    }),
    signal: options.signal,
  })
  return expectJson<WalkSnapshot>(response)
}

/** The account's open tours (empty in demo mode). */
export async function listWalks(
  options: { status?: 'active' | 'complete' | 'all'; signal?: AbortSignal } = {},
): Promise<WalkRecord[]> {
  const query = options.status ? `?status=${options.status}` : ''
  const response = await fetch(`/api/walks${query}`, { signal: options.signal })
  if (response.status === 404) return []
  const body = await expectJson<{ walks: WalkRecord[] }>(response)
  return body.walks
}

export async function getWalk(id: string, signal?: AbortSignal): Promise<WalkSnapshot | null> {
  const response = await fetch(`/api/walks/${encodeURIComponent(id)}`, { signal })
  if (response.status === 404) return null
  return expectJson<WalkSnapshot>(response)
}

/**
 * One walk turn. `operationId` makes a retry safe: the same id is one Pi
 * submission, so a flaky connection cannot buy two answers.
 */
export async function sendWalkMessage(options: {
  id: string
  text?: string
  image?: Blob
  operationId?: string
  signal?: AbortSignal
}): Promise<WalkMessageResult> {
  const { id, text, image, operationId, signal } = options
  let body: BodyInit
  const headers: Record<string, string> = {}

  if (image) {
    const form = new FormData()
    if (text) form.append('text', text)
    if (operationId) form.append('operationId', operationId)
    form.append('image', image, 'walk.jpg')
    body = form
  } else {
    headers['content-type'] = 'application/json'
    body = JSON.stringify({ text, operationId })
  }

  const response = await fetch(`/api/walks/${encodeURIComponent(id)}/message`, {
    method: 'POST',
    headers,
    body,
    signal,
  })
  return expectJson<WalkMessageResult>(response)
}

export async function advanceWalk(id: string): Promise<WalkMessageResult> {
  const response = await fetch(`/api/walks/${encodeURIComponent(id)}/advance`, {
    method: 'POST',
  })
  return expectJson<WalkMessageResult>(response)
}

export async function resetWalk(id: string): Promise<WalkSnapshot> {
  const response = await fetch(`/api/walks/${encodeURIComponent(id)}/reset`, { method: 'POST' })
  return expectJson<WalkSnapshot>(response)
}

// ─────────────────────────────────────────────────────────────
// Analyses CRUD, used by ApiRepository in remote mode.
// ─────────────────────────────────────────────────────────────

async function expectJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const { message, code } = await parseError(response)
    throw new ApiError(message, code ?? `http_${response.status}`, response.status)
  }
  return (await response.json()) as T
}

export async function listAnalyses(): Promise<Analysis[]> {
  const response = await fetch('/api/analyses')
  const body = await expectJson<{ analyses: Analysis[] }>(response)
  return body.analyses
}

export async function getAnalysis(id: string): Promise<Analysis | null> {
  const response = await fetch(`/api/analyses/${encodeURIComponent(id)}`)
  if (response.status === 404) return null
  const body = await expectJson<{ analysis: Analysis }>(response)
  return body.analysis
}

export async function setAnalysisSaved(id: string, saved: boolean): Promise<Analysis> {
  const response = await fetch(`/api/analyses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ saved }),
  })
  const body = await expectJson<{ analysis: Analysis }>(response)
  return body.analysis
}

export async function deleteAnalysis(id: string): Promise<void> {
  const response = await fetch(`/api/analyses/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    const { message, code } = await parseError(response)
    throw new ApiError(message, code ?? `http_${response.status}`, response.status)
  }
}

export async function clearAnalyses(): Promise<void> {
  const response = await fetch('/api/analyses', { method: 'DELETE' })
  if (!response.ok) {
    const { message, code } = await parseError(response)
    throw new ApiError(message, code ?? `http_${response.status}`, response.status)
  }
}
