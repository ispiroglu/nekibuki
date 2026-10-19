import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { useAuth } from '@/lib/auth'

export function AuthCallbackScreen() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [loading, user, navigate])

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <Logo className="size-16 animate-breathe text-foreground" />
        <h1 className="display text-2xl">Signing you in…</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Hold on while we bring your discoveries back.
        </p>
      </div>
    </div>
  )
}
