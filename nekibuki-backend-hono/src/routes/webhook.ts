import { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { Receiver } from '@upstash/qstash'
import { z } from '@hono/zod-openapi'
import { analyzeImage, ERROR_NO_RECOGNIZABLE_ATTRACTION } from '../services/gemini'
import { getPhoto, updateSession, getSession, deletePhoto } from '../services/storage'
import type { CloudflareBindings, QueueMessage } from '../types/bindings'

const app = new OpenAPIHono<{ Bindings: CloudflareBindings }>()

// Structured logging helper
function log(level: 'info' | 'error' | 'warn', message: string, context?: Record<string, unknown>) {
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  }
  console.log(JSON.stringify(logEntry))
}

// POST /api/webhook/recognition route
const recognitionWebhookRoute = createRoute({
  method: 'post',
  path: '/api/webhook/recognition',
  tags: ['webhook'],
  summary: 'QStash Webhook for Recognition Processing',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            sessionId: z.string().uuid(),
            location: z
              .object({
                latitude: z.number().min(-90).max(90),
                longitude: z.number().min(-180).max(180),
                accuracy: z.number().optional(),
              })
              .optional(),
            language: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Processing completed successfully',
    },
    400: {
      description: 'Bad Request - Invalid signature or payload',
    },
    500: {
      description: 'Internal Server Error - Will trigger retry',
    },
  },
})

app.openapi(recognitionWebhookRoute, async (c) => {
  const env = c.env

  // Initialize QStash receiver for signature verification
  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  })

  // Get signature from headers (case-insensitive)
  const signature =
    c.req.header('Upstash-Signature') || c.req.header('upstash-signature') || ''

  if (!signature) {
    log('error', 'Missing Upstash signature header')
    return c.json({ error: 'Missing signature' }, 400)
  }

  // Get raw body for verification
  const rawBody = await c.req.text()

  // Verify signature
  try {
    const isValid = await receiver.verify({
      signature,
      body: rawBody,
    })

    if (!isValid) {
      log('error', 'Invalid QStash signature')
      return c.json({ error: 'Invalid signature' }, 400)
    }
  } catch (verifyError) {
    log('error', 'Signature verification failed', {
      error: verifyError instanceof Error ? verifyError.message : String(verifyError),
    })
    return c.json({ error: 'Signature verification failed' }, 400)
  }

  // Parse message body
  let queueMessage: QueueMessage
  try {
    queueMessage = JSON.parse(rawBody) as QueueMessage
  } catch (parseError) {
    log('error', 'Failed to parse request body', {
      error: parseError instanceof Error ? parseError.message : String(parseError),
    })
    return c.json({ error: 'Invalid JSON payload' }, 400)
  }

  const { sessionId, location, language } = queueMessage

  // Validate sessionId exists
  if (!sessionId || typeof sessionId !== 'string') {
    log('error', 'Invalid sessionId in queue message', { sessionId })
    return c.json({ error: 'Invalid sessionId' }, 400)
  }

  // Get retry count from QStash headers (if available)
  const retryCountHeader = c.req.header('Upstash-Retries') || c.req.header('upstash-retries')
  const retryCount = retryCountHeader ? parseInt(retryCountHeader, 10) : 0

  try {
    // Get session first to retrieve MIME type and validate existence
    const session = await getSession(env.SESSIONS, sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    log('info', `Processing recognition request`, {
      sessionId,
      status: session.status,
      retryCount,
    })

    // Retrieve photo from R2
    const photoResult = await getPhoto(env.PHOTOS, sessionId, session.image_mime_type)
    if (!photoResult) {
      throw new Error(`Photo not found for session ${sessionId}`)
    }

    // Get API key from environment
    const apiKey = env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Process recognition with Gemini
    const attractionInfo = await analyzeImage(apiKey, photoResult.data, location, language)

    const now = new Date().toISOString()
    const processingStartedAt = new Date(session.processing_started_at)
    const processingCompletedAt = new Date(now)
    const processingTimeMs = processingCompletedAt.getTime() - processingStartedAt.getTime()

    // Update session with success
    await updateSession(env.SESSIONS, sessionId, {
      status: 'completed',
      attraction_info: attractionInfo,
      processing_completed_at: now,
      processing_time_ms: processingTimeMs,
      primary_attraction: attractionInfo.name,
      confidence_score: attractionInfo.confidence,
      error_message: undefined,
    })

    log('info', `Recognition completed successfully`, {
      sessionId,
      processingTimeMs,
      confidence: attractionInfo.confidence,
      attraction: attractionInfo.name,
    })

    // Delete image from R2 after successful recognition
    try {
      await deletePhoto(env.PHOTOS, sessionId, session.image_mime_type)
    } catch (deleteError) {
      // Log but don't fail the entire operation if cleanup fails
      log('warn', `Failed to delete photo after successful recognition`, {
        sessionId,
        error: deleteError instanceof Error ? deleteError.message : String(deleteError),
      })
    }

    // Return 200 to acknowledge successful processing
    return c.json({ success: true, sessionId }, 200)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : 'UnknownError'

    log('error', `Recognition processing failed`, {
      sessionId,
      error: errorMessage,
      errorName,
      retryCount,
      hasLocation: !!location,
      hasLanguage: !!language,
    })

    // Get session for MIME type if available (for cleanup)
    let mimeType: string | undefined
    try {
      const session = await getSession(env.SESSIONS, sessionId)
      mimeType = session?.image_mime_type
    } catch (sessionError) {
      log('warn', `Failed to retrieve session for cleanup`, {
        sessionId,
        error: sessionError instanceof Error ? sessionError.message : String(sessionError),
      })
    }

    // Update session with failure
    try {
      await updateSession(env.SESSIONS, sessionId, {
        status: 'failed',
        error_message: errorMessage,
      })
    } catch (updateError) {
      log('error', `Failed to update session with error status`, {
        sessionId,
        updateError: updateError instanceof Error ? updateError.message : String(updateError),
        originalError: errorMessage,
      })
    }

    // Handle retry logic based on error type
    if (errorMessage === ERROR_NO_RECOGNIZABLE_ATTRACTION) {
      // No retry for "no recognizable attraction" errors - delete photo and return 200
      log('info', `No recognizable attraction found, cleaning up`, { sessionId })
      try {
        await deletePhoto(env.PHOTOS, sessionId, mimeType)
      } catch (deleteError) {
        log('warn', `Failed to delete photo after final failure`, {
          sessionId,
          error: deleteError instanceof Error ? deleteError.message : String(deleteError),
        })
      }
      // Return 200 to prevent retry
      return c.json({ success: false, error: errorMessage, sessionId }, 200)
    }

    // For other errors, return 500 to trigger QStash retry
    // QStash will handle retries up to the configured max (5 retries)
    return c.json({ success: false, error: errorMessage, sessionId }, 500)
  }
})

export default app

