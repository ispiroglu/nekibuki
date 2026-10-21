# A4 — Responsive & Adaptation

Target: Nekibuki, impeccable/integration @ a9952f7, http://localhost:5190
Method: isolated design review (Assessment A4), viewports inspected: 320×568, 360×640, 390×844 (light + dark), 768×1024 (light + dark), 1280×800, 844×390 (landscape), plus a live 390×844 → 844×390 rotation. Chrome via Playwright, deviceScaleFactor 2, isMobile/hasTouch, fake camera + geolocation. Surfaces exercised: login, onboarding 1–3, camera (rest, settings shelf open, permission fallback DOM), report (/report/demo-eiffel: header, markers, hint, title/meta, article, trivia carousel, chat open, annotation sheet), Places (header, search + saved-only filter, rows), Profile (all groups incl. install/danger rows). Text scaling tested by injecting `html{font-size:200% !important}` and restoring after.

Layer score: 3/4
Nielsen: H7 Flexibility and efficiency of use = 2/4
Audit dimension: Responsive Design = 2/4

**Why not higher.** The fluid layout is genuinely good: across all six viewports there is **zero horizontal document overflow** (`document.documentElement.scrollWidth - window.innerWidth` = 0 on login, onboarding 1/2/3, Places, Profile, Camera and Report at 320, 360, 390, 768, 1280 and 844×390), zero true (unclipped) overflowing elements, no scroll traps, every onboarding CTA above the fold, and the floating nav pill holds three exact 44×44 targets. But the two adaptation extremes — **200% text** and **landscape** — both fail in ways that cost real content and controls, and the Profile panel ships sub-44px controls at every size. H7 and the Responsive Design dimension are scored on those extremes and the touch-target floor, hence 2/4 each while the layer overall (the 320→1280 matrix) is 3/4.

## Strengths

- **The layout matrix is genuinely fluid.** Same DOM, zero reflow bugs: the report article stays a centred reading column (h1 spans x 336→944 at 1280, x 80→688 at 768, x 24→366 at 390, x 24→296 at 320), the Places/Profile panels cap at `max-w-3xl` / `max-w-2xl`, and the nav pill stays centred at every width. Measured overflow is 0 everywhere; no element escapes its clipping ancestor uncaught.
- **Chrome overlays are collision-free by construction.** The photo markers never collide at any viewport: pairwise hit-box overlap = 0 across 320/360/390/768/1280/844×390, with a minimum vertical gap of 25px (marker 1 66→110 vs marker 2 135→179 at 320×568). The "Tap the dots on your photo" pill is positioned from the lowest marker (`hintTop = lowestMarker × 0.72 × 100% + 30px`) and always clears it by exactly 8px (320: pill top 290 vs marker bottom 282; 390: 344 vs 336; 768: 410 vs 402; 1280: 327 vs 319).
- **The camera HUD already adapts to short viewports.** `viewfinder-settings.tsx:79` carries `[@media(max-height:460px)]:flex-row`; at 844×390 the shelf renders as a horizontal row (380→464 × 66→124) instead of a column, and its `max-w-[calc(100vw-1rem)]` keeps it inside the viewport at 320 (shelf 118→202). Scroll containers reserve 7rem (`pb-28`) for the floating pill: the Profile "Sign out" row ends at y=416 (320×568) against a pill top of 506 — 90px of clearance.

## Findings

### [P1] In landscape the report's title sits behind the fixed chat bar — the place name is invisible at rest
- Location: route `/report/demo-eiffel`; `src/components/report/photo-hero.tsx:109` (`h-[60svh] min-h-[420px]`) and `src/screens/report-screen.tsx:373` (the `glass fixed inset-x-0 bottom-0` chat bar).
- Evidence: at 844×390 the hero computes to **420px tall** (`min-h-[420px]` beats `60svh` = 234px), i.e. the photograph alone is 108% of the 390px viewport. The `<h1>` "Eiffel Tower" is measured at **top 360 → bottom 408**, while the fixed chat bar occupies **top 314 → bottom 390** → **30px of the 48px title line is under the bar**, and the summary lede below it is fully covered. Screenshot `844x390-g-report-top.png` shows no title and no text at all — only photo, markers, hint pill and the chat bar. The same hero at 390×844 measures 506px (60svh, correct) and the title at 446→494 clears the bar at 768.
- Impact: the traveller rotates the phone, lands on the guide, and gets a photograph with no name and no answer until they scroll. It breaks PRODUCT.md principle 3 ("Answer first") in exactly the orientation people use to photograph a tall monument.
- Fix: make the hero height respond to *height*, not just a fixed floor: replace `min-h-[420px]` with `min-h-[min(420px,60svh)]` and add `[@media(max-height:480px)]:h-[76svh]`; keep `max-h-[420px]`. Then give the article enough negative margin (`-mt-24` is fixed) to still overlap the photo bottom by ~24px at landscape sizes.
- Suggested command: /impeccable adapt

