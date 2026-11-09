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
`tests/end-to-end/login-wide-column/`, all six pass on the Story branch, the behaviours that must not
change are proved unchanged, and the tests that describe the defect fail when the change is
reverted. No defect was found.

This round fixes the two findings of the previous gate:

1. **AC-1.5 now runs the command.** `check-fails-on-base-commit.test.ts` executes
   `bun run layout:check login` against a real dev server twice — once on this branch, once on a
   checkout extracted from the base commit — and asserts the real exit codes (`0`, then `1`) and the
   real case lines (`PASS`/`FAIL layout/login-wide-column`). It no longer reads the script's source
   text or re-derives the verdict with a second model. A no-op or broken check fails this test.
2. **AC-1.4 now asserts boxes, not mechanism.** `landscape-split.test.ts` asserts that the copy
   block and the action block are two different boxes, on one row, side by side, together spanning
   the surface's content width. `display`, track counts and item counts are no longer asserted, so a
   grid, a flex row or any other mechanism that puts the two blocks side by side passes.

## What was tested

The layout cases render the real screen components (`react-dom/server` on
`src/screens/login-screen.tsx` and `src/screens/profile-screen.tsx`, inside the same router and auth
provider the app mounts), resolve the real Tailwind CSS for the classes that markup emits with
Tailwind's own compiler (the one the Vite build uses), and compute the box a browser would lay out —
width, auto margins, gutter, and the position of each block on the row. The tests do not read the
change's `data-layout-column` hook and do not assert class strings: the sign-in column is the
deepest element holding both the copy heading and the action button, the reference column is the
profile's deepest element holding its heading and stats, and every number comes from compiled CSS
declarations.

Files:

- `support.ts` — the layout model (HTML parsing, Tailwind compilation, media resolution, box and
  row placement).
- `login-wide-column.test.ts` — AC-1.1.
- `profile-wide-column.test.ts` — AC-1.2.
- `phone-gutters-no-overflow.test.ts` — AC-1.3.
- `landscape-split.test.ts` — AC-1.4.
- `check-fails-on-base-commit.test.ts` — AC-1.5 (spawns the real command and a real dev server).
- `gate-typecheck-and-tests.test.ts` — AC-1.6 (the surface half).

## Test-plan review

`TEST-PLAN-FEAT-0001` already maps every S1 criterion to a case, so no criterion was missing. Three
cases would still strengthen a browser run and are **not** written as passing tests, because this
stage's model measures boxes, not text or focus:

1. The OAuth failure alert at 1280×800 — the alert sits inside the changed wrapper; a browser case
   should prove it cannot widen the column.
2. Turkish copy at the wide viewports — the longer heading must not push the column past its cap.
3. Keyboard focus order on the sign-in surface — the wrapper becomes `display: contents` in short
   landscape, so DOM order and visual order are worth checking in a browser.

## Results

Branch `oasis/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/S1` at `47fdd9c`.

| Criterion | Test | Result |
| --- | --- | --- |
| AC-1.1 sign-in column ≤768px and centred at 1280×800, 1024×768, 1440×900 | `login-wide-column.test.ts` | pass — 672px wide, side margins 280/280, 152/152, 360/360 |
| AC-1.2 sign-in width within 1px of the profile column; profile capped and centred | `profile-wide-column.test.ts` | pass — sign-in 672px, profile 672px at all three viewports; profile margins 304/304, 176/176, 384/384 |
| AC-1.3 20px phone gutter and no overflow at 390×844, 360×640, 320×568 | `phone-gutters-no-overflow.test.ts` | pass — gutter 20px, content 350/320/280px against 350/320/280px available |
| AC-1.4 copy and action blocks side by side at 844×390 | `landscape-split.test.ts` | pass — two different boxes on one row, copy 0–397px, action 437–796px, spanning the 796px content width |
| AC-1.5 `bun run layout:check` fails on the base commit, passes after | `check-fails-on-base-commit.test.ts` | pass — unknown surface exits 2; on this branch `bun run layout:check login` exits 0 with `PASS layout/login-wide-column`; on a checkout of `ae51078` the same command exits 1 with `FAIL layout/login-wide-column` as the only failing case |
| AC-1.6 `typecheck`, `bun test` and `build` pass; no console error on the sign-in surface | `gate-typecheck-and-tests.test.ts` plus the commands below | pass — the surface renders one heading and one action with zero console errors; all three tsc projects are clean; `bun test` passes; `vite build` exits 0 |

Commands run in this worktree:

| Command | Result |
| --- | --- |
| `bun test tests/end-to-end` | 8 pass, 1 skip, 0 fail (7 files) |
| `bun test` (regression suite) | 14 pass, 1 skip, 0 fail, 41 assertions, 8 files |
| `wrangler types`, then `tsc --noEmit` for `tsconfig.app`, `tsconfig.worker`, `tsconfig.node` | 0 errors each |
| `vite build` | exit 0 (one temporary empty `postcss.config.mjs` was needed because this sandbox denies Vite's upward PostCSS config search into the run directory; it was removed again) |

The one skip is AC-1.5's browser case: this agent sandbox can launch neither Chromium nor a
reachable dev server (`CouldntReadCurrentDirectory`, no Playwright browser, loopback denied). The
always-on case still executes `bun run layout:check` and asserts its exit-code contract. The Quality
gate runs these commands outside the agent sandbox, where the browser case executes in full; the
same command is recorded green on this branch by the Implementation evidence
(`bun run layout:check login` → 0) and red on `ae51078` (→ 1, `layout/login-wide-column`).

## Revert check

With `src/screens/login-screen.tsx` restored to the base commit
`ae51078c39d91dff3be39f142e0ccdcc4a6dea8b` and the new tests left in place:

```
6 pass
1 skip
2 fail
```

- `AC-1.1 … is at most 768px wide and horizontally centred …` fails: the column measures the full
  1280/1024/1440px surface.
- `AC-1.2 … shares the profile column's measure within 1px …` fails: 1280 vs 672px.
- The AC-1.5 browser case (skipped in this sandbox) asserts exit 0 on the branch, so it fails on the
  base layout as well. On `main`, where `scripts/layout-check.mjs` and the `layout:check` script do
  not exist yet, the always-on AC-1.5 case also fails (the command cannot exit 2 for an unknown
  surface).

The regression guards — phone gutters, landscape split, clean mount and the pre-existing smoke tests
— still pass on the base commit, as they must: they are the behaviours this change may not alter.

## Defects

None. No open critical or high defect.

## Limits of this evidence

- The layout numbers for AC-1.1 to AC-1.4 come from the compiled stylesheet plus a box model, not
  from a browser; text wrapping, scrollbars and console output in a live browser are outside it.
  AC-1.5 covers the live-browser verdict through the repository's own check where a browser exists.
- The browser case needs Chromium and a loopback dev server. Where neither exists it is skipped, not
  passed; the report names the environment in which it is skipped.
