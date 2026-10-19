import type { Analysis } from '@shared/types'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bookmark,
  Camera,
  MessageSquare,
  MapPin,
  Search,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { useHistory } from '@/hooks/use-history'
import { cn, formatRelativeDate, groupDay } from '@/lib/utils'

const GROUP_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This week',
  earlier: 'Earlier',
}

export function HistoryScreen({ onOpenCamera }: { onOpenCamera: () => void }) {
  const { analyses, loading, error } = useHistory()
  const [query, setQuery] = useState('')
  const [savedOnly, setSavedOnly] = useState(false)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return analyses.filter((analysis) => {
      if (savedOnly && !analysis.saved) return false
      if (!needle) return true
      const haystack = `${analysis.report.title} ${analysis.report.location.name} ${analysis.report.location.country} ${analysis.report.kind}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [analyses, query, savedOnly])

  const groups = useMemo(() => {
    const map = new Map<string, Analysis[]>()
    for (const analysis of filtered) {
      const key = groupDay(analysis.createdAt)
      map.set(key, [...(map.get(key) ?? []), analysis])
    }
    return ['today', 'yesterday', 'week', 'earlier']
      .filter((key) => map.has(key))
      .map((key) => ({ key, items: map.get(key)! }))
  }, [filtered])

  const stats = useMemo(() => {
    const cities = new Set(analyses.map((analysis) => analysis.report.location.name))
    const chats = analyses.reduce(
      (total, analysis) =>
        total + analysis.messages.filter((message) => message.role === 'user').length,
      0,
    )
    return { places: analyses.length, cities: cities.size, chats }
  }, [analyses])

  return (
    <section className="h-full overflow-y-auto overscroll-contain bg-background pb-28">
      <header className="px-5 safe-top">
        <div className="pb-4 pt-6">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Your journey
          </p>
          <h1 className="mt-1.5 font-serif text-[34px] leading-[1.05] tracking-[-0.025em]">
            Places you looked at
          </h1>
          <div className="mt-4 flex gap-5 text-[13px] text-muted-foreground">
            <span>
              <strong className="font-semibold text-foreground">{stats.places}</strong> discoveries
            </span>
            <span>
              <strong className="font-semibold text-foreground">{stats.cities}</strong> places
            </span>
            <span>
              <strong className="font-semibold text-foreground">{stats.chats}</strong> questions
            </span>
          </div>
        </div>

        <div className="sticky top-0 z-10 -mx-5 space-y-3 bg-background/85 px-5 pb-3 pt-2 backdrop-blur-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a place"
              className="pl-10"
              data-no-swipe
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSavedOnly(false)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                !savedOnly ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground',
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSavedOnly(true)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                savedOnly ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground',
              )}
            >
              <Bookmark className="size-3.5" /> Saved
            </button>
          </div>
        </div>
      </header>

      <div className="px-5 pt-2">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-20 shrink-0 rounded-3xl" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="relative grid size-24 place-items-center rounded-[2rem] border border-dashed border-border bg-card/60">
              <Camera className="size-8 text-muted-foreground" />
            </div>
            <h2 className="mt-5 font-serif text-2xl">
              {analyses.length === 0 ? 'Nothing yet' : 'No matches'}
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {analyses.length === 0
                ? 'Point your camera at a monument, a landscape or a street corner and this is where it lives.'
                : 'Try another word, or clear the filters.'}
            </p>
            {analyses.length === 0 && (
              <button
                type="button"
                onClick={onOpenCamera}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground active:scale-[0.97]"
              >
                <Camera className="size-4" /> Open the camera
              </button>
            )}
          </div>
        )}

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-7 pb-6"
        >
          {groups.map((group) => (
            <div key={group.key}>
              <h2 className="mb-2.5 px-1 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {GROUP_LABELS[group.key]}
              </h2>
              <div className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {group.items.map((analysis) => (
                    <AnalysisCard key={analysis.id} analysis={analysis} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function AnalysisCard({ analysis }: { analysis: Analysis }) {
  const navigate = useNavigate()
  const questionCount = analysis.messages.filter((message) => message.role === 'user').length

  return (
    <motion.button
      type="button"
      variants={staggerItem}
      layout
      onClick={() => navigate(`/report/${analysis.id}`)}
      className="group flex w-full gap-3.5 rounded-[1.5rem] border border-border/60 bg-card p-2.5 pr-4 text-left shadow-ambient transition-transform duration-200 active:scale-[0.985]"
    >
      <div className="relative size-[84px] shrink-0 overflow-hidden rounded-[1.15rem] bg-secondary">
        {analysis.previewUrl ? (
          <img
            src={analysis.previewUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <Camera className="size-5 text-muted-foreground" />
          </div>
        )}
        {analysis.saved && (
          <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
            <Bookmark className="size-3 fill-current" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-serif text-[19px] leading-tight tracking-[-0.015em]">
            {analysis.report.title}
          </h3>
          <span className="mt-0.5 shrink-0 text-[11px] text-muted-foreground">
            {formatRelativeDate(analysis.createdAt)}
          </span>
        </div>
        <p className="flex items-center gap-1 truncate text-[12.5px] text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          {analysis.report.location.name}, {analysis.report.location.country}
          <span className="mx-1 text-border">•</span>
          {analysis.report.era}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge variant="muted" className="px-2 py-0.5">
            {analysis.report.kind}
          </Badge>
          {questionCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageSquare className="size-3" />
              {questionCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}
