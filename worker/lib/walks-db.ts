import type { WalkRecord, WalkSnapshot } from '@shared/walks'
import type { GuideLanguage } from '@shared/types'

/**
 * D1 owns the account-facing index of walks: which tours belong to a person,
 * what they are called and how far they got. The route and transcript stay in
 * the walk's Durable Object; this table is safe to rebuild from a snapshot.
 */
export interface WalkRow {
  id: string
  user_id: string
  analysis_id: string | null
  plan_id: string
  source: 'curated' | 'generated'
  title: string
  title_en: string | null
  place: string
  country: string | null
  language: string
  stop_count: number
  visited_count: number
  current_stop: string | null
  status: 'active' | 'complete'
  created_at: number
  updated_at: number
}

export interface NewWalkRow {
  id: string
  userId: string
  analysisId?: string
  planId: string
  source: 'curated' | 'generated'
  title: string
  titleEn?: string
  place: string
  country?: string
  language: GuideLanguage
  stopCount: number
  now: number
}

export function toWalkRecord(row: WalkRow): WalkRecord {
  return {
    id: row.id,
    title: row.title,
    ...(row.title_en ? { titleEn: row.title_en } : {}),
    place: row.place,
    language: row.language === 'en' ? 'en' : 'tr',
    stopCount: row.stop_count,
    visitedCount: row.visited_count,
    currentStop: row.current_stop,
    complete: row.status === 'complete',
    status: row.status === 'complete' ? 'complete' : 'active',
    source: row.source === 'generated' ? 'generated' : 'curated',
    ...(row.analysis_id ? { analysisId: row.analysis_id } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function insertWalk(db: D1Database, row: NewWalkRow): Promise<void> {
  await db
    .prepare(
      `insert into walks
        (id, user_id, analysis_id, plan_id, source, title, title_en, place, country,
         language, stop_count, visited_count, current_stop, status, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, null, 'active', ?, ?)
       on conflict (id) do nothing`,
    )
    .bind(
      row.id,
      row.userId,
      row.analysisId ?? null,
      row.planId,
      row.source,
      row.title,
      row.titleEn ?? null,
      row.place,
      row.country ?? null,
      row.language,
      row.stopCount,
      row.now,
      row.now,
    )
    .run()
}

/** Keep the account index in step with the Durable Object after a turn. */
export async function syncWalkProgress(
  db: D1Database,
  userId: string,
  snapshot: WalkSnapshot,
  now = Date.now(),
): Promise<void> {
  await db
    .prepare(
      `update walks set
         title = ?, title_en = ?, place = ?, stop_count = ?, visited_count = ?,
         current_stop = ?, status = ?, updated_at = ?
       where id = ? and user_id = ?`,
    )
    .bind(
      snapshot.plan.title,
      snapshot.plan.titleEn,
      snapshot.plan.place,
      snapshot.plan.stopCount,
      snapshot.visited.length,
      snapshot.current?.title ?? null,
      snapshot.complete ? 'complete' : 'active',
      now,
      snapshot.id,
      userId,
    )
    .run()
}

export async function listWalks(
  db: D1Database,
  userId: string,
  status: 'active' | 'complete' | 'all' = 'active',
): Promise<WalkRecord[]> {
  const where = status === 'all' ? '' : 'and status = ?'
  const statement = db.prepare(
    `select id, user_id, analysis_id, plan_id, source, title, title_en, place, country,
            language, stop_count, visited_count, current_stop, status, created_at, updated_at
     from walks
     where user_id = ? ${where}
     order by updated_at desc
     limit 50`,
  )
  const bound = status === 'all' ? statement.bind(userId) : statement.bind(userId, status)
  const rows = await bound.all<WalkRow>()
  return rows.results.map(toWalkRecord)
}

export async function findWalk(
  db: D1Database,
  userId: string,
  id: string,
): Promise<WalkRecord | null> {
  const row = await db
    .prepare(
      `select id, user_id, analysis_id, plan_id, source, title, title_en, place, country,
              language, stop_count, visited_count, current_stop, status, created_at, updated_at
       from walks where id = ? and user_id = ?`,
    )
    .bind(id, userId)
    .first<WalkRow>()
  return row ? toWalkRecord(row) : null
}
