# Fix log — the scored critique, implemented

<!-- impeccable:critique 1 -->

Companion to [`critique-2026-10-21.md`](critique-2026-10-21.md) (27/40, 38 findings).
This file records what was changed for each finding, who changed it, and how the
change was verified.

- **Branch:** `impeccable/critique-fixes` (from `impeccable/critique` @ `98acde6`, itself from `impeccable/integration` @ `a9952f7`)
- **Merge:** `cbe655b` (six worker branches, file-disjoint, no conflicts)
- **Integration fixes by the coordinator:** `eefbe33` (camera "Places" shortcut name + smoke selector), `be955c1` (the visible settings trigger retires the long-press hint; swipe hint no longer covers the caption or the shelf)
- **Deployed:** Cloudflare Worker `nekibuki` → `nekibuki.thecrafter.io`, version `b7de7579-9edd-4d39-af7e-0cf411626849` (deployed from `master` after the branch was promoted)
- **Promoted:** `master` fast-forwarded to this branch and pushed to `origin/master` (`49a511c..636e618`)
- **Preserved:** the uncommitted work that was sitting in the `pwa` worktree is snapshotted as `wip/pwa-2026-10-21` (`8d7e48c`); that working tree was not touched
- **Verification:** `bun run typecheck` ✅ · `bun run build:only` ✅ · `bun run smoke` 12/12 against dev **and** against production ✅ · 16 coordinator checks against the live site ✅ · 0 console errors

## How the work was split

Six Orca workers, each owning a disjoint set of files, each implementing a slice of
the finding list and verifying its own measurements:

| Worker | Branch | Files owned | Findings |
|---|---|---|---|
| C1 | `ispiroglu/c1-deck-panels` | `swipe-deck.tsx`, `page-dots.tsx`, `swipe-hint.tsx`, `profile-screen.tsx`, `history-screen.tsx`, `ui/segmented.tsx`, `lib/utils.ts` | 1, 13, 15, 18, 27, 32, 33, 38 + the history half of 3 |
| C2 | `ispiroglu/c2-camera` | `camera-screen.tsx`, `capture/viewfinder-settings.tsx` | 2, 6, 11, 23 + the camera half of 18 |
| C3 | `ispiroglu/c3-report` | `report-screen.tsx`, `report/photo-hero.tsx`, `report/chat-panel.tsx`, `report/trivia-carousel.tsx`, `lib/api.ts` | 3, 4, 6, 9, 10, 12, 13, 14, 19, 20, 22, 29, 30, 32, 34, 35 |
| C4 | `ispiroglu/c4-semantics` | `ui/dialog.tsx`, `capture/analyzing-overlay.tsx`, `layout/shell.tsx`, `App.tsx`, `login-screen.tsx`, `screens/legal-screen.tsx` (new) | 7, 8, 16, 17, 26, 28, 38 |
| C5 | `ispiroglu/c5-theme-type` | `index.css`, `DESIGN.md`, `index.html`, `onboarding-screen.tsx`, `brand/logo.tsx` | 5, 6, 16, 21, 24, 25, 37 |
| C6 | `ispiroglu/c6-delivery` | `vite.config.ts`, `lib/image.ts`, `worker/index.ts` | 3, 4, 31 |

## Finding → change → evidence

### P1

