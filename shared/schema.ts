import { z } from 'zod'

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
})

export const triviaSchema = z.object({
  id: z.string(),
  icon: z.enum([
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
  ]),
  label: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(420),
})

export const visualReferenceSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(320),
})

export const guideSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(1200),
  seeInPhoto: z.string().max(240).optional(),
})

export const odditySchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(90),
  body: z.string().min(1).max(420),
})

export const nextStepSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
  instruction: z.string().min(1).max(200),
  why: z.string().min(1).max(240),
})

export const reportSchema = z.object({
  title: z.string().min(1).max(120),
  kind: z.string().min(1).max(80),
  location: z.object({
    name: z.string().min(1).max(120),
    country: z.string().min(1).max(80),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  era: z.string().min(1).max(60),
  confidence: z.number().min(0).max(100),
  summary: z.string().min(20).max(800),
  quickFacts: z
    .array(z.object({ label: z.string().max(40), value: z.string().max(80) }))
    .min(3)
    .max(6),
  trivia: z.array(triviaSchema).length(4),
  visualReferences: z.array(visualReferenceSchema).min(2).max(6),
  sections: z.array(guideSectionSchema).min(2).max(5),
  // Both are optional: a guide written before these fields existed must still
  // load, and a provider that skips them must not fail the whole report.
  oddities: z.array(odditySchema).min(2).max(3).optional(),
  nextSteps: z.array(nextStepSchema).min(2).max(3).optional(),
  suggestedQuestions: z.array(z.string().max(140)).min(2).max(5),
})

export const chatRequestSchema = z.object({
  report: reportSchema,
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
        createdAt: z.number(),
      }),
    )
    .max(30),
  question: z.string().min(1).max(1000),
  language: z.enum(['en', 'tr']),
})
