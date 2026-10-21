import { Suspense, lazy, useCallback, useEffect } from 'react'
import { CameraScreen } from '@/screens/camera-screen'
import { PageDots } from '@/components/layout/page-dots'
import { SwipeDeck } from '@/components/layout/swipe-deck'
import { SwipeHint } from '@/components/layout/swipe-hint'
import { Skeleton } from '@/components/ui/skeleton'
import { useRepository } from '@/hooks/use-history'
import { useAppStore } from '@/store/app'
import { useLocationStore } from '@/store/location'

const ProfileScreen = lazy(() =>
  import('@/screens/profile-screen').then((module) => ({ default: module.ProfileScreen })),
)
const HistoryScreen = lazy(() =>
  import('@/screens/history-screen').then((module) => ({ default: module.HistoryScreen })),
)

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

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <SwipeDeck index={screenIndex} onIndexChange={setScreenIndex}>
        <Suspense fallback={<PageSkeleton />}>
          <ProfileScreen />
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
          <HistoryScreen onOpenCamera={() => setScreenIndex(1)} />
        </Suspense>
      </SwipeDeck>

      <SwipeHint />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <PageDots
          index={screenIndex}
          onSelect={setScreenIndex}
          tone={screenIndex === 1 ? 'dark' : 'light'}
          className="pointer-events-auto"
        />
      </div>
    </div>
  )
}
