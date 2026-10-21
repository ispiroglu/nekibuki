# Impeccable audit — workstreams

Baseline: `impeccable/baseline` (snapshot of the working tree on 2026-10-21).

How this list was produced:

- `impeccable detect src index.html` → **0 regex findings** across 51 files.
- `impeccable detect http://localhost:5173/` → **0 rendered findings** on the public login screen.
- Design review of the remaining screens (report, trivia, chat, history, profile, camera,
  onboarding) against Impeccable's `audit`, `distill`, `typeset`, `adapt`, `harden`, `polish`,
  `clarify` and `optimize` criteria, using the 390×844 screenshot tour.
- The detector is clean, so these are design and interaction findings, not lint failures.
  Do not "fix" the detector; fix the behaviour described here.

Every workstream below owns a disjoint set of files. Do not edit files outside your set. Do not
edit `DESIGN.md`, `PRODUCT.md`, `docs/`, `package.json`, `src/index.css` (except the brand
workstream), or another workstream's screens. The coordinator runs the integration pass.

Severity: **P1** = correctness/accessibility blocker, **P2** = visible quality problem,
**P3** = polish.

---

## WS1 — `impeccable-brand` — brand surface & PWA metadata

**Owns:** `src/index.css`, `src/lib/brand.ts`, `src/components/dev/brand-lab.tsx`,
`src/components/brand/logo.tsx`, `src/components/layout/appearance-sync.tsx`, `index.html`,
`vite.config.ts`, `public/icon.svg`, `public/icon-maskable.svg`, `public/favicon.svg`,
`public/mask-icon.svg`, `scripts/generate-icons.mjs`, `README.md`.

**Goal:** the installed app, browser chrome, icons and token roles all agree with `DESIGN.md`
(petrol default). The colour lab stays available but is no longer the identity.

- **BR-1 (P1) — PWA surface still Anthropic-era colours.**
  `index.html` uses `theme-color` `#f6f2e9` / `#171512` and `mask-icon` `#bd5b3d`;
  `vite.config.ts` sets `theme_color` and `background_color` to `#f6f2e9`; `public/icon.svg`,
  `public/favicon.svg` use `#f6f2e9` + `#bd5b3d`; `public/icon-maskable.svg` is solid `#bd5b3d`.
  Move them to the documented roles: paper `#faf9f5`, dark paper `#1f1e1d`, brand `#0f5f57`,
  brand foreground `#f2fbf8`. Regenerate the PNG icons with the existing script (or update the
  script if it hardcodes the old palette) and verify the maskable icon still has safe-zone
  padding.
- **BR-2 (P1) — pinch zoom is blocked.**
  `index.html` viewport has `maximum-scale=1, user-scalable=no`. Remove both while keeping
  `viewport-fit=cover`; WCAG 1.4.4 requires zoom. Verify the camera HUD still behaves when the
  page is zoomed.
- **BR-3 (P2) — `theme-color` ignores the in-app appearance.**
  `appearance-sync.tsx` toggles `.dark` but the meta tags only respond to
  `prefers-color-scheme`. When the user chooses light/dark explicitly, update the matching
  `theme-color` meta so the status bar does not flash the wrong colour; leave `auto` on the
  media-query pair. Keep it in sync on mount and on change.
- **BR-4 (P2) — role-token audit.**
  Grep for `--clay`, `text-clay`, `bg-clay`, `border-clay` and any raw `#d97757` / `#bd5b3d`.
  Migrate meaning to `brand` / `brand-ink` / `brand-fg` / `hud` / `hud-fg`; keep `clay` only as
  the explicit `[data-brand='clay']` experiment. Confirm the focus ring uses `--brand-ink`, the
  avatar/badge/send use `brand-fg` for ink on a brand fill, and photo marks use HUD.
- **BR-5 (P3) — README and lab defaults.**
  The README already lists the presets; verify it says petrol is the default, clay is the
  experiment, and `?brandlab=1` is dev-only. Check the lab never ships in production
  (`import.meta.env.DEV`).

**Acceptance:** production build has no `#bd5b3d`, `#f6f2e9`, or `#171512` outside historical
comments; installed manifest and icons show petrol; viewport allows zoom; `tsc` + `build:only`
pass; `impeccable detect` stays clean.

---

## WS2 — `impeccable-camera` — quiet the viewfinder

