import { motion } from 'motion/react'
import {
  Bookmark,
  ChevronLeft,
  Eye,
  MapPin,
  MessageCircle,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
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

export function ReportScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { analysis, loading, setAnalysis, repository } = useAnalysis(id)
  const bumpHistory = useAppStore((state) => state.bumpHistory)
  const setScreenIndex = useAppStore((state) => state.setScreenIndex)
  const hapticsEnabled = usePreferences((state) => state.haptics)
  const [chatOpen, setChatOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const toggleSaved = async () => {
    if (!analysis || !repository) return
    haptic('light', hapticsEnabled)
    const updated = await repository.toggleSaved(analysis.id)
    if (updated) {
      setAnalysis(updated)
      bumpHistory()
      toast(updated.saved ? 'Saved to your places' : 'Removed from saved')
    }
  }

  const share = async () => {
    if (!analysis) return
    const { report } = analysis
    const text = `${report.title}, ${report.location.name}.\n\n${report.summary}\n\n${report.trivia
      .map((item) => `• ${item.title} — ${item.body}`)
      .join('\n')}`
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
        <Skeleton className="h-[52svh] w-full rounded-none" />
        <div className="space-y-4 p-5">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
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
          <h1 className="font-serif text-2xl">This guide is gone</h1>
          <p className="text-sm text-muted-foreground">
            It may have been deleted from this device.
          </p>
          <Button onClick={() => navigate('/')}>Back to the camera</Button>
        </div>
      </div>
    )
  }

  const { report } = analysis

  return (
    <div className="min-h-dvh bg-background">
      <div className="relative">
        <PhotoHero imageUrl={analysis.imageUrl} references={report.visualReferences}>
          <div className="text-white">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-white/70">
              {report.kind}
            </p>
            <h1 className="mt-1 font-serif text-[34px] leading-[1.02] tracking-[-0.025em] text-photo">
              {report.title}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px] text-white/85">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {report.location.name}, {report.location.country}
              </span>
              <span className="text-white/40">·</span>
              <span>{report.era}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white/90">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                {report.confidence}% match
              </span>
              {analysis.saved && (
                <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white/90">
                  <Bookmark className="size-3 fill-current" /> Saved
                </span>
              )}
            </div>
          </div>
        </PhotoHero>

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 safe-top">
          <button
            type="button"
            onClick={goBack}
            className="glass-dark grid size-10 place-items-center rounded-full text-white active:scale-95"
            aria-label="Back"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleSaved()}
              className={cn(
                'glass-dark grid size-10 place-items-center rounded-full active:scale-95',
                analysis.saved ? 'text-amber-300' : 'text-white',
              )}
              aria-label="Save"
            >
              <Bookmark className={cn('size-4.5', analysis.saved && 'fill-current')} />
            </button>
            <button
              type="button"
              onClick={() => void share()}
              className="glass-dark grid size-10 place-items-center rounded-full text-white active:scale-95"
              aria-label="Share"
            >
              <Share2 className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="glass-dark grid size-10 place-items-center rounded-full text-white/90 active:scale-95"
              aria-label="Delete"
            >
              <Trash2 className="size-4.5" />
            </button>
          </div>
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative -mt-6 rounded-t-[2rem] bg-background px-5 pb-32 pt-7 shadow-[0_-20px_50px_-30px_rgba(0,0,0,.5)]"
      >
        <motion.p
          variants={staggerItem}
          className="font-serif text-[19.5px] leading-[1.62] tracking-[-0.01em] text-foreground/90"
        >
          {report.summary}
        </motion.p>

        <motion.div
          variants={staggerItem}
          className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 rounded-[1.5rem] border border-border/60 bg-card p-5 sm:grid-cols-4"
        >
          {report.quickFacts.map((fact) => (
            <div key={fact.label}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {fact.label}
              </p>
              <p className="mt-1 font-serif text-[20px] leading-tight">{fact.value}</p>
            </div>
          ))}
        </motion.div>

        <motion.section variants={staggerItem} className="pt-9">
          <SectionHeading overline="Four stories" title="Things most people miss" />
          <div className="mt-4">
            <TriviaCarousel trivia={report.trivia} />
          </div>
        </motion.section>

        <motion.section variants={staggerItem} className="pt-9">
          <SectionHeading overline="Reading your photo" title="What you are looking at" />
          <ol className="mt-4 space-y-3">
            {report.visualReferences.map((reference, index) => (
              <li
                key={reference.id}
                className="flex gap-3.5 rounded-[1.35rem] border border-border/60 bg-card/70 p-4"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-serif text-[17px] leading-tight tracking-[-0.01em]">
                    {reference.title}
                  </h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                    {reference.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        <motion.section variants={staggerItem} className="pt-9">
          <SectionHeading overline="The details" title="A closer look" />
          <div className="mt-4 space-y-7">
            {report.sections.map((section, index) => (
              <article key={section.id} className="relative">
                <p className="font-serif text-[13px] tracking-[0.2em] text-primary/70">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-1 font-serif text-[22px] leading-[1.15] tracking-[-0.02em]">
                  {section.title}
                </h3>
                <p className="mt-2.5 font-serif text-[16.5px] leading-[1.72] text-foreground/85">
                  {section.body}
                </p>
                {section.seeInPhoto && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-primary/[0.06] px-3.5 py-3">
                    <Eye className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <p className="text-[13px] italic leading-relaxed text-foreground/75">
                      {section.seeInPhoto}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section variants={staggerItem} className="pt-10">
          <div className="rounded-[1.75rem] border border-border/60 bg-card p-5 text-center">
            <div className="mx-auto grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <h3 className="mt-3 font-serif text-[21px]">Still curious?</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
              Ask about anything you can see — the answer stays with this photo.
            </p>
            <Button className="mt-4" onClick={() => setChatOpen(true)}>
              <MessageCircle className="size-4" /> Ask a question
            </Button>
          </div>
        </motion.section>
      </motion.div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="glass mx-auto flex w-full max-w-md items-center gap-3 rounded-full p-1.5 pl-4 shadow-ambient active:scale-[0.99]"
        >
          <span className="flex-1 truncate text-left text-[13.5px] text-muted-foreground">
            Ask about {report.title}
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <MessageCircle className="size-4" />
          </span>
        </button>
      </div>

      <Sheet
        open={chatOpen}
        onOpenChange={setChatOpen}
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

function SectionHeading({ overline, title }: { overline: string; title: string }) {
  return (
    <div>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {overline}
      </p>
      <h2 className="mt-1 font-serif text-[26px] leading-[1.1] tracking-[-0.02em]">{title}</h2>
    </div>
  )
}
