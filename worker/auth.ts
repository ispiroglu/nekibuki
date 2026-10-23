import { betterAuth } from 'better-auth'
import type { AppEnv } from './types'

/**
 * Auth is only "on" when the Worker has a database and a secret. Without
 * them the app keeps its zero-setup demo mode: mock sign-in, mock vision and
 * the traveller's own IndexedDB.
 */
export function authReady(env: AppEnv): env is AppEnv & {
  nekibuki: D1Database
  BETTER_AUTH_SECRET: string
} {
  return Boolean(env.nekibuki && env.BETTER_AUTH_SECRET)
}

export function googleReady(env: AppEnv): env is AppEnv & {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
} {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

export function authConfigured(env: AppEnv): boolean {
  return authReady(env) && googleReady(env)
}

/**
 * A Better Auth instance is cheap to build and must see the request's
 * bindings, so it is created per request rather than at module scope.
 */
export function createAuth(env: AppEnv) {
  if (!authReady(env)) {
    throw new Error('Auth is not configured: add the D1 binding and BETTER_AUTH_SECRET.')
  }

  const baseURL = env.BETTER_AUTH_URL || 'http://localhost:5173'
  const trustedOrigins = Array.from(
    new Set([
      baseURL,
      'http://localhost:5173',
      'http://localhost:8787',
      'https://nekibuki.thecrafter.io',
    ]),
  )

  return betterAuth({
    database: env.nekibuki,
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    basePath: '/api/auth',
    trustedOrigins,
    emailAndPassword: { enabled: false },
    socialProviders:
      googleReady(env)
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              prompt: 'select_account',
            },
          }
        : {},
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // A short signed cookie cache keeps history reads off D1 on every tap.
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        // localhost is http; production is https.
        secure: baseURL.startsWith('https://'),
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
export type Session = Auth['$Infer']['Session']
