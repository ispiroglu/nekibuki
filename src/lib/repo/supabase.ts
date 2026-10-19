import type { Analysis, ChatMessage, NewAnalysis } from '@shared/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalysisRepository } from './types'

const BUCKET = 'captures'

interface AnalysisRow {
  id: string
  created_at: string
  report: Analysis['report']
  location: Analysis['location'] | null
  language: Analysis['language']
  messages: ChatMessage[] | null
  saved: boolean
  image_path: string | null
}

export class SupabaseRepository implements AnalysisRepository {
  private client: SupabaseClient
  private userId: string

  constructor(client: SupabaseClient, userId: string) {
    this.client = client
    this.userId = userId
  }

  private publicUrl(path: string | null): string {
    if (!path) return ''
    return this.client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  private toAnalysis(row: AnalysisRow): Analysis {
    const url = this.publicUrl(row.image_path)
    return {
      id: row.id,
      createdAt: new Date(row.created_at).getTime(),
      report: row.report,
      location: row.location ?? undefined,
      language: row.language,
      messages: row.messages ?? [],
      saved: row.saved,
      imageUrl: url,
      previewUrl: url,
    }
  }

  async list(): Promise<Analysis[]> {
    const { data, error } = await this.client
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as AnalysisRow[]).map((row) => this.toAnalysis(row))
  }

  async get(id: string): Promise<Analysis | null> {
    const { data, error } = await this.client.from('analyses').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? this.toAnalysis(data as AnalysisRow) : null
  }

  async create(input: NewAnalysis): Promise<Analysis> {
    const id = crypto.randomUUID()
    const path = `${this.userId}/${id}.jpg`

    const upload = await this.client.storage
      .from(BUCKET)
      .upload(path, input.image, { contentType: input.image.type || 'image/jpeg', upsert: false })
    if (upload.error) throw new Error(upload.error.message)

    const { data, error } = await this.client
      .from('analyses')
      .insert({
        id,
        user_id: this.userId,
        report: input.report,
        location: input.location ?? null,
        language: input.language,
        messages: [],
        saved: false,
        image_path: path,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return this.toAnalysis(data as AnalysisRow)
  }

  async addMessage(id: string, message: ChatMessage): Promise<Analysis | null> {
    const current = await this.get(id)
    if (!current) return null
    return this.updateMessages(id, [...current.messages, message])
  }

  async updateMessages(id: string, messages: ChatMessage[]): Promise<Analysis | null> {
    const { data, error } = await this.client
      .from('analyses')
      .update({ messages })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return this.toAnalysis(data as AnalysisRow)
  }

  async toggleSaved(id: string): Promise<Analysis | null> {
    const current = await this.get(id)
    if (!current) return null
    const { data, error } = await this.client
      .from('analyses')
      .update({ saved: !current.saved })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return this.toAnalysis(data as AnalysisRow)
  }

  async remove(id: string): Promise<void> {
    const current = await this.get(id)
    if (current?.imageUrl) {
      const marker = `/${BUCKET}/`
      const index = current.imageUrl.indexOf(marker)
      if (index >= 0) {
        const path = current.imageUrl.slice(index + marker.length)
        await this.client.storage.from(BUCKET).remove([path])
      }
    }
    const { error } = await this.client.from('analyses').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async clear(): Promise<void> {
    const all = await this.list()
    for (const analysis of all) {
      await this.remove(analysis.id)
    }
  }
}
