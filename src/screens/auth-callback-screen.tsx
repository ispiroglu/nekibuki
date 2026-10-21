import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { useAuth } from '@/lib/auth'
import {
  describeOAuthFailure,
  readOAuthError,
  type OAuthFailure,
} from '@/screens/login-screen'

export function AuthCallbackScreen() {
  const { user, loading, signIn, error } = useAuth()
  const navigate = useNavigate()
  const [oauth] = useState(() => readOAuthError())

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [loading, user, navigate])

  const failed = !loading && !user

  const failure: OAuthFailure = oauth
    ? describeOAuthFailure(oauth.code)
    : error
      ? {
          title: 'Sign-in didn’t start.',
          hint: 'Check your connection, then try again.',
        }
      : {
          title: 'We couldn’t sign you in.',
          hint: 'The sign-in link may have expired. Try again, or head back to the start.',
        }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6 safe-top safe-bottom">
      {failed ? (
        <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
          <Logo className="size-16 text-foreground" />
          <div role="alert" className="flex flex-col items-center gap-3">
            <h1 className="display text-2xl">{failure.title}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{failure.hint}</p>
          </div>
          <button
            type="button"
            onClick={() => void signIn()}
            className="mt-2 flex h-14 w-full items-center justify-center rounded-full bg-primary px-5 font-medium text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Try signing in again
          </button>
          <Link
            to="/"
            replace
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors active:text-foreground motion-reduce:transition-none"
          >
            Back to the start
          </Link>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          className="flex w-full max-w-xs flex-col items-center gap-4 text-center"
        >
          <Logo className="size-16 animate-breathe text-foreground" />
          <h1 className="display text-2xl">Signing you in…</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Hold on while we bring your discoveries back.
          </p>
        </div>
      )}
    </div>
  )
}
