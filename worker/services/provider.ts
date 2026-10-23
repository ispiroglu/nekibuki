import { GeminiProvider } from './gemini'
import { MockVisionProvider } from './mock'
import { ProviderError, type AppEnv, type VisionProvider } from '../types'

/** The single place that decides which vision service answers a request. */
export function providerFor(env: AppEnv): VisionProvider {
  const configured = (env.VISION_PROVIDER as string | undefined)?.toLowerCase()
  if (configured === 'gemini') {
    if (!env.GEMINI_API_KEY) {
      throw new ProviderError(
        'Vision is not configured yet. Add GEMINI_API_KEY to the worker secrets.',
        'missing_key',
        503,
      )
    }
    return new GeminiProvider(
      env.GEMINI_API_KEY,
      env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      env.AI_GATEWAY_URL,
    )
  }
  return new MockVisionProvider()
}
