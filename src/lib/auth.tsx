import type { SupabaseClient, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authMode, loadSupabase } from './supabase'
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
  client: SupabaseClient | null
  loading: boolean
  error: string | null
  accessToken: string | null
  mode: 'mock' | 'supabase'
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const DEMO_USER_KEY = 'nekibuki.demo-user'

const AuthContext = createContext<AuthContextValue | null>(null)

function fromSupabaseUser(user: User): AppUser {
  const metadata = user.user_metadata ?? {}
  return {
    id: user.id,
    name: (metadata.full_name as string) || (metadata.name as string) || user.email || 'Traveller',
    email: user.email ?? '',
    avatarUrl: (metadata.avatar_url as string) || (metadata.picture as string) || null,
    provider: 'google',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | undefined

    void loadSupabase().then((supabase) => {
      if (!mounted) return

      if (!supabase) {
        // Demo mode: remember the traveller on this device so the flow feels real.
        try {
          const stored = localStorage.getItem(DEMO_USER_KEY)
          if (stored) setUser(JSON.parse(stored) as AppUser)
        } catch {
          // ignore malformed demo state
        }
        setLoading(false)
        return
      }

      setClient(supabase)

      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return
        if (data.session?.user) {
          setUser(fromSupabaseUser(data.session.user))
          setAccessToken(data.session.access_token)
        }
        setLoading(false)
      })

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(fromSupabaseUser(session.user))
          setAccessToken(session.access_token)
        } else {
          setUser(null)
          setAccessToken(null)
        }
        setLoading(false)
      })
      unsubscribe = () => data.subscription.unsubscribe()
    })

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  const signIn = useCallback(async () => {
    setError(null)
    const supabase = client ?? (await loadSupabase())

    if (supabase) {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (signInError) setError(signInError.message)
      return
    }

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
  }, [client])

  const signOut = useCallback(async () => {
    const supabase = client ?? (await loadSupabase())
    if (supabase) await supabase.auth.signOut()
    localStorage.removeItem(DEMO_USER_KEY)
    setUser(null)
    setAccessToken(null)
  }, [client])

  const value = useMemo<AuthContextValue>(
    () => ({ user, client, loading, error, accessToken, mode: authMode, signIn, signOut }),
    [user, client, loading, error, accessToken, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
