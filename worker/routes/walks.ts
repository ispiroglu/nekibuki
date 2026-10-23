import type { Context } from 'hono'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { geoPointSchema } from '@shared/schema'
import type { AttractionReport, GeoPoint, GuideLanguage } from '@shared/types'
import {
  WALK_PLANS,
  decodePlanId,
  planSummary,
  type WalkPlanSummary,
  type WalkSnapshot,
} from '@shared/walks'
import { findAnalysis } from '../lib/analyses'
import { geoPoint } from '../lib/geo'
import { requireUser, type AuthContext } from '../lib/session'
import { insertWalk, listWalks, syncWalkProgress } from '../lib/walks-db'
import { ProviderError, type WalkAgentRpc } from '../types'
import { generateWalkPlan } from '../walk/planner'
import type { WalkPlanContext } from '../walk/plan'

const MAX_PHOTO_BYTES = 12 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const WALK_ID = /^[a-zA-Z0-9-]{8,64}$/

const startSchema = z.object({
  planId: z.string().min(1).max(64).optional(),
  analysisId: z.string().min(1).max(100).optional(),
  place: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  country: z.string().trim().max(120).optional(),
  language: z.enum(['tr', 'en']).optional(),
  location: geoPointSchema.optional(),
})

export const walks = new Hono<AuthContext>()

/**
 * One Durable Object per walk. The owner is part of the object name, so a
 * guessed walk id cannot reach somebody else's session.
 */
function stubFor(c: Context<AuthContext>, walkId: string): WalkAgentRpc {
  const env = c.env
  if (!env.WALK_AGENT) {
    throw new ProviderError(
      'Walks are not configured on this deployment yet.',
      'walk_unavailable',
      503,
    )
  }
  if (!env.AI) {
    throw new ProviderError(
      'The walk guide needs an AI binding. Add `ai.binding` to wrangler.jsonc.',
      'walk_unavailable',
      503,
    )
  }

  const owner = c.get('authEnabled') ? requireUser(c).id : 'demo'
  const stub = env.WALK_AGENT.getByName(`${owner}:${walkId}`)
  return stub as unknown as WalkAgentRpc
}

function assertWalkId(value: string | undefined): string {
  if (!value || !WALK_ID.test(value)) {
    throw new HTTPException(404, { message: 'That walk was not found.' })
  }
  return value
}

/** The D1 owner, or null in demo mode where there is no account to index for. */
function ownerOf(c: Context<AuthContext>): string | null {
  if (!c.get('authEnabled')) return null
  return requireUser(c).id
}

async function callWalk<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof ProviderError) throw error
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Walk agent failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    throw new ProviderError(
      error instanceof Error && error.message
        ? `The guide could not continue the walk: ${error.message}`
        : 'The guide could not continue the walk. Try again in a moment.',
      'walk_failed',
      502,
    )
  }
}

function extensionFor(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/heic') return 'heic'
  if (type === 'image/heif') return 'heif'
  return 'jpg'
}

/**
 * Remember the walk against the account. This is best effort: a D1 hiccup
 * must not throw away a route the traveller can already use. The Durable
 * Object remains the source of truth.
 */
