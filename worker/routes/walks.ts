import type { Context } from 'hono'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { WALK_PLANS, decodePlanId, planSummary, type WalkPlanSummary } from '@shared/walks'
import { requireUser, type AuthContext } from '../lib/session'
import { ProviderError, type WalkAgentRpc } from '../types'

const MAX_PHOTO_BYTES = 12 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const WALK_ID = /^[a-zA-Z0-9-]{8,64}$/

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

// ─────────────────────────────────────────────────────────────
// Plans
// ─────────────────────────────────────────────────────────────

walks.get('/plans', (c) => {
  const plans: WalkPlanSummary[] = WALK_PLANS.map(planSummary)
  return c.json({ plans }, 200, { 'cache-control': 'public, max-age=300' })
})

// ─────────────────────────────────────────────────────────────
// Start / read
// ─────────────────────────────────────────────────────────────

walks.post('/', async (c) => {
  if (c.get('authEnabled')) requireUser(c)

  const body = (await c.req.json().catch(() => null)) as
    | { planId?: unknown; language?: unknown }
    | null

  const planId = decodePlanId(typeof body?.planId === 'string' ? body.planId : undefined)
  const language = body?.language === 'en' ? 'en' : 'tr'
  const id = crypto.randomUUID()

  const snapshot = await callWalk(() =>
    stubFor(c, id).start({ walkId: id, planId, language }),
  )

  return c.json(snapshot, 201, { 'cache-control': 'no-store' })
})

walks.get('/:id', async (c) => {
  if (c.get('authEnabled')) requireUser(c)

  const id = assertWalkId(c.req.param('id'))
  const snapshot = await callWalk(() => stubFor(c, id).snapshot())
  return c.json(snapshot, 200, { 'cache-control': 'no-store' })
})

// ─────────────────────────────────────────────────────────────
// Talk to the guide
// ─────────────────────────────────────────────────────────────

walks.post('/:id/message', async (c) => {
  if (c.get('authEnabled')) requireUser(c)

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

  return c.json(result, 200, { 'cache-control': 'no-store' })
})

walks.post('/:id/advance', async (c) => {
  if (c.get('authEnabled')) requireUser(c)

  const id = assertWalkId(c.req.param('id'))
  const result = await callWalk(() => stubFor(c, id).advance())
  return c.json(result, 200, { 'cache-control': 'no-store' })
})

walks.post('/:id/reset', async (c) => {
  if (c.get('authEnabled')) requireUser(c)

  const id = assertWalkId(c.req.param('id'))
  const snapshot = await callWalk(() => stubFor(c, id).reset())
  return c.json(snapshot, 200, { 'cache-control': 'no-store' })
})
