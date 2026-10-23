import { findPlan, type WalkPlan, type WalkStop } from '@shared/walks'

export interface WalkState {
  walkId: string
  planId: string
  language: 'tr' | 'en'
  currentStop: string | null
  complete: boolean
  createdAt: number
  updatedAt: number
  /** The generated route, when this walk did not come from shared/walks.ts. */
  planJson: string | null
}

type WalkRow = {
  walk_id: string
  plan_id: string
  language: string
  current_stop: string | null
  complete: number
  created_at: number
  updated_at: number
  plan_json?: string | null
}

/**
 * The walk's own state, kept beside Pi's tables in the same SQLite database.
 *
 * Pi owns the transcript; this owns the route. Keeping them apart is what lets
 * the guide be replaced or replayed without losing where the traveller is, and
 * it keeps the next stop deterministic when the model is having a bad day.
 */
export class WalkStore {
  private ready = false

  constructor(private readonly storage: DurableObjectState['storage']) {}

  ensure(): void {
    if (this.ready) return
    this.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS walk_state (
        walk_id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        language TEXT NOT NULL,
        current_stop TEXT,
        complete INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    // Added after the first walks shipped. ALTER is the compatible migration:
    // existing rows keep working and simply fall back to the static plan.
    try {
      this.storage.sql.exec('ALTER TABLE walk_state ADD COLUMN plan_json TEXT')
    } catch {
      // SQLite has no "ADD COLUMN IF NOT EXISTS"; a duplicate is expected.
    }
    this.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS walk_visit (
        stop_id TEXT PRIMARY KEY,
        visited_at INTEGER NOT NULL,
        note TEXT
      )
    `)
    this.ready = true
  }

  /** Create the row on first use; a second call keeps the traveller's progress. */
  start(input: {
    walkId: string
    planId: string
    language: 'tr' | 'en'
    firstStop: string | null
    plan?: WalkPlan
  }): WalkState {
    this.ensure()
    const now = Date.now()
    this.storage.sql.exec(
      `INSERT OR IGNORE INTO walk_state
         (walk_id, plan_id, language, current_stop, complete, created_at, updated_at, plan_json)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      input.walkId,
      input.planId,
      input.language,
      input.firstStop,
      now,
      now,
      input.plan ? JSON.stringify(input.plan) : null,
    )
    return this.get()!
  }

  get(): WalkState | null {
    this.ensure()
    const row = this.storage.sql
      .exec<WalkRow>('SELECT * FROM walk_state LIMIT 1')
      .toArray()[0]
    if (!row) return null
    return {
      walkId: row.walk_id,
      planId: row.plan_id,
      language: row.language === 'en' ? 'en' : 'tr',
      currentStop: row.current_stop,
      complete: Boolean(row.complete),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      planJson: row.plan_json ?? null,
    }
  }

  /** Stored generated plan first; old rows and curated walks fall back to code. */
  plan(state: WalkState): WalkPlan {
    if (state.planJson) {
      try {
        const stored = JSON.parse(state.planJson) as WalkPlan
        if (stored && Array.isArray(stored.stops) && stored.stops.length > 0) return stored
      } catch {
        // A broken stored plan must not strand the traveller.
      }
    }
    return findPlan(state.planId) ?? findPlan(undefined)!
  }

  /**
   * Close the current stop and move to the next unvisited one. The route is
   * ordered by data, so this never asks the model which stop comes next.
   */
  advance(note?: string): {
    previous: string | null
    next: WalkStop | undefined
    visited: string[]
    complete: boolean
  } {
    const state = this.get()
    if (!state) throw new Error('This walk has not been started.')

    const plan = this.plan(state)
    if (state.currentStop) this.markVisited(state.currentStop, note)

    const visited = new Set(this.visited())
    const next = [...plan.stops]
      .sort((a, b) => a.order - b.order)
      .find((stop) => !visited.has(stop.id))

    if (next) {
      this.setCurrent(next.id)
      this.setComplete(false)
    } else {
      this.setCurrent(null)
      this.setComplete(true)
    }

    return {
      previous: state.currentStop,
      next,
      visited: this.visited(),
      complete: !next,
    }
  }

  setCurrent(stopId: string | null): void {
    this.ensure()
    this.storage.sql.exec(
      'UPDATE walk_state SET current_stop = ?, updated_at = ?',
      stopId,
      Date.now(),
    )
  }

  markVisited(stopId: string, note?: string): void {
    this.ensure()
    this.storage.sql.exec(
      'INSERT OR REPLACE INTO walk_visit (stop_id, visited_at, note) VALUES (?, ?, ?)',
      stopId,
      Date.now(),
      note ?? null,
    )
  }

  visited(): string[] {
    this.ensure()
    return this.storage.sql
      .exec<{ stop_id: string }>('SELECT stop_id FROM walk_visit ORDER BY visited_at')
      .toArray()
      .map((row) => row.stop_id)
  }

  setComplete(complete: boolean): void {
    this.ensure()
    this.storage.sql.exec(
      'UPDATE walk_state SET complete = ?, updated_at = ?',
      complete ? 1 : 0,
      Date.now(),
    )
  }
}
