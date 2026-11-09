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

- **Browser layout check** — `scripts/layout-check.mjs`, written as part of S1 and run with
  `bun run layout:check`: Playwright (Chromium) against the Vite dev server of this worktree
  (`bun run dev:web`, `BASE_URL` default `http://localhost:5173`). One case per viewport, each
  case emitting a pass/fail line. This is S1's test for a behaviour change (AGENTS.md) and the
  only check that can fail on the base commit for the wide-width defects. It runs whole or per
  surface; see [Running the layout check](#running-the-layout-check).
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

| Criterion | Story | Requirement | Test ids |
| --- | --- | --- | --- |
| AC-1.1 Login column centred at 1024/1280/1440 | S1 | APP-REQ-NEW-1 | `layout/login-wide-column` |
| AC-1.2 Login width matches the profile column | S1 | APP-REQ-NEW-1, APP-REQ-NEW-3 | `layout/login-wide-column`, `layout/profile-wide-column` |
| AC-1.3 Login phone widths unchanged | S1 | APP-REQ-NEW-5 | `layout/phone-gutters-no-overflow` |
| AC-1.4 Login short-landscape split kept | S1 | APP-REQ-NEW-5 | `layout/landscape-split` |
| AC-1.5 Check fails on base commit, passes after | S1 | APP-REQ-NEW-6 | `layout/check-fails-on-base-commit` |
| AC-1.6 Build gates and console clean | S1 | APP-REQ-NEW-6 | `gate/typecheck-and-tests` |
| AC-2.1 Introduction column centred at 1024/1280/1440 | S2 | APP-REQ-NEW-2 | `layout/onboarding-wide-column` |
| AC-2.2 Introduction width matches the profile column | S2 | APP-REQ-NEW-2, APP-REQ-NEW-3 | `layout/onboarding-wide-column`, `layout/profile-wide-column` |
| AC-2.3 Three slides and copy preserved | S2 | APP-REQ-NEW-4 | `onboarding/three-slides-preserved` |
| AC-2.4 Introduction phone-width and landscape unchanged | S2 | APP-REQ-NEW-5 | `layout/phone-gutters-no-overflow`, `layout/landscape-split` |
| AC-2.5 Build gates and console clean | S2 | APP-REQ-NEW-6 | `gate/typecheck-and-tests` |

## Running the layout check

The check is one instrument shared by both Stories, so it takes surface names:

```
bun run dev:web                      # dev server on :5173, in another terminal
bun run layout:check                 # every surface — the whole-feature gate
bun run layout:check login           # the sign-in surface's cases (AC-1.1 to AC-1.4)
bun run layout:check introduction    # the introduction's cases (AC-2.1 to AC-2.4)
bun run layout:check profile         # the profile reference surface alone
bun run layout:check login profile   # several surfaces at once
```

The surface names are `login`, `introduction` and `profile`; an unknown name exits 2 with the
list. Point the check at another origin with `BASE_URL=https://nekibuki.thecrafter.io`.

Exit codes: `0` every reported case passed, `1` at least one case failed, `2` bad surface name.
With no surface named, every case in the table below runs, which is the gate the whole feature
must pass on `main` after S1 and S2 merge.

What it measures, per surface:

- `login` — the centred column at 1280×800, 1024×768 and 1440×900 (≤768px, equal margins within
  2px, width within 1px of the profile column); the 20px phone gutter and the no-horizontal-
  overflow bound at 390×844, 360×640 and 320×568; the two-column split at 844×390.
- `introduction` — the same wide-column, phone-gutter and landscape cases for the welcome
  header, slide area and footer column.
- `profile` — the same wide-column and phone-gutter cases for the reference surface, whose
  column must keep its base-commit 672px measure.

`gate/no-console-errors` always runs: no console error and no uncaught page error on the way
through sign-in, introduction and profile.

Branch state while the change is in flight:

- On the base commit `ae51078c39d91dff3be39f142e0ccdcc4a6dea8b`, `bun run layout:check login`
  exits 1 on `layout/login-wide-column` (the column is full width), so the case proves the
  defect before it proves the fix.
- On S1's branch the same command exits 0: the sign-in column measures 672px with equal left and
  right margins at all three wide viewports, matches the profile column within 1px, keeps the
  20px phone gutter and the landscape split.
- `bun run layout:check` with no surface name still exits 1 on S1's branch, on
  `layout/onboarding-wide-column` only: the introduction is S2's file and outside S1's scope. The
  whole-feature run goes green when S2's introduction change and the other wide-width surfaces
  land; until then a Story runs the surface it owns.

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
- `layout/check-fails-on-base-commit` — `bun run layout:check login` against commit
  `ae51078c39d91dff3be39f142e0ccdcc4a6dea8b` exits non-zero on `layout/login-wide-column`, and
  exits zero on S1's branch; the same check for the introduction
  (`bun run layout:check introduction`) exits non-zero on the base commit and zero once S2 lands.
  Recorded once in the implementation pull request transcript.
- `gate/typecheck-and-tests` — `bun run typecheck` exits 0, `bun test` exits 0, and the check
  collects zero console errors on the three surfaces.
