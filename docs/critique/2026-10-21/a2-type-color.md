# A2 — Typography, color & theming

Target: Nekibuki, impeccable/integration @ a9952f7, http://localhost:5190
Method: isolated design review (Assessment A2), 390x844 light + dark (fresh contexts), 320x568, 1280x800; routes: login, onboarding 1–3, camera HUD, /report/demo-eiffel, /report/demo-blue-mosque, Places (History), Profile (You), annotation sheet, chat sheet; `?brand=clay` and `?brandlab=1` inspected; computed styles + rendered-pixel sampling measured in-page (shots/a2/measure2.json, measure3.json)
Layer score: 2/4
Nielsen: H4 Consistency and standards = 3/4
Audit dimension: Theming = 3/4

Strengths:
- The editorial voice is real, not decorative. Newsreader carries every piece of content (display 48px/1.05/−0.02em, lede 22px/1.55, reading 17px/1.7) while the system sans carries every control; the login headline sets "walk past" in `--brand-ink` inside the display line and the report title "Eiffel Tower" is set at the top of the display range with `text-wrap: balance`. Measured: `article h1` = Newsreader Variable 48px/500/48px/−0.96px, `balance`.
- Token discipline holds across the whole app. Every inspected surface (paper, ink, muted ink, brand ink, HUD, glass) resolves from the semantic set; `?brand=` presets keep all four brand roles populated, the default stays petrol (`--brand #0f5f57`) even with `?brandlab=1` present, and the clay preset moves hue without touching paper, ink, radii or the serif.
- Dark mode is composed, not inverted: dark paper `#1f1e1d`, surface `#2a2927`, muted ink lifted to `#a3a199` (6.43:1 on dark paper), brand ink remapped to `#7fc7bb` (8.55:1), destructive lightened to `#e07a60`. The document `theme-color` meta is correct in all three appearance states — measured: Auto → `(prefers-color-scheme: light) #faf9f5` + `(prefers-color-scheme: dark) #1f1e1d`; explicit Dark → the two media metas get `media="not all"` and an unconditional `#1f1e1d` meta is added; explicit Light → unconditional `#faf9f5`.

### [P1] Dark theme never remaps `--brand`, so every brand-filled control drops to 2.22:1 on the dark page
- Location: `src/index.css:48-73` (the `.dark` token block overrides `--brand-ink` at line 63 but never `--brand`); consumers: `src/screens/report-screen.tsx:328` (numbered reference dot, `bg-brand text-brand-fg`) and `src/screens/report-screen.tsx:382` (chat send circle, `bg-brand text-brand-fg`), `src/components/brand/logo.tsx` avatar fallback.
- Evidence: in a dark-scheme context the computed `--brand` is still `#0f5f57` (measure2.json `darkTokens`), and `#0f5f57` on `--background` `#1f1e1d` computes to **2.22:1** — below the 3:1 that DESIGN.md itself demands ("4.5:1 for text, 3:1 for UI and focus rings"). Measured from the render: the reference dot's own fill is `rgb(15, 95, 87)` (measure3.json `darkContrast`, "ref number dot"), and its text-on-fill pair is fine at 7.13:1 — the failure is the dot's boundary against the page. Visually the petrol circle of the send button dissolves into the near-black panel (`a2-dark-report-refs.png`, bottom-right arrow).
- Impact: in night/indoor use — the mode a traveller actually uses in a museum or on an evening walk — the app's only chromatic affordance (the send action, the numbered reference dots that connect prose to the photo) loses its edge. Sam-style low-vision users and anyone in low light lose the primary action boundary; the petrol "signature" the brand depends on is invisible exactly where the photo is dark.
- Fix: remap the fill role in the dark block, not just the ink role: in `src/index.css` `.dark { … }` add `--brand: #2f8f83;` (or the petrol hue lifted to ≈L 55: `oklch(58% 0.085 184.5)`), and mirror it in each `[data-brand='…'].dark` preset (`clay`, `okra`, `petrol`, `lapis`, `saffron`) so a preset never silently inherits the light-mode fill. Keep `--brand-fg` as is (7.13:1 on the old fill; verify again on the new one). No component change is needed — the token already has the right role.
- Suggested command: /impeccable colorize

