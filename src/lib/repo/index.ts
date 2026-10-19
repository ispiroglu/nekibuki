import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppUser } from '../auth'
import { LocalRepository } from './local'
import { SupabaseRepository } from './supabase'
import type { AnalysisRepository } from './types'

export type { AnalysisRepository } from './types'

export function createRepository(
  user: AppUser,
  client: SupabaseClient | null,
): AnalysisRepository {
  if (user.provider === 'google' && client) {
    return new SupabaseRepository(client, user.id)
  }
  return new LocalRepository(user.id)
}
