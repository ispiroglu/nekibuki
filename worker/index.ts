import { chatRequestSchema, geoPointSchema } from '@shared/schema'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AttractionReport, GuideLanguage } from '@shared/types'
import { GeminiProvider } from './services/gemini'
import { MockVisionProvider } from './services/mock'
import {
  ProviderError,
  type AppEnv,
  type VisionContinuation,
  type VisionInput,
  type VisionProvider,
} from './types'

const app = new Hono<{ Bindings: AppEnv }>()

const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

/**
 * Stable, machine-readable error codes. The client switches on `code`, never on
 * the message: an expired session and a dead network are different failures
 * and the traveller needs a different next step for each.
 */
export type ApiErrorCode =
  | 'session_expired'
  | 'bad_request'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'not_found'
  | 'method_not_allowed'
  | 'rate_limited'
  | 'missing_key'
  | 'invalid_key'
  | 'network_error'
  | 'blocked'
  | 'empty_response'
  | 'invalid_json'
  | 'invalid_report'
  | 'provider_error'
  | 'analysis_failed'
  | 'chat_failed'
  | 'internal'

/** Codes implied by the HTTP status of a plain `HTTPException`. */
const STATUS_ERROR_CODES: Partial<Record<number, ApiErrorCode>> = {
  400: 'bad_request',
  401: 'session_expired',
  404: 'not_found',
  405: 'method_not_allowed',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
  429: 'rate_limited',
  502: 'network_error',
  503: 'network_error',
  504: 'network_error',
}

/** Codes the vision provider is allowed to report. Anything else is internal. */
const PROVIDER_ERROR_CODES = new Set<ApiErrorCode>([
  'missing_key',
  'invalid_key',
  'rate_limited',
  'network_error',
  'blocked',
  'empty_response',
  'invalid_json',
  'invalid_report',
  'provider_error',
])

function codeForStatus(status: number): ApiErrorCode {
  return STATUS_ERROR_CODES[status] ?? 'internal'
}

function codeForProvider(code: string): ApiErrorCode {
  return PROVIDER_ERROR_CODES.has(code as ApiErrorCode) ? (code as ApiErrorCode) : 'internal'
}

function providerFor(env: AppEnv): VisionProvider {
  const configured = (env.VISION_PROVIDER as string | undefined)?.toLowerCase()
  if (configured === 'gemini') {
    if (!env.GEMINI_API_KEY) {
      throw new ProviderError(
        'Vision is not configured yet. Add GEMINI_API_KEY to the worker secrets.',
        'missing_key',
        503,
      )
    }
    return new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL || 'gemini-2.5-flash')
  }
  return new MockVisionProvider()
}

/**
 * When Supabase is configured, every vision call must carry a valid user token.
 * In demo/mock mode the API stays open so the flow works without setup.
 */
async function requireUser(env: AppEnv, authorization: string | undefined): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return
  if (!authorization?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Sign in to use the guide.' })
  }

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization,
    },
  }).catch(() => null)

  if (!response) {
    // The session could not be checked at all: that is a network failure, not
    // an expired session, and the traveller should not be asked to sign in.
    throw new HTTPException(503, { message: 'Could not confirm your session right now. Try again.' })
  }

  if (!response.ok) {
    throw new HTTPException(401, { message: 'Your session expired. Sign in again.' })
  }
}

function languageFrom(value: FormDataEntryValue | null): GuideLanguage {
  return value === 'tr' ? 'tr' : 'en'
}

/**
 * The shot the traveller was asked to take, when the photo answers a step the
 * guide proposed. It is a hint about the walk, never a contract: a malformed
 * field is ignored the same way a malformed location is, because a broken
 * caption must not fail the photo.
 */
function continuationFrom(value: FormDataEntryValue | null): VisionContinuation | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return undefined
  }
  if (!parsed || typeof parsed !== 'object') return undefined

  const { placeTitle, placeName, instruction } = parsed as Record<string, unknown>
  if (
    typeof placeTitle !== 'string' ||
    typeof placeName !== 'string' ||
    typeof instruction !== 'string'
  ) {
    return undefined
  }

  const continuation: VisionContinuation = {
    placeTitle: placeTitle.trim(),
    placeName: placeName.trim(),
    instruction: instruction.trim(),
  }
  if (!continuation.placeTitle || !continuation.placeName || !continuation.instruction) {
    return undefined
  }
  return continuation
}

