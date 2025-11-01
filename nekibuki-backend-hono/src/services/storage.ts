import type { KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import type { Session } from '../types/models'

// Detect MIME type from image data
export function detectImageMimeType(imageData: ArrayBuffer): string {
  const bytes = new Uint8Array(imageData)
  
  // Check for PNG signature
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  
  // Check for JPEG signature
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image/jpeg'
  }
  
  // Check for GIF signature
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif'
  }
  
  // Check for WebP signature
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp'
  }
  
  // Default to JPEG
  return 'image/jpeg'
}

export async function saveSession(
  kv: KVNamespace,
  sessionId: string,
  sessionData: Session
): Promise<void> {
  await kv.put(`session:${sessionId}`, JSON.stringify(sessionData))
}

export async function getSession(kv: KVNamespace, sessionId: string): Promise<Session | null> {
  const data = await kv.get(`session:${sessionId}`)
  if (!data) {
    return null
  }
  return JSON.parse(data) as Session
}

export async function updateSession(
  kv: KVNamespace,
  sessionId: string,
  updates: Partial<Session>
): Promise<void> {
  const existing = await getSession(kv, sessionId)
  if (!existing) {
    throw new Error(`Session ${sessionId} not found`)
  }
  const updated = { ...existing, ...updates }
  await kv.put(`session:${sessionId}`, JSON.stringify(updated))
}

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

export async function getPhoto(r2: R2Bucket, sessionId: string, mimeType?: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  // Try different extensions if MIME type is known
  const extensions = mimeType 
    ? (mimeType === 'image/png' ? ['png'] : 
       mimeType === 'image/gif' ? ['gif'] : 
       mimeType === 'image/webp' ? ['webp'] : ['jpg', 'jpeg'])
    : ['jpg', 'jpeg', 'png', 'gif', 'webp']
  
  for (const ext of extensions) {
    const object = await r2.get(`${sessionId}.${ext}`)
    if (object) {
      const contentType = object.httpMetadata?.contentType || mimeType || 'image/jpeg'
      return {
        data: await object.arrayBuffer(),
        contentType,
      }
    }
  }
  
  return null
}

export async function deletePhoto(r2: R2Bucket, sessionId: string, mimeType?: string): Promise<void> {
  try {
    // Try different extensions
    const extensions = mimeType 
      ? (mimeType === 'image/png' ? ['png'] : 
         mimeType === 'image/gif' ? ['gif'] : 
         mimeType === 'image/webp' ? ['webp'] : ['jpg', 'jpeg'])
      : ['jpg', 'jpeg', 'png', 'gif', 'webp']
    
    for (const ext of extensions) {
      try {
        await r2.delete(`${sessionId}.${ext}`)
      } catch {
        // Continue trying other extensions
      }
    }
  } catch (error) {
    // Silently ignore errors if image doesn't exist or already deleted
    // This prevents failures when cleaning up
  }
}

