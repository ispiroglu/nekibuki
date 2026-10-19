import type { Transition } from 'motion/react'

/** Apple-style default: critically damped, quick, no overshoot. */
export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.42 }

/** For things the user threw: a hint of bounce, never a cartoon. */
export const momentumSpring: Transition = { type: 'spring', bounce: 0.14, duration: 0.5 }

/** Softer entrance for sheets and large surfaces. */
export const sheetSpring: Transition = { type: 'spring', bounce: 0.08, duration: 0.5 }

export const easeOut = [0.16, 1, 0.3, 1] as const

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: spring,
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
}

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: 8, transition: { duration: 0.16 } },
}