async function recordWalk(
  c: Context<AuthContext>,
  userId: string | null,
  snapshot: WalkSnapshot,
  analysisId?: string,
): Promise<void> {
  if (!userId || !c.env.nekibuki) return

  try {
    await insertWalk(c.env.nekibuki, {
      id: snapshot.id,
      userId,
      analysisId: analysisId ?? snapshot.plan.analysisId,
      planId: snapshot.plan.id,
      source: snapshot.plan.source ?? 'curated',
      title: snapshot.plan.title,
      titleEn: snapshot.plan.titleEn,
      place: snapshot.plan.place,
      country: snapshot.plan.country,
      language: snapshot.language,
      stopCount: snapshot.plan.stopCount,
      now: Date.now(),
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Could not index the walk for the account',
        walkId: snapshot.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
  }
}

/** Mirror progress into D1 after a turn so "Devam et" survives a device change. */
async function syncWalk(c: Context<AuthContext>, snapshot: WalkSnapshot): Promise<void> {
  const userId = ownerOf(c)
  if (!userId || !c.env.nekibuki) return

  try {
    await syncWalkProgress(c.env.nekibuki, userId, snapshot)
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Could not sync walk progress',
        walkId: snapshot.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
  }
}

/**
 * A photo report is the context for a generated tour. When the report still
 * exists in D1 it wins over client-supplied text, so a walk cannot be steered
 * to a different place by editing the request body.
 */
async function planContextFor(
  c: Context<AuthContext>,
  body: z.infer<typeof startSchema>,
  userId: string | null,
): Promise<WalkPlanContext> {
  let report: AttractionReport | undefined
  let storedLocation: GeoPoint | undefined
  let storedLanguage: GuideLanguage | undefined

  if (body.analysisId && userId && c.env.nekibuki) {
    const row = await findAnalysis(c.env.nekibuki, userId, body.analysisId)
    if (!row) throw new HTTPException(404, { message: 'That photo is not in your history.' })
    report = JSON.parse(row.report) as AttractionReport
    storedLocation = row.location ? (JSON.parse(row.location) as GeoPoint) : undefined
    storedLanguage = row.language === 'en' ? 'en' : 'tr'
  }

  const location =
    storedLocation ??
    body.location ??
    geoPoint(report?.location.lat, report?.location.lng)

  if (!location) {
    throw new ProviderError(
      'This tour needs the location of the photo. Take the photo again with location on, or open a saved place that already has a position.',
      'walk_location_required',
      422,
    )
  }

  // The traveller's current UI choice wins over the language the report was
  // written in; the guide should speak the language they are using now.
  const language: GuideLanguage = body.language ?? storedLanguage ?? 'tr'

  return {
    ...(body.analysisId ? { analysisId: body.analysisId } : {}),
    // Stored report values win when they exist; the body is only a fallback
    // for demo mode or an analysis that has since been deleted.
    title: report?.title || body.title || 'Guided walk',
    summary: report?.summary,
    place: report?.location.name || body.place || '',
    country: report?.location.country || body.country,
    location,
    language,
  }
}

// ─────────────────────────────────────────────────────────────
// Plans and active walks
// ─────────────────────────────────────────────────────────────

walks.get('/plans', (c) => {
  const plans: WalkPlanSummary[] = WALK_PLANS.map(planSummary)
  return c.json({ plans }, 200, { 'cache-control': 'public, max-age=300' })
})

/** The traveller's open tours, for the report CTA and the Places panel. */
walks.get('/', async (c) => {
  if (!c.get('authEnabled')) return c.json({ walks: [] }, 200, { 'cache-control': 'no-store' })
  const user = requireUser(c)
  if (!c.env.nekibuki) return c.json({ walks: [] }, 200, { 'cache-control': 'no-store' })

  const status = c.req.query('status')
  const filter = status === 'all' || status === 'complete' ? status : 'active'
  const records = await listWalks(c.env.nekibuki, user.id, filter)
  return c.json({ walks: records }, 200, { 'cache-control': 'no-store' })
})

// ─────────────────────────────────────────────────────────────
// Start / read
// ─────────────────────────────────────────────────────────────

walks.post('/', async (c) => {
  const body = startSchema.safeParse(await c.req.json().catch(() => null))
  if (!body.success) throw new HTTPException(400, { message: 'The walk details are incomplete.' })

  const userId = ownerOf(c)
  const id = crypto.randomUUID()
  const input = body.data
  const generated = Boolean(input.analysisId || input.location || input.place)

  // Fail before spending a map + model round when walks are not configured.
  const stub = stubFor(c, id)

  if (generated) {
    const context = await planContextFor(c, input, userId)
    const planId = `generated-${id}`
    const { plan } = await generateWalkPlan(c.env, context, planId)

    const snapshot = await callWalk(() =>
      stub.start({ walkId: id, planId: plan.id, language: context.language, plan }),
    )
    await recordWalk(c, userId, snapshot, context.analysisId)
    return c.json(snapshot, 201, { 'cache-control': 'no-store' })
  }

  const planId = decodePlanId(input.planId)
  const language: GuideLanguage = input.language === 'en' ? 'en' : 'tr'
  const snapshot = await callWalk(() => stub.start({ walkId: id, planId, language }))
  await recordWalk(c, userId, snapshot)
  return c.json(snapshot, 201, { 'cache-control': 'no-store' })
})

walks.get('/:id', async (c) => {
  const id = assertWalkId(c.req.param('id'))
  const snapshot = await callWalk(() => stubFor(c, id).snapshot())
  await syncWalk(c, snapshot)
  return c.json(snapshot, 200, { 'cache-control': 'no-store' })
})

// ─────────────────────────────────────────────────────────────
// Talk to the guide
// ─────────────────────────────────────────────────────────────

walks.post('/:id/message', async (c) => {
  const id = assertWalkId(c.req.param('id'))
  const contentType = c.req.header('content-type') ?? ''

  let text = ''
  let photoKey: string | undefined
  let mimeType: string | undefined
  let operationId: string | undefined

  const normaliseOperationId = (value: unknown): string | undefined =>
    typeof value === 'string' && /^[a-zA-Z0-9:_-]{8,128}$/.test(value) ? value : undefined

  if (contentType.includes('multipart/form-data')) {
    let form: FormData
    try {
      form = await c.req.formData()
    } catch {
      throw new HTTPException(400, { message: 'Send the message as multipart/form-data.' })
    }

    const rawText = form.get('text')
    text = typeof rawText === 'string' ? rawText.trim().slice(0, 4000) : ''
    operationId = normaliseOperationId(form.get('operationId'))

    const image = form.get('image')
    if (image instanceof File) {
      if (image.size > MAX_PHOTO_BYTES) {
        throw new HTTPException(413, { message: 'That photo is larger than 12 MB. Try a smaller one.' })
      }
      if (!ALLOWED_TYPES.has(image.type)) {
        throw new HTTPException(415, { message: 'Use a JPEG, PNG or WebP photo.' })
      }
      if (!c.env.CAPTURES) {
        throw new ProviderError(
          'Photo storage is not configured on this deployment yet.',
          'walk_unavailable',
          503,
        )
      }

      mimeType = image.type || 'image/jpeg'
      const owner = c.get('authEnabled') ? requireUser(c).id : 'demo'
      photoKey = `walks/${owner}/${id}/${crypto.randomUUID()}.${extensionFor(mimeType)}`
      await c.env.CAPTURES.put(photoKey, await image.arrayBuffer(), {
        httpMetadata: { contentType: mimeType },
      })
    }
  } else {
    const body = (await c.req.json().catch(() => null)) as
      | { text?: unknown; operationId?: unknown }
      | null
    text = typeof body?.text === 'string' ? body.text.trim().slice(0, 4000) : ''
    operationId = normaliseOperationId(body?.operationId)
  }

  if (!text && !photoKey) {
    throw new HTTPException(400, { message: 'Send a message or a photo.' })
  }

  const result = await callWalk(() =>
    stubFor(c, id).message({ text, photoKey, mimeType, operationId }),
  )
  await syncWalk(c, result.snapshot)

  return c.json(result, 200, { 'cache-control': 'no-store' })
})

walks.post('/:id/advance', async (c) => {
  const id = assertWalkId(c.req.param('id'))
  const result = await callWalk(() => stubFor(c, id).advance())
  await syncWalk(c, result.snapshot)
  return c.json(result, 200, { 'cache-control': 'no-store' })
})

walks.post('/:id/reset', async (c) => {
  const id = assertWalkId(c.req.param('id'))
  const snapshot = await callWalk(() => stubFor(c, id).reset())
  return c.json(snapshot, 200, { 'cache-control': 'no-store' })
})
