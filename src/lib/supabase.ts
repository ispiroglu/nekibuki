import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const authMode: 'mock' | 'supabase' =
  (import.meta.env.VITE_AUTH_MODE as string | undefined) === 'supabase' && isSupabaseConfigured
    ? 'supabase'
    : 'mock'

let cached: Promise<SupabaseClient | null> | null = null

/**
 * Supabase is loaded on demand so the camera screen stays tiny on first paint.
 * The module is cached after the first call.
 */
export function loadSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  if (!cached) {
    cached = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url!, anonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      }),
    )
  }
  return cached
}
