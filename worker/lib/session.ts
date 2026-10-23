import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { authConfigured, createAuth } from '../auth'
import type { AppEnv } from '../types'

export interface SessionUser {
  id: string
  name: string
  email: string
  image?: string | null
}

export interface AuthVariables {
  userId: string
  user: SessionUser | null
  authEnabled: boolean
}

export type AuthContext = {
  Bindings: AppEnv
  Variables: AuthVariables
}

/**
 * Reads the Better Auth session once per request and puts the owner on the
 * context. In demo mode (no D1 / secret) it records `authEnabled: false` and
 * lets the route decide whether that is acceptable.
 */
export const withSession = createMiddleware<AuthContext>(async (c, next) => {
  // Accounts only exist when Google is wired too; otherwise the app runs in
  // its zero-setup demo mode even if a D1 binding happens to be present.
  if (!authConfigured(c.env)) {
    c.set('authEnabled', false)
    c.set('userId', '')
    c.set('user', null)
    return next()
  }

  c.set('authEnabled', true)

  let session: Awaited<ReturnType<ReturnType<typeof createAuth>['api']['getSession']>> | null
  try {
    session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Could not read the session',
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    throw new HTTPException(503, { message: 'Could not confirm your session right now. Try again.' })
  }

  if (!session?.user) {
    c.set('userId', '')
    c.set('user', null)
    return next()
  }

  c.set('userId', session.user.id)
  c.set('user', {
    id: session.user.id,
    name: session.user.name ?? '',
    email: session.user.email ?? '',
    image: session.user.image ?? null,
  })

  return next()
})

/** The owner of the request, or a 401 the client can act on. */
export function requireUser(c: Context<AuthContext>): SessionUser {
  if (!c.get('authEnabled')) {
    throw new HTTPException(503, {
      message: 'Accounts are not configured on this deployment yet.',
    })
  }
  const user = c.get('user')
  if (!user) {
    throw new HTTPException(401, { message: 'Sign in to use the guide.' })
  }
  return user
}
