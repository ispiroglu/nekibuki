import type { Analysis } from '@shared/types'
import type { WalkPlanSummary } from '@shared/walks'
import { AnimatePresence, motion } from 'motion/react'
import { Bookmark, Camera, Footprints, Loader2, MessageSquare, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { listWalkPlans, startWalk } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import { photoAtWidth } from '@/lib/image'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { useHistory } from '@/hooks/use-history'
import { useAppStore } from '@/store/app'
import { usePreferences } from '@/store/preferences'
import { useT, useUiLanguage } from '@/lib/ui-language'
import { cn, formatRelativeDate, groupDay } from '@/lib/utils'

const DAY_RANK: Record<ReturnType<typeof groupDay>, number> = {
  today: 0,
  yesterday: 1,
  week: 2,
  earlier: 3,
}

/**
 * How many rows take part in the entrance stagger.
 *
 * The stagger delays every row by a beat, so a long history used to spend
 * seconds unrolling — and every one of those rows was an animation running
 * at once. The first screenful arrives as a sequence; the rest is simply
 * there.
 */
const STAGGER_LIMIT = 8

export function HistoryScreen({
  onOpenCamera,
  active,
}: {
  onOpenCamera: () => void
  /** False when another panel owns the route, so the page keeps one `h1`. */
  active?: boolean
}) {
  const { analyses, loading, error, refresh } = useHistory()
  const t = useT()
  const [query, setQuery] = useState('')
  const [savedOnly, setSavedOnly] = useState(false)
  // The deck keeps every panel mounted, so the panel that owns the route must
  // be the only `h1` on it. The shell may pass `active`; the store is the
  // fallback so the page never carries two headings of the same level.
  const panelActive = useAppStore((state) => state.screenIndex === 2)
  const isActive = active ?? panelActive
  const Heading = isActive ? 'h1' : 'h2'

  const ordered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = analyses.filter((analysis) => {
      if (savedOnly && !analysis.saved) return false
      if (!needle) return true
      const haystack = `${analysis.report.title} ${analysis.report.location.name} ${analysis.report.location.country} ${analysis.report.kind}`.toLowerCase()
      return haystack.includes(needle)
    })
    // Flat list, newest first — the day bucket keeps the previous ordering.
    return filtered.sort(
      (a, b) =>
        DAY_RANK[groupDay(a.createdAt)] - DAY_RANK[groupDay(b.createdAt)] ||
        b.createdAt - a.createdAt,
    )
  }, [analyses, query, savedOnly])

  return (
    <section
      aria-label={t('Places', 'Yerler')}
      className="h-full touch-pan-y overflow-y-auto overscroll-contain bg-background pb-28"
    >
      <header className="glass sticky top-0 z-10 pb-3 safe-top">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-5 [@media(max-height:480px)]:flex-row [@media(max-height:480px)]:items-center [@media(max-height:480px)]:gap-3">
          <button
            type="button"
            onClick={onOpenCamera}
            aria-label={t('Open the camera', 'Kamerayı aç')}
            className="grid size-11 shrink-0 place-items-center self-end rounded-full bg-secondary text-foreground active:scale-[0.97] [@media(max-height:480px)]:self-auto"
          >
            <Camera className="size-5" />
          </button>

          <Heading className="display mt-4 text-4xl font-medium [@media(max-height:480px)]:mt-0 [@media(max-height:480px)]:min-w-0 [@media(max-height:480px)]:truncate [@media(max-height:480px)]:text-2xl">
            {t('Places', 'Yerler')}
          </Heading>

          <div className="mt-4 flex items-center gap-2 [@media(max-height:480px)]:mt-0 [@media(max-height:480px)]:min-w-0 [@media(max-height:480px)]:flex-1">
            <label
              htmlFor="history-search"
              className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-secondary px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring"
            >
              <Search className="size-4 shrink-0" aria-hidden />
              <Input
                id="history-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('Search your places', 'Yerlerinde ara')}
                aria-label={t('Search your places', 'Yerlerinde ara')}
                className="flex-1 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                data-no-swipe
              />
            </label>
            <button
              type="button"
              onClick={() => setSavedOnly((value) => !value)}
              aria-pressed={savedOnly}
              aria-label={t('Show only saved places', 'Yalnızca kaydedilen yerleri göster')}
              className={cn(
                'grid size-11 shrink-0 place-items-center rounded-full transition-colors active:scale-[0.97]',
                savedOnly
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground',
              )}
            >
              <Bookmark aria-hidden className={cn('size-5', savedOnly && 'fill-current')} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl">
        <GuidedWalks />

        {loading && (
          <div className="px-3 pt-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-4 rounded-2xl p-2">
                <Skeleton className="size-[4.5rem] shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="mx-3 mt-2 flex flex-col items-start gap-3 rounded-2xl bg-secondary p-4"
          >
            <p className="text-sm text-muted-foreground">
              {t('We couldn’t load your places. Check your connection and try again.', 'Yerlerin yüklenemedi. Bağlantını kontrol edip tekrar dene.')}
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground active:scale-[0.97]"
            >
              {t('Try again', 'Tekrar dene')}
            </button>
          </div>
        )}

        {!loading && !error && ordered.length === 0 && (
          <div className="mt-16 flex flex-col items-center px-6 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-secondary">
              {analyses.length === 0 ? (
                <Camera className="size-7 text-muted-foreground" />
              ) : savedOnly && !query.trim() ? (
                <Bookmark className="size-7 text-muted-foreground" />
              ) : (
                <Search className="size-7 text-muted-foreground" />
              )}
            </div>
            <h2 className="display mt-5 text-2xl font-medium">
              {analyses.length === 0
                ? t('Nothing yet', 'Henüz bir şey yok')
                : savedOnly && !query.trim()
                  ? t('No saved places yet', 'Henüz kaydedilmiş yer yok')
                  : t('No matches', 'Eşleşme yok')}
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {analyses.length === 0
                ? t('Point your camera at a monument, a landscape or a street corner and this is where it lives.', 'Kameranı bir anıta, manzaraya ya da sokak köşesine tut; burada yaşayacak.')
                : savedOnly && !query.trim()
                  ? t('Tap the bookmark on a guide to keep it here.', 'Burada tutmak için bir rehberdeki yer imine dokun.')
                  : t('Try another word, or clear the filters.', 'Başka bir kelime dene ya da filtreleri temizle.')}
            </p>
            {analyses.length === 0 ? (
              <button
                type="button"
                onClick={onOpenCamera}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground active:scale-[0.97]"
              >
                <Camera className="size-4" /> {t('Open the camera', 'Kamerayı aç')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setSavedOnly(false)
                }}
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-secondary px-6 font-medium text-foreground active:scale-[0.97]"
              >
                {savedOnly && !query.trim() ? t('Show all places', 'Tüm yerleri göster') : t('Clear filters', 'Filtreleri temizle')}
              </button>
            )}
          </div>
        )}

        {!loading && !error && ordered.length > 0 && (
          <motion.ul
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="pb-safe px-3 pt-2"
          >
            <AnimatePresence initial={false}>
              {ordered.map((analysis, index) => (
                <HistoryRow
                  key={analysis.id}
                  analysis={analysis}
                  animate={index < STAGGER_LIMIT}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  )
}

/**
 * A walk is normally entered from the place it belongs to, but the list keeps
 * it discoverable (and testable) before the traveller has taken that photo.
 */
function GuidedWalks() {
  const navigate = useNavigate()
  const t = useT()
  const language = useUiLanguage()
  const hapticsEnabled = usePreferences((state) => state.haptics)
  const [plans, setPlans] = useState<WalkPlanSummary[] | null>(null)
  const [starting, setStarting] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listWalkPlans(controller.signal)
      .then(setPlans)
      .catch(() => {
        // The section simply stays absent; it must not break the places list.
      })
    return () => controller.abort()
  }, [])

  if (!plans || plans.length === 0) return null

  const begin = async (plan: WalkPlanSummary) => {
    if (starting) return
    setStarting(plan.id)
    try {
      const walk = await startWalk({ planId: plan.id, language })
      haptic('medium', hapticsEnabled)
      navigate(`/walk/${walk.id}`)
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : t('Could not start the walk.', 'Yürüyüş başlatılamadı.'),
      )
    } finally {
      setStarting(null)
    }
  }

  return (
    <section className="px-3 pt-3" aria-label={t('Guided walks', 'Adım adım geziler')}>
      <div className="rounded-2xl bg-brand px-4 py-4 text-brand-fg">
        <div className="flex items-center gap-2 text-label font-medium tracking-[0.08em] uppercase opacity-80">
          <Footprints className="size-3.5" />
          {t('Guided walks', 'Adım adım geziler')}
        </div>
        {plans.map((plan) => (
          <div key={plan.id} className="mt-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-serif text-[1.05rem] leading-snug">
                {language === 'tr' ? plan.title : plan.titleEn}
              </p>
              <p className="mt-0.5 truncate text-xs opacity-80">
                {plan.place} · {plan.stopCount} {t('stops', 'durak')} · ~{plan.minutes}{' '}
                {t('min', 'dk')}
              </p>
            </div>
            <Button
              variant="secondary"
              size="pill"
              onClick={() => void begin(plan)}
              disabled={starting !== null}
            >
              {starting === plan.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Footprints className="size-4" />
              )}
              {t('Start', 'Başla')}
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}

function HistoryRow({ analysis, animate }: { analysis: Analysis; animate: boolean }) {
  const navigate = useNavigate()
  const t = useT()
  const language = useUiLanguage()
  const [thumbFailed, setThumbFailed] = useState(false)
  const questionCount = analysis.messages.filter((message) => message.role === 'user').length
  const thumb160 = photoAtWidth(analysis.previewUrl, 160)
  const thumb240 = photoAtWidth(analysis.previewUrl, 240)
  const thumb = thumb240 ?? analysis.previewUrl
  const thumbSrcSet = thumb160 && thumb240 ? `${thumb160} 160w, ${thumb240} 240w` : undefined
  const label = [
    analysis.report.title,
    analysis.saved && t('saved', 'kaydedildi'),
    analysis.report.location.name,
    formatRelativeDate(analysis.createdAt, language),
    questionCount > 0 && `${questionCount} ${t('questions', 'soru')}`,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <motion.li
      variants={animate ? staggerItem : undefined}
      initial={animate ? 'initial' : false}
      layout
    >
      <button
        type="button"
        onClick={() => navigate(`/report/${analysis.id}`)}
        aria-label={label}
        className="flex w-full items-center gap-4 rounded-2xl p-2 text-left transition-colors active:bg-secondary lazy-paint"
        style={{ containIntrinsicSize: 'auto 88px' }}
      >
        {analysis.previewUrl && !thumbFailed ? (
          <img
            src={thumb}
            srcSet={thumbSrcSet}
            sizes={thumbSrcSet ? '72px' : undefined}
            width={72}
            height={72}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setThumbFailed(true)}
            className="size-[4.5rem] shrink-0 rounded-xl bg-secondary object-cover"
          />
        ) : (
          // A failed photo is a quiet tile, never the browser's broken-image glyph.
          <div className="grid size-[4.5rem] shrink-0 place-items-center rounded-xl bg-secondary">
            <Camera className="size-3 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 font-serif text-xl leading-tight">
            <span className="truncate">{analysis.report.title}</span>
            {analysis.saved && (
              <Bookmark aria-hidden className="size-3.5 shrink-0 fill-brand-ink text-brand-ink" />
            )}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {analysis.report.location.name} · {formatRelativeDate(analysis.createdAt, language)}
          </p>
        </div>

        {questionCount > 0 && (
          <span className="flex shrink-0 items-center gap-1 pr-2 text-xs font-medium text-muted-foreground tabular-nums">
            <MessageSquare aria-hidden className="size-3.5" />
            {questionCount}
          </span>
        )}
      </button>
    </motion.li>
  )
}
