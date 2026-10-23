import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app'
import { usePreferences } from '@/store/preferences'
import { useT } from '@/lib/ui-language'

export function SwipeHint() {
  const t = useT()
  const seen = usePreferences((state) => state.swipeHintSeen)
  const markSeen = usePreferences((state) => state.markSwipeHintSeen)
  const screenIndex = useAppStore((state) => state.screenIndex)
  const settingsOpen = useAppStore((state) => state.viewfinderSettingsOpen)
  const pendingStep = useAppStore((state) => state.pendingStep)
  const [visible, setVisible] = useState(!seen)

  // The hint sits in the same band as the viewfinder settings shelf and the
  // shot the guide proposed; it steps aside while either of them is open so
  // the two never stack.
  const show = visible && screenIndex === 1 && !settingsOpen && !pendingStep

  useEffect(() => {
    // The clock starts when the hint is actually on screen. A hint that was
    // stepped aside for six seconds has not been read, so it must not expire
    // unseen.
    if (!show) return
    const timer = window.setTimeout(() => {
      setVisible(false)
      markSeen()
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [show, markSeen])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="glass-dark-live pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+6.25rem)] z-40 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] font-medium text-white"
        >
          <ArrowLeftRight className="size-3.5 text-brand-ink" />
          {t('Swipe between the camera, your profile and your places', 'Kamera, profil ve yerlerin arasında kaydır')}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
