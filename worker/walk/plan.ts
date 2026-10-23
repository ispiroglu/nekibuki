import { z } from 'zod'
import type { GeoPoint, GuideLanguage } from '@shared/types'
import type { WalkPlan, WalkStop } from '@shared/walks'
import { arrivalInstruction } from '../lib/geo'
import type { WalkPoi } from '../lib/overpass'

/**
 * A generated tour is written for one report. The model's job is to choose
 * from the OSM candidates and write the story; the shape below is the only
 * thing it is allowed to return.
 */
export interface WalkPlanContext {
  analysisId?: string
  title: string
  summary?: string
  place: string
  country?: string
  location: GeoPoint
  language: GuideLanguage
}

export const plannerOutputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  titleEn: z.string().trim().min(3).max(120),
  minutes: z.number().int().min(20).max(240),
  intro: z.string().trim().max(600).optional(),
  stops: z
    .array(
      z.object({
        candidateId: z.string().trim().min(1),
        title: z.string().trim().min(1).max(120),
        titleEn: z.string().trim().min(1).max(120),
        brief: z.string().trim().min(10).max(600),
        lookFor: z.array(z.string().trim().min(1).max(160)).min(2).max(4),
      }),
    )
    .min(5)
    .max(8),
})

export type PlannerOutput = z.infer<typeof plannerOutputSchema>

/** The model broke the contract in a way a second attempt could fix. */
export class PlanValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlanValidationError'
  }
}

/** Parse the model's raw text; fenced JSON is tolerated, invented fields are not. */
export function parsePlannerOutput(text: string): PlannerOutput {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  if (!trimmed) throw new PlanValidationError('The planner returned an empty answer.')

  let json: unknown
  try {
    json = JSON.parse(trimmed)
  } catch {
    throw new PlanValidationError('The planner returned unreadable JSON.')
  }

  const parsed = plannerOutputSchema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new PlanValidationError(
      `The planner returned an invalid plan (${issue?.path.join('.') || 'shape'}: ${issue?.message ?? 'invalid'}).`,
    )
  }
  return parsed.data
}

const stopIdFor = (poi: WalkPoi): string => `poi-${poi.id.replace('/', '-')}`

/**
 * Turn the model's choices into a real route. Coordinates, order and arrival
 * instructions are decided here, never by the model.
 */
export function composeWalkPlan(
  context: WalkPlanContext,
  candidates: WalkPoi[],
  output: PlannerOutput,
  planId: string,
): WalkPlan {
  const byId = new Map(candidates.map((poi) => [poi.id, poi]))
  const chosen: { poi: WalkPoi; stop: PlannerOutput['stops'][number] }[] = []
  const used = new Set<string>()

  for (const stop of output.stops) {
    const poi = byId.get(stop.candidateId)
    if (!poi) {
      throw new PlanValidationError(
        `The planner picked a place that is not in the candidate list (${stop.candidateId}).`,
      )
    }
    if (used.has(poi.id)) continue
    used.add(poi.id)
    chosen.push({ poi, stop })
  }

  if (chosen.length < 5) {
    throw new PlanValidationError('The planner did not choose enough real places for a walk.')
  }

  // The walk starts where the traveller stands: the closest chosen stop goes
  // first, then the rest keep the planner's narrative order.
  const nearestIndex = chosen.reduce(
    (best, entry, index) => (entry.poi.distance < chosen[best].poi.distance ? index : best),
    0,
  )
  if (nearestIndex > 0) {
    const [nearest] = chosen.splice(nearestIndex, 1)
    chosen.unshift(nearest)
  }

  let previous: GeoPoint = context.location
  const stops: WalkStop[] = chosen.map(({ poi, stop }, index) => {
    const point: GeoPoint = { latitude: poi.latitude, longitude: poi.longitude }
    const arriveBy = arrivalInstruction(previous, point, context.language, { start: index === 0 })
    previous = point

    const aliases = [poi.name, stop.title, stop.titleEn, stop.title.split(/[:(–—-]/)[0]]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
    const uniqueAliases = [...new Set(aliases)].filter(
      (value) => value.toLocaleLowerCase('tr-TR') !== stop.title.toLocaleLowerCase('tr-TR'),
    )

    return {
      id: stopIdFor(poi),
      order: index + 1,
      title: stop.title,
      titleEn: stop.titleEn,
      aliases: [poi.name, ...uniqueAliases],
      brief: stop.brief,
      lookFor: stop.lookFor,
      arriveBy,
      latitude: poi.latitude,
      longitude: poi.longitude,
      osmId: poi.id,
    }
  })

  return {
    id: planId,
    title: output.title,
    titleEn: output.titleEn,
    place: context.place || output.title,
    placeEn: context.place || output.titleEn,
    country: context.country ?? '',
    minutes: output.minutes,
    stops,
    source: 'generated',
    ...(context.analysisId ? { analysisId: context.analysisId } : {}),
    origin: context.location,
    ...(output.intro ? { intro: output.intro } : {}),
    createdAt: Date.now(),
  }
}
