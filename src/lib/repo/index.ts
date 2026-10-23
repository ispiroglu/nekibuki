import type { AppUser } from '../auth'
import { ApiRepository } from './api'
import { LocalRepository } from './local'
import type { AnalysisRepository } from './types'

export type { AnalysisRepository } from './types'

export function createRepository(user: AppUser): AnalysisRepository {
  return user.provider === 'google' ? new ApiRepository() : new LocalRepository(user.id)
}
