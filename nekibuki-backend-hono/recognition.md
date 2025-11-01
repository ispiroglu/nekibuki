# Photo Upload (Recognition) Flow Documentation

## Overview

The photo recognition flow allows users to upload photos of tourist attractions and landmarks, which are then analyzed using Google's Gemini AI to identify and provide detailed information about the attraction. The system processes requests asynchronously, returning a session ID immediately and processing the recognition in the background using Cloudflare Workers and Queues.

## Architecture

The recognition flow follows a layered architecture:

```
Controller Layer (HTTP Routes) → Service Layer (Storage/AI Processing) → Storage Layer (KV/R2)
```

### Components

1. **Routes** (`src/routes/recognition.ts`): Handles HTTP requests and responses using Hono with OpenAPI integration
2. **Services**: 
   - `storage.ts`: Manages session state in KV and photo storage in R2
   - `gemini.ts`: Processes images with Gemini AI
3. **Consumer** (`src/consumer.ts`): Processes recognition requests from the queue asynchronously
4. **Storage**:
   - **KV Namespace** (`SESSIONS`): Stores session state and metadata
   - **R2 Bucket** (`PHOTOS`): Stores uploaded photos temporarily
   - **Queue** (`RECOGNITION_QUEUE`): Handles asynchronous processing

## API Endpoints

### 1. Submit Recognition Request

**Endpoint:** `POST /api/recognition`

**Description:** Uploads a photo for recognition processing.

**Request Format:** `multipart/form-data`

**Form Fields:**
- `photo` (required): Image file (JPEG, PNG, GIF, or WebP)
- `location` (optional): JSON string containing location context
  ```json
  {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "accuracy": 50.0
  }
  ```
- `language` (optional): Preferred language code for response (e.g., "en", "fr", "es")

**Location Validation:**
- Latitude must be between -90 and 90
- Longitude must be between -180 and 180

**Response:**
```json
{
  "session_id": "uuid-string",
  "status": "processing",
  "message": "Photo uploaded successfully. Processing in progress."
}
```

**HTTP Status Codes:**
- `200 OK`: Successfully submitted
- `400 Bad Request`: Invalid request (missing photo, invalid location format, etc.)
- `500 Internal Server Error`: Server error during submission

### 2. Get Recognition Result

**Endpoint:** `GET /api/recognition/:sessionId`

**Description:** Retrieves the recognition result for a session.

**Path Parameters:**
- `sessionId`: UUID of the session

**Response:**
```json
{
  "session_id": "uuid-string",
  "status": "completed|processing|failed",
  "attraction_info": {
    "name": "Eiffel Tower",
    "description": "Brief description...",
    "historical_info": "Historical background...",
    "significance": "Cultural significance...",
    "interesting_facts": ["Fact 1", "Fact 2"],
    "quick_facts": [
      {"key": "Height", "value": "330m"},
      {"key": "Year Built", "value": "1889"}
    ],
    "location": {
      "country": "France",
      "city": "Paris",
      "region": "Île-de-France"
    },
    "confidence": 95
  },
  "processing_time_ms": 1250,
  "processing_error": null,
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "accuracy": 50.0
  }
}
```

**Status Values:**
- `processing`: Recognition is still in progress
- `completed`: Recognition completed successfully
- `failed`: Recognition failed (check `processing_error`)

**HTTP Status Codes:**
- `200 OK`: Success
- `404 Not Found`: Session not found
- `500 Internal Server Error`: Error retrieving session

### 3. Get Session Image

**Endpoint:** `GET /api/recognition/:sessionId/image`

**Description:** Retrieves the original uploaded image for a session.

**Path Parameters:**
- `sessionId`: UUID of the session

**Response:** Binary image data (JPEG, PNG, GIF, or WebP)

**Content-Type:** `image/jpeg`, `image/png`, `image/gif`, or `image/webp` (based on original upload)

**HTTP Status Codes:**
- `200 OK`: Success
- `404 Not Found`: Session or image not found
- `500 Internal Server Error`: Error retrieving image

## Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/recognition (multipart/form-data)
       │
       ▼
┌─────────────────────┐
│ Recognition Route   │
│ submitRecognition() │
└──────┬──────────────┘
       │ 1. Parse photo file
       │ 2. Parse optional location
       │ 3. Parse optional language
       │ 4. Detect MIME type
       │
       ├─► Save photo to R2 with correct MIME type
       │
       ├─► Create session in KV (Status: processing)
       │   - Store location if provided
       │   - Store MIME type
       │
       ├─► Send message to Queue
       │
       │ Return immediately with session_id
       │
       ▼
