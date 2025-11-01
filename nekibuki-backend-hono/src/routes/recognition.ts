import { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { v4 as uuidv4 } from 'uuid'
import { z } from '@hono/zod-openapi'
import { Client } from '@upstash/qstash'
import {
  SubmitRecognitionResponseSchema,
  GetResultResponseSchema,
  SessionSchema,
  type Session,
} from '../types/models'
import { saveSession, getSession, savePhoto, getPhoto } from '../services/storage'
import type { CloudflareBindings, QueueMessage } from '../types/bindings'

const app = new OpenAPIHono<{ Bindings: CloudflareBindings }>()

// POST /api/recognition route
const submitRecognitionRoute = createRoute({
  method: 'post',
  path: '/api/recognition',
  tags: ['recognition'],
  summary: 'Submit Recognition',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            photo: z.instanceof(File).openapi({
              description: 'Image file (JPEG, PNG, GIF, or WebP)',
            }),
            location: z
              .string()
              .optional()
              .openapi({
                description: 'JSON string containing location context',
                example: '{"latitude":48.8566,"longitude":2.3522,"accuracy":50.0}',
              }),
            language: z
              .string()
              .optional()
              .openapi({
                description: 'Preferred language code for response',
                example: 'en',
              }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SubmitRecognitionResponseSchema,
        },
      },
      description: 'successful operation',
    },
    400: {
      description: 'Bad Request',
    },
    500: {
      description: 'Internal Server Error',
    },
  },
})

app.openapi(submitRecognitionRoute, async (c) => {
  const formData = await c.req.formData()
  const photo = formData.get('photo') as File | null
  
  if (!photo) {
    return c.json({ error: 'Photo is required' }, 400)
  }
  
  // Parse optional location
  let location: { latitude: number; longitude: number; accuracy?: number } | undefined
  const locationStr = formData.get('location')?.toString()
  if (locationStr) {
    try {
      location = JSON.parse(locationStr)
      // Validate latitude and longitude ranges
      if (location?.latitude && (location.latitude < -90 || location.latitude > 90)) {
        return c.json({ error: 'Latitude must be between -90 and 90' }, 400)
      }
      if (location?.longitude && (location.longitude < -180 || location.longitude > 180)) {
        return c.json({ error: 'Longitude must be between -180 and 180' }, 400)
      }
    } catch {
      return c.json({ error: 'Invalid location format' }, 400)
    }
  }
  
  const language = formData.get('language')?.toString()
  
  // Generate session ID
  const sessionId = uuidv4()
  
  // Read photo data
  const photoData = await photo.arrayBuffer()
  
  // Detect MIME type from File type or photo data
  const mimeType = photo.type || undefined
  
  // Save photo to R2 and get detected MIME type
  const detectedMimeType = await savePhoto(c.env.PHOTOS, sessionId, photoData, mimeType)
  
  // Determine file extension from MIME type
  let extension = 'jpg'
  if (detectedMimeType === 'image/png') {
    extension = 'png'
  } else if (detectedMimeType === 'image/gif') {
    extension = 'gif'
  } else if (detectedMimeType === 'image/webp') {
    extension = 'webp'
  }
  
  // Create session
  const now = new Date().toISOString()
  const session: Session = {
    id: sessionId,
    image_path: `${sessionId}.${extension}`,
    image_mime_type: detectedMimeType,
    image_hash: '',
    primary_attraction: '',
    confidence_score: 0,
    status: 'processing',
    error_message: '',
    processing_started_at: now,
    processing_completed_at: undefined,
    processing_time_ms: undefined,
    created_at: now,
    attraction_info: undefined,
    preferred_language: language,
    location: location,
  }
  
  await saveSession(c.env.SESSIONS, sessionId, session)
  
  // Publish message to QStash
  const queueMessage: QueueMessage = {
    sessionId,
    location,
    language,
  }
  
  const client = new Client({
    token: c.env.QSTASH_TOKEN,
  })
  
  await client.publishJSON({
    url: `${c.env.WORKER_URL}/api/webhook/recognition`,
    body: queueMessage,
    retries: 5,
  })
  
  return c.json({
    session_id: sessionId,
    status: 'processing',
    message: 'Photo uploaded successfully. Processing in progress.',
  })
})

// GET /api/recognition/:sessionId route
const getRecognitionRoute = createRoute({
  method: 'get',
  path: '/api/recognition/{sessionId}',
  tags: ['recognition'],
  summary: 'Get Recognition Result',
  request: {
    params: z.object({
      sessionId: z.string().uuid().openapi({
        param: {
          name: 'sessionId',
          in: 'path',
        },
        example: '56371600-e29b-41d4-a716-446655440000',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GetResultResponseSchema,
        },
      },
      description: 'successful operation',
    },
    500: {
      description: 'Internal Server Error',
    },
  },
})

app.openapi(getRecognitionRoute, async (c) => {
  const { sessionId } = c.req.valid('param')
  
  const session = await getSession(c.env.SESSIONS, sessionId)
  if (!session) {
    return c.json({ error: 'Session not found' }, 404)
  }
  
  return c.json({
    session_id: session.id,
    status: session.status,
    attraction_info: session.attraction_info || undefined,
    processing_time_ms: session.processing_time_ms || undefined,
    processing_error: session.error_message || null,
    location: session.location || undefined,
  })
})

// GET /api/recognition/:sessionId/image route
const getImageRoute = createRoute({
  method: 'get',
  path: '/api/recognition/{sessionId}/image',
  tags: ['recognition'],
  summary: 'Get Recognition Image',
  request: {
    params: z.object({
      sessionId: z.string().uuid().openapi({
        param: {
          name: 'sessionId',
          in: 'path',
        },
        example: '56371600-e29b-41d4-a716-446655440000',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'image/jpeg': {
          schema: z.string(),
        },
      },
      description: 'successful operation',
    },
    404: {
      description: 'Image not found',
    },
    500: {
      description: 'Internal Server Error',
    },
  },
})

app.openapi(getImageRoute, async (c) => {
  const { sessionId } = c.req.valid('param')
  
  // Get session to retrieve MIME type
  const session = await getSession(c.env.SESSIONS, sessionId)
  if (!session) {
    return c.json({ error: 'Session not found' }, 404)
  }
  
  const photoResult = await getPhoto(c.env.PHOTOS, sessionId, session.image_mime_type)
  if (!photoResult) {
    return c.json({ error: 'Image not found' }, 404)
  }
  
  return c.body(photoResult.data, 200, {
    'Content-Type': photoResult.contentType,
  })
})

export default app

