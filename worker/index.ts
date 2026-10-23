import { chatRequestSchema, geoPointSchema } from '@shared/schema'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { getMigrations } from 'better-auth/db/migration'
import type { Analysis, AttractionReport, GuideLanguage } from '@shared/types'
import { authConfigured, authReady, createAuth } from './auth'
import {
  bumpUsage,
  dailyLimits,
  findCapture,
  imageUrl,
  insertAnalysis,
  keysFor,
  readUsage,
  toAnalysis,
} from './lib/analyses'
import { nearbyPlaces } from './lib/nearby'
import { requireUser, withSession, type AuthContext } from './lib/session'
import { analyses } from './routes/analyses'
import { walks } from './routes/walks'
import { providerFor } from './services/provider'
import {
  ProviderError,
  type AppEnv,
  type VisionContinuation,
  type VisionInput,
  type VisionProvider,
} from './types'

const app = new Hono<AuthContext>()

const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_CHAT_IMAGE_BYTES = 2 * 1024 * 1024
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
  | 'walk_failed'
  | 'walk_unavailable'
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
  'walk_failed',
  'walk_unavailable',
])

function codeForStatus(status: number): ApiErrorCode {
  return STATUS_ERROR_CODES[status] ?? 'internal'
}

function codeForProvider(code: string): ApiErrorCode {
  return PROVIDER_ERROR_CODES.has(code as ApiErrorCode) ? (code as ApiErrorCode) : 'internal'
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

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────

/**
 * One-time schema creation for Better Auth's own tables. D1 cannot be reached
 * by the Better Auth CLI, so the migration runs inside the Worker. Guarded by
 * MIGRATE_SECRET and safe to leave undeployed once the tables exist.
 */
app.post('/api/auth/migrate', async (c) => {
  const secret = c.env.MIGRATE_SECRET
  if (!secret || c.req.header('x-migrate-secret') !== secret) {
    return c.json({ error: 'Not found', code: 'not_found' }, 404)
  }
  if (!authReady(c.env)) {
    return c.json({ error: 'Auth is not configured.', code: 'internal' }, 503)
  }

  try {
    const auth = createAuth(c.env)
    const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options)
    if (toBeCreated.length === 0 && toBeAdded.length === 0) {
      return c.json({ message: 'No migrations needed' })
    }
    await runMigrations()
    return c.json({
      message: 'Migrations completed',
      created: toBeCreated.map((table) => table.table),
      added: toBeAdded.map((table) => table.table),
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Auth migration failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    return c.json(
      { error: error instanceof Error ? error.message : 'Migration failed', code: 'internal' },
      500,
    )
  }
})

app.all('/api/auth/*', (c) => {
  if (!authConfigured(c.env)) {
    return c.json({ error: 'Accounts are not configured on this deployment.', code: 'internal' }, 503)
  }
  return createAuth(c.env).handler(c.req.raw)
})

// ─────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    provider: c.env.VISION_PROVIDER ?? 'mock',
    model: c.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite',
    auth: authConfigured(c.env),
    db: Boolean(c.env.nekibuki),
    storage: Boolean(c.env.CAPTURES),
    walk: Boolean(c.env.WALK_AGENT && c.env.AI),
  }),
)

// ─────────────────────────────────────────────────────────────
// Analyse
// ─────────────────────────────────────────────────────────────

app.use('/api/analyze', withSession)

