# B — Detector + browser evidence

Target: Nekibuki, `impeccable/critique` @ `a9952f7` (branch based on `impeccable/integration`)
Server: shared Vite dev server `http://localhost:5190` (not started/stopped by this worker) · API `http://localhost:8787` untouched
Browser: Google Chrome (channel `chrome`, Playwright `playwright-core` in the worktree) — args `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --autoplay-policy=no-user-gesture-required`
Context: viewport 390×844, `deviceScaleFactor: 2`, `isMobile: true`, `hasTouch: true`, `locale: en-US`, `permissions: ['geolocation','camera']`, geolocation 41.0054/28.9768. Fresh context per route/viewport/theme.
Viewports exercised: 390×844 (light + dark), 320×568, 768×1024, 1280×800, 844×390 (landscape)
Auth: mock flow — "Continue with Google" → "Continue" ×2 → "Start exploring". Demo routes `/report/demo-eiffel`, `/report/demo-blue-mosque`, `/report/demo-colosseum`.
Method: `impeccable detect` (CLI source, CLI URL, plus a read-only `--cdp` pass over 8 app states) + a 74-state scripted measurement matrix + 5 targeted gap-fill scripts (`gapfill*.mjs`, raw JSON in this run's root). No overlay was injected and no project file was modified.

---

## Detector

| Run | Command | Exit | Findings | Notes |
|---|---|---|---|---|
| Source | `impeccable detect src index.html --json` | 0 | 0 (`[]`) | 52 files scanned, **regex matching only (.css/.ts/.tsx)**. Human output: *"Rules that need a parsed page (tiny-text, low-contrast and other element rules) did not run on them; findings are an undercount, not a clean bill of health."* |
| URL | `impeccable detect http://localhost:5190/ --json` | 0 | 0 (`[]`) | 14.0 s. **Sees only the public login screen** (mock auth is not entered by the CLI scan). |
| URL (human mode) | `impeccable detect http://localhost:5190/` | 1 | — | stderr: `Error: Protocol error: connection closed (Trying to work with closed connection)`. JSON mode works, text mode aborts → treat the CLI URL scan as partially unreliable. |
| CDP (supplementary, read-only) | `impeccable detect --cdp 9333 --target <route> --json` over 8 states | 0–2 | **11** | Page read as found; nothing injected, nothing navigated by the detector. |

### CDP findings detail

| State | Exit | Rule | Severity | Selector | Snippet |
|---|---|---|---|---|---|
| login | 0 | — | — | — | 0 findings |
| onboarding-1 | 0 | `straggler` | advisory | `p.mt-3.max-w-[34rem]` | `"searching."` alone on last of 3 lines (24% of measure) |
| onboarding-3 | 0 | — | — | — | 0 findings |
| camera | 0 | `low-contrast` | advisory | `div.glass-dark.pointer-events-none` | `2.9:1 (need 4.5:1) — text #ffffff on #999996` |
| report-eiffel | 0 | `low-contrast` | advisory | `div.glass-dark.pointer-events-none` | `3.1:1 — text #ffffff on #94928d` |
| report-eiffel | 0 | `straggler` | advisory | `li.flex.gap-3:nth-of-type(3) > div.min-w-0 > p.mt-1.text-sm` | `"ground."` alone on last of 4 lines (17%) |
| report-eiffel | 0 | `straggler` | advisory | `li.flex.gap-3:nth-of-type(4) > div.min-w-0 > p.mt-1.text-sm` | `"shadow."` alone on last of 4 lines (19%) |
| report-eiffel | 0 | `low-contrast` | advisory | `article.relative.mx-auto > span.inline-flex.items-center` | `pixel contrast 4.2:1 median 4.2:1 (need 4.5:1) on img underlay, unread layer "Wrought-iron lattice tower"` |
| report-blue-mosque | **2** | `low-contrast` | **warning (failure)** | `article.relative.mx-auto > span.inline-flex.items-center` | `pixel contrast 3.3:1 median 3.3:1 (need 4.5:1) on img underlay, unread layer "Ottoman imperial mosque"` |
| report-blue-mosque | 0 | `low-contrast` | advisory | `div.glass-dark.pointer-events-none` | `3.1:1 — text #ffffff on #94928d` |
| report-blue-mosque | 0 | `straggler` | advisory | `p.mt-6.font-serif` | `"Mosque."` alone on last of 8 lines (24%) |
| report-blue-mosque | 0 | `straggler` | advisory | `article.w-[78vw].max-w-[320px]:nth-of-type(1) > p.mt-2.text-sm` | `"market."` alone on last of 4 lines (20%) |
| report-blue-mosque | 0 | `straggler` | advisory | `article:nth-of-type(3) > p.mt-2.max-w-[32rem]` | `"range."` alone on last of 8 lines (13%) |
| places | 0 | — | — | — | 0 findings |
| profile | 0 | — | — | — | 0 findings |

**Totals: 11 findings — 1 failure (severity `warning`, exit 2 on `/report/demo-blue-mosque`) + 10 advisory.**

### Detector false positives / caveats

- The source scan's `0` is **not** a clean bill of health: it only regex-scans `.css/.ts/.tsx` and never runs the element rules (tiny-text, low-contrast). The real element-level defects below are exactly the ones it could not see.
- The URL scan's `0` covers only the login screen. Every authenticated surface had to be reached with `--cdp`.
- The 4 `straggler` findings are typographic, not defects — they are correctly classified advisory.
- The `low-contrast` finding on `div.glass-dark.pointer-events-none` (`2.9:1` / `3.1:1`, white on a glass panel over a photo/video) is a **real but photo-dependent** failure: the same overlay measured `2.9:1` over the fake green camera feed and `3.1:1` over the Eiffel photo. A brighter photo makes it worse.
- The `pixel contrast` findings are the detector sampling actual pixels under the text: 3.3:1 for the "Ottoman imperial mosque" chip on the Blue Mosque photo and 4.2:1 for "Wrought-iron lattice tower" on the Eiffel photo — both below 4.5:1 for 12 px text.

---

## Measurement matrix

74 route × viewport × theme states were measured (76 keys in `evidence.json`, minus `touch-checks` and `reduced-motion`). Screenshots for every state are in `shots/evidence/`.

### 1. Console / page errors / failed requests

| Metric | Result |
|---|---|
| `console.error` entries | **0** in all 74 states |
| Uncaught page errors | **0** in all 74 states |
| Failed network requests | **0** in all 74 states |
| Extra runs (gap-fill scripts, 4 fresh contexts) | 0 console errors, 0 page errors |

### 2. Horizontal overflow

`documentElement.scrollWidth − innerWidth` = **0 in every one of the 74 states** (390×844 light+dark, 320×568, 768×1024, 1280×800, 844×390 landscape).

Elements whose bounding box extends past the viewport exist but are **not** overflow sources: they are off-screen carousel cards inside clipped snap containers, e.g. on `/report/demo-eiffel` at 390 px:
`div.mt-4 > div.relative > div.-mx-6.flex > article.shrink-0.snap-start:nth-of-type(2)` — left 340.19, right 644.38, width 304.19 (the next trivia card), with `overflow-x` clipping upstream. The 4 photo-dot markers and the trivia rail do not push the document.

### 3. Text below 12 px

| Font size | Text | Selector | States | bg / colour |
|---|---|---|---|---|
| 11.2 px | `Height` | `dl.mt-8.grid > div.min-w-0.rounded-2xl:nth-of-type(1) > dt.font-medium.text-foreground/70` | 13 | light `rgb(240,238,230)` card, `text-foreground/70` |
| 11.2 px | `Iron pieces` | same `dl`, `dt` #2 | 13 | same |
| 11.2 px | `Rivets` | same `dl`, `dt` #3 | 9 | same |
| 11.2 px | `Visitors` | same `dl`, `dt` #4 | 9 | same |

**4 unique strings, 11.2 px each** — the fact labels of the report's facts grid. They render at `0.7rem × 0.8` (Tailwind `text-xs` under a reduced root scale), i.e. 89 % of a 12.6 px base. Everything else on every route is ≥ 12 px. Note: the values (`330 m`, `18,038`) are 18 px, so only the *keys* are small.

### 4. Interactive targets below 44 × 44 CSS px

| Target | Box | Route | Note |
|---|---|---|---|
| `EN` (role=radio) | 47 × 34 | /profile | `h-9` segmented pill |
| `TR` (role=radio) | 46 × 34 | /profile | |
| `Auto` / `Light` / `Dark` (role=radio) | 57×34 / 60×34 / 58×34 | /profile | appearance segmented control |
| `Show again` | 93 × 34 | /profile | "Welcome slides" row |
| Haptics switch (role=switch) | 48 × 26 | /profile | `h-7 w-12` pill, **also unnamed** |
| `Open the camera` | 42 × 42 | /profile, /places | `size-11` = 44 minus border |
| `Your profile` | 43 × 43 | camera | `glass-dark … p-0.5` |
| `Places you looked at` | 42 × 42 | camera | |
| `Location on` | 116 × 42 | camera | `min-h-11` pill |
| chat textarea `Ask about Eiffel Tower…` | 306×42 / 236×42 / 612×42 | /report/*/chat | 42 px tall |

**Exclusions and a verified false positive.** Inline links in prose were excluded (none of the measured elements were prose links). The **"Viewfinder settings" button at 2 × 2 px** that the automated sweep flagged on all 12 camera states is a **false positive**: it is an `sr-only` control (`clip-path: inset(50%)`, `position: absolute`, off-screen at x=400). When focused it becomes a real 168 × 44 pill at (111, 66) with a 2 px outline — verified by keyboard (§8). Real small-target count = **10 unique**, of which 7 are 34–36 px tall pills, 3 are 42 px (2 px short).

### 5. Contrast

**Verified failures (solid effective background):**

| Text | Selector | Ratio | Route / theme |
|---|---|---|---|
| `·` (bullet glyph) | `article.relative.mx-auto > div.mt-2.flex > span.text-border:nth-of-type(2)` | **1.19:1** | all 10 report states, light |
| `·` (bullet glyph) | `… span.text-border:nth-of-type(4)` | **1.19:1** | light |
| `·` | same | **1.30:1** | dark |
| `Hold for settings` | `div.pointer-events-none.relative > div.group.relative > div.pointer-events-none.absolute > p.pointer-…` | **1.0:1** by my script / **2.9:1** by the detector's pixel sampler | camera, all 6 camera states |

The `·` separators are `text-border` decoration between metadata chips — decorative, not information. `Hold for settings` is real: white text with no scrim directly over the live viewfinder (fake green feed measured `#999996` by the detector → 2.9:1). Any bright photo makes it worse.

**Verified failures over an image underlay (detector pixel sampling):**
- `/report/demo-blue-mosque` — chip `"Ottoman imperial mosque"`, **3.3:1**, severity `warning`, exit code 2 → the only detector *failure*.
- `/report/demo-eiffel` — chip `"Wrought-iron lattice tower"`, **4.2:1**, advisory.
- `div.glass-dark.pointer-events-none` overlay text: **2.9:1** (camera), **3.1:1** (both photos).

**Uncertain (glass / `backdrop-filter` over photo or video — 11 unique, not guessed):**
`Location on`, `Swipe between camera, you and your places`, `Grid`, photo dots `1` `2` `3` `4`, `Tap the dots on your photo`, `The open lattice` (h3), `In the frame` (label), `18,038 iron pieces joined by 2.5 million rivets…`.

**False positives I had to correct (8 entries, all dark mode).** My first-pass script reported `rgb(0 0 0)` text on `rgb(48,48,46)` (1.59:1) for the facts-grid `dt` labels and the chat bubbles. A direct re-measure in a `colorScheme: 'dark'` context returned the true computed colour `oklab(0.981769 -0.000434458 0.00538999 / 0.7)` over `rgb(48,48,46)` ≈ **8.9:1** — the first pass mis-parsed `oklab()` as black. Same for the three chat messages (`rgb(250,249,245)` on `rgb(31,30,29)` ≈ 13.8:1) and the "Paris, France" / "1887–1889" / "High confidence" metadata (`rgb(163,161,153)` on `rgb(31,30,29)` ≈ 6.4:1). **These 8 are not defects.**

### 6. Images

| Field | Value (report route, hero photo) |
|---|---|
| `src` | `https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=960&q=80` |
| `srcset` | `…w=640&q=80 640w`, `…w=960&q=80 960w` — present |
| `sizes` | `100vw` |
| `naturalWidth × naturalHeight` | 389 × 259 |
| Rendered | 390 × 506.39 |
| Upscaled | **No** (naturalWidth 389 ≈ rendered 390) |
| `loading` / `decoding` | `auto` / `async` |
| `alt` | **`""` (empty)** — the hero photo that is the subject of the page has no text alternative; the `h1` carries the name, but the image itself is the content |

Only one `<img>` in the measured states; the camera preview is a `<video>`/canvas, not an image.

### 7. Resource payload

`performance.getEntriesByType('resource')` on `/report/demo-eiffel`, 390×844 light:

| Type | Count | transferSize | decodedBodySize |
|---|---|---|---|
| script | 72 | 144,401 B | 14,252,606 B |
| img | 1 | 60,255 B | 59,955 B |
| css | 1 | 300 B | 0 B |
| other | 1 | 300 B | 876 B |
| **total** | **75** | **205,256 B (200 KB)** | **14,313,437 B (13.6 MB)** |

Slowest 10: `…unsplash…w=960&q=80` 32.7 ms · `/src/main.tsx` 12.8 ms · `/theme-init.js` 12.6 ms · `/@vite/client` 12.5 ms · `/@react-refresh` 12.2 ms · `/src/components/ui/sheet.tsx` 9.5 ms · `/src/components/store/preferences.ts` 9.4 ms · `/src/components/report/trivia-carousel.tsx` 9.3 ms · `/src/components/ui/dialog.tsx` 9.3 ms · `/src/components/report/photo-hero.tsx` 8.6 ms.
`domContentLoaded` 152.5 ms, `load` 153.5 ms.
Render-blocking: **scripts** — only `/theme-init.js`. **Styles: none render-blocking** (Tailwind is inlined in dev).
Fonts: `Newsreader Variable` (variable, weight 200–800) — 5 faces, 1 `loaded`, 4 `unloaded` (unicode-range subsetting at work).
**Caveat: these are dev-server numbers** — 72 unbundled ES modules, `/@vite/client` alone decodes to 222 KB, `/@react-refresh` to 118 KB. Not representative of the production bundle. The one production-relevant number is the single 60 KB hero photo at 640/960 w with `sizes="100vw"`.

### 8. Focus, keyboard, dialogs

| Surface | Result |
|---|---|
| Login | `Continue with Google` — `outline: solid 2px rgb(15,95,87)`, `:focus-visible` ✔ |
| Onboarding 1–3 | `Skip` (44×44), dots `Step 1/2/3 of 3: …` (44×44 each), `Continue` (123×56) — all 2 px outlines ✔ |
| Camera | `Main screens` container, `Your profile` (46×46), `Location on` (123×44), `Places you looked at` — all 2 px outline + ring shadow ✔ |
| Report | `The open lattice`, `Three observation decks`, `The four base arches`, `The Seine below`, `Back`, `Remove from saved`, `Share`, `Delete` — all 44×44, 2 px outline ✔ |
| Places | `Open the camera`, search input (outline `none` computed but 2 px `rgb(15,95,87)` in the shorthand + focus ring shadow), `Saved places only`, place cards — all visible ✔ |
| Profile | `EN`, `Show again`, `Auto`, and the **unnamed** switch (45×26) — all had `outline: solid 2px` ✔ |

**Annotation dialog** (`role="dialog" aria-modal="true" aria-labelledby="_r_1_"`, opened by tapping the photo dot `The open lattice`):
- initial focus → `Close detail` button, `activeInside: true` ✔
- Tab trap → 8 consecutive `Tab` presses kept focus on `Close detail` (the dialog's only focusable), `focusStayed: true` ✔
- scroll lock → `getComputedStyle(document.body).overflow` = `hidden` during the dialog, back to `visible` after Escape ✔
- Escape → `dialogs: 0` ✔
- focus restore → `document.activeElement` = the `The open lattice` marker ✔
- Screenshot: `gap2-annotation-dialog--mobile--light.png`

**Camera settings trigger (hidden affordance):** reachable by `Tab` (found within 16 tabs from the deck container). Focused → the `sr-only` button becomes a **visible 168 × 44 pill at (111, 66)** with `outline: solid 2px rgb(15,95,87)` and `:focus-visible` ✔. `Enter` → dialog `[role="dialog"][aria-label="Viewfinder settings"]` opens, 84 × 58, focus inside ✔. `Escape` → closes ✔. Screenshots: `gap4-settings-trigger-focused--mobile--light.png`, `gap4-settings-open--mobile--light.png`.

**Deck keyboard:** dots are `You` / `Camera` / `Places` with `aria-current="page"` on the active one. `ArrowRight`: Camera → Places ✔; `ArrowRight` again → stays on Places (clamped, no wrap). `ArrowLeft`: Places → Camera → You ✔. No `ArrowRight` from Places wraps back to You — clamping is intentional-looking but undocumented.

### 9. Reduced motion (`reducedMotion: 'reduce'`)

| Surface | Measurement |
|---|---|
| Login | 1 element with a non-zero transition (`0.15s`) out of the whole `body *` tree; `matchMedia('(prefers-reduced-motion: reduce)').matches` = true ✔ |
| Onboarding | `h1` `animation-name: none`, `animation-duration: 0s`, `transition-duration: 0s` ✔ |
| Onboarding state change | h1 text still advances `Point at anything` → `The story, not the plaque` after `Continue` — **state change stays perceivable** ✔ |
| Camera | shutter present; `reduced-motion--camera--light.png` captured |
| Code-level | `photo-hero.tsx` uses `reduceMotion` branches that swap `y: 20 → 0` for `opacity` only, and `transition={{ duration: reduceMotion ? 0.01 : … }}` on the annotation panel. 0.01 s is effectively a kill switch, but because the accompanying change is opacity/visibility the information survives. |

### 10. Semantics

| Check | Result |
|---|---|
| `<html lang>` | `en` on every route ✔ |
| Duplicate `id`s | **0** in all 74 states ✔ |
| `h1` per route | login `A quiet guide for the places you walk past.`; onboarding 1/2/3 `Point at anything` / `The story, not the plaque` / `Ask, and come back later`; places `History`; profile `Ada Traveller`; report `Eiffel Tower` / `Blue Mosque` / `Colosseum` ✔ |
| `h1` count on `/` | **2** — `Ada Traveller` (profile panel) and `History` (places panel) are both mounted; the inactive one is `aria-hidden="true"` + `inert`, so only one is exposed to AT, but a DOM-level heading audit sees two `h1` |
| Landmarks | `/report/demo-eiffel`, `/report/demo-blue-mosque`, `/report/demo-colosseum` expose **only** `div[role="region"] "Trivia cards"` — **no `banner` / `navigation` / `main` / `contentinfo`**. `/` exposes `HEADER`, `FOOTER`, `HEADER` — **no `<main>` anywhere in the app** |
| `aria-current` | used correctly on the 3 deck dots (`page`) |
| `aria-pressed` | `Remove from saved` = `true` |
| `aria-expanded` | 4 photo-dot markers, all `false` in the closed state |
| `aria-live` | one `polite` region (`div#root > section`) |
| `aria-modal` / `role="dialog"` | annotation panel `aria-modal="true"` + labelled ✔; viewfinder settings `role="dialog" aria-label="Viewfinder settings"` ✔ |
| Buttons/links without an accessible name | **1** — the Haptics switch in Profile: `role="switch" aria-checked="true"`, **no `aria-label`, no `aria-labelledby`, no `id`, no wrapping `<label>`, no `label[for]`** → nothing names it |
| Inputs without a label | **2** — `input#history-search` (Places search: `aria-label` null, `aria-labelledby` null, `label[for]` null, only `placeholder="Search your places"`) and the chat `textarea.field-si` (no `aria-label`/`aria-labelledby`; the name resolves only from its placeholder `Ask about Eiffel Tower…`) |

### 11. PWA / theme

| Check | Result |
|---|---|
| `<link rel="manifest">` | **absent from the dev DOM** (`link[rel~="manifest"]` → null) |
| `GET /manifest.webmanifest` | **200** — the file is served (vite-plugin-pwa generates it) but nothing links it in dev |
| `theme-color` metas | 2, both with `media`: `(prefers-color-scheme: light)` → `#faf9f5`; `(prefers-color-scheme: dark)` → `#1f1e1d`. Values match the DESIGN.md paper/dark-paper pair ✔ |
| `theme-init.js` | present and render-blocking — the only render-blocking script |
| Service worker | `navigator.serviceWorker.getRegistrations()` → **0**, `controller` → null. `vite-plugin-pwa` `devOptions` are off, so no SW in dev |
| Offline capability | **not testable** without a production build or `devOptions.enabled` |

### 12. Touch / gesture (synthesized touch, Chrome CDP `Input.dispatchTouchEvent`)

| Gesture | Result | Evidence |
|---|---|---|
| Deck swipe **forward** from the Camera panel (x 340→32, 14 moves, 18 ms apart) | **Works** — Camera → Places, `aria-current="page"` moves | pointer trace: `pointerdown×1 → pointermove×14 → pointerup×1`, **no `pointercancel`** (`gap3-touch-swipe--mobile--light.png`) |
| Deck swipe **forward** from the **Profile ("You") panel** (x 340→32) at y = 200, 420, 500, 700 | **Fails — 5 independent attempts, the deck never advances** | pointer trace: `pointerdown@340 → pointermove@319 → **pointercancel@0** (target `H2.label-caps.px-4`) → lostpointercapture`. The deck's own `onPointerCancel` handler then springs back to the current index (`gapfill6.json`) |
| Deck back-swipe from Places (x 40→348) | Not observed to change the panel under a fast synthetic flick; momentum projection makes the synthetic flick ambiguous — **marked untested** | `gapfill4.json` |
| Long-press on the camera viewfinder (650 ms hold, touch) | **Works** — settings shelf opens: `aria-expanded="true"`, `role="dialog"`, text "Viewfinder settings", `aria-label` list `["Viewfinder settings"]` (`touch-longpress--mobile--light.png`) |
| Mouse drag on the deck | Works (Camera → Camera… → Places); confirms the gesture logic itself is sound, so the Profile failure is browser gesture arbitration, not app logic | `gapfill2.json` |

Root-cause hypothesis, verified against the code: the deck container sets `style={{ touchAction: 'pan-y' }}` (`src/components/layout/swipe-deck.tsx:299`) and the camera screen sets the same on its own hit surface (`src/screens/camera-screen.tsx:687`), but the two screens that are **scroll containers** do not: `src/screens/profile-screen.tsx:56` and `src/screens/history-screen.tsx:42` are `<section className="h-full overflow-y-auto overscroll-contain …">` with no `touch-action` of their own. Chrome promotes the gesture to a scroll and cancels the pointer on the first move, so `swipe-deck.tsx`'s `onPointerCancel` path runs instead of `onPointerUp`.

---

## Potential violations

1. **Deck swipe gesture does not work on the Profile panel** — `src/screens/profile-screen.tsx:56` (scroll container without `touch-action: pan-y`); the browser fires `pointercancel` on the first `pointermove`, so `swipe-deck.tsx:251` (`onPointerCancel`) snaps back. Reproduced 5× at 3 different y positions, with a pointer-event trace; the same gesture on the Camera panel succeeds with no `pointercancel`. WCAG 2.5.1 Pointer Gestures / 2.5.3 Label in Name adjacent; workaround = the page dots. Severity **P1**.
2. **`/report/demo-blue-mosque` — chip "Ottoman imperial mosque" at 3.3:1** over the photo underlay, 12 px text. Only detector *failure* in the whole run (exit 2). WCAG 1.4.3 AA. Severity **P1**.
3. **`/report/demo-eiffel` — chip "Wrought-iron lattice tower" at 4.2:1** over the photo underlay. WCAG 1.4.3 AA. Severity **P1**.
4. **Glass overlay text at 2.9:1 (camera) / 3.1:1 (report)** — `div.glass-dark.pointer-events-none` and the "Hold for settings" hint sit white-on-light with no scrim over a live feed/photo. WCAG 1.4.3 AA. Severity **P1**.
5. **Haptics switch has no accessible name** — `src/screens/profile-screen.tsx`, `role="switch" aria-checked="true"`, 48 × 26 px, no `aria-label` / `aria-labelledby` / `id` / `<label for>`. WCAG 4.1.2 AA, 1.3.1 A. Severity **P1**.
6. **Places search input has no accessible name** — `input#history-search`, placeholder-only (`"Search your places"`), no `aria-label`, no `label[for]`. WCAG 4.1.2 / 3.3.2. Severity **P1**.
7. **Chat textarea name comes from its placeholder** — `textarea.field-si`, no `aria-label`/`aria-labelledby`; the placeholder disappears once the user types. WCAG 4.1.2. Severity **P2** (verified by automated scan; needs a manual AT re-check).
8. **No `<main>` landmark anywhere; report routes have no `banner`/`navigation`/`contentinfo`** — only `div[role="region"] "Trivia cards"`. WCAG 1.3.1 A / 2.4.1 A. Severity **P2**.
9. **11.2 px fact labels** — `Height`, `Iron pieces`, `Rivets`, `Visitors` (`dl.mt-8.grid > dt.font-medium.text-foreground/70`), 4 unique strings in 13 states. No WCAG minimum size, but below the 12 px floor the brief measures and hard to read on a phone in daylight. Severity **P2**.
10. **10 interactive targets below 44 × 44** — 34 px language/appearance radios and `Show again`, 26 px Haptics switch, 42–43 px circular buttons, 42 px chat textarea. Passes WCAG 2.5.8 (24 px, AA) but fails 2.5.5 (44 px, AAA). Severity **P2**.
11. **Hero photo has `alt=""`** — `img.absolute.inset-0` on every report route; the image is the subject of the page. WCAG 1.1.1 A. Severity **P2**.
12. **Decorative `·` separators at 1.19:1** (`span.text-border`) between metadata chips, 10 states. Informational only if the chips read independently; otherwise 1.4.3. Severity **P3**.
13. **Two `<h1>` on `/`** — `Ada Traveller` and `History`, from the two mounted deck panels; the inactive one is `aria-hidden` + `inert`, so AT is unaffected. Severity **P3**.
14. **The "Viewfinder settings" control is 2 × 2 px when unfocused** — verified **not** a defect (it is `sr-only` and becomes a 168 × 44 focusable pill). Recorded as a *verified false positive* of the automated <44 px sweep so the coordinator does not double-count it. Severity **none**.
15. **8 dark-mode contrast "failures" from my own first-pass script** — verified **false positives** caused by mis-parsing `oklab()` colour as `rgb(0,0,0)`; re-measured live, the real ratios are 6.4:1–13.8:1. Severity **none**.

---

## Coverage gaps

- **No physical device.** Every touch result comes from Chrome's CDP `Input.dispatchTouchEvent` in an emulated 390 × 844 / DPR 2 / `hasTouch` context. The Profile-panel `pointercancel` is reproduced with a pointer-event trace, but whether iOS Safari behaves the same is untested.
- **Camera feed is Chrome's fake device** (solid green frame). Contrast over the viewfinder (finding 4) is measured against `#999996`; a real photo can be brighter or darker. HUD legibility over real-world imagery is untested.
- **Photo-underlay contrast** is limited to the two detector-sampled report photos (Eiffel, Blue Mosque). The 11 glass/backdrop-filter text nodes are marked *uncertain*, not guessed.
- **Service worker / offline**: the dev server registers no SW (`vite-plugin-pwa` `devOptions` off, 0 registrations, no controller). Installability and offline behaviour were not tested; the manifest is served (200) but not linked in dev, so installability is unverified.
- **Performance numbers are dev-server numbers** — 72 unbundled ES modules, 13.6 MB decoded, `/@vite/client` + `/@react-refresh` included. Production bundle size, LCP and INP are untested.
- **Text scaling / 200 % zoom** and `prefers-contrast` were not exercised.
- **`impeccable detect` human (text) mode on a URL fails** (`Protocol error: connection closed`); only JSON mode worked, and only for the login screen.
- **The `--cdp` detector pass covered 8 states**; the 4-point "Tap the dots on your photo" hint, the onboarding slides 2, and the Places saved-only empty state were measured by script only, not by the detector.
- The report route `/report/demo-colosseum` was measured for semantics/landmarks only; the full 74-state matrix covers demo-eiffel and demo-blue-mosque.

---

## SUMMARY

`DETECTOR: 11 findings (1 failure / 10 advisory) across 8 CDP states; CLI source scan 0 findings (regex-only, undercount); CLI URL scan 0 findings (login screen only); OVERFLOW: 0 routes; TINY: 4 unique text nodes at 11.2px; TARGETS: 10 unique below 44px (1 verified false positive); CONTRAST: 6 verified failures + 11 uncertain + 8 verified false positives; CONSOLE: 0 errors / 0 page errors / 0 failed requests in 74 states; FOCUS: pass — visible 2px outlines everywhere, annotation dialog traps Tab / locks scroll / restores focus on Escape, sr-only camera-settings trigger becomes a 168×44 focus pill`

Screenshots: `/private/var/folders/5y/j78v7y957cd228wlrx_ds47r0000gn/T/opencode/nekibuki-critique-2026-10-21/shots/evidence/`
Raw measurements: `evidence.json` (74-state matrix), `detect-cdp.json` (detector), `gapfill.json`, `gapfill2.json` … `gapfill6.json` (gap fills), `gapfill*.mjs` (re-runnable scripts).
