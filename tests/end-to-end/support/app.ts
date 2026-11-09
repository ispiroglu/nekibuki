/**
 * Shared harness for the introduction layout end-to-end tests.
 *
 * The tests measure the rendered page in Chromium, so they start the app's own
 * Vite dev server and drive it with Playwright, the same stack the repository
 * already uses for screenshots (scripts/screenshot.mjs). The surfaces under
 * test need no credentials: demo auth is the default, and the introduction and
 * profile are reached by seeding the demo user and the preferences store in
 * localStorage before the app boots.
 *
 * E2E_SANDBOX tries the single-process Chromium first, for a sandboxed runner
 * that cannot launch a multi-process browser.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export const DEMO_USER = {
  id: 'demo-traveller',
  name: 'Ada Traveller',
  email: 'ada@nekibuki.app',
  avatarUrl: null,
  provider: 'demo',
} as const

/** The three viewports the wide-column criteria name. */
export const WIDE_VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const

/** The phone viewports the gutter criterion names. */
export const PHONE_VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
] as const

/** Short landscape: the split layout lives behind orientation:landscape and max-height:560px. */
export const LANDSCAPE_VIEWPORT = { width: 844, height: 390 } as const

const MEDIA_ARGS = [
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
]
// A sandboxed macOS runner blocks the Mach ports a multi-process Chromium needs.
const SANDBOX_ARGS = ['--single-process', '--no-zygote', '--disable-gpu']

export interface App {
  server: ViteDevServer
  base: string
  close: () => Promise<void>
}

export async function startApp(): Promise<App> {
  const server = await createServer({
    configFile: resolve(REPO_ROOT, 'vite.config.ts'),
    root: REPO_ROOT,
    logLevel: 'silent',
    server: { port: 0 },
    // The repository has no PostCSS config; pinning an empty one stops Vite
    // searching above the worktree (a read the factory sandbox denies).
    css: { postcss: { plugins: [] } },
  })
  await server.listen()
  const base = server.resolvedUrls?.local[0]
  if (!base) throw new Error('the dev server did not expose a local URL')
  return {
    server,
    base,
    close: async () => {
      await server.close()
    },
  }
}

/** Chromium with a short timeout per launch shape, so an unavailable one fails fast. */
export async function launchBrowser(): Promise<Browser> {
  const plain = [
    { headless: true, args: MEDIA_ARGS, timeout: 20_000 },
    { channel: 'chrome' as const, headless: true, args: MEDIA_ARGS, timeout: 20_000 },
  ]
  const sandboxed = [
    { headless: true, args: [...MEDIA_ARGS, ...SANDBOX_ARGS], timeout: 20_000 },
    {
      channel: 'chrome' as const,
      headless: true,
      args: [...MEDIA_ARGS, ...SANDBOX_ARGS],
      timeout: 20_000,
    },
  ]
  // The factory sandbox gives the process a TMPDIR under sandcastle-seatbelt and
  // cannot start a multi-process browser; E2E_SANDBOX forces the same order.
  const sandboxedRunner =
    process.env.E2E_SANDBOX === '1' || /sandcastle-seatbelt/.test(process.env.TMPDIR ?? '')
  const attempts = sandboxedRunner ? [...sandboxed, ...plain] : [...plain, ...sandboxed]
  const failures: string[] = []
  for (const options of attempts) {
    try {
      return await chromium.launch(options)
    } catch (error) {
      failures.push((error as Error).message.split('\n')[0])
    }
  }
  throw new Error(`no browser launched: ${failures.join(' | ')}`)
}

/** One browser context for the whole suite: single-process Chromium cannot open a second. */
export async function openSession(
  browser: Browser,
  viewport: { width: number; height: number },
): Promise<{ context: BrowserContext; page: Page; errors: string[] }> {
  const context = await browser.newContext({ viewport, locale: 'en-US' })
  // The Vite dev server has no Worker behind /api; the demo auth the tests run
  // in never reads these answers, so keep the static server's 401s out of the
  // console-error assertion.
  await context.route('**/api/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"session":null,"user":null}',
    }),
  )
  await context.addInitScript(() => {
    if (!location.protocol.startsWith('http') || !navigator.mediaDevices) return
    // The layout checks need no camera, and a fake video device crashes the
    // single-process Chromium the factory sandbox allows.
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException('no camera in the layout tests', 'NotAllowedError'))
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return { context, page, errors }
}

/** Seed the demo user and onboarding state, then load the surface they select. */
export async function seed(
  page: Page,
  base: string,
  options: { onboarded: boolean | null },
): Promise<void> {
  const onboarded =
    options.onboarded === null ? null : options.onboarded ? { [DEMO_USER.id]: true } : {}
  // Load the origin once so localStorage is writable, then replace its state.
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ user, onboarded }) => {
      localStorage.clear()
      if (!onboarded) return
      localStorage.setItem('nekibuki.demo-user', JSON.stringify(user))
      localStorage.setItem(
        'nekibuki.preferences',
        JSON.stringify({
          state: {
            guideLanguage: 'en',
            appearance: 'light',
            haptics: true,
            onboarded,
            swipeHintSeen: true,
          },
          version: 0,
        }),
      )
    },
    { user: DEMO_USER, onboarded },
  )
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => (document.querySelector('h1, h2')?.textContent ?? '').trim().length > 0,
    null,
    { timeout: 30_000 },
  )
}

