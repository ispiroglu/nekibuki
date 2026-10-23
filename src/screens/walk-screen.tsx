import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowUp,
  Camera as CameraIcon,
  Check,
  ChevronLeft,
  Footprints,
  Loader2,
  MapPin,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { advanceWalk, ApiError, getWalk, resetWalk, sendWalkMessage, startWalk } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import { compressImage } from '@/lib/image'
import { useT } from '@/lib/ui-language'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/store/preferences'
import type { WalkSnapshot } from '@shared/walks'

/** A photo the traveller just picked, kept only until the answer arrives. */
interface PendingPhoto {
  blob: Blob
  previewUrl: string
}

/**
 * The model normally writes its answer into the transcript. When it ended on
 * a tool call, the server returns a fallback answer instead; keep that line
 * visible until the next real message.
 */
function withAnswer(snapshot: WalkSnapshot, answer: string): WalkSnapshot {
  const text = answer.trim()
  if (!text) return snapshot
  const last = snapshot.messages[snapshot.messages.length - 1]
  if (last?.role === 'assistant' && last.content === text) return snapshot
  return {
    ...snapshot,
    messages: [...snapshot.messages, { role: 'assistant', content: text }],
  }
}

export function WalkScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const t = useT()
  const reduceMotion = useReducedMotion()
  const language = usePreferences((state) => state.guideLanguage)
  const hapticsEnabled = usePreferences((state) => state.haptics)

  const [snapshot, setSnapshot] = useState<WalkSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null)
  const [resetting, setResetting] = useState(false)
  const [starting, setStarting] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const skipNextAutoScroll = useRef(false)
  /** Reuse the id when the same turn is retried after a network failure. */
  const lastOperation = useRef<{ key: string; id: string } | null>(null)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getWalk(id, controller.signal)
      .then((next) => {
        if (!next) setError(t('This walk is gone.', 'Bu yürüyüş artık yok.'))
        else setSnapshot(next)
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : t('Could not open the walk.', 'Yürüyüş açılamadı.'))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [id, t])

  // The guide speaks last, so keep the newest line in view.
  useEffect(() => {
    if (!snapshot) return
    if (skipNextAutoScroll.current) {
      skipNextAutoScroll.current = false
      return
    }
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'end' })
  }, [snapshot?.messages.length, snapshot, sending, reduceMotion])

  const send = useCallback(
    async (text: string, photo?: Blob) => {
      if (!id || sending) return
      const trimmed = text.trim()
      if (!trimmed && !photo) return

      setSending(true)
      setDraft('')
      haptic('light', hapticsEnabled)

      // An optimistic line closes the gap between the tap and the model.
      setSnapshot((current) =>
        current
          ? {
              ...current,
              messages: [
                ...current.messages,
                { role: 'user' as const, content: trimmed, ...(photo ? { photo: true } : {}) },
              ],
            }
          : current,
      )

      const operationKey = `${trimmed}::${photo ? 'photo' : 'text'}`
      const operationId =
        lastOperation.current?.key === operationKey
          ? lastOperation.current.id
          : crypto.randomUUID()
      lastOperation.current = { key: operationKey, id: operationId }

      try {
        const result = await sendWalkMessage({
          id,
          text: trimmed,
          image: photo,
          operationId,
        })
        lastOperation.current = null
        setSnapshot(withAnswer(result.snapshot, result.answer))
        haptic('medium', hapticsEnabled)
      } catch (cause) {
        // Drop the optimistic line; the composer keeps the text for a retry.
        setSnapshot((current) =>
          current ? { ...current, messages: current.messages.slice(0, -1) } : current,
        )
        setDraft(trimmed)
        if (cause instanceof ApiError && cause.isAuthFailure) {
          toast.error(t('Sign in again to keep walking.', 'Yürüyüşe devam etmek için tekrar giriş yap.'))
        } else {
          toast.error(cause instanceof Error ? cause.message : t('The guide did not answer.', 'Rehber cevap vermedi.'))
        }
      } finally {
        setSending(false)
      }
    },
    [id, sending, hapticsEnabled, t],
  )

  const pickPhoto = async (file: File | undefined) => {
    if (!file || !id || sending) return
    try {
      const compressed = await compressImage(file)
      const previewUrl = URL.createObjectURL(compressed)
      setPendingPhoto({ blob: compressed, previewUrl })
      try {
        // A photo is the fastest way to say "I am here": send it with the
        // draft if the traveller typed something first.
        await send(draft, compressed)
      } finally {
        URL.revokeObjectURL(previewUrl)
        setPendingPhoto(null)
      }
    } catch {
      toast.error(t('Could not read that photo.', 'Bu fotoğraf okunamadı.'))
    }
  }

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const restart = async () => {
    if (starting) return
    setStarting(true)
    try {
      // A generated route cannot be rebuilt from its id alone: reuse the
      // report, or at least the origin and place, so "start again" does not
      // silently fall back to the Dolmabahçe plan.
      const plan = snapshot?.plan
      const next = plan?.analysisId
        ? await startWalk({
            analysisId: plan.analysisId,
            place: plan.place,
            title: plan.title,
            country: plan.country,
            location: plan.origin,
            language,
          })
        : plan?.source === 'generated' && plan.origin
          ? await startWalk({
              place: plan.place,
              title: plan.title,
              country: plan.country,
              location: plan.origin,
              language,
            })
          : await startWalk({ planId: plan?.id ?? 'dolmabahce', language })
      navigate(`/walk/${next.id}`, { replace: true })
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t('Could not start a new walk.', 'Yeni yürüyüş başlatılamadı.'))
    } finally {
      setStarting(false)
    }
  }

  /** The route is deterministic, so leaving a stop is a route action, not a
   * message the model has to interpret. */
  const leaveStop = async () => {
    if (!id || sending) return
    setSending(true)
    setDraft('')
    haptic('light', hapticsEnabled)
    try {
      const result = await advanceWalk(id)
      skipNextAutoScroll.current = true
      setSnapshot(withAnswer(result.snapshot, result.answer))
      haptic('medium', hapticsEnabled)
      // The new stop is the next thing to read, not the bottom of the old
      // story. Let the commit land, then bring the card under the header.
      window.setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      }, 80)
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t('Could not move to the next stop.', 'Sıradaki durağa geçilemedi.'),
      )
    } finally {
      setSending(false)
    }
  }

  const clearConversation = async () => {
    if (!id || resetting) return
    setResetting(true)
    try {
      const next = await resetWalk(id)
      setSnapshot(next)
      toast.success(t('The guide is listening again.', 'Rehber yeniden dinliyor.'))
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t('Could not reset the walk.', 'Yürüyüş sıfırlanamadı.'))
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-8">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">{t('Opening the walk…', 'Yürüyüş açılıyor…')}</p>
        </div>
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary">
            <TriangleAlert className="size-6 text-destructive" />
          </div>
          <h1 className="display text-2xl">{t('Could not open the walk', 'Yürüyüş açılamadı')}</h1>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/')} size="lg">
            {t('Back to the camera', 'Kameraya dön')}
          </Button>
        </div>
      </div>
    )
  }

  const { plan, current, visited, complete, messages } = snapshot
  const progress = plan.stopCount === 0 ? 0 : Math.round((visited.length / plan.stopCount) * 100)
  const hasSpoken = messages.some((message) => message.role === 'assistant')

  return (
    <main className="relative min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex w-full max-w-[42rem] items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={goBack}
            className="grid size-10 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-secondary active:scale-95"
            aria-label={t('Back', 'Geri')}
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-label font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {current
                ? `${t('Stop', 'Durak')} ${current.order} / ${plan.stopCount}`
                : t('Guided walk', 'Adım adım gezi')}
            </p>
            <h1 className="truncate font-serif text-[1.05rem] leading-snug">
              {current ? current.title : language === 'tr' ? plan.title : plan.titleEn}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void clearConversation()}
            disabled={resetting}
            className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
            aria-label={t('Start the conversation over', 'Sohbeti baştan başlat')}
          >
            {resetting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          </button>
        </div>
        <div className="mx-auto w-full max-w-[42rem] px-4 pb-3">
          <div className="flex items-center justify-between text-label text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{plan.place}</span>
            </span>
            <span className="tabular-nums">
              {visited.length} / {plan.stopCount}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(progress, complete ? 100 : 0)}%` }}
            />
          </div>
          {plan.origin && (
            <p className="mt-1.5 flex items-center gap-1.5 text-label text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {t(
                  'This walk starts where you took the photo',
                  'Tur fotoğrafı çektiğin noktadan başlıyor',
                )}
              </span>
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-[42rem] px-4 pb-56">
        {current && (
          <section
            ref={cardRef}
            className="relative mt-5 scroll-mt-32 overflow-hidden rounded-[1.75rem] bg-secondary px-5 py-5"
          >
            <div className="flex items-center gap-2 text-label font-medium tracking-[0.08em] text-brand-ink uppercase">
              <MapPin className="size-3.5" />
              {t('Stop', 'Durak')} {current.order}
            </div>
            <h2 className="display mt-2 text-[clamp(1.6rem,7vw,2.2rem)] leading-[1.15] text-balance">
              {current.title}
            </h2>
            <p className="mt-3 font-serif text-reading leading-relaxed text-foreground/80 [text-wrap:pretty]">
              {current.brief}
            </p>

            {current.lookFor.length > 0 && (
              <div className="mt-5">
                <p className="text-label font-medium tracking-[0.06em] text-muted-foreground uppercase">
                  {t('Look for', 'Şuna bak')}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {current.lookFor.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-foreground/85">
                      <Check className="mt-1 size-3.5 shrink-0 text-brand-ink" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-5 rounded-2xl bg-background/70 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              <Sparkles className="mr-1.5 inline size-3.5 -translate-y-px text-brand-ink" />
              {current.arriveBy}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="pill"
                onClick={() => void send(t('I am here, tell me the story.', 'Buradayım, hikâyesini anlat.'))}
                disabled={sending}
              >
                {hasSpoken ? t('Tell me more', 'Biraz daha anlat') : t('I am here, tell me', 'Buradayım, anlat')}
              </Button>
              <Button
                size="pill"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
              >
                <CameraIcon className="size-4" />
                {t('Take the photo', 'Fotoğrafı çek')}
              </Button>
            </div>
          </section>
        )}

        {complete && (
          <section className="mt-5 rounded-[1.75rem] bg-brand px-5 py-5 text-brand-fg">
            <div className="flex items-center gap-2 text-label font-medium tracking-[0.08em] uppercase opacity-80">
              <Footprints className="size-3.5" />
              {t('Walk complete', 'Yürüyüş tamam')}
            </div>
            <h2 className="display mt-2 text-2xl leading-tight">
              {t('You walked the whole route.', 'Bütün rotayı yürüdün.')}
            </h2>
            <p className="mt-2 font-serif text-reading leading-relaxed opacity-85">
              {t(
                'Stay a little longer, or ask the guide anything about what you saw.',
                'Biraz daha kal ya da gördüklerinle ilgili rehbere istediğini sor.',
              )}
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => void restart()} disabled={starting}>
              {starting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              {t('Start again', 'Baştan başla')}
            </Button>
          </section>
        )}

        {messages.length > 0 && (
          <div className="mt-6 space-y-4">
            {messages.map((message, index) =>
              message.role === 'assistant' ? (
                <motion.div
                  key={index}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="max-w-[34rem]"
                >
                  <p className="font-serif text-reading leading-[1.75] whitespace-pre-wrap text-foreground/90 [text-wrap:pretty]">
                    {message.content}
                  </p>
                </motion.div>
              ) : (
                <div key={index} className="flex justify-end">
                  <div
                    className={cn(
                      'max-w-[85%] rounded-3xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed',
                      message.photo ? 'bg-brand/10 text-brand-ink' : 'bg-secondary text-foreground',
                    )}
                  >
                    {message.photo && (
                      <span className="mb-1 flex items-center gap-1.5 text-label font-medium tracking-[0.06em] uppercase opacity-80">
                        <CameraIcon className="size-3.5" />
                        {t('Photo', 'Fotoğraf')}
                      </span>
                    )}
                    {message.content || (message.photo ? t('Look what I found.', 'Bak ne buldum.') : '')}
                  </div>
                </div>
              ),
            )}
            <div ref={endRef} className="scroll-mb-48" />
          </div>
        )}

        {sending && (
          <div className="mt-4 flex items-center gap-2 py-1 text-muted-foreground">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
            </span>
            <span className="text-xs">{t('The guide is thinking…', 'Rehber düşünüyor…')}</span>
          </div>
        )}

        {messages.length === 0 && current && (
          <p className="mt-6 px-1 text-center text-sm leading-relaxed text-muted-foreground">
            {t(
              'Start with a photo of where you are standing, or tell the guide you have arrived.',
              'Durduğun yerin fotoğrafıyla başla ya da rehbere geldiğini söyle.',
            )}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur-xl safe-bottom">
        <div className="mx-auto w-full max-w-[42rem] px-4 py-3">
          <AnimatePresence>
            {pendingPhoto && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-2 flex items-center gap-2 rounded-2xl bg-secondary px-2 py-2"
              >
                <img src={pendingPhoto.previewUrl} alt="" className="size-10 rounded-xl object-cover" />
                <span className="text-xs text-muted-foreground">{t('Sending photo…', 'Fotoğraf gönderiliyor…')}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {current && !complete && (
            <div className="mb-2 flex justify-center">
              <button
                type="button"
                onClick={() => void leaveStop()}
                disabled={sending}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
              >
                {t('I am leaving this stop →', 'Bu duraktan ayrılıyorum →')}
              </button>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send(draft)
            }}
            className="flex items-end gap-2"
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition-colors hover:bg-accent disabled:opacity-40"
              aria-label={t('Send a photo', 'Fotoğraf gönder')}
            >
              <CameraIcon className="size-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                void pickPhoto(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send(draft)
                }
              }}
              rows={1}
              placeholder={t('Ask the guide…', 'Rehbere sor…')}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-secondary px-4 py-3 text-[16px] leading-snug text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={sending || (!draft.trim() && !pendingPhoto)}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
              aria-label={t('Send', 'Gönder')}
            >
              {sending ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
