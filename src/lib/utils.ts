import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const MONTH_NAMES = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
} as const

/**
 * One axis of distance, so a column of dates reads as one column:
 * `Today, 17:16` → `Yesterday` → `4 days ago` → `13 Oct`.
 */
export function formatRelativeDate(timestamp: number, language: 'en' | 'tr' = 'en'): string {
  const date = new Date(timestamp)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOfToday - startOfDate) / (24 * 60 * 60 * 1000))

  if (days <= 0) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${language === 'tr' ? 'Bugün' : 'Today'}, ${hours}:${minutes}`
  }
  if (days === 1) return language === 'tr' ? 'Dün' : 'Yesterday'
  if (days <= 7) return language === 'tr' ? `${days} gün önce` : `${days} days ago`
  return `${date.getDate()} ${MONTH_NAMES[language][date.getMonth()]}`
}

export function groupDay(timestamp: number): 'today' | 'yesterday' | 'week' | 'earlier' {
  const date = new Date(timestamp)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = 24 * 60 * 60 * 1000
  if (timestamp >= startOfToday) return 'today'
  if (timestamp >= startOfToday - day) return 'yesterday'
  if (timestamp >= startOfToday - 7 * day) return 'week'
  return 'earlier'
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
