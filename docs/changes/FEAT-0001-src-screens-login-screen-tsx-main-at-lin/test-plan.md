---
id: TEST-PLAN-FEAT-0001
type: test-plan
title: Test plan — center the login and onboarding screens at wide widths
context: app
issue: 7
related: [FEAT-0001, SPEC-FEAT-0001, TWI-0001, NFR-UX-001, NFR-COMP-001]
supersedes: null
---

# Test plan — center the login and onboarding screens at wide widths

## Scope

In scope: the rendered layout of the three full-screen surfaces (`login-screen.tsx`,
`onboarding-screen.tsx`, `profile-screen.tsx`) at the viewports named in TWI-0001, the preserved
introduction slides, and the existing build gates. Out of scope: data, Worker, store, contracts,
camera and report surfaces, and every viewport not listed here.

## Environments

- **Browser layout check** — `scripts/layout-check.mjs`, Playwright (Chromium) against the Vite
  dev server of this worktree (`bun run dev:web`, `BASE_URL` default `http://localhost:5173`).
  One case per viewport, each case emitting a pass/fail line. This is the only check that can
  fail on the base commit for the wide-width defects.
- **Build gates** — `bun test` and `bun run typecheck` in the worktree. No browser needed.
- The sign-in and introduction surfaces need no credentials: the login surface is public, and
  the introduction is reached by the check's seeded local session (`localStorage` seed written by
  the check, then a reload). If a surface cannot be reached without a real session, the check
  reports the case as skipped and fails the run, never as a pass.

## Data

Synthetic only. The check seeds a local profile record (`Nekibuki`, a fixed display name, three
walk summaries) into `localStorage` under the app's existing keys, and clears it afterwards. No
production database, no real account, no network call to a provider, and no image capture from
the camera.

## Acceptance criteria → test cases

| Criterion | Requirement | Test ids |
| --- | --- | --- |
| AC-1 Login column centred at 1024/1280/1440 | APP-REQ-NEW-1 | `layout/login-wide-column` |
| AC-2 Login phone widths unchanged | APP-REQ-NEW-5 | `layout/phone-gutters-no-overflow` |
| AC-3 Login short-landscape split kept | APP-REQ-NEW-5 | `layout/landscape-split` |
| AC-4 Introduction column centred at 1024/1280/1440 | APP-REQ-NEW-2 | `layout/onboarding-wide-column` |
| AC-5 Three slides and copy preserved | APP-REQ-NEW-4 | `onboarding/three-slides-preserved` |
| AC-6 Introduction phone-width and landscape unchanged | APP-REQ-NEW-5 | `layout/phone-gutters-no-overflow`, `layout/landscape-split` |
| AC-7 Profile column still centred and unchanged | APP-REQ-NEW-3 | `layout/profile-wide-column` |
| AC-8 Browser check fails on base commit, passes after | APP-REQ-NEW-6 | `layout/check-fails-on-base-commit` |
| AC-9 Build gates and console clean | APP-REQ-NEW-1, APP-REQ-NEW-2, APP-REQ-NEW-3 | `gate/typecheck-and-tests` |

## Test cases

- `layout/login-wide-column` — at 1280×800, 1024×768 and 1440×900, measure the login content
  column: width ≤ 768px, `|left margin − right margin| ≤ 2px`, and width within 1px of the
  profile column. Fails on the base commit (column is full width).
- `layout/onboarding-wide-column` — the same three viewports and bounds for the introduction
  header, slide area and footer container. Fails on the base commit.
- `layout/profile-wide-column` — the same three viewports: the profile column stays ≤ 768px and
  centred within 2px, and its bounding box does not change by more than 1px from the base commit
  measurement recorded in the check. Guards against a regression while the other surfaces change.
- `layout/phone-gutters-no-overflow` — at 390×844, 360×640 and 320×568, first content edge is 20px
  from the viewport edge, and `document.documentElement.scrollWidth ≤ innerWidth` on each surface.
- `layout/landscape-split` — at 844×390, the login and introduction content areas each render two
  side-by-side blocks (two children on one row of the grid), not one stacked column.
- `onboarding/three-slides-preserved` — the introduction reports exactly three steps in its
  `Onboarding steps` group, and the rendered title and body text of each step equals the text
  captured from the base commit.
- `layout/check-fails-on-base-commit` — the check run against commit
  `ae51078c39d91dff3be39f142e0ccdcc4a6dea8b` exits non-zero on `layout/login-wide-column` and
  `layout/onboarding-wide-column`, and exits zero on the change branch. Recorded once in the
  implementation pull request transcript.
- `gate/typecheck-and-tests` — `bun run typecheck` exits 0, `bun test` exits 0, and the check
  collects zero console errors on the three surfaces.
