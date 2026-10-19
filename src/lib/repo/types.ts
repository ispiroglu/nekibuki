import type { Analysis, ChatMessage, NewAnalysis } from '@shared/types'

export interface AnalysisRepository {
  list(): Promise<Analysis[]>
  get(id: string): Promise<Analysis | null>
  create(input: NewAnalysis): Promise<Analysis>
  addMessage(id: string, message: ChatMessage): Promise<Analysis | null>
  updateMessages(id: string, messages: ChatMessage[]): Promise<Analysis | null>
  toggleSaved(id: string): Promise<Analysis | null>
  remove(id: string): Promise<void>
  clear(): Promise<void>
  seedDemo?(): Promise<void>
}
