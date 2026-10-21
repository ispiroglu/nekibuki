import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowUp,
  Bookmark,
  ChevronLeft,
  Eye,
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
import { haptic } from '@/lib/haptics'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { useAppStore } from '@/store/app'
import { usePreferences } from '@/store/preferences'
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
  const hapticsEnabled = usePreferences((state) => state.haptics)
  const reduceMotion = useReducedMotion()
  const [chatOpen, setChatOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [savingSaved, setSavingSaved] = useState(false)
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
        toast(updated.saved ? 'Saved to your places' : 'Removed from saved')
      }
    } catch {
      toast.error('Could not save this guide.')
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
      'What you are looking at',
      ...report.visualReferences.map((reference, index) => `${index + 1}. ${reference.title}`),
      '',
      'Things most people miss',
      ...report.trivia.map((item) => `• ${item.title} — ${item.body}`),
    ].join('\n')
    try {
      if (navigator.share) {
        await navigator.share({ title: `Nekibuki · ${report.title}`, text })
        return
      }
      await navigator.clipboard.writeText(text)
      toast.success('Guide copied to clipboard')
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
    toast.success('Place deleted')
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
            aria-label="Back"
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
          <h1 className="display text-2xl">Could not open this guide</h1>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">{error}</p>
          <Button size="lg" onClick={() => bumpHistory()}>
            <RotateCcw className="size-4" /> Try again
          </Button>
          <div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to the camera
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
          <h1 className="display text-2xl">This guide is gone</h1>
          <p className="text-sm text-muted-foreground">It may have been deleted from this device.</p>
          <Button size="lg" onClick={() => navigate('/')}>
            Back to the camera
          </Button>
        </div>
      </div>
    )
  }

  const { report } = analysis
  const confidenceLabel =
    report.confidence >= 85
      ? 'High confidence'
      : report.confidence >= 60
        ? 'Likely match'
        : 'Best guess'

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
          aria-label="Back"
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
            aria-label={analysis.saved ? 'Remove from saved' : 'Save'}
          >
            <Bookmark className={cn('size-[18px]', analysis.saved && 'fill-current')} />
          </button>
          <button
            type="button"
            onClick={() => void share()}
            className="glass-dark grid size-[44px] place-items-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95"
            aria-label="Share"
          >
            <Share2 className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="glass-dark grid size-[44px] place-items-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95"
            aria-label="Delete"
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
          className="mt-8 grid grid-cols-2 gap-2"
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

        <motion.section variants={reduceMotion ? undefined : staggerItem} className="mt-10">
          <h2 className="text-title font-medium tracking-[-0.01em]">Things most people miss</h2>
          <div className="mt-4">
            <TriviaCarousel trivia={report.trivia} />
          </div>
        </motion.section>

        <motion.section variants={reduceMotion ? undefined : staggerItem} className="mt-10">
          <h2 className="text-title font-medium tracking-[-0.01em]">What you are looking at</h2>
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
          <h2 className="text-title font-medium tracking-[-0.01em]">A closer look</h2>
          <div className="mt-5 space-y-7">
            {report.sections.map((section) => (
              <article key={section.id}>
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

        <motion.section variants={reduceMotion ? undefined : staggerItem} className="mt-10">
          <h2 className="text-title font-medium tracking-[-0.01em]">Still curious?</h2>
          <p className="mt-3 text-body leading-relaxed text-foreground/85 [text-wrap:pretty]">
            Ask about anything you can see — the answer stays with this photo.
          </p>
          <Button size="lg" className="mt-5 whitespace-normal" onClick={openChat}>
            Ask a question
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
            Ask about {report.title}…
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
        description={`Continuing your photo of ${report.location.name}`}
      >
        <Suspense
          fallback={
            <div className="grid flex-1 place-items-center py-10 text-sm text-muted-foreground">
              Opening the conversation…
            </div>
          }
        >
          <ChatPanel analysis={analysis} />
        </Suspense>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this guide?</DialogTitle>
            <DialogDescription>
              {report.title} and its conversation will be removed from your places.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void remove()}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