| # | Fix | Measured evidence |
|---|---|---|
| 1 | Profile and Places scroll containers get `touch-action: pan-y`, so a horizontal drag is no longer stolen by the scroller and Chrome stops firing `pointercancel`. | CDP touch drag x 340→32 at y = 200/420/640: **14 `pointermove`, 0 `pointercancel`**, `aria-current` moves You→Camera. With the fix neutralised in-page the old defect reproduces exactly (pointercancel after 4–6 moves). Vertical drag still scrolls (scrollTop 0→279). |
| 2 | The viewfinder shelf gained a **visible 44×44 sliders button** in the camera HUD. The `sr-only` trigger is no longer the only path; the long-press remains a shortcut. | Trigger measured **44×44, visible** on the camera panel; the one-time "Hold for settings" chip was removed in `be955c1` because a visible target makes it redundant. |
| 3 | Hero and history thumbnails get an `onError` fallback: a muted tile with a 12 px muted caption or glyph, never the browser's broken-image glyph; the annotation dots and the tap-hint hide when the hero fails. | Shared pattern exported as `usePhotoFallback()` + `PHOTO_FALLBACK_SURFACE_CLASS` / `PHOTO_FALLBACK_CAPTION_CLASS` from `src/lib/image.ts`. |
| 4 | The chat failure bubble renders the **server's** message and code; `session_expired` offers "Sign in again", everything else "Try again". The API answers every error with `{ error, code }`. | Code table: `session_expired`, `bad_request`, `payload_too_large`, `unsupported_media_type`, `not_found`, `method_not_allowed`, `rate_limited`, `network_error`, `missing_key`, `invalid_key`, `blocked`, `empty_response`, `invalid_json`, `invalid_report`, `provider_error`, `analysis_failed`, `chat_failed`, `internal`. Verified with a wrangler error matrix (415/400/413/404/401/503). |
| 5 | The dark theme remaps the **fill** role, not only the ink role; every `[data-brand]` preset states its own dark fill. | `--brand` `#0f5f57` → **`#2f8f83`: 4.26:1** on `#1f1e1d` (was 2.22:1), ink on the new fill 4.72:1. |
| 6 | Text over photography gets a real scrim or a solid chip. | `.glass-dark` scrim raised to `rgba(14 14 13 / .62)` → **5.4:1** over a blown-out sky, 6.8:1 over a mid-bright wall. The report kind chip is now a solid muted chip (`rgb(240,238,230)` with brand ink `rgb(15,95,87)`), no longer a 15% wash over the image. |
| 7 | The analysing overlay traps focus (the background goes inert), keeps `aria-modal="true"` honest, and returns focus to the shutter when it ends. | Tab no longer walks into the camera chrome; focus lands back on the shutter that was pressed. |
| 8 | The delete dialog's × keeps a visible focus ring and a ≥44×44 hit area. | Measured **85×44** with `outline` present (was 28×28 with `outline: none`). |
| 9 | The hero height responds to the viewport height instead of a fixed 420 px floor. | At 844×390 the h1 measures **157→207** with the chat bar starting at **326** (was 360→408 with the bar at 314 — 30 px of the title was covered). The summary is on the first screen. |
| 10 | The display type is fluid and breakable, so 200% text reflows instead of widening the page. | At 320×568 and 360×640 with `html { font-size: 200% }`: `scrollWidth` **320 / 360** (was 377). |
| 11 | The camera HUD is sized in px, so a 200% root size cannot deform it. | Shutter **80×80, ratio 1.000** at 200% (was 81×160); "Open places" ends at **308 / 320**, fully on screen. |
| 12 | The annotation sheet now earns its place: it shows the cropped region of the photograph around the marker with a "Read in the guide →" link to the matching numbered item. | The sheet no longer duplicates the list entry verbatim. |
| 13 | The Haptics switch, the Places search input and the chat textarea all carry a real accessible name. | `aria-labelledby="profile-haptics-label"`, `aria-label="Search your places"`, `aria-label="Ask about this place"` (verified live on production). |

### P2

| # | Fix |
|---|---|
| 14 | The report header cluster is px-sized with a fixed gap; markers are never hidden behind the action bar at 200% text. |
| 15 | Segmented controls and "Show again" are **44 px** tall at every viewport (were 36 px). |
| 16 | The analysing progress bar stops looping under `prefers-reduced-motion` (static track + `role="progressbar"`), and `src/index.css` gained a global reduced-motion fallback. |
| 17 | The live region announces once (`aria-atomic` dropped) and the dialog has an `aria-describedby`. |
| 18 | One destination, one name, one icon: the panel heading is "Places", the third page-dot is a `Bookmark`, the camera shortcut matches, and the swipe hint reads "Swipe between the camera, your profile and your places". |
| 19 | The reference prose is 16–17 px and capped at the reading measure (was 14 px and uncapped, up to 79.7 ch). |
| 20 | The measure widens under 360 px and the prose gets `text-wrap: pretty`. |
| 21 | The type scale is a declared ramp in `DESIGN.md` and `@theme`: title 30 / headline 24 / lede 22 / value 18 / reading 17 / body 16 / list 15 / ui 13 / label 12 / meta 11.2. |
| 22 | The place name is the first text read; the kind chip moved below it and the meta row no longer breaks with a dangling "·". |
| 23 | The camera gained a persistent framing guide (four HUD-mint brackets) and a persistent "Point at one thing" caption. |
| 24 | The onboarding mark renders at full strength inside the bracket and all three art pieces sit at one optical width (208 px). |
| 25 | The clay fill is `#c25f3f` — **3.98:1** on paper (was 2.96:1) — with the measured ratios documented next to the Anti-Terracotta rule. |
| 26 | `/terms` and `/privacy` exist as real pages with honest copy (what the app stores locally, what it sends to the vision provider); the login sentence is a real link pair. |
| 27 | History dates collapse to one axis: "Today, 17:51", "Yesterday", "N days ago", "13 Oct". |
| 28 | The shell exposes a `<main>` and the panel switcher is a `navigation` landmark. |
| 29 | The hero photo carries a real `alt`. |
| 30 | The fact-grid labels are ≥12 px. |

