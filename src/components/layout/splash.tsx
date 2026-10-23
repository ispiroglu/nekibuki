import { motion } from 'motion/react'
import { Logo } from '@/components/brand/logo'
import { useT } from '@/lib/ui-language'

export function SplashScreen() {
  const t = useT()
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.1, duration: 0.6 }}
        className="flex flex-col items-center gap-4"
      >
        <Logo className="size-16 animate-breathe text-foreground" />
        <p className="display text-lg text-muted-foreground">{t('Finding your guide…', 'Rehberin bulunuyor…')}</p>
      </motion.div>
    </div>
  )
}
