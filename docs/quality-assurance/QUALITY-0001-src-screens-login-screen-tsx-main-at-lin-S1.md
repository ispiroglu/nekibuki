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

1. **The layout model resolves margins and overflow like a browser.** It no longer treats any
   column as centred: `margin-inline: auto` splits the leftover space, a one-sided `margin-left:
   auto` takes all of it (right-aligned), a one-sided `margin-right: auto` does the opposite
   (left-aligned), and a column with no auto margin leaves the leftover space on the right
   (left-aligned). AC-1.1 now measures the gap from each **viewport** edge, and AC-1.3 measures a
   **document scroll width** built from every laid-out box — explicit widths and min-widths
   included — not just the column's own width. `layout-model-contract.test.ts` pins that contract:
   the same 672px column is reported centred with `mx-auto` and not centred with `ml-auto`,
   `mr-auto` or no auto margin, and a 900px box inside a 320px viewport is reported as overflow.
2. **AC-1.6 runs the gates.** `gate-typecheck-and-tests.test.ts` executes `bun run typecheck`,
   `bun test` and `bun run build` and asserts all three exit 0 (plus the earlier render/console
   check). Where the agent sandbox cannot resolve the worktree for `bun run`, the same programs the
   scripts start are run directly and the report says so; the gate runs the scripted form outside
   the agent sandbox.

## What was tested

The layout cases render the real screen components (`react-dom/server` on
`src/screens/login-screen.tsx` and `src/screens/profile-screen.tsx`, inside the same router and auth
provider the app mounts), resolve the real Tailwind CSS for the classes that markup emits with
Tailwind's own compiler (the one the Vite build uses), and compute the boxes a browser would lay
out. Nothing reads the change's `data-layout-column` hook or asserts class strings: the sign-in
column is the deepest element holding both the copy heading and the action button, the reference
column is the profile's deepest element holding its heading and stats, and every number comes from
compiled CSS declarations.

Cross-check: the model's viewport-edge gaps for the sign-in column are 304/304, 176/176 and 384/384
at 1280×800, 1024×768 and 1440×900 — the same margins the repository's browser check recorded on
this commit (`scripts/layout-check.mjs`, Implementation evidence).

Files:

- `support.ts` — the layout model: HTML parsing, Tailwind compilation, media resolution, box and
  row placement, auto-margin resolution, document scroll width.
- `login-wide-column.test.ts` — AC-1.1.
- `profile-wide-column.test.ts` — AC-1.2.
- `phone-gutters-no-overflow.test.ts` — AC-1.3.
- `landscape-split.test.ts` — AC-1.4.
- `check-fails-on-base-commit.test.ts` — AC-1.5: runs the real command against real dev servers.
- `gate-typecheck-and-tests.test.ts` — AC-1.6: runs the three repository gates.
- `layout-model-contract.test.ts` — the model's own contract (margin variants, overflow).

## Test-plan review

`TEST-PLAN-FEAT-0001` already maps every S1 criterion to a case, so no criterion was missing. Three
cases would still strengthen a live-browser run and are **not** written as passing tests, because
this stage's model measures boxes, not text or focus:

1. The OAuth failure alert at 1280×800 — the alert sits inside the changed wrapper; a browser case
   should prove it cannot widen the column.
2. Turkish copy at the wide viewports — the longer heading must not push the column past its cap.
3. Keyboard focus order on the sign-in surface — the wrapper becomes `display: contents` in short
   landscape, so DOM order and visual order are worth checking in a browser.

## Results

Branch `oasis/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/S1` at `47fdd9c`.

