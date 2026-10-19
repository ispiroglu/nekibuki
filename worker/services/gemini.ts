import { reportSchema } from '@shared/schema'
import type { AttractionReport, GuideLanguage } from '@shared/types'
import { arrayBufferToBase64 } from '../lib/base64'
import { buildAnalyzePrompt, buildChatPrompt } from '../prompts'
import { ProviderError, type VisionInput, type VisionProvider } from '../types'

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models'

const TRIVIA_ICONS = [
  'calendar',
  'user',
  'sparkles',
  'layers',
  'map',
  'palette',
  'hammer',
  'crown',
  'compass',
  'leaf',
] as const

const responseSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    kind: { type: 'STRING' },
    location: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING' },
        country: { type: 'STRING' },
      },
      required: ['name', 'country'],
    },
    era: { type: 'STRING' },
    confidence: { type: 'INTEGER' },
    summary: { type: 'STRING' },
    quickFacts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          value: { type: 'STRING' },
        },
        required: ['label', 'value'],
      },
    },
    trivia: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          icon: { type: 'STRING', enum: [...TRIVIA_ICONS] },
          label: { type: 'STRING' },
          title: { type: 'STRING' },
          body: { type: 'STRING' },
        },
        required: ['id', 'icon', 'label', 'title', 'body'],
      },
    },
    visualReferences: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          x: { type: 'NUMBER' },
          y: { type: 'NUMBER' },
          title: { type: 'STRING' },
          body: { type: 'STRING' },
        },
        required: ['id', 'x', 'y', 'title', 'body'],
      },
    },
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          title: { type: 'STRING' },
          body: { type: 'STRING' },
          seeInPhoto: { type: 'STRING' },
        },
        required: ['id', 'title', 'body'],
      },
    },
    suggestedQuestions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: [
    'title',
    'kind',
    'location',
    'era',
    'confidence',
    'summary',
    'quickFacts',
    'trivia',
    'visualReferences',
    'sections',
    'suggestedQuestions',
  ],
} as const

interface GeminiCandidate {
  content?: { parts?: { text?: string; thought?: boolean }[] }
  finishReason?: string
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
  promptFeedback?: { blockReason?: string }
  error?: { message?: string; status?: string }
}

const languageName = (language: GuideLanguage) => (language === 'tr' ? 'Turkish' : 'English')

export class GeminiProvider implements VisionProvider {
  readonly name = 'gemini' as const
  readonly model: string
  private readonly apiKey: string

  constructor(apiKey: string, model = 'gemini-2.5-flash') {
    this.apiKey = apiKey
    this.model = model
  }

  private async call(body: unknown): Promise<GeminiResponse> {
    let response: Response
    try {
      response = await fetch(`${API_ROOT}/${this.model}:generateContent`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(55_000),
      })
    } catch {
      throw new ProviderError(
        'The guide could not reach the vision service. Check your connection and try again.',
        'network_error',
        504,
      )
    }

    const payload = (await response.json().catch(() => ({}))) as GeminiResponse

    if (!response.ok) {
      if (response.status === 429) {
        throw new ProviderError(
          'The guide is busy right now. Give it a moment and try again.',
          'rate_limited',
          429,
        )
      }
      if (response.status === 400 && payload.error?.message?.includes('API key')) {
        throw new ProviderError('The vision service key is invalid.', 'invalid_key', 503)
      }
      throw new ProviderError(
        payload.error?.message ?? 'The vision service returned an error.',
        'provider_error',
        502,
      )
    }

    if (payload.promptFeedback?.blockReason) {
      throw new ProviderError(
        'This photo could not be analysed. Try a clearer view of the place.',
        'blocked',
        422,
      )
    }

    return payload
  }

  private textFrom(payload: GeminiResponse): string {
    const candidate = payload.candidates?.[0]
    const text = candidate?.content?.parts
      ?.filter((part) => !part.thought && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
      .trim()

    if (!text) {
      throw new ProviderError(
        'The guide came back empty. Try the photo again.',
        'empty_response',
        502,
      )
    }
    return text
  }

  async analyze(input: VisionInput): Promise<AttractionReport> {
    const prompt = buildAnalyzePrompt(input.language, input.location)

    const payload = await this.call({
      systemInstruction: {
        parts: [
          {
            text: 'You are Nekibuki, a precise and warm travel guide. Return only valid JSON matching the requested schema.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: input.mimeType, data: arrayBufferToBase64(input.image) } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.45,
        topP: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema,
      },
    })

    const text = this.textFrom(payload)
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new ProviderError(
        'The guide returned an unreadable answer. Please try again.',
        'invalid_json',
        502,
      )
    }

    const parsed = reportSchema.safeParse(json)
    if (!parsed.success) {
      throw new ProviderError(
        `The guide returned an incomplete answer (${parsed.error.issues[0]?.path.join('.') ?? 'schema'}). Try again.`,
        'invalid_report',
        502,
      )
    }

    return parsed.data
  }

  async chat(input: {
    report: AttractionReport
    history: { role: 'user' | 'assistant'; content: string }[]
    question: string
    language: GuideLanguage
  }): Promise<string> {
    const history = input.history
      .slice(-12)
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }))

    while (history.length && history[0].role === 'model') history.shift()

    const payload = await this.call({
      systemInstruction: {
        parts: [{ text: buildChatPrompt(input.report, input.language) }],
      },
      contents: [
        ...history,
        { role: 'user', parts: [{ text: input.question }] },
      ],
      generationConfig: {
        temperature: 0.6,
        topP: 0.95,
        maxOutputTokens: 900,
      },
    })

    return this.textFrom(payload)
  }
}

export function geminiChatFallback(report: AttractionReport, question: string): string {
  return `You asked: “${question}”. I can tell you about ${report.title} in ${report.location.name}, but the live guide is unavailable right now. Try again in a moment.`
}

export const geminiLanguageName = languageName
