import { motion } from 'motion/react'
import { Logo } from '@/components/brand/logo'

export function SplashScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.1, duration: 0.6 }}
        className="flex flex-col items-center gap-4"
      >
        <span className="grid size-14 place-items-center rounded-3xl bg-primary text-primary-foreground">
          <Logo className="size-7 animate-breathe" />
        </span>
        <p className="font-serif text-[15px] tracking-[-0.01em] text-muted-foreground">
          Finding your guide…
        </p>
      </motion.div>
    </div>
  )
}