/** Land on the introduction surface (demo user present, onboarding not yet completed). */
export async function openIntroduction(page: Page, base: string): Promise<void> {
  await seed(page, base, { onboarded: false })
  await page.waitForFunction(
    () => (document.querySelector('h1')?.textContent ?? '').trim().length > 0,
    null,
    { timeout: 30_000 },
  )
  await settle(page)
}

/** Land on the app shell with the profile panel in front. */
export async function openProfile(page: Page, base: string): Promise<void> {
  await seed(page, base, { onboarded: true })
  await page.waitForSelector('h1, h2', { timeout: 30_000 })
  await page.locator('button[aria-label="You"]').first().click({ timeout: 15_000 })
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('section h1')].some((heading) =>
        heading.textContent?.includes('Ada Traveller'),
      ),
    null,
    { timeout: 30_000 },
  )
  await settle(page)
}

/** Wait until two consecutive layout reads agree, so spring/enter animations are done. */
export async function settle(page: Page, timeout = 10_000): Promise<void> {
  await page.waitForFunction(
    () => {
      const element = document.querySelector('header, section')
      const width = element?.getBoundingClientRect().width ?? 0
      const store = window as unknown as { __lastWidth?: number }
      const stable = store.__lastWidth === width
      store.__lastWidth = width
      return stable
    },
    null,
    { timeout, polling: 250 },
  )
}

export interface Column {
  /** The capped column's border-box width. */
  width: number
  /** Distance from the document's left edge to the column. */
  left: number
  /** Distance from the column to the document's right edge. */
  right: number
}

/**
 * The reading column that contains `anchor`, read without knowing any class
 * name: the widest ancestor narrower than the viewport, which is the centred
 * measure the surface settles on.
 */
export async function columnOf(page: Page, anchor: string): Promise<Column | null> {
  return page.evaluate((selector) => {
    const found = document.querySelector(selector)
    if (!found) return null
    const viewport = document.documentElement.clientWidth
    let best: DOMRect | null = null
    let element: Element | null = found
    while (element && element !== document.documentElement) {
      const rect = element.getBoundingClientRect()
      if (rect.width < viewport - 1 && (!best || rect.width > best.width + 0.5)) best = rect
      element = element.parentElement
    }
    if (!best) return null
    return { width: best.width, left: best.left, right: viewport - best.right }
  }, anchor)
}

/** Border boxes of the introduction's three containers, as the criterion names them. */
export async function introductionColumns(page: Page): Promise<{
  header: Column
  slides: Column
  footer: Column
}> {
  const header = await columnOf(page, 'header')
  const slides = await columnOf(page, 'h1')
  const footer = await columnOf(page, '[role="group"][aria-label="Onboarding steps"]')
  if (!header || !slides || !footer) {
    throw new Error('the introduction rendered no measurable column')
  }
  return { header, slides, footer }
}

export interface ViewportMetrics {
  viewport: number
  scrollWidth: number
  gutterLeft: number
  headerWidth: number
}

/** Phone-width facts: the content gutter and whether the page overflows. */
export async function viewportMetrics(page: Page): Promise<ViewportMetrics> {
  return page.evaluate(() => {
    const header = document.querySelector('header')
    const first = header?.firstElementChild
    if (!header || !first) throw new Error('the introduction rendered no header content')
    const viewport = document.documentElement.clientWidth
    return {
      viewport,
      scrollWidth: document.documentElement.scrollWidth,
      gutterLeft: first.getBoundingClientRect().left,
      headerWidth: header.getBoundingClientRect().width,
    }
  })
}

interface Block {
  left: number
  right: number
  top: number
  bottom: number
}

/** Positions of the artwork and the copy inside the visible slide. */
export async function slideBlocks(page: Page): Promise<{ art: Block; copy: Block }> {
  return page.evaluate(() => {
    const heading = document.querySelector('h1')
    const copy = heading?.parentElement
    const art = copy?.previousElementSibling
    if (!heading || !copy || !art) throw new Error('the visible slide has no art and copy blocks')
    const box = (element: Element) => {
      const r = element.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    }
    return { art: box(art), copy: box(copy) }
  })
}

/** All text of the visible slide: its title and its body paragraph. */
export async function visibleSlide(page: Page): Promise<{ title: string; body: string }> {
  return page.evaluate(() => {
    const heading = document.querySelector('h1')
    const body = heading?.parentElement?.querySelector('p')
    return { title: (heading?.textContent ?? '').trim(), body: (body?.textContent ?? '').trim() }
  })
}