| Criterion | Test | Result |
| --- | --- | --- |
| AC-1.1 sign-in column ≤768px and centred at 1280×800, 1024×768, 1440×900 | `login-wide-column.test.ts` | pass — 672px wide; viewport gaps 304/304, 176/176, 384/384 |
| AC-1.2 sign-in width within 1px of the profile column; profile capped and centred | `profile-wide-column.test.ts` | pass — sign-in 672px, profile 672px at all three viewports; profile margins 304/304, 176/176, 384/384 |
| AC-1.3 20px phone gutter and no sideways scroll at 390×844, 360×640, 320×568 | `phone-gutters-no-overflow.test.ts` | pass — gutter 20px; document scroll width 390/360/320 against the same viewport widths |
| AC-1.4 copy and action blocks side by side at 844×390 | `landscape-split.test.ts` | pass — two different boxes on one row, copy 0–397px, action 437–796px, spanning the 796px content width |
| AC-1.5 `bun run layout:check` fails on the base commit, passes after | `check-fails-on-base-commit.test.ts` | pass — unknown surface exits 2; on this branch `bun run layout:check login` exits 0 with `PASS layout/login-wide-column`; on a checkout of `ae51078` the same command exits 1 with `FAIL layout/login-wide-column` as the only failing case |
| AC-1.6 `typecheck`, `bun test` and `build` pass; no console error on the sign-in surface | `gate-typecheck-and-tests.test.ts` | pass — the surface renders one heading and one action with zero console errors; `bun run typecheck`, `bun test` and `bun run build` all exit 0 |

Commands run in this worktree:

| Command | Result |
| --- | --- |
| `bun test tests/end-to-end` | 11 pass, 1 skip, 0 fail (8 files) |
| `bun test` (whole suite, includes AC-1.6's own `bun test`) | 17 pass, 1 skip, 0 fail, 47 assertions, 9 files |
| AC-1.6's `bun run typecheck` | exit 0 (sandboxed fallback: `wrangler types` plus `tsc --noEmit` for `tsconfig.app`, `tsconfig.worker`, `tsconfig.node`) |
| AC-1.6's `bun run build` | exit 0 (sandboxed fallback: the Vite build the script runs, with an empty temporary `postcss.config.mjs` because the sandbox denies Vite's upward PostCSS search; removed again) |

The one skip is AC-1.5's browser case: this agent sandbox can launch neither Chromium nor a
reachable dev server. The always-on case still executes `bun run layout:check` and asserts its
exit-code contract; the Quality gate runs the browser case outside the agent sandbox, where the
recorded verdicts are `0` on this branch and `1` on `ae51078`.

## Revert check

With `src/screens/login-screen.tsx` restored to the base commit
`ae51078c39d91dff3be39f142e0ccdcc4a6dea8b` and the new tests left in place:

```
8 pass
1 skip
3 fail
```

- `AC-1.1 … is at most 768px wide and centred …` fails: the column is the full-width surface, so
  the viewport gaps are 0 and 1280 (and 1024, 1440), not equal.
- `AC-1.2 … shares the profile column's measure within 1px …` fails: 1280 vs 672px.
- `AC-1.6 … passes bun run typecheck, bun test and bun run build` fails: the inner `bun test` runs
  the failing tests above.
- The AC-1.5 browser case (skipped in this sandbox) asserts exit 0 on the branch, so it fails on the
  base layout too; on `main`, where `scripts/layout-check.mjs` and the `layout:check` script do not
  exist, the always-on AC-1.5 case fails as well.

The regression guards — phone gutters, landscape split, clean mount, the model contract and the
pre-existing smoke tests — still pass on the base commit, as they must: they are the behaviours and
the measuring instrument this change may not alter.

## Defects

None. No open critical or high defect.

## Limits of this evidence

- AC-1.1 to AC-1.4 are measured by the repository's own rendered markup and compiled stylesheet plus
  a box model, not by a browser engine: text wrapping and real font metrics are outside it. The
  model's fidelity on the two things AC-1.1 and AC-1.3 turn on — one-sided auto margins and boxes
  wider than the viewport — is pinned by `layout-model-contract.test.ts`.
- The browser case of AC-1.5 needs Chromium and a loopback dev server. Where neither exists it is
  skipped, not passed; the report names the environment in which it is skipped.
