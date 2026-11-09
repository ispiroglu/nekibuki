---
id: BEHAVIOR-APP-READING-MEASURE
type: behavior
title: Reading measure — full-screen app surfaces
context: app
issue: 7
related: [CONTEXT-APP, APP-DOMAIN-MODEL, APP-GLOSSARY, ADR-0001, NFR-UX-001, NFR-UX-002, NFR-COMP-001, NFR-COMP-002, SPEC-FEAT-0001]
supersedes: null
---

# Reading measure — full-screen app surfaces

A full-screen app surface keeps its background full-bleed and puts its content in one centred
column capped at 42rem (672px) on wide viewports. The profile surface is the reference measure;
the sign-in and introduction surfaces match it. The camera stays full-bleed and the report and
legal surfaces keep their own longer measures.

These requirements were folded from `SPEC-FEAT-0001`; the mapping from the change-spec ids is at
the end of this document.

## Requirements

### APP-REQ-001 Sign-in reading measure
At viewports 1024px wide and wider, the sign-in surface renders its content in one horizontally
centred column capped at 42rem (672px), with left and right margins equal within 2px and a column
width equal to the profile surface's column within 1px. The surface background stays full-bleed.
**Source:** DESIGN.md Layout; ADR-0001; NFR-UX-001.
**Checked by:** `layout/login-wide-column` in `scripts/layout-check.mjs`.

### APP-REQ-002 Introduction reading measure
At viewports 1024px wide and wider, the introduction surface renders its welcome header, slide
area and footer in one horizontally centred column capped at 42rem, with the same equal-margin
and profile-matching tolerances as `APP-REQ-001`.
**Source:** DESIGN.md Layout; ADR-0001; NFR-UX-001.
**Checked by:** `layout/onboarding-wide-column` in `scripts/layout-check.mjs`.

### APP-REQ-003 Profile measure retained
At viewports 1024px wide and wider, the profile surface keeps its centred column capped at 42rem
and is not moved to a different measure; it is the reference the sign-in and introduction
surfaces match.
**Source:** DESIGN.md Layout; ADR-0001; NFR-UX-002.
**Checked by:** `layout/profile-wide-column` in `scripts/layout-check.mjs`.

### APP-REQ-004 Introduction content preserved
The introduction shows exactly three slides — "Point at anything", "The story, not the plaque",
"Ask, and come back later" — with their copy and artwork unchanged, and navigation by dots, drag
and the primary button unchanged.
**Source:** NFR-COMP-002.
**Checked by:** `onboarding/three-slides-preserved` in `tests/end-to-end/`.

### APP-REQ-005 Phone and short-landscape layout preserved
At phone widths (390×844, 360×640, 320×568) the screen gutter stays 20px and the document scroll
width does not exceed the viewport width; at 844×390 the sign-in and introduction surfaces keep
their two-column split layouts and the bottom clearance for the floating navigation is not
clipped.
**Source:** NFR-COMP-001.
**Checked by:** `layout/phone-gutters-no-overflow` and `layout/landscape-split` in
`scripts/layout-check.mjs`.

### APP-REQ-006 Wide-viewport measure checked in a browser
A repeatable browser check measures the three surfaces at 1280×800, 1024×768, 1440×900, 390×844,
360×640, 320×568 and 844×390, fails on the base commit at the wide-width cases and passes after
the change. It collects no console error or uncaught page error on the way through the surfaces.
**Source:** TWI-0001 Done criteria.
**Checked by:** `layout/check-fails-on-base-commit` and `gate/typecheck-and-tests` in
`tests/end-to-end/`; the check itself is `scripts/layout-check.mjs`, run with
`bun run layout:check`.

## Fold provenance

| Change-spec id | Living id |
| --- | --- |
| `APP-REQ-NEW-1` | `APP-REQ-001` |
| `APP-REQ-NEW-2` | `APP-REQ-002` |
| `APP-REQ-NEW-3` | `APP-REQ-003` |
| `APP-REQ-NEW-4` | `APP-REQ-004` |
| `APP-REQ-NEW-5` | `APP-REQ-005` |
| `APP-REQ-NEW-6` | `APP-REQ-006` |

Folded from `docs/changes/archive/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/spec.md`
at verified commit `e844f7998f01ae9509d9d6d1d0136e9ce7682363`.