### [P2] Reference and "see in photo" prose is set at 14px and left uncapped — below the 16px body floor and up to 79.7ch wide
- Location: `src/screens/report-screen.tsx:333` (`<p className="mt-1 text-sm leading-relaxed text-muted-foreground">` — the visual-reference body) and `:352` (`seeInPhoto`, `text-sm` italic muted with a `border-l-2 border-brand/50` rule).
- Evidence: measured at 390px — `text-sm` = 14px/22.75px, 42.3ch per line; at 1280px the same paragraph renders **79.7ch** wide because the `<li>` has no max-width, while the serif prose beside it is capped at `max-w-[32rem]` and lands at 63.4ch (measure3.json `wideType`). DESIGN.md's Do-list says "body text at 16px or larger" and its Typography section keeps prose in 55–70ch; 14px is below the declared role floor (`body` 1rem, `list` 15px) and 79.7ch is past the declared ceiling.
- Impact: these two paragraphs carry the product's actual payload ("The gaps are not decoration: wind passes through instead of pushing the tower over"). At 14px on a phone in sunlight they are the least readable text in the report, and on desktop they stretch into a single 80-character line that the eye cannot track back from.
- Fix: set the reference body to `text-[0.9375rem]`-equivalent only if it stays a meta role — better, treat it as body: `text-[1rem] leading-relaxed` (16px) and add `max-w-[32rem]` to the `<li>` content wrapper so it matches the reading measure; keep `seeInPhoto` at 15–16px italic but give it the same `max-w-[32rem]`.
- Suggested command: /impeccable typeset

### [P2] On a 390px phone the report's prose measure falls to 33.7ch, and to 26ch at 320px
- Location: `src/screens/report-screen.tsx:295` (summary/lede, `text-[1.375rem] leading-[1.55]`) and `:348` (reading paragraph, `text-[1.0625rem] leading-[1.7]`), inside `article` with `px-6` (24px gutters) at `report-screen.tsx:251`.
- Evidence: measured — 390px: lede 342px wide → 33ch/line, reading paragraph → 42.3ch; 320px: lede 272px → 26ch/line, reading paragraph → 33.7ch (measure2/measure3 `narrowType`). typeset's comfortable prose band is 45–75ch; the DESIGN rule is 55–70ch. The rag on the summary is correspondingly jagged (`light-eiffel-00-hero.png`: "Rising beside the Seine, the Eiffel / Tower was built as a temporary / gateway for the 1889 World's Fair —").
- Impact: the summary is the one piece of prose a traveller reads while standing on a pavement with one hand; at 26ch it breaks every third word into a new line and the text reads as a column of fragments rather than a sentence.
- Fix: (a) drop the summary one step to 1.25rem (20px) below 400px, or keep 1.375rem and widen the measure by cutting gutters to `px-4` under 360px; (b) add `text-wrap: pretty` to the summary and reading paragraphs — currently only headings get `balance` (`src/index.css:225-236`), so the prose keeps a widow-prone default wrap.
- Suggested command: /impeccable typeset

