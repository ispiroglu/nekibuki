/**
 * Factory smoke test: the Worker entry loads and answers.
 *
 * Quality Assurance owns this directory and the factory pins the hash of every file under it, so
 * this test stays small and proves the shape of the deployment rather than a feature: the route
 * table of worker/index.ts is intact and `/api/health` answers with the zero-setup demo defaults
 * (mock vision, no D1, no R2, no walk Durable Object).
 *
 * Bun has no `cloudflare:workers` module, and worker/index.ts re-exports the walk Durable Object, so
 * the durable-object base class is stubbed before the entry is imported. Nothing else is faked: the
 * assertions below run against the real Hono app.
 */
import { describe, expect, mock, test } from 'bun:test'

// `@ts-expect-error` is not needed: tests/ is outside every tsconfig project, so neither tsc nor the
// build reads this file.
mock.module('cloudflare:workers', () => ({
  DurableObject: class {
    ctx: unknown
    env: unknown
    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx
      this.env = env
    }
  },
}))

const { default: app } = await import('../../worker/index')

/** A deployment with no bindings at all: the demo mode the app ships with before Cloudflare is set up. */
const demoEnv = { VISION_PROVIDER: 'mock' } as never

describe('worker smoke', () => {
  test('the health route answers with the demo defaults', async () => {
    const res = await app.request('/api/health', undefined, demoEnv)
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      ok: boolean
      provider: string
      auth: boolean
      db: boolean
      storage: boolean
      walk: boolean
    }
    expect(body.ok).toBe(true)
    expect(body.provider).toBe('mock')
    expect(body.auth).toBe(false)
    expect(body.db).toBe(false)
    expect(body.storage).toBe(false)
    expect(body.walk).toBe(false)
  })

  test('an unknown api route answers a json 404', async () => {
    const res = await app.request('/api/does-not-exist', undefined, demoEnv)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found', code: 'not_found' })
  })
})
