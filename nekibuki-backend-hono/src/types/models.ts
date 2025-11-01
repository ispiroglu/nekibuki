import { z } from '@hono/zod-openapi'

// Status enum
export const StatusSchema = z.enum(['processing', 'completed', 'failed']).openapi({
  description: 'Session processing status',
})

// LocationInfo schema
export const LocationInfoSchema = z
  .object({
    country: z.string().openapi({ example: 'France' }),
    city: z.string().openapi({ example: 'Paris' }),
    region: z.string().openapi({ example: 'Île-de-France' }),
  })
  .openapi('LocationInfo')

// LocationContext schema
export const LocationContextSchema = z
  .object({
    latitude: z
      .number()
      .min(-90)
      .max(90)
      .openapi({ example: 48.8566, description: 'Latitude (-90 to 90)' }),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .openapi({ example: 2.3522, description: 'Longitude (-180 to 180)' }),
    accuracy: z.number().optional().openapi({ example: 50.0 }),
  })
  .openapi('LocationContext')

// AttractionInfo schema
export const AttractionInfoSchema = z
  .object({
    name: z.string().openapi({ example: 'Eiffel Tower' }),
    description: z.string().openapi({ example: 'Brief description...' }),
    historical_info: z.string().openapi({ example: 'Historical background...' }),
    significance: z.string().openapi({ example: 'Cultural significance...' }),
    interesting_facts: z.array(z.string()).openapi({ example: ['Fact 1', 'Fact 2'] }),
    quick_facts: z
      .array(z.record(z.string(), z.string()))
      .openapi({ example: [{ Height: '330m' }, { 'Year Built': '1889' }] }),
    location: LocationInfoSchema.optional(),
    confidence: z
      .number()
      .min(0)
      .max(100)
      .openapi({ example: 95, description: 'Confidence score (0-100)' }),
  })
  .openapi('AttractionInfo')

// Session schema
export const SessionSchema = z
  .object({
    id: z.string().uuid().openapi({ example: '56371600-e29b-41d4-a716-446655440000' }),
    image_path: z.string().openapi({ example: '/uploads/session-id.jpg' }),
    image_mime_type: z.string().optional().openapi({ example: 'image/jpeg', description: 'MIME type of the uploaded image' }),
    image_hash: z.string().optional(),
    primary_attraction: z.string().openapi({ example: 'Eiffel Tower' }),
    confidence_score: z.number().openapi({ example: 95 }),
    status: StatusSchema,
    error_message: z.string().optional().openapi({ example: null }),
    processing_started_at: z.string().datetime().openapi({ example: '2025-01-18T10:00:00Z' }),
    processing_completed_at: z.string().datetime().nullable().optional(),
    processing_time_ms: z.number().optional().openapi({ example: 1250 }),
    created_at: z.string().datetime().openapi({ example: '2025-01-18T10:00:00Z' }),
    attraction_info: AttractionInfoSchema.optional(),
    preferred_language: z.string().optional().openapi({ example: 'en' }),
    location: LocationContextSchema.optional().openapi({ description: 'Location context from the request' }),
  })
  .openapi('Session')

// Request/Response schemas
export const SubmitRecognitionRequestSchema = z
  .object({
    language: z.string().optional().openapi({ example: 'en' }),
    location: LocationContextSchema.optional(),
  })
  .openapi('SubmitRecognitionRequest')

export const SubmitRecognitionResponseSchema = z
  .object({
    session_id: z.string().uuid().openapi({ example: '56371600-e29b-41d4-a716-446655440000' }),
    status: StatusSchema,
    message: z.string().openapi({ example: 'Photo uploaded successfully. Processing in progress.' }),
  })
  .openapi('SubmitRecognitionResponse')

export const GetResultResponseSchema = z
  .object({
    session_id: z.string().uuid().openapi({ example: '56371600-e29b-41d4-a716-446655440000' }),
    status: StatusSchema,
    attraction_info: AttractionInfoSchema.optional(),
    processing_time_ms: z.number().optional().openapi({ example: 1250 }),
    processing_error: z.string().nullable().optional().openapi({ example: null }),
    location: LocationContextSchema.optional().openapi({ description: 'Location context from the request' }),
  })
  .openapi('GetResultResponse')

// TypeScript types inferred from schemas
export type Status = z.infer<typeof StatusSchema>
export type LocationInfo = z.infer<typeof LocationInfoSchema>
export type LocationContext = z.infer<typeof LocationContextSchema>
export type AttractionInfo = z.infer<typeof AttractionInfoSchema>
export type Session = z.infer<typeof SessionSchema>
export type SubmitRecognitionRequest = z.infer<typeof SubmitRecognitionRequestSchema>
export type SubmitRecognitionResponse = z.infer<typeof SubmitRecognitionResponseSchema>
export type GetResultResponse = z.infer<typeof GetResultResponseSchema>

