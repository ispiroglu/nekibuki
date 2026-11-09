---
id: QUALITY-0001
type: quality-assurance
title: Quality assurance — sign-in content sits in the wide-viewport column (S1)
context: app
issue: 10
related: [FEAT-0001, SPEC-FEAT-0001, TEST-PLAN-FEAT-0001, TWI-0001]
supersedes: null
---

# Quality assurance — sign-in content sits in the wide-viewport column (S1)

## Outcome

All six acceptance criteria of S1 have a checked-in end-to-end test under
`tests/end-to-end/login-wide-column/`, all six pass on the Story branch, the four behaviours that
must not change are proved unchanged, and three of the new tests fail when the change is reverted.
No defect was found.

## What was tested

The Story is a layout change, and the factory gate re-runs `bun test tests/end-to-end` in a plain
worktree with no browser and no dev server. The tests therefore render the real screen components
(`react-dom/server` on `src/screens/login-screen.tsx` and `src/screens/profile-screen.tsx`, inside
the same router and auth provider the app mounts), resolve the real Tailwind CSS for the classes
that markup emits with Tailwind's own compiler (the one the Vite build uses), and compute the box a
browser would lay out: the column's width, its auto margins, the surface gutter and the
short-landscape grid.

The tests do not read the change's `data-layout-column` hook and do not assert class strings:

- The sign-in "column" is the deepest element that holds both the copy block's heading and its
  action button — on the branch a wrapper, on the base commit the full-width `main`.
- The reference "column" on the profile surface is the deepest element holding the profile heading
  and its stats list.
- Every width, margin and gutter comes from compiled CSS declarations, so a different
  implementation that produces the same layout passes.

Files:

- `tests/end-to-end/login-wide-column/support.ts` — the layout model (HTML and JSX tree parsing,
  Tailwind compilation, media-resolution, box measurement).
- `login-wide-column.test.ts` — AC-1.1.
- `profile-wide-column.test.ts` — AC-1.2.
- `phone-gutters-no-overflow.test.ts` — AC-1.3.
- `landscape-split.test.ts` — AC-1.4.
- `check-fails-on-base-commit.test.ts` — AC-1.5.
- `gate-typecheck-and-tests.test.ts` — AC-1.6 (the surface half).

## Test-plan review

`TEST-PLAN-FEAT-0001` already maps every S1 criterion to a case, so no criterion was missing. Three
cases would strengthen the browser run and were **not** added, because this stage's model cannot
measure them honestly:

1. The OAuth failure alert at 1280×800 — the alert sits inside the changed wrapper; a browser case
   should prove it cannot widen the column.
2. Turkish copy at the wide viewports — the longer heading must not push the column past its cap.
3. Keyboard focus order on the sign-in surface — the wrapper becomes `display: contents` in short
   landscape, so DOM order and visual order are worth checking in a browser.

The model measures boxes only: it does not measure text, scrollbars or console output in a live
browser, which is why 1–3 are recorded here rather than written as passing tests.

## Results

Branch `oasis/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/S1` at `47fdd9c`.

| Criterion | Test | Result |
| --- | --- | --- |
| AC-1.1 sign-in column ≤768px and centred at 1280×800, 1024×768, 1440×900 | `login-wide-column.test.ts` | pass — 672px wide, side margins 280/280, 152/152, 360/360 |
| AC-1.2 sign-in width within 1px of the profile column; profile capped and centred | `profile-wide-column.test.ts` | pass — sign-in 672px, profile 672px at all three viewports; profile margins 304/304, 176/176, 384/384 |
| AC-1.3 20px phone gutter and no overflow at 390×844, 360×640, 320×568 | `phone-gutters-no-overflow.test.ts` | pass — gutter 20px, content 350/320/280px against 350/320/280px available |
| AC-1.4 two-column split at 844×390 | `landscape-split.test.ts` | pass — grid with 2 tracks and 2 items; the heading and the action are in different items |
| AC-1.5 the check measures the three surfaces and fails on the base commit, passes after | `check-fails-on-base-commit.test.ts` | pass — `layout:check` is wired and names `layout/login-wide-column`, `layout/onboarding-wide-column`, `layout/profile-wide-column`, the 768px bound and the three wide viewports; the base commit's sign-in column measures 1280/1024/1440px (>768, so the case fails there) while the branch's measures 672px |
| AC-1.6 `typecheck`, `bun test` and `build` pass; no console error on the sign-in surface | `gate-typecheck-and-tests.test.ts` plus the commands below | pass — the surface renders one heading and one action with zero console errors; all three tsc projects are clean; `bun test` is 15/0; `vite build` exits 0 |

Commands run in this worktree:

| Command | Result |
| --- | --- |
| `bun test tests/end-to-end` | 9 pass, 0 fail (7 files: the new 7 tests and the 2 pre-existing smoke tests) |
| `bun test` (regression suite) | 15 pass, 0 fail, 50 assertions, 8 files |
| `node node_modules/wrangler/bin/wrangler.js types` then `tsc --noEmit` for `tsconfig.app`, `tsconfig.worker`, `tsconfig.node` | 0 errors each |
| `vite build` | exit 0 (one temporary empty `postcss.config.mjs` was needed because the sandbox denies Vite's upward PostCSS config search into the run directory; it was removed again) |
| `bun run layout:check` | not runnable here: no Chromium in the sandbox and the dev server cannot start (`CouldntReadCurrentDirectory`) |

## Revert check

With `src/screens/login-screen.tsx` restored to the base commit
`ae51078c39d91dff3be39f142e0ccdcc4a6dea8b` and the new tests left in place:

```
6 pass
3 fail
```

The three failures are exactly the criteria that describe the defect and its detection:

- `AC-1.1 … is at most 768px wide and horizontally centred …` — the column measures the full
  1280/1024/1440px surface.
- `AC-1.2 … shares the profile column's measure within 1px …` — 1280 vs 672px.
- `AC-1.5 … rejects the base commit's sign-in layout and accepts the branch's …` — the rendered
  branch layout is the base layout again.

The regression guards — phone gutters, landscape split, clean mount, and the pre-existing smoke
tests — still pass on the base commit, as they must: they are the behaviours this change is not
allowed to alter.

## Defects

None. No open critical or high defect.

## Limits of this evidence

- The layout numbers come from the compiled stylesheet plus a box model, not from a browser. The
  repository's `bun run layout:check` remains the browser instrument named by the test plan; it
  could not run in this sandbox, so its committed measurement (672px with equal margins) is not
  re-proved here. The new tests do reproduce its verdict on both commits from the markup and CSS.
- The model assumes no classic scrollbar and ignores text-line wrapping; both only matter inside the
  column, whose width is capped by CSS rather than by its content.
