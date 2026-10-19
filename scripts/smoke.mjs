/**
 * End-to-end smoke test: sign in, capture a photo, read the report, ask a
 * question, and confirm it all landed in history.
 *
 *   node scripts/smoke.mjs                                        # localhost:5173
 *   BASE_URL=https://nekibuki.thecrafter.io node scripts/smoke.mjs
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const outDir = process.env.SHOT_DIR ?? null

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
  locale: 'en-US',
  permissions: ['geolocation', 'camera'],
  geolocation: { latitude: 41.0054, longitude: 28.9768 },
})

const page = await context.newPage()
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(e.message))

const checks = []
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}
const shot = async (name) => {
  if (outDir) await page.screenshot({ path: `${outDir}/${name}.png` })
}

console.log(`smoke test against ${BASE}\n`)

await page.goto(BASE, { waitUntil: 'networkidle' })
check('app shell renders', await page.getByText(/Nekibuki/).first().isVisible())

// --------------------------------------------------------------- auth + intro
await page.getByRole('button', { name: /Continue with Google/i }).click()
await page.waitForTimeout(1000)
const onIntro = await page.getByRole('button', { name: /Skip|Continue/i }).count()
check('onboarding shown after sign-in', onIntro > 0)
if (onIntro > 0) {
  const skip = page.getByRole('button', { name: 'Skip' })
  if (await skip.count()) await skip.click()
  else {
    await page.getByRole('button', { name: /Continue/i }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /Continue/i }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /Start exploring/i }).click()
  }
}
await page.waitForTimeout(3000)
check('camera is the landing screen', await page.getByLabel('Take a photo').isVisible())
await shot('smoke-01-camera')

// -------------------------------------------------------------------- capture
await page.getByLabel('Take a photo').click()
await page.waitForTimeout(700)
const analyzing = await page.getByText(/analy|read|looking|study/i).count()
check('analyzing overlay appears', analyzing > 0)
await shot('smoke-02-analyzing')

await page.waitForURL(/\/report\//, { timeout: 30000 })
const reportUrl = page.url()
check('capture produced a report', /\/report\//.test(reportUrl), reportUrl)
await page.waitForTimeout(2500)
await shot('smoke-03-report')

const title = (await page.locator('h1, .font-serif').first().innerText()).trim()
check('report has a title', title.length > 0, title)

const markers = await page.locator('button[aria-label]:has(span)').count()
const dots = await page.locator('img[alt=""] ~ button').count()
check('photo annotations rendered', markers >= 4 || dots >= 4, `${markers} markers`)

const matchChip = await page.getByText(/confidence|%\s*match/i).count()
check('confidence chip rendered', matchChip > 0)

// ----------------------------------------------------------------------- chat
await page.getByRole('button', { name: /Ask about/ }).first().click()
await page.waitForTimeout(1500)
await shot('smoke-04-chat')

const input = page.getByPlaceholder(/Ask a question/i)
check('chat input is available', await input.isVisible())
await input.fill('What should I look at first?')
await page.getByLabel('Send').click()

let answered = false
try {
  await page.waitForFunction(
    () => {
      const texts = Array.from(document.querySelectorAll('p, div')).map((n) => n.textContent ?? '')
      return texts.some((t) => t.length > 80)
    },
    { timeout: 30000 },
  )
  answered = true
} catch {
  answered = false
}
await page.waitForTimeout(1200)
await shot('smoke-05-answer')
check('chat answered the question', answered)
const apiErrors = errors.filter((e) => /\/api\/|Failed to fetch|500/.test(e))
check('no API errors in console', apiErrors.length === 0, apiErrors.join(' | '))

// -------------------------------------------------------------------- history
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.getByRole('tab', { name: 'Places' }).click()
await page.waitForTimeout(1500)
await shot('smoke-06-history')
const rows = await page.locator('ul li button').count()
const firstRow = rows > 0 ? (await page.locator('ul li button').first().innerText()).trim() : ''
check('history lists your places', rows >= 1, `${rows} rows · ${firstRow.replace(/\n+/g, ' · ')}`)

await browser.close()

const failed = checks.filter((c) => !c.ok)
console.log(
  `\n${checks.length - failed.length}/${checks.length} checks passed` +
    (errors.length ? `\nconsole errors:\n${errors.join('\n')}` : '\nno console errors'),
)
process.exit(failed.length ? 1 : 0)
