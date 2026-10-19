import { motion } from 'motion/react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
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
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-24 -top-24 size-[26rem] rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 size-[24rem] rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-10 md:grid-cols-2 md:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex flex-col items-start"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Logo className="size-6" />
            </span>
            <span className="font-serif text-[22px] tracking-[-0.02em]">Nekibuki</span>
          </div>

          <h1 className="mt-8 max-w-md font-serif text-[42px] leading-[1.03] tracking-[-0.03em] md:text-[54px]">
            A quiet guide for the places you walk past.
          </h1>
          <p className="mt-5 max-w-sm text-[15.5px] leading-relaxed text-muted-foreground">
            Point your camera at a monument, a landscape or a corner of a city. Nekibuki tells you
            what it is, what to look at, and four things worth remembering.
          </p>

          <div className="mt-9 w-full max-w-sm space-y-3">
            <Button
              variant="secondary"
              size="lg"
              className="h-13 w-full bg-card shadow-ambient"
              disabled={pending || loading}
              onClick={async () => {
                setPending(true)
                try {
                  await signIn()
                } finally {
                  setPending(false)
                }
              }}
            >
              {pending ? (
                <Loader2 className="size-4.5 animate-spin" />
              ) : (
                <GoogleMark className="size-4.5" />
              )}
              Continue with Google
            </Button>

            {error && <p className="text-[13px] text-destructive">{error}</p>}

            <p className="flex items-start gap-2 pt-1 text-[12px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              Sign in is required to keep your discoveries and conversations in one place.
              {mode === 'mock' && ' This build runs in demo mode — no Google account is contacted.'}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: 0.08 }}
          className="relative hidden aspect-[4/5] w-full overflow-hidden rounded-[2.5rem] border border-border/60 shadow-ambient md:block"
        >
          <img
            src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80"
            alt="The Eiffel Tower beside the Seine"
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
          <div className="absolute inset-x-5 bottom-5 text-white">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-white/70">
              Paris · 1887–1889
            </p>
            <p className="mt-1 font-serif text-[26px] leading-tight">
              Built as a temporary gate. It never left.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
