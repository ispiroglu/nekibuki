---
id: SPEC-FEAT-0001
type: change-spec
title: Change spec — center the login and onboarding screens at wide widths
context: app
issue: 7
related: [FEAT-0001, TWI-0001, ADR-0001, NFR-UX-001, NFR-UX-002, NFR-COMP-001, NFR-COMP-002]
supersedes: null
---

# Change spec — center the login and onboarding screens at wide widths

Base commit for this change: `ae51078c39d91dff3be39f142e0ccdcc4a6dea8b` (`main`, the commit the
living documents and code were read at).

The `app` context has no behaviour documents at the base commit (`docs/contexts/app/` holds the
context canvas only), so every requirement below is a new behaviour requirement. No existing
behaviour requirement is modified, removed or renamed, and no other context changes.

## ADDED

- `APP-REQ-NEW-1` Sign-in reading measure. At viewports 1024px wide and wider, the login surface
  (`src/screens/login-screen.tsx`) renders its content in one horizontally centred column capped
  at 42rem (672px), with left and right margins equal within 2px and a column width equal to the
  profile surface's column within 1px. The surface background stays full-bleed. Source:
  DESIGN.md Layout, ADR-0001, NFR-UX-001.
- `APP-REQ-NEW-2` Introduction reading measure. At viewports 1024px wide and wider, the
  introduction surface (`src/screens/onboarding-screen.tsx`) renders its welcome header, slide
  area and footer in one horizontally centred column capped at 42rem, with the same equal-margin
  and profile-matching tolerances as `APP-REQ-NEW-1`. Source: DESIGN.md Layout, ADR-0001,
  NFR-UX-001.
- `APP-REQ-NEW-3` Profile measure retained. At viewports 1024px wide and wider, the profile
  surface (`src/screens/profile-screen.tsx`) keeps its centred column capped at 42rem and is not
  moved to a different measure; it is the reference the other two surfaces match. Source:
  DESIGN.md Layout, ADR-0001, NFR-UX-002.
- `APP-REQ-NEW-4` Introduction content preserved. The introduction still shows exactly three
  slides — "Point at anything", "The story, not the plaque", "Ask, and come back later" — with
  their copy and artwork unchanged, and navigation by dots, drag and the primary button
  unchanged. Source: NFR-COMP-002.
- `APP-REQ-NEW-5` Phone and short-landscape layout preserved. At phone widths (390×844, 360×640,
  320×568) the screen gutter stays 20px and the document scroll width does not exceed the
  viewport width; at 844×390 the login and introduction keep their two-column split layouts and
  the bottom clearance for the floating navigation is not clipped. Source: NFR-COMP-001.
- `APP-REQ-NEW-6` Wide-viewport measure checked in a browser. A repeatable browser check
  (`scripts/layout-check.mjs`) measures the three surfaces at 1280×800, 1024×768, 1440×900,
  390×844, 360×640, 320×568 and 844×390, fails on the base commit at the wide-width cases and
  passes after the change. Source: TWI-0001 Done criteria.

## MODIFIED

None. No living behaviour requirement is changed: the design-system band in DESIGN.md (42–48rem)
already asks for this measure, and this change makes the code match it.

## REMOVED

None.

## RENAMED

None.
