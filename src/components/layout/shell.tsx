import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  type ComponentType,
  type LazyExoticComponent,
} from 'react'
import { CameraScreen } from '@/screens/camera-screen'
import { PageDots } from '@/components/layout/page-dots'
import { SwipeDeck } from '@/components/layout/swipe-deck'
import { SwipeHint } from '@/components/layout/swipe-hint'
import { Skeleton } from '@/components/ui/skeleton'
import { useRepository } from '@/hooks/use-history'
import { useAppStore } from '@/store/app'
import { useLocationStore } from '@/store/location'

/**
 * The panels take an optional `active` flag: the panel in front keeps its `h1`,
 * the ones off screen step down to `h2`, so the document has one title.
 */
type PanelProps = { active?: boolean }

const ProfileScreen: LazyExoticComponent<ComponentType<PanelProps>> = lazy(() =>
  import('@/screens/profile-screen').then((module) => ({ default: module.ProfileScreen })),
)
const HistoryScreen: LazyExoticComponent<
  ComponentType<PanelProps & { onOpenCamera: () => void }>
> = lazy(() =>
  import('@/screens/history-screen').then((module) => ({ default: module.HistoryScreen })),
)

const SCREEN_COUNT = 3

/** Focus targets that own the arrow keys themselves. */
const ARROW_KEY_OWNERS =
  'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="slider"], [role="radiogroup"], [role="tablist"], [role="menu"], [role="dialog"]'

function PageSkeleton() {
  return (
    <div className="h-full space-y-4 overflow-hidden bg-background px-5 safe-top">
      <Skeleton className="mt-10 h-9 w-2/3" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  )
}

export function Shell() {
  const screenIndex = useAppStore((state) => state.screenIndex)
  const setScreenIndex = useAppStore((state) => state.setScreenIndex)
  const setCapture = useAppStore((state) => state.setCapture)
  const capture = useAppStore((state) => state.capture)
  const bumpHistory = useAppStore((state) => state.bumpHistory)
  const location = useLocationStore((state) => state.location)
  const locationStatus = useLocationStore((state) => state.status)
  const requestLocation = useLocationStore((state) => state.request)
  const repository = useRepository()

  // Only `idle` (a fresh store / first mount) auto-requests. After a deliberate
  // opt-out the store is `disabled`, and this effect must leave it alone.
  useEffect(() => {
    if (locationStatus === 'idle') void requestLocation()
  }, [locationStatus, requestLocation])

  useEffect(() => {
    let active = true
    const seed = repository?.seedDemo?.()
    if (seed) {
      seed
        .then(() => {
          if (active) bumpHistory()
        })
        .catch(() => undefined)
    }
    return () => {
      active = false
    }
  }, [repository, bumpHistory])

  const handleCapture = useCallback(
    (blob: Blob) => {
      setCapture({ blob, previewUrl: URL.createObjectURL(blob) })
    },
    [setCapture],
  )

  // Pointer users can swipe or tap the page dots; keyboard users get the same
  // panel switch with the arrow keys, unless they are typing or driving a
  // control that already owns those keys. The deck handles the case where its
  // own container has focus and marks the event as handled.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if (!(event.target instanceof Element)) return
      if (event.target.closest(ARROW_KEY_OWNERS)) return

      const current = useAppStore.getState().screenIndex
      const next = event.key === 'ArrowRight' ? current + 1 : current - 1
      if (next < 0 || next >= SCREEN_COUNT) return

      event.preventDefault()
      setScreenIndex(next)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setScreenIndex])

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-background"
      // While a photo is being analysed the overlay is the only thing on
      // screen: the deck behind it must not take focus.
      inert={Boolean(capture)}
    >
      <main className="h-full w-full">
        <SwipeDeck index={screenIndex} onIndexChange={setScreenIndex}>
          <Suspense fallback={<PageSkeleton />}>
            <ProfileScreen active={screenIndex === 0} />
          </Suspense>
          <CameraScreen
            active={screenIndex === 1}
            onCapture={handleCapture}
            location={location}
            locationStatus={locationStatus}
            onRequestLocation={requestLocation}
            onClearLocation={() => useLocationStore.getState().reset()}
            onOpenProfile={() => setScreenIndex(0)}
            onOpenHistory={() => setScreenIndex(2)}
          />
          <Suspense fallback={<PageSkeleton />}>
            <HistoryScreen active={screenIndex === 2} onOpenCamera={() => setScreenIndex(1)} />
          </Suspense>
        </SwipeDeck>
      </main>

      <SwipeHint />

      <nav
        aria-label="Panels"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      >
        <PageDots
          index={screenIndex}
          onSelect={setScreenIndex}
          tone={screenIndex === 1 ? 'dark' : 'light'}
          className="pointer-events-auto"
        />
      </nav>
    </div>
  )
}