### [P2] The role scale is a collection of values, not a ramp — five sizes sit off the declared steps, two of them 2px apart
- Location: measured set — 30px serif screen titles ("History", "Ada Traveller", `src/screens/profile-screen.tsx:64`, Places header), 24px serif section h2 (`report-screen.tsx:311`), 20px serif reference h3 (`:335`), 18px serif quick-fact value (`:308` `font-serif text-lg`), 18px sans onboarding body (`src/screens/onboarding-screen.tsx:98`, `text-lg leading-relaxed`), 14px sans body copy (`:333`), 12.5px sans swipe hint (`src/components/layout/swipe-hint.tsx:32`). DESIGN.md declares display 36–48, headline 24, reading 17, body 16, label 12, meta 11.2, ui 13, list 15, lede 22.
- Evidence: measure2.json / measure3.json `lightType`, `reportType`, `onbTokens` — e.g. quick-fact value 18px serif and reference h3 20px serif are two different jobs two pixels apart; the 30px screen title is 6px above the 24px section heading it outranks.
- Impact: hierarchy stops being legible at a glance — typeset's "adjacent sizes or weights too close to carry different jobs" — and the DESIGN system can no longer be used as a spec by whoever writes the next screen.
- Fix: promote the observed values into the system rather than deleting them: declare `title: 30px` and `value: 18px` as named roles in DESIGN.md's typography block and in `@theme` (`--font-size-*`), then move the reference h3 to the declared `headline` step (24px) or the quick-fact value to `reading` (17px) so no two neighbouring jobs differ by less than 4px. Same for onboarding body: use `body` 16px/1.5 instead of an ad-hoc 18px/1.625.
- Suggested command: /impeccable typeset

### [P2] The clay experiment still fails the system's own 3:1 UI rule on paper, and its photo badge washes out
- Location: `src/index.css:83-88` (`[data-brand='clay'] { --brand: #d97757; --brand-ink: #a8452a; --brand-fg: #3b1c10; --hud: #eaa084; }`); consumers: `report-screen.tsx:262` (badge `bg-brand/15 … text-brand-ink`) and `:328` (dot `bg-brand`).
- Evidence: computed `--brand` `#d97757` on paper `#faf9f5` = **2.96:1**, i.e. below the 3:1 UI minimum DESIGN.md sets for controls; the *ink* role was fixed for the preset (`#a8452a` = 5.62:1 on paper) but the *fill* role was not. The clay badge sits over the bright sky in `a2-clay-report.png`: the 15% clay wash plus `#a8452a` ink over a near-white sky reads as pale salmon and is visibly weaker than the petrol badge in `light-eiffel-00-hero.png` (petrol ink on its own 15% wash = 5.66:1).
- Impact: the opt-in experiment reproduces exactly the defect DESIGN.md's Anti-Terracotta rule names ("terracotta … fails 3:1 on paper"), and it fails on the one surface that matters most for the experiment — the photo overlay badge.
- Fix: in `[data-brand='clay']` set `--brand: #c25f3f` (3.99:1 on paper) while keeping `--brand-ink: #a8452a` and `--brand-fg: #3b1c10` (4.95:1 on `#d97757`; re-check on the new fill), and give the photo badge a `--hud`-role treatment instead of `brand/15` when it sits over photography, so the overlay uses the token DESIGN.md reserves for marks on photos.
- Suggested command: /impeccable colorize

### [P2] "Hold for settings" is the only camera label with no scrim behind it
- Location: `src/screens/camera-screen.tsx` (the "Hold for settings" hint) vs. the `glass-dark` chips used by the location chip and the swipe hint (`src/components/layout/swipe-hint.tsx`).
- Evidence: `light-05-camera.png` / `a2-light-camera-hud.png` — "Location on" and "Swipe between camera, you and your places" both sit on a `glass-dark` scrim; "Hold for settings" is bare white with only a text-shadow directly on the frame. Sampling the pixels under the label on Chrome's flat green frame gives rgb(46,127,24), on which white measures ≈5:1 — acceptable on *this* frame, but the label is the only HUD text with no scrim, and DESIGN.md's photo-ink rule (two-layer shadow, 0 1px 2px + 0 8px 30px) is what it is relying on alone over arbitrary photography.
- Impact: the weakest of the three hints is the one most likely to be washed out — a bright sky over the camera is the single most common outdoor condition for this product.
- Fix: give the label the same `glass-dark` treatment as its siblings, or (cheaper) adopt DESIGN.md's two-layer `--photo-shadow` on it, so every string over the photo gets one identical overlay recipe.
- Suggested command: /impeccable colorize

