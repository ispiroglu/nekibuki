import { chatRequestSchema, geoPointSchema } from '@shared/schema'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { GuideLanguage } from '@shared/types'
import { GeminiProvider } from './services/gemini'
import { MockVisionProvider } from './services/mock'
import { ProviderError, type AppEnv, type VisionProvider } from './types'

const app = new Hono<{ Bindings: AppEnv }>()

const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

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
  })

  if (!response.ok) {
    throw new HTTPException(401, { message: 'Your session expired. Sign in again.' })
  }
}

function languageFrom(value: FormDataEntryValue | null): GuideLanguage {
  return value === 'tr' ? 'tr' : 'en'
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

  const form = await c.req.formData()
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
  const provider = providerFor(c.env)
  const started = Date.now()
  const report = await provider.analyze({
    image: await image.arrayBuffer(),
    mimeType: image.type,
    location,
    language,
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
  const answer = await provider.chat({
    report,
    history: messages.map((message) => ({ role: message.role, content: message.content })),
    question,
    language,
  })

  return c.json({ answer, provider: provider.name }, 200, { 'cache-control': 'no-store' })
})

app.notFound((c) => c.json({ error: 'Not found' }, 404))

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status as ContentfulStatusCode)
  }
  if (error instanceof ProviderError) {
    return c.json(
      { error: error.message, code: error.code },
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
  return c.json({ error: 'Something went wrong. Please try again.' }, 500)
})

export default app
