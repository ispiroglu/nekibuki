/**
 * Performance guard.
 *
 * The app has three places where a careless change quietly costs the user
 * frames: the photo pipeline (which must stay off the main thread), the
 * camera chrome (which must not frost a moving backdrop too hard) and the
 * analysing overlay (which must not paint a full-screen blur). This checks
 * all three in a real browser.
 *
 *   node scripts/perf-check.mjs                       # localhost:5173
 *   BASE_URL=https://nekibuki.thecrafter.io node scripts/perf-check.mjs
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
/** The most expensive frost the camera chrome is allowed to paint. */
const MAX_HUD_BLUR = 12

const browser = await chromium.launch({
  channel: 'chrome',
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ],
})

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  permissions: ['geolocation', 'camera'],
})

const page = await context.newPage()
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' && !/502|Failed to fetch/.test(m.text())) errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(e.message))

const checks = []
const check = (name, ok, detail = '') => {
  checks.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log(`performance check against ${BASE}\n`)

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /Continue with Google/i }).click()
await page.waitForTimeout(1200)
const skip = page.getByRole('button', { name: 'Skip' })
if (await skip.count()) await skip.click()
await page.waitForTimeout(3000)

check('camera is up', await page.getByLabel('Take a photo').isVisible())

// The tier decides how much the stylesheet may frost. It must be decided
// before the first paint, not after the camera opens.
const tier = await page.evaluate(() => document.documentElement.dataset.power ?? 'missing')
check('the power tier is set before the first paint', tier === 'full' || tier === 'lean', tier)

// The camera chrome sits over a moving backdrop, so a wide frost there is
// redrawn on every frame.
const frost = await page.evaluate(() => {
  const radii = []
  for (const node of Array.from(document.querySelectorAll('*'))) {
    const style = getComputedStyle(node)
    const filter = style.backdropFilter || style.webkitBackdropFilter || ''
    const match = filter.match(/blur\((\d+(?:\.\d+)?)px\)/)
    if (!match) continue
    const box = node.getBoundingClientRect()
    if (box.width < 8 || box.height < 8) continue
    radii.push({ radius: Number(match[1]), area: Math.round(box.width * box.height) })
  }
  return radii.sort((a, b) => b.radius - a.radius)
})
check(
  'the camera chrome keeps a cheap frost',
  frost.every((entry) => entry.radius <= MAX_HUD_BLUR),
  frost.length ? `widest ${frost[0].radius}px` : 'no frost at all',
)

// A filter on the live video layer is a full-screen filter pass per frame.
const videoFilter = await page.evaluate(() => {
  const video = document.querySelector('video')
  return video ? getComputedStyle(video).filter : 'none'
})
check('the live video carries no permanent filter', videoFilter === 'none', videoFilter)

// ------------------------------------------------------------------- capture
await page.evaluate(() => {
  window.__frames = []
  let last = performance.now()
  const tick = (now) => {
    window.__frames.push(now - last)
    last = now
    window.__raf = requestAnimationFrame(tick)
  }
  window.__raf = requestAnimationFrame(tick)
})

await page.getByLabel('Take a photo').click()
await page.waitForTimeout(1200)

const frames = await page.evaluate(() => {
  cancelAnimationFrame(window.__raf)
  return window.__frames
})
const longest = Math.round(Math.max(...frames, 0))
check('no long frame during the capture', longest < 100, `longest ${longest}ms`)

const workerUsed = await page.evaluate(() =>
  performance.getEntriesByType('resource').some((entry) => entry.name.includes('image.worker')),
)
check('the photo pipeline runs in the worker', workerUsed)

// The overlay must not paint a full-screen blur over the photograph.
await page.waitForTimeout(400)
const overlayBlur = await page.evaluate(() =>
  Array.from(document.querySelectorAll('img'))
    .filter((image) => {
      const style = getComputedStyle(image)
      return style.filter.includes('blur') && image.getBoundingClientRect().width > 300
    })
    .map((image) => getComputedStyle(image).filter),
)
check('no full-screen blur on the overlay', overlayBlur.length === 0, overlayBlur.join(' | '))

await page.waitForURL(/\/report\//, { timeout: 40000 })
await page.waitForTimeout(2000)
const markers = await page.locator('button[aria-label]:has(span)').count()
check('the report still renders with its markers', markers >= 4, `${markers} markers`)

// The long tail of the guide is skipped until it is scrolled to.
const lazySections = await page.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll('.lazy-paint'))
  return {
    count: nodes.length,
    skipped: nodes.filter((node) => getComputedStyle(node).contentVisibility === 'auto').length,
  }
})
check(
  'long content is painted lazily',
  lazySections.count > 0 && lazySections.skipped === lazySections.count,
  `${lazySections.skipped}/${lazySections.count} lazy`,
)

await browser.close()

const failed = checks.filter((c) => !c.ok)
console.log(
  `\n${checks.length - failed.length}/${checks.length} checks passed` +
    (errors.length ? `\nconsole errors:\n${errors.join('\n')}` : '\nno console errors'),
)
process.exit(failed.length ? 1 : 0)