/**
 * A failed analysis is never a silent failure: the provider's own code and
 * message survive, and anything else becomes an actionable `analysis_failed`.
 */
async function analyzeWith(provider: VisionProvider, input: VisionInput): Promise<AttractionReport> {
  try {
    return await provider.analyze(input)
  } catch (error) {
    if (error instanceof ProviderError) throw error
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Vision analysis failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    throw new ProviderError(
      'The guide could not read that photo. Try again in a moment.',
      'analysis_failed',
      502,
    )
  }
}

/** The same contract for the guide's answer: a named code, an actionable message. */
async function chatWith(
  provider: VisionProvider,
  input: Parameters<VisionProvider['chat']>[0],
): Promise<string> {
  try {
    return await provider.chat(input)
  } catch (error) {
    if (error instanceof ProviderError) throw error
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Guide answer failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    throw new ProviderError('The guide could not answer that. Try again in a moment.', 'chat_failed', 502)
  }
}

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    provider: c.env.VISION_PROVIDER ?? 'mock',
    model: c.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    auth: Boolean(c.env.SUPABASE_URL && c.env.SUPABASE_ANON_KEY),
  }),
)

app.post('/api/analyze', async (c) => {
  await requireUser(c.env, c.req.header('authorization'))

  const contentType = c.req.header('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    throw new HTTPException(415, { message: 'Send the photo as multipart/form-data.' })
  }

  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    throw new HTTPException(400, { message: 'Send the photo as multipart/form-data.' })
  }
  const image = form.get('image')

  if (!(image instanceof File)) {
    throw new HTTPException(400, { message: 'A photo is required.' })
  }
  if (image.size > MAX_IMAGE_BYTES) {
    throw new HTTPException(413, { message: 'That photo is larger than 12 MB. Try a smaller one.' })
  }
  if (!ALLOWED_TYPES.has(image.type)) {
    throw new HTTPException(415, { message: 'Use a JPEG, PNG or WebP photo.' })
  }

  let location: { latitude: number; longitude: number; accuracy?: number } | undefined
  const rawLocation = form.get('location')
  if (typeof rawLocation === 'string' && rawLocation.trim()) {
    try {
      const parsed = geoPointSchema.safeParse(JSON.parse(rawLocation))
      if (parsed.success) location = parsed.data
    } catch {
      // A malformed location is a hint, not a failure.
    }
  }

  const language = languageFrom(form.get('language'))
  const continuation = continuationFrom(form.get('continuation'))
  const provider = providerFor(c.env)
  const started = Date.now()
  const report = await analyzeWith(provider, {
    image: await image.arrayBuffer(),
    mimeType: image.type,
    location,
    language,
    continuation,
  })

  return c.json(
    {
      report,
      meta: {
        provider: provider.name,
        model: provider.model,
        processingMs: Date.now() - started,
      },
    },
    200,
    { 'cache-control': 'no-store' },
  )
})

app.post('/api/chat', async (c) => {
  await requireUser(c.env, c.req.header('authorization'))

  const body = await c.req.json().catch(() => null)
  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw new HTTPException(400, { message: 'The question is incomplete.' })
  }

  const provider = providerFor(c.env)
  const { report, messages, question, language } = parsed.data
  const answer = await chatWith(provider, {
    report,
    history: messages.map((message) => ({ role: message.role, content: message.content })),
    question,
    language,
  })

  return c.json({ answer, provider: provider.name }, 200, { 'cache-control': 'no-store' })
})

app.notFound((c) => c.json({ error: 'Not found', code: 'not_found' }, 404))

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json(
      { error: error.message, code: codeForStatus(error.status) },
      error.status as ContentfulStatusCode,
    )
  }
  if (error instanceof ProviderError) {
    return c.json(
      { error: error.message, code: codeForProvider(error.code) },
      error.status as ContentfulStatusCode,
    )
  }
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'Unhandled API error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }),
  )
  return c.json({ error: 'Something went wrong. Please try again.', code: 'internal' }, 500)
})

export default app
