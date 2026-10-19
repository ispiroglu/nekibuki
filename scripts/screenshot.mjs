/**
 * Visual tour of the app. Captures screenshots of every screen and the main
 * report interactions into SHOT_DIR (default: a temp folder).
 *
 *   node scripts/screenshot.mjs            # dev server on :5173 must be running
 *   SHOT_DIR=./shots node scripts/screenshot.mjs
 */
import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const outDir =
  process.env.SHOT_DIR ??
  '/private/var/folders/5y/j78v7y957cd228wlrx_ds47r0000gn/T/nekibuki-shots'
await mkdir(outDir, { recursive: true })

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
  geolocation: { latitude: 48.8584, longitude: 2.2945 },
})

const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', (error) => errors.push(error.message))

const shot = async (name) => {
  await page.screenshot({ path: `${outDir}/${name}.png` })
  console.log('shot', name)
}

const wait = (ms) => page.waitForTimeout(ms)

// ---------------------------------------------------------------- auth + intro
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await wait(800)
await shot('01-login')

await page.getByRole('button', { name: /Continue with Google/i }).click()
await wait(1200)
await shot('02-onboarding-1')

await page.getByRole('button', { name: /Continue/i }).click()
await wait(900)
await shot('03-onboarding-2')

await page.getByRole('button', { name: /Continue/i }).click()
await wait(900)
await shot('04-onboarding-3')

await page.getByRole('button', { name: /Start exploring/i }).click()
await wait(1200)
await shot('05-camera')
await wait(6000) // let the swipe hint fade out
await shot('06-camera-clean')

// -------------------------------------------------------------------- history
await page.getByRole('tab', { name: 'Places' }).click()
await wait(1400)
await shot('07-history')

// ------------------------------------------------------------- report (in-app)
await page.getByRole('button', { name: /Blue Mosque/ }).first().click()
await wait(2000)
console.log('report url:', page.url())
await shot('08-report-hero')

const marker = page.locator('button[aria-label="Six minarets"]')
if (await marker.count()) {
  await marker.click()
  await wait(700)
  await shot('09-report-annotation')
  await page.getByRole('button', { name: 'Close detail' }).click()
  await wait(400)
}

await page.mouse.wheel(0, 950)
await wait(900)
await shot('10-report-trivia')

await page.mouse.wheel(0, 2600)
await wait(900)
await shot('11-report-details')

// report chat sheet
await page.getByRole('button', { name: /Ask about/ }).first().click()
await wait(1400)
await shot('12-report-chat')
await page.keyboard.press('Escape')
await wait(700)

// ------------------------------------------------------------------- profile
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await wait(1200)
await page.getByRole('tab', { name: 'You' }).click()
await wait(1200)
await shot('13-profile')

await page.getByRole('radio', { name: 'Dark' }).click()
await wait(1200)
await shot('14-profile-dark')

await page.getByRole('tab', { name: 'Places' }).click()
await wait(1000)
await shot('15-history-dark')

await page.goto(`${BASE}/report/demo-eiffel`, { waitUntil: 'networkidle' })
await wait(1800)
await shot('16-report-dark')

await browser.close()
console.log('done —', errors.length ? `errors: ${JSON.stringify(errors, null, 2)}` : 'no console errors')
