/**
 * Brand colour lab. Captures the same screens under every preset so the hues
 * can be compared side by side instead of in the abstract.
 *
 *   bun run dev:web                        # dev server on :5173 first
 *   SHOT_DIR=./shots/brand node scripts/brand-shots.mjs
 */
import { chromium } from 'playwright-core'
import { mkdir, readdir, writeFile } from 'node:fs/promises'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const outDir =
  process.env.SHOT_DIR ??
  '/private/var/folders/5y/j78v7y957cd228wlrx_ds47r0000gn/T/nekibuki-brand-lab'

const BRANDS = ['petrol', 'clay', 'okra', 'lapis', 'saffron']

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

const wait = (ms) => page.waitForTimeout(ms)

/** Set the preset both live and in storage, so full reloads keep it. */
const setBrand = async (brand) => {
  await page.evaluate((value) => {
    localStorage.setItem('nekibuki.brand', value)
    if (value === 'petrol') delete document.documentElement.dataset.brand
    else document.documentElement.dataset.brand = value
  }, brand)
  await wait(450)
}

const shot = async (name) => {
  await page.screenshot({ path: `${outDir}/${name}.png` })
  console.log('shot', name)
}

// ------------------------------------------------------------- login (brand moment)
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await wait(900)

for (const brand of BRANDS) {
  await setBrand(brand)
  await shot(`01-login-${brand}`)
}

// ------------------------------------------------------- get into the camera once
await setBrand('petrol')
await page.getByRole('button', { name: /Continue with Google/i }).click()
await wait(1100)

// The onboarding illustration is the loudest brand surface in the app.
for (const brand of BRANDS) {
  await setBrand(brand)
  await shot(`02-onboarding-${brand}`)
}

await setBrand('petrol')
for (let step = 0; step < 2; step += 1) {
  await page.getByRole('button', { name: /Continue/i }).click()
  await wait(800)
}
await page.getByRole('button', { name: /Start exploring/i }).click()
await wait(1600)

for (const brand of BRANDS) {
  await setBrand(brand)
  await shot(`03-camera-${brand}`)
}

// -------------------------------------------------- report on light paper, three photos
for (const [index, id] of ['eiffel', 'colosseum', 'blue-mosque'].entries()) {
  await page.goto(`${BASE}/report/demo-${id}`, { waitUntil: 'networkidle' })
  await wait(1500)

  for (const brand of BRANDS) {
    await page.evaluate(() => window.scrollTo(0, 0))
    await setBrand(brand)
    await shot(`0${4 + index}-report-${id}-${brand}`)
  }
}

// ------------------------------- the two places where the hue has to earn its keep
await page.goto(`${BASE}/report/demo-eiffel`, { waitUntil: 'networkidle' })
await wait(1500)

for (const brand of BRANDS) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await setBrand(brand)

  await page.getByRole('button', { name: 'Three observation decks' }).click()
  await wait(700)
  await shot(`07-report-marker-${brand}`)
  await page.getByRole('button', { name: 'Close detail' }).click()
  await wait(400)

  await page.mouse.wheel(0, 1050)
  await wait(800)
  await shot(`08-report-trivia-${brand}`)
}

// --------------------------------------------------------------------- dark mode
await page.goto(`${BASE}/report/demo-eiffel`, { waitUntil: 'networkidle' })
await wait(1500)
await page.evaluate(() => document.documentElement.classList.add('dark'))

for (const brand of BRANDS) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await setBrand(brand)
  await shot(`09-report-dark-${brand}`)
}

await browser.close()

// ----------------------------------------------------------------- contact sheet
const files = (await readdir(outDir)).filter((name) => name.endsWith('.png'))
const prefixOf = (name) => name.replace(new RegExp(`-(${BRANDS.join('|')})\\.png$`), '')
const prefixes = [...new Set(files.map(prefixOf))].sort()

const swatches = {
  clay: '#d97757',
  okra: '#9c6116',
  petrol: '#0f5f57',
  lapis: '#2a4c8f',
  saffron: '#c98a1c',
}

const sections = prefixes
  .map((prefix) => {
    const cells = BRANDS.map(
      (brand) => `<figure>
        <img src="${prefix}-${brand}.png" loading="lazy" alt="${prefix} in ${brand}">
        <figcaption><span class="dot" style="background:${swatches[brand]}"></span>${brand}</figcaption>
      </figure>`,
    ).join('\n')

    return `<section><h2>${prefix.replace(/^\d+-/, '')}</h2><div class="row">${cells}</div></section>`
  })
  .join('\n')

await writeFile(
  `${outDir}/index.html`,
  `<!doctype html>
<meta charset="utf-8">
<title>Nekibuki brand lab</title>
<style>
  :root { color-scheme: light; --paper:#faf9f5; --ink:#141413; }
  body { margin:0; padding:32px; background:var(--paper); color:var(--ink);
    font: 14px/1.5 ui-sans-serif, -apple-system, sans-serif; }
  h1 { font: 500 28px/1.1 ui-serif, Georgia, serif; letter-spacing:-.02em; margin:0 0 4px; }
  p.lead { color:#6b6a63; margin:0 0 32px; max-width:60ch; }
  section { margin-bottom:40px; }
  h2 { font: 500 15px/1.2 ui-sans-serif, sans-serif; text-transform:uppercase;
    letter-spacing:.08em; color:#6b6a63; margin:0 0 12px; }
  .row { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:12px; }
  figure { margin:0; }
  img { width:100%; border-radius:10px; box-shadow:0 0 0 1px #e8e6dc; display:block; }
  figcaption { display:flex; align-items:center; gap:6px; margin-top:6px;
    font-size:12px; letter-spacing:.04em; text-transform:uppercase; color:#6b6a63; }
  .dot { width:10px; height:10px; border-radius:50%; display:inline-block; }
  @media (max-width:900px) { .row { grid-template-columns:repeat(2, minmax(0,1fr)); } }
</style>
<h1>Nekibuki brand lab</h1>
<p class="lead">Same paper, same serif, same layout. Only the hue and its three roles
move: brand fill, brand ink and HUD over photography.</p>
${sections}`,
)

console.log('sheet', `${outDir}/index.html`)
console.log(
  'done —',
  errors.length ? `errors: ${JSON.stringify(errors.slice(0, 5), null, 2)}` : 'no console errors',
)
