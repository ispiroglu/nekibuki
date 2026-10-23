import { motion, useReducedMotion } from 'motion/react'
import { walkPlanForPlace, type WalkRecord } from '@shared/walks'
import {
  ArrowUp,
  Bookmark,
  ChevronLeft,
  Eye,
  Footprints,
  Loader2,
  MapPin,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { GeoPoint, NextStep } from '@shared/types'
import { NextSteps } from '@/components/report/next-step'
import { OddityCards } from '@/components/report/oddity-cards'
import { PhotoHero } from '@/components/report/photo-hero'
import { TriviaCarousel } from '@/components/report/trivia-carousel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalysis } from '@/hooks/use-history'
import { listWalks, startWalk } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { useAppStore } from '@/store/app'
import { usePreferences } from '@/store/preferences'
import { useT } from '@/lib/ui-language'
import { cn } from '@/lib/utils'

const ChatPanel = lazy(() =>
  import('@/components/report/chat-panel').then((module) => ({ default: module.ChatPanel })),
)

/** How far the article rises over the bottom of the photograph, in px. */
const PHOTO_OVERLAP = 96
/**
 * On a short screen the article starts higher, so the place name and the first
 * lines of the summary share the first screen with the photo.
 */
const PHOTO_OVERLAP_SHORT = 128

export function ReportScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { analysis, loading, error, setAnalysis, repository } = useAnalysis(id)
  const bumpHistory = useAppStore((state) => state.bumpHistory)
  const setScreenIndex = useAppStore((state) => state.setScreenIndex)
  const setPendingStep = useAppStore((state) => state.setPendingStep)
  const hapticsEnabled = usePreferences((state) => state.haptics)
  const guideLanguage = usePreferences((state) => state.guideLanguage)
  const t = useT()
  const reduceMotion = useReducedMotion()
  const [chatOpen, setChatOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [savingSaved, setSavingSaved] = useState(false)
  const [startingWalk, setStartingWalk] = useState(false)
  const [activeWalk, setActiveWalk] = useState<WalkRecord | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerInset, setHeaderInset] = useState(56)
  const [shortScreen, setShortScreen] = useState(false)

  // The photo's markers are placed below the floating actions, so the report
  // measures the bar instead of guessing its height at a given text size.
  useEffect(() => {
    const element = headerRef.current
    if (!element) return
    const update = () => setHeaderInset(Math.round(element.getBoundingClientRect().height))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [analysis])

  useEffect(() => {
    const media = window.matchMedia('(max-height: 480px)')
    const sync = () => setShortScreen(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  // A tour that already started from this photo becomes "Devam et" instead of
  // a second, differently planned walk.
  useEffect(() => {
    if (!analysis?.id) return
    const controller = new AbortController()
    listWalks({ signal: controller.signal })
      .then((records) => {
        setActiveWalk(
          records.find((walk) => walk.analysisId === analysis.id && !walk.complete) ?? null,
        )
      })
      .catch(() => {
        // The CTA still starts a fresh tour; the account list is a bonus.
      })
    return () => controller.abort()
  }, [analysis?.id])

  const photoOverlap = shortScreen ? PHOTO_OVERLAP_SHORT : PHOTO_OVERLAP

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const openChat = () => {
    window.history.pushState({ chat: true }, '')
    setChatOpen(true)
  }

  const closeChat = () => {
    if (window.history.state?.chat) window.history.back()
    else setChatOpen(false)
  }

  useEffect(() => {
    if (!chatOpen) return
    const onPopState = () => setChatOpen(false)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [chatOpen])

  const toggleSaved = async () => {
    if (!analysis || !repository || savingSaved) return
    setSavingSaved(true)
    try {
      const updated = await repository.toggleSaved(analysis.id)
      if (updated) {
        setAnalysis(updated)
        bumpHistory()
        haptic('light', hapticsEnabled)
        toast(updated.saved ? t('Saved to your places', 'Yerlerine kaydedildi') : t('Removed from saved', 'Kaydedilenlerden çıkarıldı'))
      }
    } catch {
      toast.error(t('Could not save this guide.', 'Bu rehber kaydedilemedi.'))
    } finally {
      setSavingSaved(false)
    }
  }

  const share = async () => {
    if (!analysis) return
    const { report } = analysis
    const text = [
      report.title,
      `${report.location.name}, ${report.location.country} · ${report.era}`,
      '',
      report.summary,
      '',
      t('What you are looking at', 'Neye bakıyorsun'),
      ...report.visualReferences.map((reference, index) => `${index + 1}. ${reference.title}`),
      '',
      t('Things most people miss', 'Çoğu kişinin kaçırdığı şeyler'),
      ...report.trivia.map((item) => `• ${item.title} — ${item.body}`),
    ].join('\n')
    try {
      if (navigator.share) {
        await navigator.share({ title: `Nekibuki · ${report.title}`, text })
        return
      }
      await navigator.clipboard.writeText(text)
      toast.success(t('Guide copied to clipboard', 'Rehber panoya kopyalandı'))
    } catch {
      // user cancelled the share sheet
    }
  }

  const remove = async () => {
    if (!analysis || !repository) return
    await repository.remove(analysis.id)
    bumpHistory()
    setConfirmDelete(false)
    setScreenIndex(2)
    toast.success(t('Place deleted', 'Yer silindi'))
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <Skeleton className="h-[60svh] min-h-[min(420px,60svh)] w-full rounded-none [@media(max-height:480px)]:h-[70svh]" />
        <div className="absolute inset-x-0 top-0 z-30 flex items-center px-4 safe-top">
          <button
            type="button"
            onClick={goBack}
            className="glass-dark grid size-11 place-items-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95"
            aria-label={t('Back', 'Geri')}
          >
            <ChevronLeft className="size-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !analysis) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary">
            <TriangleAlert className="size-6 text-destructive" />
          </div>
          <h1 className="display text-2xl">{t('Could not open this guide', 'Bu rehber açılamadı')}</h1>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">{error}</p>
          <Button size="lg" onClick={() => bumpHistory()}>
            <RotateCcw className="size-4" /> {t('Try again', 'Tekrar dene')}
          </Button>
          <div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('Back to the camera', 'Kameraya dön')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary">
            <Eye className="size-6 text-muted-foreground" />
          </div>
          <h1 className="display text-2xl">{t('This guide is gone', 'Bu rehber artık yok')}</h1>
          <p className="text-sm text-muted-foreground">{t('It may have been deleted from this device.', 'Bu cihazdan silinmiş olabilir.')}</p>
          <Button size="lg" onClick={() => navigate('/')}>
            {t('Back to the camera', 'Kameraya dön')}
          </Button>
        </div>
      </div>
    )
  }

  const { report } = analysis
  // A curated plan is a fallback for photos that arrived without a position.
  const matchingWalk = walkPlanForPlace(report.location.name, report.title)
  const photoLocation: GeoPoint | undefined =
    analysis.location ??
    (typeof report.location.lat === 'number' && typeof report.location.lng === 'number'
      ? { latitude: report.location.lat, longitude: report.location.lng }
      : undefined)

  const beginWalk = async () => {
    if (startingWalk) return
    if (activeWalk) {
      haptic('medium', hapticsEnabled)
      navigate(`/walk/${activeWalk.id}`)
      return
    }
    if (!photoLocation && !matchingWalk) return

    setStartingWalk(true)
    try {
      const walk = photoLocation
        ? await startWalk({
            analysisId: analysis.id,
            title: report.title,
            place: report.location.name,
            country: report.location.country,
            location: photoLocation,
            language: guideLanguage,
          })
        : await startWalk({ planId: matchingWalk!.id, language: guideLanguage })
      haptic('medium', hapticsEnabled)
      navigate(`/walk/${walk.id}`)
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t('Could not start the walk.', 'Yürüyüş başlatılamadı.'),
      )
    } finally {
      setStartingWalk(false)
    }
  }

  const walkTitle = activeWalk
    ? guideLanguage === 'tr'
      ? activeWalk.title
      : (activeWalk.titleEn ?? activeWalk.title)
    : matchingWalk && !photoLocation
      ? guideLanguage === 'tr'
        ? matchingWalk.title
        : matchingWalk.titleEn
      : guideLanguage === 'tr'
        ? `${report.location.name} çevresinde bir yürüyüş`
        : `A walk around ${report.location.name}`

  const walkDescription = activeWalk
    ? t(
        `${activeWalk.visitedCount} of ${activeWalk.stopCount} stops seen. The guide is waiting where you left off.`,
        `${activeWalk.stopCount} durağın ${activeWalk.visitedCount} tanesi görüldü. Rehber bıraktığın yerde bekliyor.`,
      )
    : photoLocation
      ? t(
          '5–8 real places around your photo, picked on the fly. The walk starts where you are standing and the guide tells each stop’s story when you arrive.',
          'Fotoğrafının çevresindeki gerçek mekânlardan 5–8 durak, o an hazırlanır. Tur durduğun noktadan başlar; rehber her durağın hikâyesini oraya varınca anlatır.',
        )
      : matchingWalk
        ? t(
            `${matchingWalk.stops.length} stops, about ${matchingWalk.minutes} minutes. This photo has no location, so the ready-made route is the safer start.`,
            `${matchingWalk.stops.length} durak, yaklaşık ${matchingWalk.minutes} dakika. Fotoğrafta konum yok; hazır rota daha güvenli bir başlangıç.`,
          )
        : t(
            'This tour needs the location of the photo. Turn location on and take the photo again, or open a saved place that already has a position.',
            'Bu tur için fotoğrafın konumu gerekiyor. Konumu açıp fotoğrafı yeniden çek ya da konumu olan kayıtlı bir yeri aç.',
          )

  const confidenceLabel =
    report.confidence >= 85
      ? t('High confidence', 'Yüksek güven')
      : report.confidence >= 60
        ? t('Likely match', 'Muhtemelen doğru')
        : t('Best guess', 'Tahmini sonuç')

  /**
   * Hands a step to the camera and walks the traveller over to it: the
   * instruction travels with the shot, so the viewfinder knows what it is
   * being asked to look for.
   */
  const shootStep = (step: NextStep) => {
    setPendingStep({
      id: step.id,
      title: step.title,
      instruction: step.instruction,
      placeTitle: report.title,
      placeName: report.location.name,
    })
    setScreenIndex(1)
    navigate('/')
  }

  return (
    <div className="min-h-dvh bg-background">
      <PhotoHero
        imageUrl={analysis.imageUrl}
        references={report.visualReferences}
        alt={`${report.title}, ${report.location.name}, ${report.location.country}`}
        topInset={headerInset}
        bottomInset={photoOverlap}
      />

      <div
        ref={headerRef}
        className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 safe-top"
      >
        <button
          type="button"
          onClick={goBack}
          className="glass-dark grid size-[44px] place-items-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95"
          aria-label={t('Back', 'Geri')}
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex items-center gap-[6px]">
          <button
            type="button"
            onClick={() => void toggleSaved()}
            disabled={savingSaved}
            aria-pressed={analysis.saved}
            className={cn(
              'glass-dark grid size-[44px] place-items-center rounded-full transition-transform duration-150 ease-out active:scale-95 disabled:opacity-60',
              analysis.saved ? 'text-hud' : 'text-white',
            )}
            aria-label={analysis.saved ? t('Remove from saved', 'Kaydedilenlerden çıkar') : t('Save', 'Kaydet')}
          >
            <Bookmark className={cn('size-[18px]', analysis.saved && 'fill-current')} />
          </button>
          <button
            type="button"
            onClick={() => void share()}
            className="glass-dark grid size-[44px] place-items-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95"
            aria-label={t('Share', 'Paylaş')}
          >
            <Share2 className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="glass-dark grid size-[44px] place-items-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95"
            aria-label={t('Delete', 'Sil')}
          >
            <Trash2 className="size-[18px]" />
          </button>
        </div>
      </div>

      <motion.article
        variants={reduceMotion ? undefined : staggerContainer}
        initial={reduceMotion ? false : 'initial'}
        animate="animate"
        style={{ marginTop: -photoOverlap }}
        className="relative mx-auto w-full max-w-[42rem] px-6 pb-36 select-text max-[399px]:px-5 max-[359px]:px-4 md:px-8"
      >
        <motion.h1
          variants={reduceMotion ? undefined : staggerItem}
          className="display mt-3 text-[clamp(2rem,10vw,3rem)] font-medium break-words [hyphens:auto]"
        >
          {report.title}
        </motion.h1>

        <motion.div
          variants={reduceMotion ? undefined : staggerItem}
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-list text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden />
            {report.location.name}, {report.location.country}
          </span>
          <span>
            {report.era} <span aria-hidden>·</span> {confidenceLabel}
          </span>
        </motion.div>

        <motion.span
          variants={reduceMotion ? undefined : staggerItem}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-label font-medium text-brand-ink"
        >
          <Sparkles className="size-3" />
          {report.kind}
        </motion.span>

        <motion.p
          variants={reduceMotion ? undefined : staggerItem}
          className="mt-6 font-serif text-lede leading-[1.55] [text-wrap:pretty] max-[399px]:text-value [@media(max-height:480px)]:mt-4"
        >
          {report.summary}
        </motion.p>

        <motion.dl
          variants={reduceMotion ? undefined : staggerItem}
          className="mt-8 grid grid-cols-2 gap-2 lazy-paint"
          style={{ containIntrinsicSize: 'auto 180px' }}
        >
          {report.quickFacts.map((fact) => (
            <div key={fact.label} className="min-w-0 rounded-2xl bg-secondary px-4 py-3">
              <dt className="text-label font-medium tracking-[0.06em] break-words text-foreground/70 uppercase">
                {fact.label}
              </dt>
              <dd className="mt-0.5 min-w-0 font-serif text-value leading-snug break-words">
                {fact.value}
              </dd>
            </div>
          ))}
        </motion.dl>

        <motion.section variants={reduceMotion ? undefined : staggerItem} className="mt-8">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-brand px-5 py-5 text-brand-fg">
            <div className="flex items-center gap-2 text-label font-medium tracking-[0.08em] uppercase opacity-80">
              <Footprints className="size-3.5" />
              {activeWalk
                ? t('Continue your walk', 'Yürüyüşe devam')
                : t('Step by step', 'Adım adım')}
            </div>
            <h2 className="display mt-2 text-2xl leading-tight text-balance">{walkTitle}</h2>
            <p className="mt-2 max-w-[32rem] font-serif text-reading leading-relaxed opacity-85 [text-wrap:pretty]">
              {walkDescription}
            </p>
            {photoLocation && !activeWalk && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-fg/10 px-3 py-1 text-label">
                <MapPin className="size-3" />
                {t('This walk starts where you are standing', 'Tur senin durduğun noktadan başlıyor')}
              </p>
            )}
            <Button
              variant="secondary"
              size="lg"
              className="mt-4 whitespace-normal"
              onClick={() => void beginWalk()}
              disabled={startingWalk || (!activeWalk && !photoLocation && !matchingWalk)}
            >
              {startingWalk ? (
                <Loader2 className="size-4 animate-spin" />
              ) : !activeWalk && !photoLocation && !matchingWalk ? (
                <MapPin className="size-4" />
              ) : (
                <Footprints className="size-4" />
              )}
              {activeWalk
                ? t('Continue the walk', 'Tura devam et')
                : photoLocation
                  ? startingWalk
                    ? t('Planning your walk…', 'Tur planlanıyor…')
                    : t('Start the walk', 'Turu başlat')
                  : matchingWalk
                    ? t('Start the ready route', 'Hazır rotayı başlat')
                    : t('Location needed', 'Konum gerekli')}
            </Button>
          </div>
        </motion.section>

        <motion.section variants={reduceMotion ? undefined : staggerItem} className="mt-10">
          <h2 className="text-title font-medium tracking-[-0.01em]">{t('Things most people miss', 'Çoğu kişinin kaçırdığı şeyler')}</h2>
          <div className="mt-4">
            <TriviaCarousel trivia={report.trivia} />
          </div>
        </motion.section>

        {/*
          The strange-but-true notes sit with the other surprising material,
          straight after the trivia. The component owns its section and its
          heading; this wrapper only carries the entrance.
        */}
        {report.oddities && report.oddities.length > 0 && (
          <motion.section variants={reduceMotion ? undefined : staggerItem} className="mt-10">
            <OddityCards oddities={report.oddities} />
          </motion.section>
        )}

        <motion.section variants={reduceMotion ? undefined : staggerItem} className="mt-10">
          <h2 className="text-title font-medium tracking-[-0.01em]">{t('What you are looking at', 'Neye bakıyorsun')}</h2>
          <ol className="mt-4 space-y-4">
            {report.visualReferences.map((reference, index) => (
              <li
                key={reference.id}
                id={`reference-${reference.id}`}
                tabIndex={-1}
                className="flex gap-3"
              >
                <span className="mt-0 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-fg tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 max-w-[32rem]">
                  <h3 className="font-serif text-headline leading-snug break-words">{reference.title}</h3>
                  <p className="mt-1 font-serif text-reading leading-relaxed text-muted-foreground [text-wrap:pretty]">
                    {reference.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        <motion.section variants={reduceMotion ? undefined : staggerItem} className="mt-10">
          <h2 className="text-title font-medium tracking-[-0.01em]">{t('A closer look', 'Daha yakından')}</h2>
          <div className="mt-5 space-y-7">
            {report.sections.map((section) => (
              // The sections are the long tail of the guide. Off-screen ones
              // are not laid out and not painted until the reader reaches
              // them, which keeps a long report scrolling on a weak phone.
              <article key={section.id} className="lazy-paint" style={{ containIntrinsicSize: 'auto 220px' }}>
                <h3 className="text-headline font-medium leading-snug">{section.title}</h3>
                <p className="mt-2 max-w-[32rem] font-serif text-reading leading-[1.7] text-foreground/80 [text-wrap:pretty]">
                  {section.body}
                </p>
                {section.seeInPhoto && (
                  <p className="mt-3 flex max-w-[32rem] gap-2.5 border-l-2 border-brand/50 pl-4 font-serif text-reading leading-relaxed text-muted-foreground italic [text-wrap:pretty]">
                    <Eye className="mt-0.5 size-3.5 shrink-0" />
                    {section.seeInPhoto}
                  </p>
                )}
              </article>
            ))}
          </div>
        </motion.section>

        {/*
          The route comes last but one: the guide has finished explaining the
          place and now hands over the camera. The chat block that follows is
          the page's last word — the traveller leaves with a question, not
          with a button to press.
        */}
        {report.nextSteps && report.nextSteps.length > 0 && (
          <motion.section variants={reduceMotion ? undefined : staggerItem} className="mt-10">
            <NextSteps
              steps={report.nextSteps}
              placeTitle={report.title}
              placeName={report.location.name}
              onShoot={shootStep}
            />
          </motion.section>
        )}

        <motion.section variants={reduceMotion ? undefined : staggerItem} className="mt-10">
          <h2 className="text-title font-medium tracking-[-0.01em]">{t('Still curious?', 'Hâlâ merak ediyor musun?')}</h2>
          <p className="mt-3 text-body leading-relaxed text-foreground/85 [text-wrap:pretty]">
            {t('Ask about anything you can see — the answer stays with this photo.', 'Gördüğün her şeyi sor — cevap bu fotoğrafla birlikte kalır.')}
          </p>
          <Button size="lg" className="mt-5 whitespace-normal" onClick={openChat}>
            {t('Ask a question', 'Bir soru sor')}
          </Button>
        </motion.section>
      </motion.article>

      <div className="glass fixed inset-x-0 bottom-0 z-40 scroll-fade-b px-4 pt-3 safe-bottom [@media(max-height:480px)]:pt-1">
        <button
          type="button"
          onClick={openChat}
          className="mx-auto flex w-full max-w-md items-center gap-2 rounded-full bg-card p-1 pl-4 shadow-sm transition-transform duration-150 ease-out active:scale-[0.99]"
        >
          <span className="flex-1 truncate text-left text-[16px] text-muted-foreground">
            {t('Ask about', 'Sor:')} {report.title}…
          </span>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-brand-fg [@media(max-height:480px)]:size-9">
            <ArrowUp className="size-5" />
          </span>
        </button>
      </div>

      <Sheet
        open={chatOpen}
        onOpenChange={(next) => {
          if (next) openChat()
          else closeChat()
        }}
        title={report.title}
        description={t(`Continuing your photo of ${report.location.name}`, `${report.location.name} fotoğrafına devam ediyorsun`)}
      >
        <Suspense
          fallback={
            <div className="grid flex-1 place-items-center py-10 text-sm text-muted-foreground">
              {t('Opening the conversation…', 'Sohbet açılıyor…')}
            </div>
          }
        >
          <ChatPanel analysis={analysis} onUpdate={setAnalysis} />
        </Suspense>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete this guide?', 'Bu rehber silinsin mi?')}</DialogTitle>
            <DialogDescription>
              {t(`${report.title} and its conversation will be removed from your places.`, `${report.title} ve sohbeti yerlerinden kaldırılacak.`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t('Cancel', 'Vazgeç')}
            </Button>
            <Button variant="destructive" onClick={() => void remove()}>
              <Trash2 className="size-4" /> {t('Delete', 'Sil')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
