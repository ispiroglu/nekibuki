import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app'
import { usePreferences } from '@/store/preferences'

export function SwipeHint() {
  const seen = usePreferences((state) => state.swipeHintSeen)
  const markSeen = usePreferences((state) => state.markSwipeHintSeen)
  const screenIndex = useAppStore((state) => state.screenIndex)
  const [visible, setVisible] = useState(!seen)

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => {
      setVisible(false)
      markSeen()
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [visible, markSeen])

  const show = visible && screenIndex === 1

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="glass-dark pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+4.75rem)] z-40 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] font-medium text-white"
        >
          <ArrowLeftRight className="size-3.5 text-brand-ink" />
          Swipe between camera, you and your places
        </motion.div>
      )}
    </AnimatePresence>
  )
}