┌─────────────────────┐
│ Queue Consumer      │
│ processRecognition() │
└──────┬──────────────┘
       │
       ├─► Retrieve photo from R2
       │
       ├─► Call GeminiService.analyzeImage()
       │   │
       │   ├─► Detect image MIME type
       │   ├─► Build prompt with location/language context
       │   ├─► Send image + prompt to Gemini API
       │   └─► Receive structured JSON response
       │
       ├─► Parse JSON response to AttractionInfo
       │
       ├─► Validate confidence score (>= 30)
       │
       ├─► Update session status:
       │   - Success: Status = "completed"
       │     - Set AttractionInfo
       │     - Set ProcessingCompletedAt
       │     - Calculate ProcessingTimeMs
       │     - Set PrimaryAttraction
       │     - Set ConfidenceScore
       │   - Failure: Status = "failed"
       │     - Set ErrorMessage
       │
       ├─► Delete image from R2
       │
       └─► End
```

## Detailed Flow Description

### Step 1: Request Reception

The `submitRecognitionRoute` handler receives the HTTP request:

```67:136:src/routes/recognition.ts
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
```

### Step 2: Session Creation

The handler creates a new session with status "processing" and stores it in KV:

- Session includes location context if provided
- MIME type is detected and stored
- Photo is saved to R2 with appropriate extension

### Step 3: Queue Processing

The recognition happens asynchronously via Cloudflare Queue:

```17:94:src/consumer.ts
export async function queue(
  batch: MessageBatch<QueueMessage>,
  env: CloudflareBindings
): Promise<void> {
  log('info', `Processing queue batch`, { batchSize: batch.messages.length })
  
  for (const message of batch.messages) {
    const { sessionId, location, language } = message.body
    
    // Validate sessionId exists
    if (!sessionId || typeof sessionId !== 'string') {
      log('error', 'Invalid sessionId in queue message', { sessionId, messageId: message.id })
      message.ack()
      continue
    }
    
    try {
      // Get session first to retrieve MIME type and validate existence
      const session = await getSession(env.SESSIONS, sessionId)
      if (!session) {
        throw new Error(`Session ${sessionId} not found`)
      }
      
      log('info', `Processing recognition request`, { 
        sessionId, 
        status: session.status,
        retryCount: message.attempts 
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
      
      message.ack()
```

### Step 4: Image Recognition Service

The service builds context and calls Gemini:

```157:215:src/services/gemini.ts
export async function analyzeImage(
  apiKey: string,
  imageData: ArrayBuffer,
  location?: LocationContext,
  language?: string
): Promise<AttractionInfo> {
  const ai = new GoogleGenAI({ apiKey })
  
  // Detect MIME type
  const mimeType = detectImageMimeType(imageData)
  
  // Build prompt
  const prompt = buildPrompt(location, language)
  
  // Convert ArrayBuffer to base64
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageData)))
  
  // Call Gemini API
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: attractionSchema,
    },
  })
  
  if (!response.text) {
    throw new Error('Empty response received from Gemini')
  }
  
  // Parse JSON response
  let attractionInfo: AttractionInfo
  try {
    attractionInfo = JSON.parse(response.text.trim()) as AttractionInfo
  } catch (error) {
    throw new Error(`Failed to parse structured response: ${error}`)
  }
  
  // Validate confidence threshold
  if (attractionInfo.confidence < 30) {
    throw new Error(ERROR_NO_RECOGNIZABLE_ATTRACTION)
  }
  
  return attractionInfo
}
```

## Data Models

### Session Model

```54:73:src/types/models.ts
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
```

### AttractionInfo Model

```34:52:src/types/models.ts
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
```

### LocationContext Model

```17:32:src/types/models.ts
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
```

## Photo Storage

Photos are stored in R2 with MIME type detection:

```61:88:src/services/storage.ts
export async function savePhoto(
  r2: R2Bucket,
  sessionId: string,
  photoData: ArrayBuffer,
  mimeType?: string
): Promise<string> {
  // Detect MIME type if not provided
  const contentType = mimeType || detectImageMimeType(photoData)
  
  // Determine file extension from MIME type
  let extension = 'jpg'
  if (contentType === 'image/png') {
    extension = 'png'
  } else if (contentType === 'image/gif') {
    extension = 'gif'
  } else if (contentType === 'image/webp') {
    extension = 'webp'
  }
  
  const key = `${sessionId}.${extension}`
  await r2.put(key, photoData, {
    httpMetadata: {
      contentType,
    },
  })
  
  return contentType
}
```

Photos are automatically deleted after successful recognition or final failure.

## Error Handling

### Recognition Failures

If recognition fails, the session status is updated to "failed":

```96:172:src/consumer.ts
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorName = error instanceof Error ? error.name : 'UnknownError'
      
      log('error', `Recognition processing failed`, {
        sessionId,
        error: errorMessage,
        errorName,
        retryCount: message.attempts,
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
      
      // Retry if it's not a "no recognizable attraction" error
      if (errorMessage !== ERROR_NO_RECOGNIZABLE_ATTRACTION) {
        // Check retry attempts to prevent infinite retries
        const maxRetries = 5
        if (message.attempts >= maxRetries) {
          log('error', `Max retries exceeded, acknowledging message`, {
            sessionId,
            attempts: message.attempts,
            maxRetries,
          })
          // Clean up photo before acknowledging
          try {
            await deletePhoto(env.PHOTOS, sessionId, mimeType)
          } catch {
            // Ignore cleanup errors
          }
          message.ack()
        } else {
          log('warn', `Retrying message`, {
            sessionId,
            attempts: message.attempts,
            maxRetries,
          })
          message.retry()
        }
      } else {
        // Delete image from R2 after final failure (no retry)
        log('info', `No recognizable attraction found, cleaning up`, { sessionId })
        try {
          await deletePhoto(env.PHOTOS, sessionId, mimeType)
        } catch (deleteError) {
          log('warn', `Failed to delete photo after final failure`, {
            sessionId,
            error: deleteError instanceof Error ? deleteError.message : String(deleteError),
          })
        }
        message.ack()
      }
	}
```

### Common Error Scenarios

1. **No Recognizable Attraction**: Confidence score < 30
   - Error: `ERROR_NO_RECOGNIZABLE_ATTRACTION`
   - Status: `failed`
   - No retry

2. **Invalid Location**: Latitude/longitude out of range
   - HTTP Status: `400 Bad Request`
   - Error message: "Latitude must be between -90 and 90" or "Longitude must be between -180 and 180"

3. **Invalid Location Format**: Malformed JSON
   - HTTP Status: `400 Bad Request`
   - Error message: "Invalid location format"

4. **Missing Photo**: No photo file uploaded
   - HTTP Status: `400 Bad Request`
   - Error message: "Photo is required"

5. **Gemini API Errors**: Various API-related errors
   - Status: `failed`
   - Error message: Stored in session's `error_message` field
   - Retries up to 5 attempts

6. **Max Retries Exceeded**: After 5 failed attempts
   - Message is acknowledged
   - Photo is cleaned up
   - Session status remains `failed`

## Context Enhancement

### Location Context

When location is provided, the system:
1. Stores it in the session
2. Approximates the geographic region
3. Enhances the prompt with location hints
4. Adjusts confidence scoring for nearby attractions
5. Returns location in the GET response

### Language Context

When language is provided, all textual responses are requested in that language.

## Configuration

The Gemini client requires configuration in environment variables:

- `GEMINI_API_KEY`: Google Gemini API key
- `SESSIONS`: KV namespace binding for session storage
- `PHOTOS`: R2 bucket binding for photo storage
- `RECOGNITION_QUEUE`: Queue binding for asynchronous processing

## Performance Considerations

1. **Asynchronous Processing**: Recognition happens via Cloudflare Queue, allowing immediate response to clients
2. **Photo Storage**: Photos are stored in R2 with MIME type detection and automatically cleaned up after processing
3. **Processing Time Tracking**: The system tracks processing time from start to completion
4. **Session Management**: Sessions maintain state throughout the processing lifecycle
5. **Retry Logic**: Failed processing attempts are retried up to 5 times with structured logging
6. **Structured Logging**: All operations are logged with context for debugging and monitoring

## Usage Example

### Upload Photo with Location

```bash
curl -X POST http://localhost:8787/api/recognition \
  -F "photo=@eiffel-tower.jpg" \
  -F "location={\"latitude\":48.8566,\"longitude\":2.3522,\"accuracy\":50.0}" \
  -F "language=en"
```

### Check Recognition Status

```bash
curl http://localhost:8787/api/recognition/{session-id}
```

### Retrieve Uploaded Image

```bash
curl http://localhost:8787/api/recognition/{session-id}/image \
  --output photo.jpg
```

## OpenAPI Documentation

The API includes OpenAPI documentation available at `/doc` endpoint, which provides interactive API documentation and schema definitions.