**Owns:** `src/screens/camera-screen.tsx`, `src/components/capture/*`, `src/lib/image.ts`
(only if capture resizing needs it — do not add responsive-photo helpers here; report owns that).

**Goal:** the camera reads as a viewfinder with a shutter, not a control panel. Keep every
capability, remove the clutter.

- **CAM-1 (P2, distill) — too many controls at rest.**
  At rest the screen shows: profile, torch, grid, history, location chip (+ options), zoom
  presets, gallery, shutter, flip, and the three-item bottom deck. Consolidate to at most six
  visible controls: keep shutter, gallery, flip, location, history and profile; put torch +
  grid behind one small "viewfinder settings" popover or a long-press on the viewfinder; reduce
  the zoom strip to a single 1×/2× toggle or pinch-only with a transient indicator. Do not
  remove functionality — relocate it. All targets stay ≥44×44px.
- **CAM-2 (P2, polish) — HUD marks disappear on bright scenes.**
  The viewfinder ring, zoom pill and glass chips rely on white over a dark scrim. Review against
  a white-sky photo (the seeded Eiffel/Blue Mosque shots are fine) and add a 1px dark companion
  ring or a slightly stronger scrim where white-on-white occurs, mirroring the annotation
  marker treatment in `photo-hero.tsx`.
- **CAM-3 (P2, harden) — analysing overlay is silent to assistive tech.**
  `analyzing-overlay.tsx` rotates progress messages and renders an error, but has no live
  region. Add `role="status"` + `aria-live="polite"` for the rotating copy, `role="alert"` for
  the error, and a stable accessible label ("Analyzing photo"). Keep Cancel reachable by
  keyboard and do not let the rotating text steal focus.
- **CAM-4 (P3, adapt) — fixed HUD offsets on short screens.**
  Verify at 320×568, 390×844 and 430×932, in portrait and landscape: the location chip, zoom
  control, gallery, shutter and flip must not overlap, and all must sit inside safe areas.
  Replace fixed `top-*`/`bottom-*` pixel offsets with flex/grid rows where that removes the
  overlap.
- **CAM-5 (P3, clarify) — denied-permission copy.**
  The denied state currently explains two states in one block. Tighten it to one sentence plus
  one primary action ("Choose from gallery") and one secondary ("How to enable the camera"),
  keeping the inline settings guidance. Do not add a new modal.

**Acceptance:** ≤6 visible controls at rest, all features reachable; no overlap at 320×568;
live regions announce analysis and errors; reduced motion respected; `tsc`/`build:only` pass.

---

## WS3 — `impeccable-report` — report reading & annotation

**Owns:** `src/screens/report-screen.tsx`, `src/components/report/*`, `src/lib/image.ts`,
`shared/schema.ts` (only if a type needs a non-breaking optional field — avoid schema changes).

**Goal:** the report feels like a printed guide with photo evidence; the annotation sheet is a
real dialog; images stop shipping desktop pixels to phones.

- **REP-1 (P1, harden) — annotation sheet is not a real dialog.**
  `photo-hero.tsx` already restores focus to the marker and handles Escape, but the panel lacks
  `aria-modal`, focus trapping, initial focus and background scroll lock. Add `aria-modal="true"`,
  focus the close button on open, cycle Tab within the panel, lock body scroll while open, and
  restore focus on close. Keep the backdrop click-to-close.
- **REP-2 (P2, distill) — stacked metadata pills.**
  The header shows location, confidence and a separate "Saved" chip. Merge location, era and
  confidence into one meta row; move save to a 44×44 icon button with `aria-pressed` and a
  bookmark that fills when saved. Remove the duplicate "Saved" chip. Keep the "Saved to your
  places" toast.
- **REP-3 (P2, typeset) — 11px reference numbers.**
  Reference dots are `size-6` with `text-[11px]`. Raise to 12px in a 28px dot, keep the brand
  fill/foreground, and align the reference title/body rhythm. Check 320px width and long
  reference titles.
- **REP-4 (P2, distill/typeset) — trivia is a card in a card with two counters.**
  Simplify: one card surface, the counter integrated as a label (`1 of 4` or dots), no second
  floating counter. On ≥768px lay the four cards out as a 2×2 grid; on mobile keep the
  horizontal snap scroller. Preserve exactly four cards, keyboard access and swipe. The
  container already has `role="region"` + `aria-label`; add `aria-roledescription="carousel"`
  only if it remains a carousel on mobile.
