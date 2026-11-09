/**
 * Wide-viewport layout check.
 *
 * The app is designed phone-first: the login and introduction surfaces were
 * built to fill the viewport, so on a laptop or tablet their text column sat
 * against the left edge while the profile surface already centred its content
 * at a 42rem reading measure (ADR-0001, DESIGN.md Layout). This check measures
 * that measure in a real browser, so a later layout change cannot quietly
 * stretch the column again.
 *
 *   bun run dev:web                          # dev server on :5173 first
 *   bun run layout:check                     # every surface
 *   bun run layout:check login               # one surface: login, introduction or profile
 *   BASE_URL=https://nekibuki.thecrafter.io bun run layout:check
 *
 * Naming a surface narrows the assertions to it, so a Story can run the check
 * while its sibling Story has not landed yet and still exit zero on its own
 * cases. With no argument every case runs, which is the whole-feature gate.
 *
 * A "column" is the element a surface centres its content in: the one carrying
 * `mx-auto` plus a `max-w-*` cap, or an explicit `data-layout-column` hook.
 * Cases:
 *
 *   layout/login-wide-column            centred ≤768px column, matching the profile column
 *   layout/onboarding-wide-column       the introduction header, slide area and footer, same bounds
 *   layout/profile-wide-column          the profile column stays at its base-commit 42rem
 *   layout/phone-gutters-no-overflow    20px gutter, no horizontal overflow on every surface
 *   layout/landscape-split              login and introduction keep their side-by-side split
 *   gate/no-console-errors              no console error or uncaught exception on the way
 *
 * Every surface is reached through the app's mock auth, which is the default
 * build: the introduction and profile are reached by seeding the demo user in
 * `localStorage`, never by a real account or provider call.
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'

/** Wide viewports from the test plan; the reading measure applies at 1024px and wider. */
const WIDE = [
  [1280, 800],
  [1024, 768],
  [1440, 900],
]
const PHONE = [
  [390, 844],
  [360, 640],
  [320, 568],
]
const LANDSCAPE = [844, 390]

const MAX_COLUMN = 768
const MARGIN_TOLERANCE = 2
const WIDTH_TOLERANCE = 1
const GUTTER = 20
const GUTTER_TOLERANCE = 1
/** Measured on the base commit ae51078: the profile surface caps at max-w-2xl, 42rem. */
const PROFILE_BASE_WIDTH = 672

/** Surfaces named on the command line; none means every surface. */
const SURFACES = ['login', 'introduction', 'profile']
const named = process.argv.slice(2)
const unknown = named.filter((name) => !SURFACES.includes(name))
if (unknown.length) {
  console.error(`Unknown surface: ${unknown.join(', ')}. Use ${SURFACES.join(', ')}.`)
  process.exit(2)
}
const wanted = (surface) => named.length === 0 || named.includes(surface)

