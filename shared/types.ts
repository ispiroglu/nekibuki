export type GuideLanguage = 'en' | 'tr'

export type TriviaIcon =
  | 'calendar'
  | 'user'
  | 'sparkles'
  | 'layers'
  | 'map'
  | 'palette'
  | 'hammer'
  | 'crown'
  | 'compass'
  | 'leaf'

export interface GeoPoint {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface VisualReference {
  id: string
  /** Horizontal position on the photo, 0–1. */
  x: number
  /** Vertical position on the photo, 0–1. */
  y: number
  title: string
  body: string
}

export interface Trivia {
  id: string
  icon: TriviaIcon
  /** Short overline, e.g. "Completed in" */
  label: string
  /** The headline fact, e.g. "1889" */
  title: string
  body: string
}

export interface GuideSection {
  id: string
  title: string
  body: string
  /** The detail visible in *this* photograph that the paragraph refers to. */
  seeInPhoto?: string
}

export interface QuickFact {
  label: string
  value: string
}

/**
 * A strange-but-true fact about the place. Not a quiz answer and not a
 * restatement of a quick fact: the odd detail a local would tell you.
 */
export interface Oddity {
  id: string
  /** The strange fact in a few words. */
  title: string
  body: string
}

/**
 * A shot that would take the traveller further. The instruction is what the
 * camera should be pointed at next.
 */
export interface NextStep {
  id: string
  /** Short overline, e.g. "Step back" */
  label: string
  /** What to look for, e.g. "The arch that frames the square" */
  title: string
  /** The concrete shot to take, written for the viewfinder. */
  instruction: string
  /** Why this shot is worth taking. */
  why: string
}

export interface AttractionReport {
  title: string
  /** What kind of thing it is, e.g. "Iron lattice tower" */
  kind: string
  location: {
    name: string
    country: string
    lat?: number
    lng?: number
  }
  /** Human era string, e.g. "1887–1889" */
  era: string
  /** 0–100 */
  confidence: number
  summary: string
  quickFacts: QuickFact[]
  trivia: Trivia[]
  visualReferences: VisualReference[]
  sections: GuideSection[]
  /** 2–3 strange-but-true facts. Optional so guides saved earlier still load. */
  oddities?: Oddity[]
  /** 2–3 shots that would take the traveller further. */
  nextSteps?: NextStep[]
  suggestedQuestions: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface Analysis {
  id: string
  createdAt: number
  report: AttractionReport
  location?: GeoPoint
  language: GuideLanguage
  messages: ChatMessage[]
  saved: boolean
  /** Full-size image URL (blob URL for local captures, /api/... when remote). */
  imageUrl: string
  /** Small image for lists. */
  previewUrl: string
  /** Which model wrote the guide. Present only for remote captures. */
  provider?: string
  model?: string
}

export interface NewAnalysis {
  report: AttractionReport
  location?: GeoPoint
  language: GuideLanguage
  image: Blob
}

export interface AnalyzeResponse {
  report: AttractionReport
  /**
   * The stored capture, when the Worker persisted it. Absent in demo mode,
   * where the traveller's own IndexedDB is the only repository.
   */
  analysis?: Analysis
  meta?: {
    provider: 'gemini' | 'mock'
    model?: string
    processingMs?: number
  }
}

export interface ChatRequest {
  report: AttractionReport
  messages: ChatMessage[]
  question: string
  language: GuideLanguage
}

export interface ChatResponse {
  answer: string
  provider: 'gemini' | 'mock'
}
