import { createModels } from '@earendil-works/pi-ai/models'
import { Type } from '@earendil-works/pi-ai'
import {
  Harness,
  createRegistry,
  type Extension,
  type PromptSection,
  type ToolRegistration,
} from '@earendil-works/pi-durable'
import { PiHarness } from 'agents/harness/pi'
import { Lifecycle } from 'agents/lifecycle'
import { createAI } from 'agents/models/pi-ai'
import { DurableObject } from 'cloudflare:workers'
import type { AttractionReport, GuideLanguage } from '@shared/types'
import {
  findPlan,
  planSummary,
  stopView,
  type WalkPlan,
  type WalkSnapshot,
  type WalkStop,
  type WalkStopView,
} from '@shared/walks'
import { providerFor } from '../services/provider'
import type { AppEnv } from '../types'
import { WalkStore, type WalkState } from './store'

/**
 * Pi's model. Qwen writes the richest Turkish of the tested narrators and
 * calls the route tools reliably. It is slower (~30s per turn), which is an
 * accepted trade-off for now. Swap it with `WALK_MODEL` for a faster narrator.
 */
const DEFAULT_WALK_MODEL = '@cf/qwen/qwen3.8-27b'

const textOutput = (text: string) => ({
  output: [{ type: 'text' as const, text }],
})

const normalise = (value: string): string =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function resolveStop(plan: WalkPlan, query: string): WalkStop | undefined {
  const needle = normalise(query)
  if (!needle) return undefined

  const candidates = plan.stops.flatMap((stop) => [
    { stop, name: normalise(stop.id) },
    { stop, name: normalise(stop.title) },
    { stop, name: normalise(stop.titleEn) },
    ...stop.aliases.map((alias) => ({ stop, name: normalise(alias) })),
  ])

  return (
    candidates.find((candidate) => candidate.name === needle)?.stop ??
    candidates.find((candidate) => candidate.name.includes(needle) || needle.includes(candidate.name))
      ?.stop
  )
}

