import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnalyzingOverlay } from '@/components/capture/analyzing-overlay'
import { analyzePhoto } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { compressImage, createPreviewDataUrl } from '@/lib/image'
import { useRepository } from '@/hooks/use-history'
import { useAppStore } from '@/store/app'
import { useLocationStore } from '@/store/location'
import { usePreferences } from '@/store/preferences'
import { useT } from '@/lib/ui-language'

/** The 720px copy sent with chat, so follow-ups do not re-upload the archive. */
async function chatCopy(blob: Blob): Promise<Blob | undefined> {
  try {
    const dataUrl = await createPreviewDataUrl(blob)
    if (!dataUrl) return undefined
    return await (await fetch(dataUrl)).blob()
  } catch {
    return undefined
  }
}

export function CaptureController() {
  const navigate = useNavigate()
  const repository = useRepository()
  const { mode } = useAuth()
  const language = usePreferences((state) => state.guideLanguage)
  const t = useT()
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
        const remote = mode === 'google'
        const { report, analysis: stored } = await analyzePhoto({
          image: compressed,
          // The Worker archives the capture only when it knows the owner.
          captureId: remote ? draft.id : undefined,
          chatImage: remote ? await chatCopy(draft.blob) : undefined,
          location: location ?? undefined,
          language,
          signal: controller.signal,
          // Only set when the photo answers a suggested step.
          continuation: draft.continuation,
        })
        if (!active) return

        // Remote captures are already stored by /api/analyze; demo mode still
        // writes to the traveller's IndexedDB.
        if (!stored && remote) {
          throw new Error(
            t(
              'Your session could not save this photo. Sign in again and retry the capture.',
              'Oturumun bu fotoğrafı kaydedemedi. Tekrar giriş yapıp çekimi yeniden dene.',
            ),
          )
        }
        const analysis =
          stored ??
          (await repository.create({
            report,
            image: compressed,
            location: location ?? undefined,
            language,
          }))
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
            : t('The guide could not read this photo. Please try again.', 'Rehber bu fotoğrafı okuyamadı. Lütfen tekrar dene.'),
        )
      }
    }

    void run()
    return () => {
      active = false
      controller.abort()
    }
  }, [attempt, draft, language, location, navigate, repository, mode, bumpHistory, setCapture, t])

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
