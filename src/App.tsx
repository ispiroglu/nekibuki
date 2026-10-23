import { Suspense, lazy, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { BrowserRouter } from 'react-router-dom'
import { AppearanceSync } from '@/components/layout/appearance-sync'
import { LanguageSync } from '@/lib/ui-language'
import { CaptureController } from '@/components/capture/capture-controller'
import { Shell } from '@/components/layout/shell'
import { SplashScreen } from '@/components/layout/splash'
import { AuthProvider, useAuth } from '@/lib/auth'
import { AuthCallbackScreen } from '@/screens/auth-callback-screen'
import { LegalScreen, type LegalPage } from '@/screens/legal-screen'
import { LoginScreen } from '@/screens/login-screen'
import { OnboardingScreen } from '@/screens/onboarding-screen'
import { usePreferences } from '@/store/preferences'

const ReportScreen = lazy(() =>
  import('@/screens/report-screen').then((module) => ({ default: module.ReportScreen })),
)

const WalkScreen = lazy(() =>
  import('@/screens/walk-screen').then((module) => ({ default: module.WalkScreen })),
)

/** The legal pages are readable by anyone, signed in or not. */
function legalPage(pathname: string): LegalPage | null {
  if (pathname === '/terms') return 'terms'
  if (pathname === '/privacy') return 'privacy'
  return null
}

function ReportRoute() {
  const mainRef = useRef<HTMLElement>(null)

  // The guide replaces the camera: put focus in the new page instead of
  // leaving it on the control that was pressed.
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <main ref={mainRef} tabIndex={-1} className="min-h-dvh bg-background focus:outline-none">
      <Suspense fallback={<SplashScreen />}>
        <ReportScreen />
      </Suspense>
    </main>
  )
}

function WalkRoute() {
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <main ref={mainRef} tabIndex={-1} className="min-h-dvh bg-background focus:outline-none">
      <Suspense fallback={<SplashScreen />}>
        <WalkScreen />
      </Suspense>
    </main>
  )
}

function Screens() {
  const { user, loading } = useAuth()
  const onboarded = usePreferences((state) => state.onboarded)
  const location = useLocation()
  const legal = legalPage(location.pathname)

  if (location.pathname === '/auth/callback') return <AuthCallbackScreen />
  if (legal) return <LegalScreen page={legal} />
  if (loading) return <SplashScreen />
  if (!user) return <LoginScreen />
  if (!onboarded[user.id]) return <OnboardingScreen />

  return (
    <>
      <CaptureController />
      <Routes>
        <Route path="/" element={<Shell />} />
        <Route path="/report/:id" element={<ReportRoute />} />
        <Route path="/walk/:id" element={<WalkRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppearanceSync />
        <LanguageSync />
        <div className="min-h-dvh">
          <Screens />
        </div>
        <Toaster
          position="top-center"
          offset={20}
          toastOptions={{
            classNames: {
              toast:
                'rounded-2xl bg-popover text-popover-foreground shadow-[0_0_0_1px_var(--border),0_20px_50px_-30px_rgba(0,0,0,.4)]',
              description: 'text-muted-foreground',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
