import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnalyzingOverlay } from '@/components/capture/analyzing-overlay'
import { analyzePhoto } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { compressImage } from '@/lib/image'
import { useRepository } from '@/hooks/use-history'
import { useAppStore } from '@/store/app'
import { useLocationStore } from '@/store/location'
import { usePreferences } from '@/store/preferences'

export function CaptureController() {
  const navigate = useNavigate()
  const repository = useRepository()
  const { accessToken } = useAuth()
  const language = usePreferences((state) => state.guideLanguage)
  const location = useLocationStore((state) => state.location)
  const draft = useAppStore((state) => state.capture)
  const setCapture = useAppStore((state) => state.setCapture)
  const bumpHistory = useAppStore((state) => state.bumpHistory)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (draft) URL.revokeObjectURL(draft.previewUrl)
    setCapture(null)
    setError(null)
  }, [draft, setCapture])

  // The guide is the next screen. Its chunk is fetched while the photo is
  // still being analysed, so the report appears the moment the answer lands
  // instead of waiting on the network.
  useEffect(() => {
    if (!draft) return
    void import('@/screens/report-screen')
  }, [draft])

  useEffect(() => {
    if (!draft || !repository) return

    const controller = new AbortController()
    abortRef.current = controller
    let active = true

    const run = async () => {
      try {
        const compressed = await compressImage(draft.blob)
        const { report } = await analyzePhoto({
          image: compressed,
          location: location ?? undefined,
          language,
          token: accessToken,
          signal: controller.signal,
          // Only set when the photo answers a suggested step.
          continuation: draft.continuation,
        })
        if (!active) return

        const analysis = await repository.create({
          report,
          image: compressed,
          location: location ?? undefined,
          language,
        })
        if (!active) return

        bumpHistory()
        URL.revokeObjectURL(draft.previewUrl)
        setCapture(null)
        navigate(`/report/${analysis.id}`)
      } catch (cause) {
        if (!active || controller.signal.aborted) return
        setError(
          cause instanceof Error
            ? cause.message
            : 'The guide could not read this photo. Please try again.',
        )
      }
    }

    void run()
    return () => {
      active = false
      controller.abort()
    }
  }, [attempt, draft, language, location, navigate, repository, accessToken, bumpHistory, setCapture])

  if (!draft) return null

  return (
    <AnalyzingOverlay
      previewUrl={draft.previewUrl}
      error={error}
      onCancel={cancel}
      onRetry={() => {
        setError(null)
        setAttempt((value) => value + 1)
      }}
    />
  )
}
