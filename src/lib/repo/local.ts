import { MOCK_REPORTS } from '@shared/mock-reports'
import type { Analysis, ChatMessage, NewAnalysis } from '@shared/types'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { createPreviewDataUrl } from '../image'
import type { AnalysisRepository } from './types'

interface StoredAnalysis {
  id: string
  createdAt: number
  report: Analysis['report']
  location?: Analysis['location']
  language: Analysis['language']
  messages: ChatMessage[]
  saved: boolean
  previewDataUrl?: string | null
  remoteImageUrl?: string
  hasImage: boolean
}

interface NekibukiDB extends DBSchema {
  analyses: {
    key: string
    value: StoredAnalysis
    indexes: { createdAt: number }
  }
  images: {
    key: string
    value: Blob
  }
}

let dbPromise: Promise<IDBPDatabase<NekibukiDB>> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB<NekibukiDB>('nekibuki', 1, {
      upgrade(database) {
        const store = database.createObjectStore('analyses', { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
        database.createObjectStore('images')
      },
    })
  }
  return dbPromise
}

function toAnalysis(record: StoredAnalysis, imageUrl: string): Analysis {
  return {
    id: record.id,
    createdAt: record.createdAt,
    report: record.report,
    location: record.location,
    language: record.language,
    messages: record.messages,
    saved: record.saved,
    imageUrl,
    previewUrl: record.previewDataUrl || record.remoteImageUrl || imageUrl,
  }
}

export class LocalRepository implements AnalysisRepository {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async list(): Promise<Analysis[]> {
    const database = await db()
    const records = await database.getAll('analyses')
    return records
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((record) =>
        toAnalysis(record, record.previewDataUrl || record.remoteImageUrl || ''),
      )
  }

  async get(id: string): Promise<Analysis | null> {
    const database = await db()
    const record = await database.get('analyses', id)
    if (!record) return null

    let imageUrl = record.remoteImageUrl ?? ''
    if (record.hasImage) {
      const blob = await database.get('images', id)
      if (blob) imageUrl = URL.createObjectURL(blob)
    }
    return toAnalysis(record, imageUrl)
  }

  async create(input: NewAnalysis): Promise<Analysis> {
    const database = await db()
    const id = crypto.randomUUID()
    const createdAt = Date.now()
    const previewDataUrl = await createPreviewDataUrl(input.image).catch(() => null)

    const record: StoredAnalysis = {
      id,
      createdAt,
      report: input.report,
      location: input.location,
      language: input.language,
      messages: [],
      saved: false,
      previewDataUrl,
      hasImage: true,
    }

    await database.put('images', input.image, id)
    await database.put('analyses', record)

    return toAnalysis(record, URL.createObjectURL(input.image))
  }

  async addMessage(id: string, message: ChatMessage): Promise<Analysis | null> {
    const record = await this.patch(id, (current) => ({
      ...current,
      messages: [...current.messages, message],
    }))
    return record ? this.get(id) : null
  }

  async updateMessages(id: string, messages: ChatMessage[]): Promise<Analysis | null> {
    const record = await this.patch(id, (current) => ({ ...current, messages }))
    return record ? this.get(id) : null
  }

  async toggleSaved(id: string): Promise<Analysis | null> {
    const record = await this.patch(id, (current) => ({ ...current, saved: !current.saved }))
    return record ? this.get(id) : null
  }

  async remove(id: string): Promise<void> {
    const database = await db()
    await database.delete('analyses', id)
    await database.delete('images', id)
  }

  async clear(): Promise<void> {
    const database = await db()
    await database.clear('analyses')
    await database.clear('images')
  }

  private async patch(
    id: string,
    update: (current: StoredAnalysis) => StoredAnalysis,
  ): Promise<StoredAnalysis | null> {
    const database = await db()
    const current = await database.get('analyses', id)
    if (!current) return null
    const next = update(current)
    await database.put('analyses', next)
    return next
  }

  async seedDemo(): Promise<void> {
    const flag = `nekibuki.seeded.${this.userId}`
    if (localStorage.getItem(flag)) return

    const database = await db()
    const existing = await database.count('analyses')
    if (existing > 0) {
      localStorage.setItem(flag, '1')
      return
    }

    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    const seeds: { mockId: string; age: number; saved: boolean; messages: ChatMessage[] }[] = [
      {
        mockId: 'blue-mosque',
        age: 3 * 60 * 60 * 1000,
        saved: true,
        messages: [
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: 'Is the six-minaret story true?',
            createdAt: now - 2.5 * 60 * 60 * 1000,
          },
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              'It is a popular story rather than a documented fact. The mosque does have six minarets, which was unusual — and it caused a diplomatic problem because Mecca’s Grand Mosque also had six. The sultan later paid for a seventh in Mecca.',
            createdAt: now - 2.4 * 60 * 60 * 1000,
          },
        ],
      },
      {
        mockId: 'colosseum',
        age: 2 * day,
        saved: false,
        messages: [],
      },
      {
        mockId: 'eiffel',
        age: 6 * day,
        saved: true,
        messages: [
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: 'Why was it almost demolished?',
            createdAt: now - 6 * day + 60_000,
          },
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              'It was only meant to stand for twenty years. Radio antennas at the top made it too useful to remove, so the temporary fairground gate became permanent infrastructure.',
            createdAt: now - 6 * day + 120_000,
          },
        ],
      },
    ]

    for (const seed of seeds) {
      const mock = MOCK_REPORTS.find((item) => item.id === seed.mockId)
      if (!mock) continue
      const record: StoredAnalysis = {
        id: `demo-${seed.mockId}`,
        createdAt: now - seed.age,
        report: mock.report,
        language: 'en',
        messages: seed.messages,
        saved: seed.saved,
        remoteImageUrl: mock.imageUrl,
        hasImage: false,
      }
      await database.put('analyses', record)
    }

    localStorage.setItem(flag, '1')
  }
}
