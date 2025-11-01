import { GoogleGenAI, Type } from '@google/genai'
import type { AttractionInfo, LocationContext } from '../types/models'

const ERROR_NO_RECOGNIZABLE_ATTRACTION = 'No recognizable attraction found (confidence < 30)'

// Detect MIME type from image data
function detectImageMimeType(imageData: ArrayBuffer): string {
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

// Approximate region from coordinates
function approximateRegion(latitude: number, longitude: number): string {
  // Simple approximation - can be enhanced
  if (latitude > 0 && longitude > 0) {
    if (latitude > 35 && longitude > 100) return 'East Asia'
    if (latitude > 35 && longitude < 100) return 'Europe/Middle East'
    return 'North America'
  }
  if (latitude > 0 && longitude < 0) return 'North America'
  if (latitude < 0 && longitude > 0) return 'Australia/Oceania'
  if (latitude < 0 && longitude < 0) return 'South America'
  return 'Unknown Region'
}

// Build prompt with context
function buildPrompt(location?: LocationContext, language?: string): string {
  let basePrompt = `Analyze this image and identify the tourist attraction or landmark. Provide detailed information about it in JSON format with the following structure:
{
  "name": "Attraction name",
  "description": "Brief description",
  "historical_info": "Historical background",
  "significance": "Cultural significance",
  "interesting_facts": ["Fact 1", "Fact 2"],
  "quick_facts": [{"key": "Height", "value": "330m"}, {"key": "Year Built", "value": "1889"}],
  "location": {
    "country": "Country name",
    "city": "City name",
    "region": "Region/State name"
  },
  "confidence": 95
}

Provide accurate information and ensure confidence is between 0-100.`

  if (location) {
    const loc = location
    const region = approximateRegion(loc.latitude, loc.longitude)
    
    let accuracyHint = ''
    if (loc.accuracy && loc.accuracy > 0) {
      if (loc.accuracy < 100) {
        accuracyHint = ' (high location accuracy)'
      } else if (loc.accuracy < 1000) {
        accuracyHint = ' (moderate location accuracy)'
      } else {
        accuracyHint = ' (low location accuracy)'
      }
    }
    
    basePrompt += `\nIMPORTANT CONTEXT: The user is currently located at approximately ${loc.latitude.toFixed(4)}°, ${loc.longitude.toFixed(4)}°${accuracyHint}, which is in/near ${region}. When there are multiple attractions with similar names in different locations, strongly prefer the one closest to this geographic area. Adjust your confidence score higher for attractions in this region. But user could be upload a photo from gallery or camera, so you should not assume the location is always the same.\n`
  }
  
  if (language) {
    basePrompt += `\nPlease provide all textual information (name, description, historical_info, significance, interesting_facts) in ${language} language.\n`
  }
  
  return basePrompt
}

// Define the response schema for AttractionInfo
const attractionSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: 'The name of the attraction or landmark',
    },
    description: {
      type: Type.STRING,
      description: 'Brief description of the attraction',
    },
    historical_info: {
      type: Type.STRING,
      description: 'Historical background information',
    },
    significance: {
      type: Type.STRING,
      description: 'Cultural or historical significance',
    },
    interesting_facts: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: 'Array of interesting facts about the attraction',
    },
    quick_facts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          value: { type: Type.STRING },
        },
      },
      description: 'Array of key-value pairs with quick facts',
    },
    location: {
      type: Type.OBJECT,
      properties: {
        country: { type: Type.STRING },
        city: { type: Type.STRING },
        region: { type: Type.STRING },
      },
      description: 'Location information',
    },
    confidence: {
      type: Type.INTEGER,
      description: 'Confidence score from 0-100',
    },
  },
  propertyOrdering: [
    'name',
    'description',
    'historical_info',
    'significance',
    'interesting_facts',
    'quick_facts',
    'location',
    'confidence',
  ],
}

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

export { ERROR_NO_RECOGNIZABLE_ATTRACTION }

