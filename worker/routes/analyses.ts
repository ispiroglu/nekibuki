import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { ChatMessage } from '@shared/types'
import {
  bumpUsage,
  dailyLimits,
  deleteAnalysisRow,
  findAnalysis,
  keysFor,
  readUsage,
  saveMessages,
  setSaved,
  toAnalysis,
  type AnalysisRow,
} from '../lib/analyses'
import { requireUser, type AuthContext } from '../lib/session'
import { providerFor } from '../services/provider'
import { ProviderError } from '../types'

const saveSchema = z.object({ saved: z.boolean() })
const chatSchema = z.object({ question: z.string().min(1).max(1000) })
const MAX_MESSAGES = 30

/**
 * All analysis routes are owner-scoped. Every D1 query carries `user_id`;
 * a missing row and someone else's row are deliberately indistinguishable.
 */
export const analyses = new Hono<AuthContext>()

analyses.get('/', async (c) => {
  const user = requireUser(c)
  const rows = await c.env.nekibuki
    .prepare(
      `select id, user_id, capture_id, report, location, language, messages, saved,
              image_key, chat_key, image_width, image_height, provider, model,
              created_at, updated_at
       from analyses where user_id = ? order by created_at desc limit 500`,
    )
    .bind(user.id)
    .all<AnalysisRow>()

  return c.json({ analyses: rows.results.map(toAnalysis) })
})

analyses.get('/:id', async (c) => {
  const user = requireUser(c)
  const row = await findAnalysis(c.env.nekibuki, user.id, c.req.param('id'))
  if (!row) throw new HTTPException(404, { message: 'That place is not in your history.' })
  return c.json({ analysis: toAnalysis(row) })
})

analyses.patch('/:id', async (c) => {
  const user = requireUser(c)
  const body = await c.req.json().catch(() => null)
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) throw new HTTPException(400, { message: 'Nothing to update.' })

  const id = c.req.param('id')
  const existing = await findAnalysis(c.env.nekibuki, user.id, id)
  if (!existing) throw new HTTPException(404, { message: 'That place is not in your history.' })

  await setSaved(c.env.nekibuki, user.id, id, parsed.data.saved, Date.now())
  const row = await findAnalysis(c.env.nekibuki, user.id, id)
  return c.json({ analysis: toAnalysis(row ?? existing) })
})

analyses.delete('/:id', async (c) => {
  const user = requireUser(c)
  const id = c.req.param('id')
  const row = await findAnalysis(c.env.nekibuki, user.id, id)
  if (!row) return c.body(null, 204)

  await deleteAnalysisRow(c.env.nekibuki, user.id, id)
  const keys = [row.image_key, row.chat_key].filter((key): key is string => Boolean(key))
  if (keys.length) {
    try {
      await c.env.CAPTURES.delete(keys)
    } catch (error) {
      // The row is gone; an orphaned object is a cleanup job, not a failed delete.
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Could not remove archived photo',
          keys,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }
  }

  return c.body(null, 204)
})

analyses.delete('/', async (c) => {
  const user = requireUser(c)
  const rows = await c.env.nekibuki
    .prepare(`select image_key, chat_key from analyses where user_id = ?`)
    .bind(user.id)
    .all<Pick<AnalysisRow, 'image_key' | 'chat_key'>>()

  await c.env.nekibuki.prepare(`delete from analyses where user_id = ?`).bind(user.id).run()

  const keys = rows.results.flatMap((row) =>
    [row.image_key, row.chat_key].filter((key): key is string => Boolean(key)),
  )
  for (let index = 0; index < keys.length; index += 1000) {
    await c.env.CAPTURES.delete(keys.slice(index, index + 1000))
  }

  return c.body(null, 204)
})

analyses.get('/:id/image', async (c) => {
  const user = requireUser(c)
  const row = await findAnalysis(c.env.nekibuki, user.id, c.req.param('id'))
  if (!row) throw new HTTPException(404, { message: 'That photo is not in your history.' })

  const variant = c.req.query('variant') === 'chat' ? 'chat' : 'photo'
  const key = variant === 'chat' ? (row.chat_key ?? row.image_key) : row.image_key
  const object = await c.env.CAPTURES.get(key)
  if (!object) throw new HTTPException(404, { message: 'That photo is no longer available.' })

  const headers = new Headers()
  headers.set('content-type', object.httpMetadata?.contentType ?? 'image/jpeg')
  headers.set('cache-control', 'private, max-age=86400')
  headers.set('etag', object.httpEtag)
  headers.set('content-length', String(object.size))

  return new Response(object.body, { headers })
})

analyses.post('/:id/chat', async (c) => {
  const user = requireUser(c)
  const id = c.req.param('id')

  const body = await c.req.json().catch(() => null)
  const parsed = chatSchema.safeParse(body)
  if (!parsed.success) throw new HTTPException(400, { message: 'The question is incomplete.' })

  const row = await findAnalysis(c.env.nekibuki, user.id, id)
  if (!row) throw new HTTPException(404, { message: 'That place is not in your history.' })

  const limits = dailyLimits(c.env)
  const usage = await readUsage(c.env.nekibuki, user.id)
  if (usage.chats >= limits.chats) {
    throw new HTTPException(429, {
      message: 'You have reached today’s question limit. It resets at midnight UTC.',
    })
  }

  const current = JSON.parse(row.messages) as ChatMessage[]
  const history = current.slice(-(MAX_MESSAGES - 2))

  const key = row.chat_key ?? row.image_key
  let image: { data: ArrayBuffer; mimeType: string } | undefined
  const object = await c.env.CAPTURES.get(key)
  if (object) {
    image = {
      data: await object.arrayBuffer(),
      mimeType: object.httpMetadata?.contentType ?? 'image/jpeg',
    }
  }

  const provider = providerFor(c.env)
  let answer: string
  try {
    answer = await provider.chat({
      report: JSON.parse(row.report) as Parameters<typeof provider.chat>[0]['report'],
      history: history.map((message) => ({ role: message.role, content: message.content })),
      question: parsed.data.question,
      language: row.language === 'tr' ? 'tr' : 'en',
      image,
    })
  } catch (error) {
    if (error instanceof ProviderError) throw error
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Guide answer failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    throw new ProviderError(
      'The guide could not answer that. Try again in a moment.',
      'chat_failed',
      502,
    )
  }

  const now = Date.now()
  const updated: ChatMessage[] = [
    ...history,
    { id: crypto.randomUUID(), role: 'user', content: parsed.data.question, createdAt: now },
    { id: crypto.randomUUID(), role: 'assistant', content: answer, createdAt: now },
  ]

  await saveMessages(c.env.nekibuki, user.id, id, updated, now)
  await bumpUsage(c.env.nekibuki, user.id, 'chat_messages', now)

  return c.json({
    analysis: toAnalysis({
      ...row,
      messages: JSON.stringify(updated),
      updated_at: now,
    }),
  })
})
