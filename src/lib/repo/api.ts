import type { Analysis, ChatMessage, NewAnalysis } from '@shared/types'
import {
  clearAnalyses,
  deleteAnalysis,
  getAnalysis,
  listAnalyses,
  setAnalysisSaved,
} from '../api'
import type { AnalysisRepository } from './types'

/**
 * The remote repository is deliberately thin: the Worker owns writes, photo
 * storage and the chat transcript. Creating a capture happens in /api/analyze,
 * which archives the image before the traveller ever sees the report.
 */
export class ApiRepository implements AnalysisRepository {
  async list(): Promise<Analysis[]> {
    return listAnalyses()
  }

  async get(id: string): Promise<Analysis | null> {
    return getAnalysis(id)
  }

  async create(_input: NewAnalysis): Promise<Analysis> {
    throw new Error('Captures are archived by /api/analyze, not by the repository.')
  }

  async addMessage(_id: string, _message: ChatMessage): Promise<Analysis | null> {
    throw new Error('Chat is persisted by /api/analyses/:id/chat.')
  }

  async updateMessages(_id: string, _messages: ChatMessage[]): Promise<Analysis | null> {
    throw new Error('Chat is persisted by /api/analyses/:id/chat.')
  }

  async toggleSaved(id: string): Promise<Analysis | null> {
    const current = await getAnalysis(id)
    if (!current) return null
    return setAnalysisSaved(id, !current.saved)
  }

  async remove(id: string): Promise<void> {
    return deleteAnalysis(id)
  }

  async clear(): Promise<void> {
    return clearAnalyses()
  }
}
