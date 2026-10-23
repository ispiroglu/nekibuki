import { mockChatAnswer, mockReportForSeed } from '@shared/mock-reports'
import type { AttractionReport, GuideLanguage } from '@shared/types'
import type { VisionInput, VisionProvider } from '../types'

function seedFromImage(input: VisionInput): string {
  const bytes = new Uint8Array(input.image)
  let hash = bytes.byteLength
  const step = Math.max(1, Math.floor(bytes.byteLength / 96))
  for (let i = 0; i < bytes.byteLength; i += step) {
    hash = (hash * 31 + bytes[i]) >>> 0
  }
  if (input.location) {
    hash = (hash * 31 + Math.round(input.location.latitude * 1000)) >>> 0
    hash = (hash * 31 + Math.round(input.location.longitude * 1000)) >>> 0
  }
  return String(hash)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class MockVisionProvider implements VisionProvider {
  readonly name = 'mock' as const
  readonly model = 'nekibuki-demo'

  async analyze(input: VisionInput): Promise<AttractionReport> {
    // A small, honest delay so the analysing state can be experienced properly.
    await wait(2600 + Math.random() * 900)
    const mock = mockReportForSeed(seedFromImage(input))
    return structuredClone(mock.report)
  }

  async chat(input: {
    report: AttractionReport
    history: { role: 'user' | 'assistant'; content: string }[]
    question: string
    language: GuideLanguage
    image?: { data: ArrayBuffer; mimeType: string }
  }): Promise<string> {
    await wait(750 + Math.random() * 500)
    return mockChatAnswer(input.report, input.question)
  }
}
