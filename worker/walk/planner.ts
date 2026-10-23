import { bearingDegrees, directionLabel } from '../lib/geo'
import { fetchNearbyPois, type WalkPoi } from '../lib/overpass'
import { ProviderError, type AppEnv } from '../types'
import {
  composeWalkPlan,
  parsePlannerOutput,
  PlanValidationError,
  type WalkPlanContext,
} from './plan'

/**
 * Fast enough for a tap-to-tour request and good at following a JSON schema.
 * Swap with WALK_PLANNER_MODEL without touching the narrator.
 */
export const DEFAULT_PLANNER_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

const PLANNER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'titleEn', 'minutes', 'stops'],
  properties: {
    title: { type: 'string' },
    titleEn: { type: 'string' },
    minutes: { type: 'integer', minimum: 20, maximum: 240 },
    intro: { type: 'string' },
    stops: {
      type: 'array',
      minItems: 5,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['candidateId', 'title', 'titleEn', 'brief', 'lookFor'],
        properties: {
          candidateId: { type: 'string' },
          title: { type: 'string' },
          titleEn: { type: 'string' },
          brief: { type: 'string' },
          lookFor: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: { type: 'string' },
          },
        },
      },
    },
  },
} as const

/** Candidate ids are the only handles the model gets; it never sees a free coordinate. */
export function buildPlannerPrompt(context: WalkPlanContext, candidates: WalkPoi[]): string {
  const language = context.language === 'tr' ? 'Turkish' : 'English'
  const nearby = candidates.map((poi) => ({
    candidateId: poi.id,
    name: poi.name,
    kind: poi.kind,
    distanceMeters: poi.distance,
    direction: directionLabel(
      bearingDegrees(context.location, { latitude: poi.latitude, longitude: poi.longitude }),
      context.language,
    ),
  }))

  return [
    'You are planning one short walking tour for a traveller standing in the place described below.',
    '',
    `Photo report: ${context.title}`,
    context.summary ? `Report summary: ${context.summary}` : '',
    `Place: ${context.place}${context.country ? `, ${context.country}` : ''}`,
    `The traveller is at ${context.location.latitude.toFixed(5)}, ${context.location.longitude.toFixed(5)}.`,
    `Write the narrative fields in ${language}. The *En fields must always be English.`,
    '',
    'Rules:',
    '- Choose 5 to 8 stops, and only from the candidate list. Use each candidateId at most once.',
    '- Never invent a place, and never output coordinates. The app takes coordinates from OpenStreetMap.',
    '- The first stop must be the closest meaningful starting point to the traveller.',
    '- Keep the route walkable: prefer short hops between consecutive stops, and do not zig-zag across the neighbourhood.',
    '- Skip generic places (parking, plain offices, unremarkable shops) even if they are in the list.',
    '- Each stop needs a 2–3 sentence brief and 2–4 concrete things to look for. Sound like a person walking beside them, not a plaque.',
    '- Title and intro should make it clear this tour starts from where the traveller is standing.',
    '- minutes is a realistic walking time for the whole route, including pauses.',
    '- Return only JSON that matches the provided schema.',
    '',
    'CANDIDATES:',
    JSON.stringify(nearby, null, 2),
  ]
    .filter(Boolean)
    .join('\n')
}

function responseText(result: unknown): string {
  if (typeof result === 'string') return result
  if (!result || typeof result !== 'object') return ''

  const value = result as Record<string, unknown>
  if (typeof value.response === 'string') return value.response

  const choices = value.choices
  if (Array.isArray(choices)) {
    const first = choices[0] as { message?: { content?: unknown } } | undefined
    if (typeof first?.message?.content === 'string') return first.message.content
  }

  const nested = value.result as Record<string, unknown> | undefined
  if (nested && typeof nested.response === 'string') return nested.response

  return ''
}

async function askPlanner(
  env: AppEnv,
  model: string,
  context: WalkPlanContext,
  candidates: WalkPoi[],
  correction?: string,
): Promise<string> {
  const prompt = [
    buildPlannerPrompt(context, candidates),
    correction ? `\nYour previous answer was rejected: ${correction}\nReturn a corrected JSON plan.` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const result = await env.AI.run(model, {
      messages: [
        {
          role: 'system',
          content:
            'You plan walking tours. You only choose places from the supplied candidate list and you always answer with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 3200,
      temperature: 0.35,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'walk_plan',
          schema: PLANNER_SCHEMA,
          strict: true,
        },
      },
    } as never)

    return responseText(result)
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Walk planner model failed',
        model,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    throw new ProviderError(
      'The guide could not plan this walk right now. Try again in a moment.',
      'walk_plan_failed',
      502,
    )
  }
}

/**
 * Build a tour from the photo position: Overpass supplies real places, the
 * model chooses and narrates them, and this function owns the second attempt.
 */
export async function generateWalkPlan(
  env: AppEnv,
  context: WalkPlanContext,
  planId: string,
): Promise<{ plan: ReturnType<typeof composeWalkPlan>; candidates: WalkPoi[] }> {
  if (!env.AI) {
    throw new ProviderError(
      'The walk planner needs an AI binding. Add `ai.binding` to wrangler.jsonc.',
      'walk_unavailable',
      503,
    )
  }

  const candidates = await fetchNearbyPois(context.location, { url: env.OVERPASS_URL })
  const model = env.WALK_PLANNER_MODEL || DEFAULT_PLANNER_MODEL

  let correction: string | undefined
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const text = await askPlanner(env, model, context, candidates, correction)
    try {
      const output = parsePlannerOutput(text)
      // parse checks the shape; compose checks that every chosen id is a real
      // candidate and that enough of them survived.
      const plan = composeWalkPlan(context, candidates, output, planId)
      return { plan, candidates }
    } catch (error) {
      if (!(error instanceof PlanValidationError)) throw error
      correction = error.message
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'Walk planner output rejected',
          attempt: attempt + 1,
          reason: error.message,
        }),
      )
    }
  }

  throw new ProviderError(
    'The guide could not assemble a reliable route from the places around this photo. Try again, or take the photo from a nearby square or museum entrance.',
    'walk_plan_failed',
    502,
  )
}
