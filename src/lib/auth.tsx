import { createAuthClient } from 'better-auth/react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { sleep } from './utils'

export interface AppUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  provider: 'google' | 'demo'
}

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  error: string | null
  /** `mock` keeps the zero-setup demo; `google` uses Better Auth on the Worker. */
  mode: 'mock' | 'google'
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const authMode: 'mock' | 'google' =
  (import.meta.env.VITE_AUTH_MODE as string | undefined) === 'google' ? 'google' : 'mock'

const DEMO_USER_KEY = 'nekibuki.demo-user'

/**
 * One client for the Worker's /api/auth routes. Sessions are cookies, so no
 * access token ever reaches the app.
 */
const authClient = createAuthClient({ basePath: '/api/auth' })

const AuthContext = createContext<AuthContextValue | null>(null)

function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, error: sessionError } = authClient.useSession()
  const [actionError, setActionError] = useState<string | null>(null)

  const user = useMemo<AppUser | null>(() => {
    const remote = data?.user
    if (!remote) return null
    return {
      id: remote.id,
      name: remote.name || remote.email || 'Traveller',
      email: remote.email ?? '',
      avatarUrl: remote.image ?? null,
      provider: 'google',
    }
  }, [data])

  const signIn = useCallback(async () => {
    setActionError(null)
    const result = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/auth/callback`,
    })
    if (result.error) {
      setActionError(result.error.message || 'Signing in did not work. Please try again.')
    }
  }, [])

  const signOut = useCallback(async () => {
    await authClient.signOut()
    setActionError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: isPending,
      error: actionError ?? sessionError?.message ?? null,
      mode: 'google',
      signIn,
      signOut,
    }),
    [user, isPending, actionError, sessionError, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Demo mode: remember the traveller on this device so the flow feels real.
    try {
      const stored = localStorage.getItem(DEMO_USER_KEY)
      if (stored) setUser(JSON.parse(stored) as AppUser)
    } catch {
      // ignore malformed demo state
    }
    setLoading(false)
  }, [])

  const signIn = useCallback(async () => {
    setError(null)
    setLoading(true)
    await sleep(900)
    const demoUser: AppUser = {
      id: 'demo-traveller',
      name: 'Ada Traveller',
      email: 'ada@nekibuki.app',
      avatarUrl: null,
      provider: 'demo',
    }
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser))
    setUser(demoUser)
    setLoading(false)
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem(DEMO_USER_KEY)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, mode: 'mock', signIn, signOut }),
    [user, loading, error, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return authMode === 'google' ? (
    <GoogleAuthProvider>{children}</GoogleAuthProvider>
  ) : (
    <MockAuthProvider>{children}</MockAuthProvider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
