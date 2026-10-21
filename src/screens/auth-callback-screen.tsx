import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { useAuth } from '@/lib/auth'

export function AuthCallbackScreen() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [loading, user, navigate])

  const failed = !loading && !user

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-8 text-center">
      {failed ? (
        <div className="flex flex-col items-center gap-4">
          <Logo className="size-16 text-foreground" />
          <h1 className="display text-2xl">We couldn’t sign you in.</h1>
          <p role="alert" className="max-w-xs text-sm text-muted-foreground">
            The sign-in link may have expired. Try again, or head back to the start.
          </p>
          <button
            type="button"
            onClick={() => void signIn()}
            className="mt-2 flex h-12 w-full min-w-56 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.98]"
          >
            Try signing in again
          </button>
          <Link
            to="/"
            replace
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors active:text-foreground"
          >
            Back to the start
          </Link>
        </div>
      ) : (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
          <Logo className="size-16 animate-breathe text-foreground" />
          <h1 className="display text-2xl">Signing you in…</h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            Hold on while we bring your discoveries back.
          </p>
        </div>
      )}
    </div>
  )
}