### [P3] The HUD mint is used as a fill, but `hud-fg` — the token written for it — is barely reachable
- Location: `src/index.css:36-37` (`--hud: #6cc0b0; --hud-fg: #141413;`) and its consumers (active annotation marker in `src/components/report/photo-hero.tsx`, saved bookmark `text-hud` in `report-screen.tsx:224`).
- Evidence: white on `--hud` is 2.14:1, while `--hud-fg` `#141413` on `--hud` is 8.61:1 — the system has the right pairing, but any HUD fill that receives white text (or a white glyph inherited from a parent) will fail. Nothing in the inspected states does this today; the token pair simply makes the failure easy to author.
- Fix: state the rule where the token is defined — HUD fills always take `--hud-fg` ink, never `--photo-ink`/white — and check the photo-hero's inactive marker (black at 55% + white text) for the same trap.
- Suggested command: /impeccable colorize

Minor observations:
- The report's own screen title is 48px (`article h1`), the same size as the login headline; the annotation sheet title is 24px serif while the *same* reference title in the list below is 20px serif (`a2-light-report-hero.png` vs `light-eiffel-01-annotation.png`).
- "Ask about Eiffel Tower…" in the bottom pill is 16px `--muted-foreground` on `--card`; muted #6b6a63 on #ffffff is 5.43:1, fine, but it is the same size as the report's body copy while being chrome — a `ui` (13px) or `list` (15px) step would separate it.
- The numbered reference dots use `tabular-nums` correctly (good), but the quick-fact values ("330 m", "18,038") are set in a proportional serif, so the numbers in a two-column stat grid do not align.
- The clay preset leaves `--hud: #eaa084`, a warm peach that loses the "light and chromatic enough to survive photography" property of the mint over warm photos; the petrol HUD is the more defensible choice even in a warm preset.
- The `?brandlab=1` swatch strip is dev-only but renders over the login legal line at 390px (`brandlab-01-report.png`) — harmless, but it is one line of CSS away from shipping if the flag is ever left on.

Persona red flags:
- **Sam (Accessibility-Dependent User)**: reading a report in night mode — the numbered reference dot (the only thing tying the prose to a point in the photo) is `bg-brand` on a `#1f1e1d` page at 2.22:1, so at 200% browser zoom on a dim screen the dot stops reading as a distinct element and the reference list becomes an unlabelled list of captions. Sam cannot recover the visual "1 → photo" mapping that the whole report structure depends on.
- **Casey (Distracted Mobile User)**: standing in bright sun, one thumb, phone at 390px — the reference explanations ("18,038 iron pieces joined by 2.5 million rivets…") are set at 14px muted grey, the smallest body text in the app, and at 320px the summary breaks at 26 characters per line. Casey is the user PRODUCT.md describes ("standing in front of something they cannot name… usually on a phone, outdoors, often one-handed and in a hurry"), and the app's most load-bearing prose is the least legible thing on the page.

Questions:
- If the report is the product, why is its body copy set 14px while the marketing headline is set at 48px — is the type ramp tuned for the login screen and inherited by the reading screen?
- The brand has exactly one hue. In dark mode that hue vanishes into the background. Is "one accent" meant to include "one accent that is always visible", and if so, why does `--brand-ink` get a dark variant but `--brand` does not?
- The clay experiment is documented as failing 3:1 on paper and is shipped behind a flag anyway. What decision would have to be true for a preset to be promoted — and should the flag be the gate, or a measured pass?

SUMMARY: 2/4; 0 P0, 1 P1, 5 P2, 1 P3; the dark theme never remaps `--brand`, so every brand-filled control (send button, reference dots) drops to 2.22:1 against the dark page.
