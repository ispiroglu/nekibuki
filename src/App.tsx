import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { BrowserRouter } from 'react-router-dom'
import { AppearanceSync } from '@/components/layout/appearance-sync'
import { CaptureController } from '@/components/capture/capture-controller'
import { Shell } from '@/components/layout/shell'
import { SplashScreen } from '@/components/layout/splash'
import { AuthProvider, useAuth } from '@/lib/auth'
import { AuthCallbackScreen } from '@/screens/auth-callback-screen'
import { LoginScreen } from '@/screens/login-screen'
import { OnboardingScreen } from '@/screens/onboarding-screen'
import { usePreferences } from '@/store/preferences'

const ReportScreen = lazy(() =>
  import('@/screens/report-screen').then((module) => ({ default: module.ReportScreen })),
)

function Screens() {
  const { user, loading } = useAuth()
  const onboarded = usePreferences((state) => state.onboarded)
  const location = useLocation()

  if (location.pathname === '/auth/callback') return <AuthCallbackScreen />
  if (loading) return <SplashScreen />
  if (!user) return <LoginScreen />
  if (!onboarded[user.id]) return <OnboardingScreen />

  return (
    <>
      <CaptureController />
      <Routes>
        <Route path="/" element={<Shell />} />
        <Route
          path="/report/:id"
          element={
            <Suspense fallback={<SplashScreen />}>
              <ReportScreen />
            </Suspense>
          }
        />
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
