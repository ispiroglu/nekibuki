import { describe, test, expect } from 'bun:test'
import { detectImageMimeType } from '../src/services/storage'

describe('MIME Type Detection', () => {
  test('detects JPEG files', () => {
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    const mimeType = detectImageMimeType(jpegHeader.buffer)
    expect(mimeType).toBe('image/jpeg')
  })

  test('detects PNG files', () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const mimeType = detectImageMimeType(pngHeader.buffer)
    expect(mimeType).toBe('image/png')
  })

  test('detects GIF files', () => {
    const gifHeader = new Uint8Array([0x47, 0x49, 0x46, 0x38])
    const mimeType = detectImageMimeType(gifHeader.buffer)
    expect(mimeType).toBe('image/gif')
  })

  test('detects WebP files', () => {
    const webpHeader = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
    const mimeType = detectImageMimeType(webpHeader.buffer)
    expect(mimeType).toBe('image/webp')
  })

  test('defaults to JPEG for unknown formats', () => {
    const unknownHeader = new Uint8Array([0x00, 0x00, 0x00, 0x00])
    const mimeType = detectImageMimeType(unknownHeader.buffer)
    expect(mimeType).toBe('image/jpeg')
  })
})

describe('Location Validation', () => {
  test('validates latitude range', () => {
    const validLatitudes = [-90, 0, 90]
    const invalidLatitudes = [-91, 91, 100]
    
    validLatitudes.forEach(lat => {
      expect(lat >= -90 && lat <= 90).toBe(true)
    })
    
    invalidLatitudes.forEach(lat => {
      expect(lat >= -90 && lat <= 90).toBe(false)
    })
  })

  test('validates longitude range', () => {
    const validLongitudes = [-180, 0, 180]
    const invalidLongitudes = [-181, 181, 200]
    
    validLongitudes.forEach(lng => {
      expect(lng >= -180 && lng <= 180).toBe(true)
    })
    
    invalidLongitudes.forEach(lng => {
      expect(lng >= -180 && lng <= 180).toBe(false)
    })
  })
})