- **REP-5 (P2, optimize) — hero image ships desktop pixels.**
  `photo-hero.tsx` requests a single Unsplash URL at 1600w with no `srcset`/`sizes` and no
  priority hint. Add a helper in `src/lib/image.ts` that builds `srcset` at 640/960/1280/1600
  (respecting the existing Unsplash params), set `sizes="100vw"`, add `width`/`height` or a
  fixed aspect wrapper to prevent CLS, and `fetchpriority="high"` for the hero. Do not change
  the stored photo URL or the schema.
- **REP-6 (P3, clarify/adapt) — chat input details.**
  The send button is `size-10` (40px); raise it to 44px. Change the placeholder from
  "Ask a question…" to something place-aware ("Ask about the Blue Mosque…") using the report
  location. Keep the existing error/retry path and the disabled state; do not add streaming.

**Acceptance:** keyboard-only annotation open/close with focus trapped and Escape; no scroll
behind the sheet; saved state has one control; reference numbers ≥12px; hero uses `srcset` and
no CLS; send target 44px; `tsc`/`build:only` pass; `impeccable detect` on changed files clean.

---

## WS4 — `impeccable-places` — Places, Profile, deck navigation

**Owns:** `src/screens/history-screen.tsx`, `src/screens/profile-screen.tsx`,
`src/components/layout/*`, `src/components/ui/*` (only if a primitive genuinely needs it).

**Goal:** Places and Profile feel deliberate on tablets/desktop and honest about saved state,
without changing the mobile composition.

- **PLC-1 (P2, adapt) — edge-to-edge content on wide screens.**
  `history-screen.tsx` and `profile-screen.tsx` have no max width, while the report is capped at
  42rem. Add a shared content column (`mx-auto w-full max-w-2xl`, or 3xl for history) inside the
  scroll container, keep the sticky glass header aligned to the same column, and leave the
  mobile layout untouched. Do not change the shell's full-bleed camera.
- **PLC-2 (P2, optimize) — thumbnails request full-size photos.**
  History rows render a 72px thumbnail from the original Unsplash URL (often 1600w). Add a
  local `thumbUrl(url, width)` helper in `history-screen.tsx` that rewrites the `w=` param
  (e.g. 160/240) and adds `srcset`/`sizes`, `width`/`height`, `loading="lazy"` and
  `decoding="async"`. The report workstream owns the shared helper; keep this local and the
  coordinator will consolidate.
- **PLC-3 (P2, polish) — saved state is invisible in the list.**
  Rows show a comment count but no saved marker. Add a small filled bookmark for saved guides,
  include it in the row's accessible name ("Blue Mosque, saved"), and make the saved-only filter
  state unmistakable (filled icon + `aria-pressed` already exists). Check the empty and
  no-search-results states still read well.
- **PLC-4 (P3, adapt/a11y) — deck is pointer-only on desktop.**
  Add Left/Right arrow key navigation to the shell for switching panels when focus is not in an
  input/textarea, and make off-screen panels inert or `aria-hidden` so Tab does not land in a
  panel the user cannot see. Keep the page-dot buttons and their `aria-current`.
- **PLC-5 (P3, polish) — profile rhythm and nav clearance.**
  Verify the last row clears the floating nav at scroll end on 390×844 (the container has
  `pb-28`; confirm with a scrolled screenshot). Separate "Clear my places" from the install row
  and keep the destructive confirm dialog. Do not redesign the stats or settings groups.

**Acceptance:** at 768px+ content is centred at a readable width; thumbnails ≤240w; saved rows
are announced; arrow keys switch panels; no focus in hidden panels; profile scroll end clears
the nav; `tsc`/`build:only` pass.

---

## WS5 — `impeccable-onboarding` — first run & sign-in

**Owns:** `src/screens/onboarding-screen.tsx`, `src/screens/login-screen.tsx`,
`src/screens/auth-callback-screen.tsx`, `src/App.tsx` (routing only if needed).

**Goal:** the first three minutes feel calm and legible; failures are recoverable.

- **ONB-1 (P2, typeset) — 9.6px labels.**
  Onboarding fact labels use `text-[0.6rem]` (9.6px), below the 12px floor in `DESIGN.md`. Raise
  to at least `0.7rem` (11.2px), ideally `0.75rem`, preserve the wide tracking, and rebalance
  the fact grid so long values do not wrap awkwardly at 320px.