app.post('/api/analyze', async (c) => {
  const user = c.get('authEnabled') ? requireUser(c) : null

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

  const chatImage = form.get('chatImage')
  const chatFile = chatImage instanceof File ? chatImage : null
  if (chatFile && chatFile.size > MAX_CHAT_IMAGE_BYTES) {
    throw new HTTPException(413, { message: 'The chat copy of the photo is too large.' })
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

  const rawHeading = form.get('heading')
  const heading =
    typeof rawHeading === 'string' && rawHeading.trim() && Number.isFinite(Number(rawHeading))
      ? Number(rawHeading)
      : undefined

  const rawHint = form.get('hint')
  const hint = typeof rawHint === 'string' && rawHint.trim() ? rawHint.trim().slice(0, 120) : undefined

  const language = languageFrom(form.get('language'))
  const continuation = continuationFrom(form.get('continuation'))
  const captureId =
    typeof form.get('captureId') === 'string' && (form.get('captureId') as string).trim()
      ? (form.get('captureId') as string).trim()
      : crypto.randomUUID()

  // A retried request must not call the model twice or archive two photos.
  if (user) {
    const existing = await findCapture(c.env.nekibuki, user.id, captureId)
    if (existing) {
      return c.json(
        {
          report: JSON.parse(existing.report) as AttractionReport,
          analysis: toAnalysis(existing),
          meta: {
            provider: existing.provider === 'gemini' ? 'gemini' : 'mock',
            model: existing.model ?? undefined,
            processingMs: 0,
          },
        },
        200,
        { 'cache-control': 'no-store' },
      )
    }

    const limits = dailyLimits(c.env)
    const usage = await readUsage(c.env.nekibuki, user.id)
    if (usage.analyses >= limits.analyses) {
      throw new HTTPException(429, {
        message: 'You have reached today’s guide limit. It resets at midnight UTC.',
      })
    }
  }

  const imageData = await image.arrayBuffer()
  const nearby = await nearbyPlaces(location, language)
  const provider = providerFor(c.env)
  const started = Date.now()
  const report = await analyzeWith(provider, {
    image: imageData,
    mimeType: image.type,
    location,
    heading,
    nearby,
    hint,
    language,
    continuation,
  })

  let analysis: Analysis | undefined
  if (user) {
    if (!c.env.CAPTURES) {
      throw new HTTPException(503, {
        message: 'Photo storage is not configured on this deployment yet.',
      })
    }

    const id = crypto.randomUUID()
    const hasChat = Boolean(chatFile)
    const keys = keysFor(user.id, id, hasChat)
    const now = Date.now()

    const photoBytes = imageData
    const chatBytes = chatFile ? await chatFile.arrayBuffer() : null

    try {
      await c.env.CAPTURES.put(keys.photo, photoBytes, {
        httpMetadata: { contentType: image.type || 'image/jpeg' },
      })
      if (keys.chat && chatBytes) {
        await c.env.CAPTURES.put(keys.chat, chatBytes, {
          httpMetadata: { contentType: chatFile?.type || 'image/jpeg' },
        })
      }

      const inserted = await insertAnalysis(c.env.nekibuki, {
        id,
        userId: user.id,
        captureId,
        report,
        location,
        language,
        imageKey: keys.photo,
        chatKey: keys.chat,
        provider: provider.name,
        model: provider.model,
        now,
      })

      if (!inserted) {
        // Another request won the race; drop this copy and return theirs.
        await c.env.CAPTURES.delete(
          [keys.photo, keys.chat].filter((key): key is string => Boolean(key)),
        )
        const existing = await findCapture(c.env.nekibuki, user.id, captureId)
        if (!existing) throw new Error('Capture conflict without an owner row.')
        analysis = toAnalysis(existing)
      } else {
        analysis = {
          id,
          createdAt: now,
          report,
          location,
          language,
          messages: [],
          saved: false,
          imageUrl: imageUrl(id),
          previewUrl: imageUrl(id, 'chat'),
          provider: provider.name,
          model: provider.model,
        }
        // Quota bookkeeping must never undo a capture that is already stored.
        try {
          await bumpUsage(c.env.nekibuki, user.id, 'analyses')
        } catch (error) {
          console.error(
            JSON.stringify({
              level: 'error',
              message: 'Could not record usage',
              error: error instanceof Error ? error.message : String(error),
            }),
          )
        }
      }
    } catch (error) {
      // Never leave half a capture behind.
      try {
        await c.env.CAPTURES.delete(
          [keys.photo, keys.chat].filter((key): key is string => Boolean(key)),
        )
      } catch {
        // best effort
      }
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Could not archive the capture',
          error: error instanceof Error ? error.message : String(error),
        }),
      )
      throw new HTTPException(502, {
        message: 'The guide read the photo but could not save it. Try again.',
      })
    }
  }

  return c.json(
    {
      report,
      analysis,
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

// ─────────────────────────────────────────────────────────────
// Legacy demo chat (the report travels in the body; nothing is stored)
// ─────────────────────────────────────────────────────────────

app.use('/api/chat', withSession)

app.post('/api/chat', async (c) => {
  if (c.get('authEnabled')) requireUser(c)

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

// ─────────────────────────────────────────────────────────────
// Stored analyses
// ─────────────────────────────────────────────────────────────

app.use('/api/analyses', withSession)
app.use('/api/analyses/*', withSession)
app.route('/api/analyses', analyses)

// ─────────────────────────────────────────────────────────────
// Guided walks (Pi Durable)
// ─────────────────────────────────────────────────────────────

app.use('/api/walks', withSession)
app.use('/api/walks/*', withSession)
app.route('/api/walks', walks)

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

/**
 * The Pi Durable walk guide. One object per walk; the API reaches it through
 * the `WALK_AGENT` binding.
 */
export { WalkAgent } from './walk/agent'
