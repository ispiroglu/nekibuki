---
id: TWI-0001
type: technical-work-item
title: Center login, onboarding and profile content on wide viewports
context: app
issue: 7
related: [ADR-0001, FEAT-0001, NFR-UX-001, NFR-UX-002, NFR-COMP-001, NFR-COMP-002]
supersedes: null
---

# Center login, onboarding and profile content on wide viewports

## Context

`app` is phone-first, but the same build is opened in tablet and desktop browsers. Two of its
full-screen surfaces never got the reading measure the rest of the app uses:

- `src/screens/login-screen.tsx`: the `<main>` at line 124 and its two content blocks at
  lines 125 and 154 have no `max-width` and no auto margins, so at a wide viewport the copy and
  the sign-in button stretch the full width and the text column sits at the left edge.
- `src/screens/onboarding-screen.tsx`: the root at line 165, the welcome header at line 166, the
  scrolling slide area opened at line 186 (container classes at line 194) and the footer at
  line 221 all stretch edge to edge for the same reason.
- `src/screens/profile-screen.tsx:66` already caps its content with
  `mx-auto w-full max-w-2xl px-5` and is the reference the other two must match.

`DESIGN.md` (Layout section) requires history and profile content to cap at 42–48rem on wide
screens instead of stretching edge to edge. ADR-0001 fixes the measure at 42rem for the login,
onboarding and profile surfaces and keeps the cap per screen.

Nothing about the data, the calls or the stored values changes: this is a layout change inside
one context.

## Scope

In scope:

- `src/screens/login-screen.tsx` — cap and centre the content column.
- `src/screens/onboarding-screen.tsx` — cap and centre the header, slide area and footer in the
  same column; keep the three slides (Point at anything / The story, not the plaque / Ask, and
  come back later) and their copy and artwork unchanged.
- `src/screens/profile-screen.tsx` — confirm it stays centred at wide widths; change it only if
  the shared measure needs aligning, never to a different measure.
- A browser-level layout check (see Done criteria) that fails on the base commit and passes
  after the change.

Out of scope:

- Any change to `api`, `shared`, contracts, storage, auth or the vision provider.
- The camera surface, which stays full-bleed.
- The report and legal reading surfaces, which keep their own existing measures.
- Phone-width layout, the 20px gutters, and the short-landscape split layouts
  (`orientation:landscape` and `max-height:560px`); these are preserved exactly.
- Copy edits, new onboarding slides, new settings, or a new desktop navigation model.

## Technical outcome

At viewports 1024px and wider, the login, onboarding and profile surfaces each render their
content in one horizontally centred column capped at 42rem (672px), matching the profile
surface within 1px, with equal left and right margins within 2px. Backgrounds stay full-bleed;
only the content is capped.

At phone widths (390×844, 360×640, 320×568) the gutter stays 20px, the document has no
horizontal overflow, and nothing about the existing layout changes. At short landscape
(844×390) the login and onboarding split layouts keep their two columns.

The onboarding still shows exactly three slides with the same titles, body copy and artwork;
navigation by dots, drag and the primary button is unchanged. The profile surface remains
centred and unchanged in behaviour.

Implementation follows ADR-0001: reuse the existing centred-column pattern on each screen, no
new shared layout component and no global width rule.

## Done criteria

- A browser check at 1280×800 measures the login and onboarding primary content column: width
  at most 768px, left and right margins equal within 2px, and width equal to the profile
  surface's column within 1px. The check fails on the base commit and passes after the change.
- The same check at 1024×768 and 1440×900 passes with the same bounds.
- At 390×844, 360×640 and 320×568: the screen gutter measures 20px, the document scroll width
  does not exceed the viewport width, and the onboarding renders exactly 3 slides with their
  original copy.
- At 844×390 the login and onboarding surfaces still render their two-column split layout.
- Rendered copy of the three onboarding slides is identical to the base commit.
- `bun run typecheck` and `bun test` pass; no new console errors on the three surfaces.
- No file outside `src/screens/` is touched, and no contract, schema or store change ships with
  this work item.

## Risk

Low. Presentation-only, no data and no wire change. The risks that are real:

- **Split-layout regression on short landscape.** Wrapping or capping the login and onboarding
  roots can break the `orientation:landscape` / `max-height:560px` grid. Keep the existing media
  query classes on the same elements that carry them today and verify 844×390 explicitly.
- **Background seam.** Capping the element that also paints the background leaves the page
  background visible at the sides and can show a colour or safe-area seam. Cap the content
  wrapper, not the surface that paints the background.
- **Safe-area interaction.** The capped column must not clip the top and bottom safe-area
  padding or the 7rem bottom clearance reserved for the floating navigation pill.
- **Panel deck mounting.** The profile screen is mounted inside the three-panel deck, so any
  profile change is measured in place; do not move the cap to the deck wrapper.
- **Wide-only false confidence.** A viewport check at one width can pass while 1024 and 1440
  disagree; the done criteria cover all three widths.

## Rollback

Revert the presentation change. There is no migration, no stored data, no cache and no contract
to unwind: the previous classes are the rollback, and a single revert restores the wide-viewport
layout. The added layout check can stay or be reverted with the same commit without affecting
the app.