- **ONB-2 (P2, a11y) — step state is not announced.**
  The dots have `aria-label="Slide N"` but no current state. Add `aria-current="step"` and a
  visually hidden "Step X of 3" (or an `aria-live="polite"` step announcement). Keep the 44px
  dot targets and the Continue button as the non-swipe path.
- **ONB-3 (P3, clarify) — sign-in failure surface.**
  `auth-callback-screen.tsx` already handles failure with `role="alert"` and retry; verify the
  login screen surfaces an OAuth error instead of silently returning, and that both retry paths
  call the same `signIn`. Keep Google as the only provider.
- **ONB-4 (P3, polish) — long names and small screens.**
  "Welcome, {firstName}." has no truncation. Add a max width/`truncate` with the full name in a
  `title`, and verify the longest seeded name at 320px. Do not shrink the type below the
  `display` scale.
- **ONB-5 (P3, adapt) — first-run layout at 320×568 and landscape.**
  The art, headline, body and Continue row must all be reachable without scrolling; scale the
  art down before the copy. The Skip and Continue targets stay ≥44px and inside safe areas.
  Reduced motion must keep the slide change understandable.

**Acceptance:** no text below 12px; current step announced; failure has a visible retry; 320×568
and landscape fit without clipping; `tsc`/`build:only` pass; `impeccable detect` clean.

---

## Integration pass (coordinator, after all workers settle)

1. Read each worker's summary; confirm every finding above has a disposition.
2. Merge the five branches into an integration branch based on `impeccable/baseline`; resolve
   only mechanical conflicts (imports, helper duplication).
3. Consolidate the two photo-URL helpers into `src/lib/image.ts`; one source of truth.
4. Run `tsc`, `bun run build:only`, `bun run smoke`, and the screenshot tours at 390×844,
   320×568 and 768×1024; re-run `impeccable detect` on `src` and the running app.
5. Update `DESIGN.md` only if a worker introduced a rule the document does not already state.
6. Report the diff, the verification evidence, and anything intentionally left out.

---

## Delivered — 2026-10-21

Integration branch: `impeccable/integration`, based on `impeccable/baseline`.

| Workstream | Branch | Commit |
| --- | --- | --- |
| WS1 brand | `ispiroglu/impeccable-brand` | `5f7df6c` |
| WS2 camera | `ispiroglu/impeccable-camera` | `49a511c`, hint fix `2dffb4a` |
| WS3 report | `ispiroglu/impeccable-report` | `f7a8dd6`, hint fix `a854bc4` |
| WS4 places | `ispiroglu/impeccable-places` | `a897374` |
| WS5 onboarding | `ispiroglu/impeccable-onboarding` | `4446565` |

Integration-only commits:

- `dbd786b` — document the full type/photo ramp in `DESIGN.md`; point the brand
  contact sheet at petrol instead of clay.
- `3caa577` — one `photoAtWidth` helper in `src/lib/image.ts`, used by the report
  hero and the history thumbnails.
- `ea37a6a` — smoke test follows the new place-aware chat placeholder.

Verification:

- `bun run typecheck` (generated Worker types + app/worker/node configs) — pass.
- `bun run build:only` — pass.
- `bun run smoke` — 12/12 checks, no console errors.
- `impeccable detect src index.html` → 0 findings; rendered login → 0 findings.
- Screenshot tours at 390×844 (light/dark), 320×568, 768×1024 and 1280×800:
  no horizontal overflow, no console errors. Camera hint and report hint measured
  against their controls: zero overlap at 390 and 320, and the hints pass taps
  through.
- History thumbnails negotiate `160w` / `240w` at `sizes="72px"`; report hero
  negotiates `640w`–`1600w`.

Intentionally left out / residual:

- At 320×568 the top-left marker on `demo-blue-mosque` overlaps the back button
  by about 8px. The marker centre stays tappable; this predates the audit and is
  not one of the findings.
- The first-run swipe pill is 321.6px wide, so it is clipped by about 0.8px on
  each side at 320px. It is `pointer-events-none` and lives for six seconds.
- Playwright uses a fake camera, so camera screenshots are solid green; HUD
  contrast was judged from layout, edges and measured control boxes.
- Production is separate from this branch. It currently serves the user's
  camera-only preview (`49a511c`), not the full integration branch.
