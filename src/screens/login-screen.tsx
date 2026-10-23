import { motion, useReducedMotion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { useAuth } from '@/lib/auth'
import { spring } from '@/lib/motion'
import { pickLanguage, useT, useUiLanguage } from '@/lib/ui-language'

const LINK =
  'rounded-sm text-brand-ink underline decoration-brand-ink/40 underline-offset-4 transition-colors hover:decoration-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink'

export interface OAuthFailure {
  title: string
  hint: string
}

interface OAuthError {
  code: string
}

/**
 * OAuth errors come back on the query string (PKCE) or the hash (implicit).
 * Read both so a cancelled Google flow is never silent.
 */
export function readOAuthError(): OAuthError | null {
  if (typeof window === 'undefined') return null
  const sources = [
    new URLSearchParams(window.location.search),
    new URLSearchParams(window.location.hash.replace(/^#/, '')),
  ]
  for (const params of sources) {
    const code = params.get('error') ?? params.get('error_code')
    if (code) return { code }
  }
  return null
}

export function describeOAuthFailure(code: string | null, language: 'en' | 'tr' = 'en'): OAuthFailure {
  switch (code) {
    case 'access_denied':
      return {
        title: pickLanguage(language, 'Sign-in was cancelled.', 'Giriş iptal edildi.'),
        hint: pickLanguage(
          language,
          'Nothing changed on your account. Try again when you’re ready.',
          'Hesabında bir şey değişmedi. Hazır olduğunda tekrar dene.',
        ),
      }
    case 'temporarily_unavailable':
    case 'server_error':
      return {
        title: pickLanguage(language, 'Google couldn’t sign you in just now.', 'Google şu anda giriş yapamadı.'),
        hint: pickLanguage(
          language,
          'This is usually temporary. Try again in a moment.',
          'Bu genellikle geçicidir. Birazdan tekrar dene.',
        ),
      }
    default:
      return {
        title: pickLanguage(language, 'We couldn’t finish signing you in.', 'Girişi tamamlayamadık.'),
        hint: pickLanguage(
          language,
          'Allow cookies for this site, then try again.',
          'Bu site için çerezlere izin ver, sonra tekrar dene.',
        ),
      }
  }
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.59-5.15 3.59-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.93-2.92l-3.86-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.29a12 12 0 0 0 0 10.74l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.63l3.98 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

export function LoginScreen() {
  const { signIn, loading, error, mode } = useAuth()
  const language = useUiLanguage()
  const t = useT()
  const [pending, setPending] = useState(false)
  const [oauth] = useState<OAuthError | null>(() => readOAuthError())
  const reduceMotion = useReducedMotion()

  // Show the provider error once, then leave a clean URL so a later sign-out
  // does not resurrect a stale message.
  useEffect(() => {
    if (!oauth) return
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    window.history.replaceState(window.history.state, '', url)
  }, [oauth])

  const failure: OAuthFailure | null = oauth
    ? describeOAuthFailure(oauth.code, language)
    : error
      ? {
          title: t('Sign-in didn’t start.', 'Giriş başlamadı.'),
          hint: t('Check your connection, then try again.', 'Bağlantını kontrol edip tekrar dene.'),
        }
      : null
  const busy = pending || loading

  return (
    <main className="flex min-h-dvh flex-col bg-background px-5 safe-top safe-bottom sm:px-6 [@media(orientation:landscape)_and_(max-height:560px)]:grid [@media(orientation:landscape)_and_(max-height:560px)]:grid-cols-[1.05fr_0.95fr] [@media(orientation:landscape)_and_(max-height:560px)]:items-center [@media(orientation:landscape)_and_(max-height:560px)]:gap-10">
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex flex-1 flex-col justify-center"
      >
        <p className="display text-lg text-brand-ink">Nekibuki</p>
        <Logo className="mt-5 size-16 text-foreground sm:mt-6 sm:size-20 [@media(orientation:landscape)_and_(max-height:560px)]:mt-3 [@media(orientation:landscape)_and_(max-height:560px)]:size-12 [@media(max-height:360px)]:hidden" draw={!reduceMotion} />
        <h1 className="display mt-7 text-[clamp(2.25rem,12vw,3.25rem)] font-medium sm:mt-10 [@media(orientation:landscape)_and_(max-height:560px)]:mt-4 [@media(orientation:landscape)_and_(max-height:560px)]:text-4xl [@media(max-height:360px)]:mt-3">
          {language === 'tr' ? (
            <>
              Yanından geçip gittiğin yerler için{' '}
              <em className="not-italic text-brand-ink">sakin bir rehber</em>.
            </>
          ) : (
            <>
              A quiet guide for the places you{' '}
              <em className="not-italic text-brand-ink">walk past</em>.
            </>
          )}
        </h1>
        <p className="mt-4 max-w-xs text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg [@media(orientation:landscape)_and_(max-height:560px)]:mt-4 [@media(orientation:landscape)_and_(max-height:560px)]:max-w-none [@media(orientation:landscape)_and_(max-height:560px)]:text-base [@media(orientation:landscape)_and_(max-height:560px)]:leading-6 [@media(max-height:360px)]:mt-3 [@media(max-height:360px)]:leading-snug">
          {t(
            'Point your camera at a monument, a landscape or a corner of a city. Nekibuki tells you what it is, what to look at, and four things worth remembering.',
            'Kameranı bir anıta, manzaraya ya da şehrin bir köşesine tut. Nekibuki ne olduğunu, neye bakman gerektiğini ve hatırlamaya değer dört şeyi anlatır.',
          )}
        </p>
      </motion.div>

      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.06 }}
        className="pb-2 [@media(orientation:landscape)_and_(max-height:560px)]:py-4"
      >
        {failure && (
          <div role="alert" className="mb-4 rounded-2xl bg-secondary px-4 py-3">
            <p className="text-sm font-medium text-foreground">{failure.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{failure.hint}</p>
          </div>
        )}

        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={async () => {
            setPending(true)
            try {
              await signIn()
            } finally {
              setPending(false)
            }
          }}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-primary px-5 text-base font-medium text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-80 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {busy ? (
            <>
              <Loader2 aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
              {t('Signing you in…', 'Giriş yapılıyor…')}
            </>
          ) : (
            <>
              <GoogleMark className="size-5" />
              {failure ? t('Try Google again', 'Google ile tekrar dene') : t('Continue with Google', 'Google ile devam et')}
            </>
          )}
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t('By continuing you agree to our', 'Devam ederek şunları kabul etmiş olursun:')}{' '}
          <Link to="/terms" className={LINK}>
            {t('Terms', 'Koşullar')}
          </Link>{' '}
          {t('and', 've')}{' '}
          <Link to="/privacy" className={LINK}>
            {t('Privacy Policy', 'Gizlilik Politikası')}
          </Link>
          .
          {mode === 'mock' && t(' Demo mode — no Google account is contacted.', ' Demo modu — hiçbir Google hesabına bağlanılmaz.')}
        </p>
      </motion.div>
    </main>
  )
}
