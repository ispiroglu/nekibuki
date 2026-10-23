import type { Analysis, ChatMessage, GuideLanguage } from '@shared/types'

export interface AnalysisRow {
  id: string
  user_id: string
  capture_id: string
  report: string
  location: string | null
  language: string
  messages: string
  saved: number
  image_key: string
  chat_key: string | null
  image_width: number | null
  image_height: number | null
  provider: string | null
  model: string | null
  created_at: number
  updated_at: number
}

export const ANALYSIS_COLUMNS = `id, user_id, capture_id, report, location, language,
  messages, saved, image_key, chat_key, image_width, image_height, provider, model,
  created_at, updated_at`

/** Image URLs are always served by the Worker, never straight from R2. */
export function imageUrl(id: string, variant?: 'chat'): string {
  const base = `/api/analyses/${encodeURIComponent(id)}/image`
  return variant === 'chat' ? `${base}?variant=chat` : base
}

export function toAnalysis(row: AnalysisRow): Analysis {
  return {
    id: row.id,
    createdAt: row.created_at,
    report: JSON.parse(row.report) as Analysis['report'],
    location: row.location ? (JSON.parse(row.location) as Analysis['location']) : undefined,
    language: row.language === 'tr' ? 'tr' : 'en',
    messages: JSON.parse(row.messages) as ChatMessage[],
    saved: Boolean(row.saved),
    imageUrl: imageUrl(row.id),
    previewUrl: imageUrl(row.id, 'chat'),
    provider: row.provider ?? undefined,
    model: row.model ?? undefined,
  }
}

export function keysFor(userId: string, analysisId: string, hasChat = true) {
  const prefix = `users/${userId}/analyses/${analysisId}`
  return {
    photo: `${prefix}/photo.jpg`,
    chat: hasChat ? `${prefix}/chat.jpg` : null,
  }
}

export async function findAnalysis(
  db: D1Database,
  userId: string,
  id: string,
): Promise<AnalysisRow | null> {
  return db
    .prepare(`select ${ANALYSIS_COLUMNS} from analyses where id = ? and user_id = ?`)
    .bind(id, userId)
    .first<AnalysisRow>()
}

export async function findCapture(
  db: D1Database,
  userId: string,
  captureId: string,
): Promise<AnalysisRow | null> {
  return db
    .prepare(`select ${ANALYSIS_COLUMNS} from analyses where user_id = ? and capture_id = ?`)
    .bind(userId, captureId)
    .first<AnalysisRow>()
}

export interface NewAnalysisRow {
  id: string
  userId: string
  captureId: string
  report: unknown
  location?: unknown
  language: GuideLanguage
  imageKey: string
  chatKey: string | null
  imageWidth?: number
  imageHeight?: number
  provider?: string
  model?: string
  now: number
}

/** Returns false when another request already wrote this capture. */
export async function insertAnalysis(db: D1Database, row: NewAnalysisRow): Promise<boolean> {
  const result = await db
    .prepare(
      `insert into analyses
        (id, user_id, capture_id, report, location, language, messages, saved,
         image_key, chat_key, image_width, image_height, provider, model,
         created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, '[]', 0, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict (user_id, capture_id) do nothing`,
    )
    .bind(
      row.id,
      row.userId,
      row.captureId,
      JSON.stringify(row.report),
      row.location ? JSON.stringify(row.location) : null,
      row.language,
      row.imageKey,
      row.chatKey,
      row.imageWidth ?? null,
      row.imageHeight ?? null,
      row.provider ?? null,
      row.model ?? null,
      row.now,
      row.now,
    )
    .run()

  return (result.meta?.changes ?? 0) > 0
}

export async function saveMessages(
  db: D1Database,
  userId: string,
  id: string,
  messages: ChatMessage[],
  now: number,
): Promise<void> {
  await db
    .prepare(`update analyses set messages = ?, updated_at = ? where id = ? and user_id = ?`)
    .bind(JSON.stringify(messages), now, id, userId)
    .run()
}

export async function setSaved(
  db: D1Database,
  userId: string,
  id: string,
  saved: boolean,
  now: number,
): Promise<void> {
  await db
    .prepare(`update analyses set saved = ?, updated_at = ? where id = ? and user_id = ?`)
    .bind(saved ? 1 : 0, now, id, userId)
    .run()
}

export async function deleteAnalysisRow(
  db: D1Database,
  userId: string,
  id: string,
): Promise<void> {
  await db.prepare(`delete from analyses where id = ? and user_id = ?`).bind(id, userId).run()
}

export function utcDay(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

export async function readUsage(
  db: D1Database,
  userId: string,
  now = Date.now(),
): Promise<{ analyses: number; chats: number }> {
  const row = await db
    .prepare(`select analyses, chat_messages from usage_daily where user_id = ? and day = ?`)
    .bind(userId, utcDay(now))
    .first<{ analyses: number; chat_messages: number }>()
  return { analyses: row?.analyses ?? 0, chats: row?.chat_messages ?? 0 }
}

export async function bumpUsage(
  db: D1Database,
  userId: string,
  field: 'analyses' | 'chat_messages',
  now = Date.now(),
): Promise<void> {
  const analyses = field === 'analyses' ? 1 : 0
  const chats = field === 'chat_messages' ? 1 : 0
  await db
    .prepare(
      `insert into usage_daily (user_id, day, analyses, chat_messages)
       values (?, ?, ?, ?)
       on conflict (user_id, day) do update set
         analyses = analyses + excluded.analyses,
         chat_messages = chat_messages + excluded.chat_messages`,
    )
    .bind(userId, utcDay(now), analyses, chats)
    .run()
}

export function dailyLimits(env: { DAILY_ANALYSES?: string; DAILY_CHATS?: string }) {
  const parse = (value: string | undefined, fallback: number) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
  }
  return {
    analyses: parse(env.DAILY_ANALYSES, 25),
    chats: parse(env.DAILY_CHATS, 200),
  }
}