### [P1] At 200% text on a 320/360 phone the report cannot reflow — the page widens to 377px instead of scaling
- Location: route `/report/demo-eiffel`; `src/screens/report-screen.tsx` `h1` (`display mt-3 text-5xl font-medium`) inside `article … px-6 pb-36 md:px-8`.
- Evidence: injecting `html { font-size: 200% !important }` at **320×568** gives `documentElement.scrollWidth = 377` and `window.innerWidth = 377` on a 320px-wide device — Chrome expands the layout viewport by 57px and renders the whole page scaled down instead of reflowing. The same injection at **360×640** again lands on 377. The h1 is the culprit: at 96px its longest word cannot wrap — measured `scrollWidth 251` vs `clientWidth 224` — so it pushes the document 57px wider than the device. At **390, 768 and 1280** the same injection leaves `innerWidth` untouched (390/768/1280), so this is a small-screen-only failure. Screenshots `320x568-h-report-200.png`, `320x568-g-report-200.png`.
- Impact: WCAG 1.4.4 (resize text to 200% without loss of content). A traveller with low vision on a small phone does not get bigger text — they get a shrunken page, and the right-hand part of the header (the Delete button, right edge 370px) and of the title fall off the 320px device edge.
- Fix: make the display size fluid and breakable — `text-[clamp(2rem,10vw,3rem)]` on the h1 instead of `text-5xl`, add `break-words`/`hyphens:auto` to the `display` class, and drop the article gutter to `px-5` under 360px. The title must be able to wrap at any root size.
- Suggested command: /impeccable adapt

### [P1] At 200% text the camera HUD breaks: the shutter becomes an 81×160 oval and the history button leaves the screen
- Location: `src/screens/camera-screen.tsx:1043` (shutter, `grid size-20 … rounded-full border-[3px]`) and the HUD top row (avatar / location chip / history button).
- Evidence: at **100%** on 320×568 the shutter measures **80×80 (ratio 1.000)** — a true circle, as DESIGN.md requires. At **200%** on 320×568 it measures **81×160 (ratio 0.505)**: `size-20` is rem-based, so the height doubles with the root font while the flex row keeps the width at 80px, stretching the "perfect circle" into a narrow vertical oval. In the same state the HUD top row measures: "Your profile" 32→122, "Location on" chip 146→348 (**28px past the 320px edge**), "Places you looked at" **372→460 — entirely outside the viewport and therefore unreachable**. At 390×844/200% the history button is at 372→460, i.e. 18px of 88px visible. Screenshot `320x568-h-camera-200.png` shows the oval shutter, the clipped chip and the missing history button; the "Hold for settings" hint is also overprinted by the oval.
- Impact: the one control a low-vision user most needs (take the photo) loses its shape and its tap target, and the route back to their saved places disappears entirely on the smallest phones.
- Fix: stop scaling the HUD with the root font — use px sizing for the shutter (`size-[80px]`, `border-[3px]` → `border-[3px]` on a px-based box) and for the HUD buttons (`size-[44px]`), let the location chip truncate with `min-w-0 truncate` instead of growing, and give the top row `flex-wrap`/smaller gaps so a 200% chip can never push the history button off-canvas.
- Suggested command: /impeccable adapt

