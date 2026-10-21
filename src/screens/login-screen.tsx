import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/brand/logo'
import { useAuth } from '@/lib/auth'
import { spring } from '@/lib/motion'

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
  const [pending, setPending] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 safe-top safe-bottom">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex flex-1 flex-col justify-center"
      >
        <p className="display text-lg text-brand-ink">Nekibuki</p>
        <Logo className="mt-6 size-20 text-foreground" draw />
        <h1 className="display mt-10 text-[3.25rem] font-medium">
          A quiet guide for the places you <em className="not-italic text-brand-ink">walk past</em>.
        </h1>
        <p className="mt-5 max-w-xs text-lg leading-relaxed text-muted-foreground">
          Point your camera at a monument, a landscape or a corner of a city. Nekibuki tells you what
          it is, what to look at, and four things worth remembering.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.06 }}
        className="pb-2"
      >
        {error && <p className="pb-3 text-sm text-destructive">{error}</p>}

        <button
          type="button"
          disabled={pending || loading}
          onClick={async () => {
            setPending(true)
            try {
              await signIn()
            } finally {
              setPending(false)
            }
          }}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-primary text-[1.05rem] font-medium text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-80"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <GoogleMark className="size-5" />}
          Continue with Google
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms and Privacy Policy.
          {mode === 'mock' && ' Demo mode — no Google account is contacted.'}
        </p>
      </motion.div>
    </div>
  )
}