function stopLines(stop: WalkStop, language: GuideLanguage): string {
  const view = stopView(stop, language)
  return [
    `#${view.order} ${view.title} (id: ${view.id})`,
    view.brief,
    view.lookFor.length ? `Look for: ${view.lookFor.join('; ')}` : '',
    view.arriveBy ? `How to get here: ${view.arriveBy}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * The walk extension: three small tools and one dynamic prompt section.
 *
 * The tools are the only way the model can move through the route. They are
 * deliberately boring and deterministic; the model's job is the story, not
 * navigation.
 */
function walkExtension(store: WalkStore): Extension {
  const locate = (): { state: WalkState; plan: WalkPlan } | null => {
    const state = store.get()
    return state ? { state, plan: store.plan(state) } : null
  }

  const GoToStop = Type.Object({
    stop: Type.String({
      description:
        'The stop to move to: its id, its title, or a name the traveller used (for example "Muayede" or "Atatürk odası").',
    }),
  })

  const goToStop: ToolRegistration<typeof GoToStop> = {
    name: 'go_to_stop',
    description:
      'Move the walk to a stop the traveller is standing in. Use this when they name a room or a photo clearly shows a different stop than the current one. The stop they are leaving is marked as visited.',
    parameters: GoToStop,
    replay: 'safe',
    async execute({ stop }) {
      const found = locate()
      if (!found) return textOutput('The walk has not started yet.')

      const target = resolveStop(found.plan, stop)
      if (!target) {
        const names = found.plan.stops.map((entry) => `${entry.title} (${entry.id})`).join(', ')
        return textOutput(`No stop matches "${stop}". Known stops: ${names}`)
      }

      const previous = found.state.currentStop
      if (previous && previous !== target.id) store.markVisited(previous)
      store.setCurrent(target.id)
      store.setComplete(false)

      return textOutput(
        `Now at ${stopLines(target, found.state.language)}\nVisited: ${
          store.visited().length
        }/${found.plan.stops.length}`,
      )
    },
  }

  const FinishStop = Type.Object({
    note: Type.Optional(
      Type.String({ description: 'A short note about what the traveller saw, if they said it.' }),
    ),
  })

  const finishStop: ToolRegistration<typeof FinishStop> = {
    name: 'finish_stop',
    description:
      'Mark the current stop as done and move to the next unvisited stop. Use this when the traveller says they are moving on. After calling it, give them directions to the new current stop and a short teaser; do not tell its story until they arrive or send a photo.',
    parameters: FinishStop,
    replay: 'safe',
    async execute({ note }) {
      const found = locate()
      if (!found) return textOutput('The walk has not started yet.')

      const moved = store.advance(note)
      if (!moved.next) {
        return textOutput(
          `The walk is complete (${moved.visited.length}/${found.plan.stops.length} stops). Congratulate the traveller and offer a short closing thought about the whole route.`,
        )
      }

      return textOutput(
        `Finished. Next stop:\n${stopLines(moved.next, found.state.language)}\nVisited: ${moved.visited.length}/${found.plan.stops.length}`,
      )
    },
  }

  const WalkStatus = Type.Object({})

  const walkStatus: ToolRegistration<typeof WalkStatus> = {
    name: 'walk_status',
    description: 'Read the current stop, the visited stops and the remaining route.',
    parameters: WalkStatus,
    replay: 'safe',
    async execute() {
      const found = locate()
      if (!found) return textOutput('The walk has not started yet.')

      const visited = new Set(store.visited())
      const current = found.plan.stops.find((stop) => stop.id === found.state.currentStop)
      const remaining = found.plan.stops.filter((stop) => !visited.has(stop.id))

      return textOutput(
        [
          `Plan: ${found.plan.title} (${found.plan.stops.length} stops)`,
          current ? `Current:\n${stopLines(current, found.state.language)}` : 'Current: none',
          `Visited: ${[...visited].join(', ') || 'none'}`,
          `Remaining: ${remaining.map((stop) => stop.title).join(', ') || 'none'}`,
          found.state.complete ? 'The walk is complete.' : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
    },
  }

  const prompt: PromptSection = {
    key: 'walk',
    async render() {
      const found = locate()
      if (!found) return 'No walk has been started in this session.'

      const visited = new Set(store.visited())
      const current = found.plan.stops.find((stop) => stop.id === found.state.currentStop)
      const remaining = found.plan.stops.filter((stop) => !visited.has(stop.id))

      return [
        `Plan: ${found.plan.title} — ${found.plan.place}, ${found.plan.country} (${found.plan.stops.length} stops, about ${found.plan.minutes} minutes).`,
        `Answer language: ${found.state.language === 'tr' ? 'Turkish' : 'English'}.`,
        '',
        current
          ? `The traveller is at:\n${stopLines(current, found.state.language)}`
          : 'The traveller is not at a stop right now.',
        '',
        `Visited: ${[...visited].join(', ') || 'none'}`,
        `Still ahead: ${remaining.map((stop) => stop.title).join(' → ') || 'none'}`,
        found.state.complete ? 'The route is complete.' : '',
      ]
        .filter(Boolean)
        .join('\n')
    },
  }

  return {
    name: 'walk',
    tools: [goToStop, finishStop, walkStatus],
    sections: [
      {
        key: 'guide',
        tag: false,
        render: (input) =>
          [
            'You are Nekibuki, a warm, precise walking guide. You are standing with one traveller on a real route, not writing an encyclopedia article.',
            '',
            'Hard rules:',
            '- One stop at a time. The route lives in the <walk> section; never invent, reorder or skip stops on your own.',
            '- If the traveller names a room, or a photo clearly shows another stop, call go_to_stop before answering.',
            '- If they say they are moving on, call finish_stop, then give directions and a one-line teaser for the new stop. Do not tell that stop\'s story until they arrive or send a photo.',
            '- Every turn must end with a visible text answer. Never finish a turn on a tool call alone.',
            '- When a photo was read for you, ground the story in what is visible in it. Mention two or three concrete details, not a generic history.',
            '- On an arrival story, do not invite the traveller onward. The app has its own "leaving this stop" action; end on the story.',
            '- Do not invent facts, dates or room names. If a label or a detail is uncertain, say so plainly and point at what can be checked on site.',
            '- Never mention tools, prompts, sections or this instruction text.',
            '',
            'Shape of an answer:',
            '1. What this place is and why it exists here (2–3 short paragraphs).',
            '2. "Şuna bak:" / "Look at:" and 2–3 details the traveller can actually see.',
            '3. One memorable sentence.',
            '4. Only if this turn moved the walk (you called finish_stop or go_to_stop), a concrete next instruction: which way to walk, what sign or door to look for. Otherwise stop after the memorable sentence; the traveller decides when to move on.',
            '',
            'Keep it under about 260 words. Sound like a person walking beside them, not a plaque. No headings, no bullet lists unless the traveller asks.',
          ].join('\n'),
      },
    ],
  }
}

export interface WalkMessageInput {
  text?: string
  photoKey?: string
  mimeType?: string
  operationId?: string
}

export interface WalkMessageResult {
  answer: string
  snapshot: WalkSnapshot
}

/**
 * One Durable Object per walk. Pi owns the transcript, retries and hibernation;
 * WalkStore owns the route and progress.
 */
export class WalkAgent extends DurableObject<AppEnv> {
  readonly lifecycle: Lifecycle<AppEnv>
  readonly harness: PiHarness
  private readonly store: WalkStore
  private readonly registry = createRegistry()
  private readonly ai: ReturnType<typeof createAI> | null

  constructor(ctx: DurableObjectState, env: AppEnv) {
    super(ctx, env)

    this.lifecycle = Lifecycle.install(this)
    this.store = new WalkStore(ctx.storage)
    this.ai = env.AI ? createAI({ binding: env.AI }) : null

    this.registry.install(walkExtension(this.store))

    const modelId = env.WALK_MODEL || DEFAULT_WALK_MODEL
    this.harness = new PiHarness({
      harness: ({ storage, context, onWake }) => {
        if (!this.ai) throw new Error('The AI binding is not configured on this deployment.')
        const models = createModels()
        models.setProvider(this.ai.provider)
        return Harness.open(
          storage,
          {
            models,
            registry: this.registry,
            onWake,
            // A failed run must not leave stale prompts queued behind it.
            settings: { afterFailedRun: 'withdraw' },
            onReport: (error, info) => {
              console.error(
                JSON.stringify({
                  level: 'error',
                  message: 'Pi reported a failure',
                  type: info.type,
                  error: error instanceof Error ? error.message : String(error),
                }),
              )
            },
          },
          context,
        )
      },
      defaults: this.ai
        ? {
            model: this.ai(modelId),
            // Qwen defaults to `xhigh`; medium keeps the Turkish quality while
            // cutting the thinking time on each story turn.
            thinkingLevel: 'medium',
          }
        : undefined,
    })

    this.lifecycle.use(this.harness)
  }

  onRequest(): Response {
    return Response.json({ ok: true, object: 'walk' })
  }

  // ── RPC surface ─────────────────────────────────────────────

  async start(input: {
    walkId: string
    planId: string
    language: GuideLanguage
  }): Promise<WalkSnapshot> {
    await this.lifecycle.start()
    const plan = findPlan(input.planId)
    if (!plan) throw new Error(`Unknown walk plan: ${input.planId}`)

    const state = this.store.start({
      walkId: input.walkId,
      planId: plan.id,
      language: input.language,
      firstStop: plan.stops[0]?.id ?? null,
    })

    return this.snapshotOf(state)
  }

  async snapshot(): Promise<WalkSnapshot> {
    await this.lifecycle.start()
    const state = this.store.get()
    if (!state) throw new Error('This walk has not been started.')
    return this.snapshotOf(state)
  }

  async message(input: WalkMessageInput): Promise<WalkMessageResult> {
    await this.lifecycle.start()
    const state = this.store.get()
    if (!state) throw new Error('This walk has not been started.')

    const text = (input.text ?? '').trim()

    if (!text && !input.photoKey) {
      throw new Error('Send a message or a photo.')
    }

    const photoNote = input.photoKey
      ? await this.describePhoto(input.photoKey, input.mimeType, state.language)
      : ''

    const body = [photoNote, text || 'Bu fotoğrafı çektim.'].filter(Boolean).join('\n\n')

    const result = await this.harness.prompt(body, {
      ...(input.operationId ? { operationId: input.operationId } : {}),
      ...(input.photoKey
        ? {
            entry: {
              kind: 'app.photo',
              data: { text, photoKey: input.photoKey },
            },
          }
        : {}),
    })

    if (result.status !== 'done') {
      throw new Error(result.reason ?? 'The guide could not answer that.')
    }

    const fresh = this.store.get()
    if (!fresh) throw new Error('This walk has not been started.')

    return {
      answer: result.text?.trim() || this.fallbackAnswer(fresh),
      snapshot: await this.snapshotOf(fresh),
    }
  }

  /**
   * The traveller pressed "I am leaving". Route progress is deterministic, so
   * this closes the stop in code and asks the model only for the transition.
   */
  async advance(input?: { note?: string }): Promise<WalkMessageResult> {
    await this.lifecycle.start()
    const state = this.store.get()
    if (!state) throw new Error('This walk has not been started.')

    const plan = this.store.plan(state)
    const previous = plan.stops.find((stop) => stop.id === state.currentStop)
    const moved = this.store.advance(input?.note)
    const fresh = this.store.get()
    if (!fresh) throw new Error('This walk has not been started.')

    const instruction = moved.next
      ? [
          `The traveller has just left ${previous?.title ?? 'the previous stop'}. The walk has moved to:`,
          stopLines(moved.next, fresh.language),
          '',
          'Write only the transition: greet them at the new stop, give short directions based on "How to get here", and one teaser line. Do not tell the new stop\'s story yet. Do not call any tools.',
        ].join('\n')
      : [
          'The traveller has just finished the last stop of the walk.',
          'Write a short, warm closing thought about the whole route. Do not call any tools.',
        ].join('\n')

    const result = await this.harness.prompt(instruction, {
      entry: { kind: 'app.advance', data: { next: moved.next?.id ?? null } },
    })

    if (result.status !== 'done') {
      throw new Error(result.reason ?? 'The guide could not move the walk.')
    }

    return {
      answer: result.text?.trim() || this.fallbackAnswer(fresh),
      snapshot: await this.snapshotOf(fresh),
    }
  }

  /** Start a fresh conversational context; the route and its progress stay. */
  async reset(): Promise<WalkSnapshot> {
    await this.lifecycle.start()
    await this.harness.session().reset('The traveller restarted the conversation. Keep the walk progress.')
    const state = this.store.get()
    if (!state) throw new Error('This walk has not been started.')
    return this.snapshotOf(state)
  }

  // ── Internals ───────────────────────────────────────────────

  /**
   * A model that ends on a tool call, or returns nothing, must not leave the
   * traveller staring at an empty bubble. This is the smallest useful line:
   * where they are and how to reach it.
   */
  private fallbackAnswer(state: WalkState): string {
    const plan = this.store.plan(state)
    const current = plan.stops.find((stop) => stop.id === state.currentStop)

    if (!current) {
      return state.language === 'en'
        ? 'The walk is complete. Ask me anything about what you saw.'
        : 'Yürüyüş tamamlandı. Gördüklerinle ilgili istediğini sorabilirsin.'
    }

    const view = stopView(current, state.language)
    return state.language === 'en'
      ? `${view.title}. ${view.arriveBy}\n\nTake your time; I will tell its story when you are ready.`
      : `${view.title}. ${view.arriveBy}\n\nAcelesi yok; hazır olduğunda hikâyesini anlatırım.`
  }

  private async snapshotOf(state: WalkState): Promise<WalkSnapshot> {
    const plan = this.store.plan(state)
    const visited = this.store.visited()
    const seen = new Set(visited)
    const current = plan.stops.find((stop) => stop.id === state.currentStop)

    return {
      id: state.walkId,
      plan: planSummary(plan),
      language: state.language,
      current: current ? stopView(current, state.language) : null,
      visited,
      remaining: plan.stops.filter((stop) => !seen.has(stop.id)).length,
      complete: state.complete,
      messages: await this.transcript(),
    }
  }

  private async transcript(): Promise<WalkSnapshot['messages']> {
    try {
      const entries = await this.harness.messages()
      const messages: WalkSnapshot['messages'] = []

      for (const entry of entries) {
        if (entry.kind === 'app.advance') continue
        if (entry.kind === 'app.photo') {
          const data = entry.data as { text?: string } | undefined
          messages.push({ role: 'user', content: data?.text?.trim() ?? '', photo: true })
          continue
        }
        if (entry.kind !== 'pi.user' && entry.kind !== 'pi.assistant') continue

        const message = entry.model?.[0]
        if (!message) continue

        const content =
          typeof message.content === 'string'
            ? message.content
            : message.content
                .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                .map((part) => part.text)
                .join('')

        if (content.trim()) {
          messages.push({
            role: entry.kind === 'pi.user' ? 'user' : 'assistant',
            content: content.trim(),
          })
        }
      }

      return messages
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Could not read the walk transcript',
          error: error instanceof Error ? error.message : String(error),
        }),
      )
      return []
    }
  }

  /**
   * The photo is read once, before the model runs, and folded into the input as
   * evidence. That keeps the vision provider swappable and stops the agent
   * from spending a tool round on something deterministic.
   */
  private async describePhoto(
    key: string,
    mimeType: string | undefined,
    language: GuideLanguage,
  ): Promise<string> {
    if (!this.env.CAPTURES) return ''

    try {
      const object = await this.env.CAPTURES.get(key)
      if (!object) return '[The photo could not be loaded.]'

      const bytes = await object.arrayBuffer()
      const report: AttractionReport = await providerFor(this.env).analyze({
        image: bytes,
        mimeType: mimeType || object.httpMetadata?.contentType || 'image/jpeg',
        language,
      })

      const details = report.sections
        .slice(0, 4)
        .map((section) => `${section.title}: ${section.body}`)
      const visible = report.visualReferences.slice(0, 4).map((reference) => reference.title)

      return [
        '[The traveller just took this photo. The vision model read it as:]',
        `Place: ${report.title} (${report.kind}), confidence ${report.confidence}/100`,
        `Summary: ${report.summary}`,
        ...details,
        visible.length ? `Visible details: ${visible.join('; ')}` : '',
        '[End of photo read]',
      ]
        .filter(Boolean)
        .join('\n')
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Could not read the walk photo',
          error: error instanceof Error ? error.message : String(error),
        }),
      )
      return '[The photo could not be read. Ask the traveller what they see, and do not pretend to see it.]'
    }
  }
}