### [P2] At 200% text the report header's action cluster collides and hides a photo marker
- Location: route `/report/demo-eiffel`; `src/screens/report-screen.tsx:210-250` (`absolute inset-x-0 top-0` bar with Back / Save / Share / Delete, all `grid size-11`).
- Evidence: at **390×844 with 200% text** the four buttons measure Back 32→74, Save **74→162** (the two boxes touch at x=74 with a 0px gap and their 88px glass circles visibly overlap), Share 178→266, Delete 282→370. At **320×568 with 200%** the same Delete button ends at **370px on a 320px device** — 50px is off-screen. The photo marker "The open lattice" is measured at 167→255 × 44→132, entirely behind the Share circle (178→266 × 24→112). The hint pill "Tap the dots on your photo" is 339px wide at 200% and overlaps both the eyebrow badge and the h1. Screenshots `320x568-h-report-200.png`, `390x844-h-report-200.png`.
- Impact: at large text the destructive Delete action is partly off-screen and a marker is unclickable — the exact opposite of the "photo is the source" model, and a destructive control is sitting one stray tap from the article.
- Fix: px-size the header cluster (`size-[44px]`, `gap-[6px]`), give the hint `max-w-[calc(100%-1rem)] whitespace-normal` so it wraps instead of stretching, and raise the marker band (or the header's z-order) so markers never sit under the action bar at large text.
- Suggested command: /impeccable adapt

### [P2] The Profile panel's settings controls are 36px tall at every viewport
- Location: `src/screens/profile-screen.tsx:97-152` — Language `Segmented` (EN/TR), "Show again" `Button size="sm"`, Appearance `Segmented` (Auto/Light/Dark); `src/components/ui/segmented.tsx`.
- Evidence: measured identically at 320, 360, 390, 768 and 1280: EN 49×36, TR 49×36, "Show again" 99×36, Auto 61×36, Light 63×36, Dark 61×36 — **6 interactive controls 8px short of the 44px minimum**, in the two groups a user visits precisely to fix a problem (language, appearance). The Haptics switch measures 48×28 but its `before:-inset-y-2` pseudo-element extends the real hit area to 44px, so it is *not* counted here.
- Impact: PRODUCT.md commits to 44×44 touch targets and DESIGN.md says "don't ship a control below 44×44px"; WCAG 2.5.8 (AA) is still met at 36px, so this is friction, not a conformance failure — but on a phone, in sunlight, with a shaking hand, switching to Dark becomes a mis-tap risk.
- Fix: give the segmented control `min-h-11` (44px) and the secondary "Show again" button `h-11`, keeping the visual weight by adjusting the track padding rather than the label size.
- Suggested command: /impeccable harden

### [P3] The sticky Places/Profile header eats 184px — 47% of a landscape phone
- Location: `src/screens/history-screen.tsx:42-43` and `src/screens/profile-screen.tsx:56` — `<section class="h-full overflow-y-auto … pb-28">` with `<header class="glass sticky top-0 z-10 pb-3 safe-top">`.
- Evidence: the sticky header measures **top 0 → bottom 184 at every viewport** (320×568: 32% of the screen; 844×390: **184 of 390 = 47%**). In landscape the Places panel's scroll container reports `scrollHeight 568` vs `clientHeight 390` — a scroll range of only 178px, and the screenshot `844x390-k-places-scrolled-end.png` shows the "History" wordmark, the camera button and the search field stacked vertically above barely one place row. At 320 and 390 the same panel does not need to scroll at all (scrollHeight == clientHeight; last row bottom 456, pill top 506 → 50px clearance), so the cost is purely a landscape one.
- Fix: under `@media(max-height:480px)` collapse the header to a single row — small title beside the camera button, search field inline — and drop the vertical stack to ~72px.
- Suggested command: /impeccable adapt

### [P3] At 320×568 the report's summary is behind the fixed chat bar at rest
- Location: route `/report/demo-eiffel`; `src/components/report/photo-hero.tsx:109` (`min-h-[420px]`) vs `src/screens/report-screen.tsx:373` (fixed bar).
- Evidence: at 320×568 the hero is **420px of a 568px viewport (74%)**, the bar's top edge is at **492**, the h1 sits at 360→408 (visible) but the meta row (≈415–440) and the lede summary (≈460 onward) fall under the bar. The reader must scroll ~40px before the "Rising beside the Seine…" summary — the answer — appears. At 390×844 the same layout leaves the summary visible (h1 446→494, bar top 768).
- Fix: make the hero's floor height-aware (`min-h-[min(420px,60svh)]`, giving ~341px at 320×568) so the title, meta and first lines of the summary share the first screen on the smallest phone too.
- Suggested command: /impeccable adapt

## Minor observations

- The report hero at **1280×800** crops a 1.50:1 source into a 2.67:1 frame (1280×480) via `object-cover` — technically correct (no distortion, `srcset`/`sizes` present) but it slices the Eiffel Tower's base out of the picture; `object-position` would keep the tower centred.
- The report's fixed chat trigger paints its send arrow as a `size-10` (40px) circle inside a full-width button — visually under the 44px dot size even though the tap target is the whole row.
- The Places rows at **320×568** truncate mid-word with an ellipsis: "Available from your browser …" and "Removes every saved guide a…" (screenshots `320x568-profile-end.png`). The destructive row's explanation loses its meaning exactly where the user has to decide.
- The Places list thumbnails are 72×72 crops of 1.47–1.53 landscape originals; fine as squares, but the Blue Mosque thumbnail is cropped so tightly the minarets are clipped.
- Orientation change is safe: after `setViewportSize(390×844 → 844×390)` the app re-measured with no overflow (`390x844-rot-g-*` captures are byte-identical in layout to the portrait ones), and the deck keeps the active panel.
- The dark theme changes no geometry at all (390-dark and 768-dark produce measurements identical to their light counterparts), so theming introduces no responsive risk.

## Persona red flags

- **Sam (accessibility-dependent user, browser zoom 200%)** — Step "open a saved guide and read it" breaks: at 320×568 with 200% text the report widens to 377px (Chrome zooms the page out), the h1 overflows its own box (scrollWidth 251 vs clientWidth 224), the Delete button's right edge lands at 370px on a 320px device, and photo marker 1 is hidden behind the Share circle. Step "take a photo" breaks too: the shutter is an 81×160 oval and the "Places you looked at" button is at x 372→460 on a 320px screen, completely unreachable.
- **Casey (distracted mobile user, one hand, outdoors)** — Step "rotate to frame a tall monument and read the name": at 844×390 the report title is 30px under the fixed chat bar and the summary is entirely hidden, so the first thing she sees is a photo with no caption. Step "switch to Dark so she can read in sunlight" targets a 36px-tall segmented control, and in landscape the sticky header leaves room for barely one list row.
- **Riley (stress tester)** — Step "use the viewfinder settings on a small phone": the settings shelf opens on a 420ms long-press of the preview with no visible affordance; once open at 320 it shows a single control ("Grid") because the fake device reports no torch and a single zoom preset, so the shelf's contents change with device capability rather than with layout — untestable on the emulator and easy to ship broken on a real device.

## Questions

- Is the photo hero meant to be a fixed 420px floor on purpose (so the photo always dominates), or is that a number picked for a 390×844 phone that never earned its way onto a 320×568 screen or a landscape one?
- If the title were allowed to move *above* the photo at short viewport heights — instead of the photo pushing it down and the chat bar covering it — would the "answer first" principle survive better?
- Which context is the real product: the phone held upright, or the phone rotated for a landscape photograph? Right now the app is designed for the first and merely tolerated by the second, yet the camera is exactly the moment a user rotates the device.

Gaps recorded (not guesses): the **camera permission-denied fallback** could not be captured — Chrome's `--use-fake-ui-for-media-stream` auto-accepts the camera prompt, so the fallback was only observed in the DOM (a "Choose from gallery" button, 48×48, at x 20→68, y 416→464 on 320×568). Gestures (swipe deck, trivia carousel drag, long-press) were exercised through synthesized pointer events in Chromium only — no real touch hardware, and no Safari/iOS engine, was available.

SUMMARY: 3/4; 0 P0, 3 P1, 2 P2, 2 P3; the report and the camera HUD both fail to adapt at 200% text (page widens to 377px on a 320px phone, shutter deforms to 81×160, history button pushed off-screen) and the report title is hidden behind the fixed chat bar in landscape.
