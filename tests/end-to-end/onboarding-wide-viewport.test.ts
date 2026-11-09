/**
 * Introduction at wide viewports — end-to-end layout and content tests.
 *
 * One browser context for the whole file: the Quality gate runs test files
 * concurrently and a single-process Chromium cannot open a second context, so
 * every scenario re-seeds localStorage on the same page. Each test names the
 * acceptance criterion it proves and measures the rendered page, never the
 * class names.
 *
 *   layout/onboarding-wide-column      AC-2.1, AC-2.2
 *   layout/profile-wide-column         AC-2.2 (profile half)
 *   onboarding/three-slides-preserved  AC-2.3
 *   layout/phone-gutters-no-overflow   AC-2.4 (phone half)
 *   layout/landscape-split             AC-2.4 (landscape half)
 *   gate/typecheck-and-tests           AC-2.5
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Browser, Page } from 'playwright-core'
import {
  LANDSCAPE_VIEWPORT,
  PHONE_VIEWPORTS,
  WIDE_VIEWPORTS,
  columnOf,
  introductionColumns,
  launchBrowser,
  openIntroduction,
  openProfile,
  openSession,
  seed,
  slideBlocks,
  startApp,
  viewportMetrics,
  visibleSlide,
  type App,
} from './support/app'

/** The three slides and their copy on the base commit (git show ae51078:src/screens/onboarding-screen.tsx). */
const SLIDES = [
  {
    title: 'Point at anything',
    body: 'A tower, a fountain, a carved doorway. Snap it or pick a photo — no typing, no searching.',
  },
  {
    title: 'The story, not the plaque',
    body: 'Every place arrives with a short guide written for you, plus four things worth remembering.',
  },
  {
    title: 'Ask, and come back later',
    body: 'Each discovery keeps its own conversation, so you can revisit the place and the question you left open.',
  },
] as const

let app: App
let browser: Browser
let page: Page
let errors: string[]

beforeAll(async () => {
  app = await startApp()
  browser = await launchBrowser()
  const session = await openSession(browser, { width: 1280, height: 800 })
  page = session.page
  errors = session.errors
}, 180_000)

afterAll(async () => {
  await browser?.close()
  await app?.close()
})

describe('the introduction column at wide viewports', () => {
  for (const viewport of WIDE_VIEWPORTS) {
    test(`layout/onboarding-wide-column ${viewport.width}×${viewport.height}`, async () => {
      await page.setViewportSize(viewport)
      await openIntroduction(page, app.base)
      const { header, slides, footer } = await introductionColumns(page)
      for (const part of [header, slides, footer]) {
        expect(part.width).toBeLessThanOrEqual(768)
        expect(Math.abs(part.left - part.right)).toBeLessThanOrEqual(2)
      }
      // The header, slide area and footer sit on the same measure and edges.
      expect(Math.abs(header.width - slides.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(footer.width - slides.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(header.left - slides.left)).toBeLessThanOrEqual(1)
      expect(Math.abs(footer.left - slides.left)).toBeLessThanOrEqual(1)

      // AC-2.2: same measure as the profile surface at the same viewport.
      await openProfile(page, app.base)
      const profile = await columnOf(page, 'section h1')
      expect(profile).not.toBeNull()
      if (!profile) return
      expect(profile.width).toBeLessThanOrEqual(768)
      expect(Math.abs(profile.left - profile.right)).toBeLessThanOrEqual(2)
      expect(Math.abs(profile.width - slides.width)).toBeLessThanOrEqual(1)
    }, 180_000)
  }
})

describe('the profile column at wide viewports', () => {
  for (const viewport of WIDE_VIEWPORTS) {
    test(`layout/profile-wide-column ${viewport.width}×${viewport.height}`, async () => {
      await page.setViewportSize(viewport)
      await openProfile(page, app.base)
      const column = await columnOf(page, 'section h1')
      expect(column).not.toBeNull()
      if (!column) return
      expect(column.width).toBeLessThanOrEqual(768)
      expect(Math.abs(column.left - column.right)).toBeLessThanOrEqual(2)
    }, 180_000)
  }
})

test('onboarding/three-slides-preserved', async () => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openIntroduction(page, app.base)
  const steps = page.locator('[role="group"][aria-label="Onboarding steps"] button')
  expect(await steps.count()).toBe(3)

  for (const [index, slide] of SLIDES.entries()) {
    await page.waitForFunction(
      (title) => document.querySelector('h1')?.textContent?.trim() === title,
      slide.title,
      { timeout: 15_000 },
    )
    expect(await steps.nth(index).getAttribute('aria-label')).toBe(
      `Step ${index + 1} of 3: ${slide.title}`,
    )
    expect(await visibleSlide(page)).toEqual({ title: slide.title, body: slide.body })

    if (index < SLIDES.length - 1) {
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
    }
  }

  expect(await page.getByRole('button', { name: 'Start exploring', exact: true }).count()).toBe(1)
}, 180_000)

describe('the introduction at phone widths', () => {
  for (const viewport of PHONE_VIEWPORTS) {
    test(`layout/phone-gutters-no-overflow ${viewport.width}×${viewport.height}`, async () => {
      await page.setViewportSize(viewport)
      await openIntroduction(page, app.base)
      const metrics = await viewportMetrics(page)
      expect(metrics.viewport).toBe(viewport.width)
      expect(Math.abs(metrics.gutterLeft - 20)).toBeLessThanOrEqual(1)
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport)
    }, 180_000)
  }
})

test('layout/landscape-split 844×390', async () => {
  await page.setViewportSize(LANDSCAPE_VIEWPORT)
  await openIntroduction(page, app.base)
  const { art, copy } = await slideBlocks(page)
  // Side by side: the copy starts at or after the artwork's right edge.
  expect(copy.left).toBeGreaterThanOrEqual(art.right - 1)
  // On one row: the blocks vertically overlap by more than half of the smaller one.
  const overlap = Math.min(art.bottom, copy.bottom) - Math.max(art.top, copy.top)
  const smaller = Math.min(art.bottom - art.top, copy.bottom - copy.top)
  expect(overlap).toBeGreaterThan(smaller * 0.5)
}, 180_000)

test('gate/typecheck-and-tests — signing in and walking the slides logs no error', async () => {
  await page.setViewportSize({ width: 1280, height: 800 })
  // No seeded user: the app starts on the login surface, so this walks the real
  // sign-in transition into the introduction. The build half of the criterion
  // (bun run typecheck, bun test, bun run build) is the repository gate command.
  await seed(page, app.base, { onboarded: null })
  await page.getByRole('button', { name: /Continue with Google/i }).click({ timeout: 30_000 })
  await page.waitForFunction(
    (titles) => titles.includes(document.querySelector('h1')?.textContent?.trim() ?? ''),
    SLIDES.map((slide) => slide.title),
    { timeout: 30_000 },
  )

  for (const title of SLIDES.slice(1).map((slide) => slide.title)) {
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.waitForFunction(
      (next) => document.querySelector('h1')?.textContent?.trim() === next,
      title,
      { timeout: 15_000 },
    )
  }

  expect(errors).toEqual([])
}, 180_000)
