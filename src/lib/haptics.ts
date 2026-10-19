export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success'

const patterns: Record<HapticStyle, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 22,
  success: [10, 40, 16],
}

export function haptic(style: HapticStyle = 'light', enabled = true) {
  if (!enabled) return
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(patterns[style])
    } catch {
      // Haptics are a bonus, never a requirement.
    }
  }
}