### P3

| # | Fix |
|---|---|
| 31 | The service worker no longer precaches the lazy Supabase chunk or the Newsreader `latin-ext`/`vietnamese` subsets: **precache 27 files / 412.0 KiB gzip → 24 files / 311.8 KiB gzip (−100.2 KiB over the wire)**. The PWA manifest now carries media-scoped light/dark `theme_color` and `background_color`. |
| 32 | The trivia carousel shows a clean sliver and has a progress control; "Sign out" is ink again, only "Clear my places" is destructive red. |
| 33 | The Places/Profile header collapses to a single row under `max-height: 480px` — **68 px** in landscape (was 184 px, 47% of the screen). |
| 34 | The 320 px report shows the summary on the first screen (the height-aware hero floor). |
| 35 | The decorative "·" separators use a visible muted colour. |
| 36 | The swipe deck's focusable group has a visible focus ring and a hint that arrow keys switch screens. |
| 37 | The HUD rule is stated where the tokens live: a HUD fill always takes `--hud-fg`, never white. |
| 38 | Exactly one `h1` per route: the panels take an optional `active` prop and the shell passes it. |

## Verification performed against the live site

`bun run smoke` — **12/12** on `https://nekibuki.thecrafter.io`, no console errors.
Coordinator checks (Playwright + Chrome, production build):

```
PASS  dark --brand fill >= 3:1 on the dark page — #2f8f83 on #1f1e1d = 4.26:1
PASS  report reflows at 200% text on a 320px phone — scrollWidth 320 / innerWidth 320
PASS  camera shutter stays a circle at 200% text — 80x80 ratio 1
PASS  camera "Open places" stays on screen at 200% text — right 308 / 320
PASS  touch swipe advances the deck from the You panel — Camera -> Places
PASS  haptics switch has an accessible name — profile-haptics-label
PASS  search input has an accessible name — Search your places
PASS  delete dialog close button has a focus indicator — box 85x44
PASS  delete dialog close button is >= 44px
PASS  Terms and Privacy are real links — /terms, /privacy
PASS  /terms renders
PASS  camera settings trigger is a visible control — 44x44 visible=true
PASS  no console errors across the run
```

Landscape (844×390): h1 **157→207**, chat bar **326→390** — the title is clear.
Report chat: `textarea` → `aria-label="Ask about this place"`.
Report kind chip: `rgb(15,95,87)` on a solid `rgb(240,238,230)` chip — no longer text over the photograph.

## Residual risks and what is still untested

- **Real devices.** Every touch result is emulated through Chrome CDP
  `Input.dispatchTouchEvent`; iOS Safari behaviour is unverified. The pointer-cancel
  defect was browser gesture arbitration, which may differ on iOS.
- **The camera feed is Chrome's fake device** (solid green). HUD legibility over real
  photography is still unproven, and the shelf's contents change with device capability
  (the fake device reports no torch and one zoom preset).
- **Service worker and offline installability** were not exercised in a browser; the
  precache list was verified by reading the built `sw.js`.
- **The vision provider was the deterministic mock** in every run — the Gemini path was
  read from source only.
- **The annotation crop** (finding 12) now shows the region around the marker; whether
  the stored reference coordinates are accurate for every seeded report was not audited
  report by report.
- `impeccable detect` still reports the source as clean because the source scan is
  regex-only; the element-level rules need a running page (and, for authenticated
  routes, a CDP session).