const checks = []
const check = (id, ok, detail = '') => {
  checks.push({ id, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}${detail ? ` — ${detail}` : ''}`)
}
const round = (value) => Math.round(value * 10) / 10
const at = ([width, height]) => `${width}×${height}`

/** The demo session the app writes itself in mock mode; the email line is a plain marker, not an address. */
const DEMO_USER = {
  id: 'demo-traveller',
  name: 'Nekibuki',
  email: 'demo-account',
  avatarUrl: null,
  provider: 'demo',
}

/** Auto-accept the camera prompt: the shell mounts the camera behind the panels. */
const MEDIA_ARGS = [
  '--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
]

/**
 * Playwright tries the local Chrome first. A bare environment without it falls
 * back to its own download, and a sandboxed CI needs the single-process flags.
 */
async function launch() {
  let last
  for (const options of [
    { channel: 'chrome', args: MEDIA_ARGS },
    { args: MEDIA_ARGS },
    { args: [...MEDIA_ARGS, '--no-sandbox', '--single-process', '--no-zygote'] },
  ]) {
    try {
      return await chromium.launch(options)
    } catch (error) {
      last = error
    }
  }
  throw last
}

/** Seed the demo session on the current page; a reload then shows the surface. */
async function seed(page, onboarded) {
  await page.evaluate(
    ({ user, onboarded }) => {
      localStorage.setItem('nekibuki.demo-user', JSON.stringify(user))
      localStorage.setItem(
        'nekibuki.preferences',
        JSON.stringify({ state: { onboarded }, version: 0 }),
      )
    },
    { user: DEMO_USER, onboarded },
  )
}

/**
 * Measure one surface in the page. The root is the surface's own container, so
 * centring is judged against the space the surface actually has, not the
 * window (a classic scrollbar must not be read as an off-centre column).
 */
function measure(page, surface) {
  return page.evaluate(({ surface, marker }) => {
    const roots = {
      login: () => document.querySelector('main'),
      introduction: () => document.querySelector('header')?.parentElement ?? null,
      profile: () =>
        Array.from(document.querySelectorAll('section')).find((element) =>
          element.textContent?.includes(marker),
        ) ?? null,
    }

    const root = roots[surface]?.()
    if (!root) return { found: false }

    const visible = (element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
    }
    const rootRect = root.getBoundingClientRect()
    const isColumn = (element) =>
      element.hasAttribute('data-layout-column') ||
      (typeof element.className === 'string' &&
        element.className.includes('mx-auto') &&
        /(^|\s)max-w-/.test(element.className))

    const columns = Array.from(root.querySelectorAll('[data-layout-column], .mx-auto'))
      .filter(isColumn)
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          width: rect.width,
          left: rect.left - rootRect.left,
          right: rootRect.right - rect.right,
          // Where the column's own gutter starts: the first content edge.
          contentLeft: rect.left + parseFloat(getComputedStyle(element).paddingLeft || '0'),
        }
      })

    const heading = root.querySelector('h1')

    // Two blocks on one row: walk up from the heading until an ancestor holds
    // exactly two visible children that share a row. A stacked pair (title and
    // copy) is not a split, so the walk keeps going.
    const sideBySide = (a, b) => {
      const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      return overlap > 0 && (b.left >= a.right - 1 || a.left >= b.right - 1)
    }
    const hasSplit = () => {
      let node = heading?.parentElement ?? null
      while (node && node !== document.body) {
        const children = Array.from(node.children).filter(visible)
        if (
          children.length === 2 &&
          sideBySide(children[0].getBoundingClientRect(), children[1].getBoundingClientRect())
        ) {
          return true
        }
        node = node.parentElement
      }
      return false
    }

    return {
      found: true,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      columns,
      headingLeft: heading ? heading.getBoundingClientRect().left : null,
      split: hasSplit(),
    }
  }, { surface, marker: DEMO_USER.email })
}

const widest = (columns) => [...columns].sort((a, b) => b.width - a.width)[0] ?? null
const columnLabel = (column) =>
  column
    ? `${round(column.width)}px wide, margins ${round(column.left)}/${round(column.right)}`
    : 'no column found'

/** The bounds a wide-viewport column must satisfy, from the test plan. */
const centredWithin = (columns) =>
  columns.length > 0 &&
  columns.every(
    (column) =>
      column.width <= MAX_COLUMN &&
      Math.abs(column.left - column.right) <= MARGIN_TOLERANCE,
  )

/** Collect console errors and uncaught exceptions while the check runs. */
function watch(page, errors) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    // Artwork hosted elsewhere is not this check's subject; its availability is
    // proven by the image itself, not by the reading measure.
    if (/Failed to load resource/.test(message.text())) return
    errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
}

/**
 * Walk the three surfaces at one viewport: sign-in, introduction, profile.
 * The same page is reused so the walk costs one browser context per run.
 */
async function visit(page, [width, height]) {
  await page.setViewportSize({ width, height })

  await page.goto(BASE, { waitUntil: 'load' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'load' })
  await page.getByRole('button', { name: /Continue with Google/i }).waitFor()
  await page.waitForTimeout(400)
  const login = await measure(page, 'login')

  await seed(page, {})
  await page.reload({ waitUntil: 'load' })
  await page.getByRole('button', { name: /^(Skip|Continue)$/ }).first().waitFor()
  await page.waitForTimeout(400)
  const introduction = await measure(page, 'introduction')

  await seed(page, { 'demo-traveller': true })
  await page.reload({ waitUntil: 'load' })
  // The deck opens on the camera; the profile panel is the reference surface.
  await page.getByRole('button', { name: 'You', exact: true }).click()
  await page.getByText(DEMO_USER.email).waitFor()
  // The deck slides the panel in at a smaller scale; wait until its column has
  // stopped changing width, then measure the settled surface.
  await page.waitForFunction((marker) => {
    const section = Array.from(document.querySelectorAll('section')).find((element) =>
      element.textContent?.includes(marker),
    )
    const column = section?.querySelector('.mx-auto')
    if (!column) return false
    const width = column.getBoundingClientRect().width
    const previous = window.__settledWidth
    window.__settledWidth = width
    return typeof previous === 'number' && Math.abs(previous - width) < 0.5
  }, DEMO_USER.email)
  const profile = await measure(page, 'profile')

  return { login, introduction, profile }
}

const browser = await launch()
const context = await browser.newContext({
  viewport: { width: WIDE[0][0], height: WIDE[0][1] },
  locale: 'en-US',
  permissions: ['geolocation'],
  geolocation: { latitude: 48.8584, longitude: 2.2945 },
})
// The camera panel mounts behind the reading surfaces. This check is about
// their measure, so the viewfinder gets an empty stream instead of hardware:
// a machine without a camera must not decide a layout result.
await context.addInitScript(() => {
  if (!navigator.mediaDevices) return
  navigator.mediaDevices.getUserMedia = async () => new MediaStream()
})
const page = await context.newPage()
// The layout is the subject, not the choreography: reduced motion settles the
// deck's panel and slide transitions in a few frames, so the measurement does
// not race a spring.
await page.emulateMedia({ reducedMotion: 'reduce' })
const errors = []
watch(page, errors)

console.log(`layout check against ${BASE}\n`)

for (const viewport of WIDE) {
  const { login, introduction, profile } = await visit(page, viewport)

  const loginColumn = widest(login.columns)
  const profileColumn = widest(profile.columns)
  const introductionColumn = widest(introduction.columns)

  if (wanted('login')) {
    check(
      'layout/login-wide-column',
      centredWithin(login.columns) &&
        Boolean(loginColumn && profileColumn) &&
        Math.abs(loginColumn.width - profileColumn.width) <= WIDTH_TOLERANCE,
      `@ ${at(viewport)} login ${columnLabel(loginColumn)} vs profile ${columnLabel(profileColumn)}`,
    )
  }

  if (wanted('introduction')) {
    check(
      'layout/onboarding-wide-column',
      centredWithin(introduction.columns) &&
        Boolean(introductionColumn && profileColumn) &&
        Math.abs(introductionColumn.width - profileColumn.width) <= WIDTH_TOLERANCE,
      `@ ${at(viewport)} introduction ${columnLabel(introductionColumn)}`,
    )
  }

  if (wanted('profile')) {
    check(
      'layout/profile-wide-column',
      centredWithin(profile.columns) &&
        profile.columns.every(
          (column) => Math.abs(column.width - PROFILE_BASE_WIDTH) <= WIDTH_TOLERANCE,
        ),
      `@ ${at(viewport)} profile ${columnLabel(profileColumn)} (base ${PROFILE_BASE_WIDTH}px)`,
    )
  }
}

for (const viewport of PHONE) {
  const { login, introduction, profile } = await visit(page, viewport)

  const problems = []
  for (const [name, surface] of [
    ['login', login],
    ['introduction', introduction],
    ['profile', profile],
  ].filter(([name]) => wanted(name))) {
    if (!surface.found) {
      problems.push(`${name}: not found`)
      continue
    }
    const contentLeft = surface.columns.length
      ? Math.min(...surface.columns.map((column) => column.contentLeft))
      : surface.headingLeft
    if (contentLeft === null || Math.abs(contentLeft - GUTTER) > GUTTER_TOLERANCE) {
      problems.push(`${name}: first content edge ${round(contentLeft ?? -1)}px`)
    }
    if (surface.scrollWidth > surface.innerWidth) {
      problems.push(`${name}: scrollWidth ${surface.scrollWidth} > ${surface.innerWidth}`)
    }
  }

  check(
    'layout/phone-gutters-no-overflow',
    problems.length === 0,
    `@ ${at(viewport)}${problems.length ? ` — ${problems.join('; ')}` : ''}`,
  )
}

{
  const { login, introduction } = await visit(page, LANDSCAPE)

  if (wanted('login')) {
    check(
      'layout/landscape-split',
      login.found && login.split,
      `@ ${at(LANDSCAPE)} login two blocks on one row`,
    )
  }
  if (wanted('introduction')) {
    check(
      'layout/landscape-split',
      introduction.found && introduction.split,
      `@ ${at(LANDSCAPE)} introduction two blocks on one row`,
    )
  }
}

await browser.close()

check(
  'gate/no-console-errors',
  errors.length === 0,
  errors.length ? errors.slice(0, 3).join(' | ') : 'clean',
)

const failed = checks.filter((entry) => !entry.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
process.exit(failed.length ? 1 : 0)
