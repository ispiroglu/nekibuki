---
id: QUALITY-0002
type: quality-assurance
title: Quality assurance — sign-in content sits in the wide-viewport column (S1), re-verification
context: app
issue: 10
related: [FEAT-0001, SPEC-FEAT-0001, TEST-PLAN-FEAT-0001, TWI-0001, QUALITY-0001, GAP-0001]
supersedes: QUALITY-0001
---

# Quality assurance — sign-in content sits in the wide-viewport column (S1), re-verification

## Outcome

This is a re-verification of S1 after the Implementation round that answered the merge-approval
finding. That round changed exactly one thing in the product: a one-line comment above the sign-in
column wrapper in `src/screens/login-screen.tsx` recording that the two `motion.div` blocks keep the
base commit's entrance animation. The wrapper, its `mx-auto w-full max-w-2xl` cap, its
`display: contents` behaviour in short landscape, the copy and both media queries are unchanged
(`git diff 47fdd9c HEAD -- src/screens/login-screen.tsx` is that single comment). The end-to-end
suite is unchanged too.

All six acceptance criteria of S1 still pass on the current head `6b945b2`, the regression guards
still pass, and reverting the sign-in screen to the base commit `ae51078` still fails the three
tests that describe the defect. No defect was found.

The method and the test files are those recorded in QUALITY-0001 and are not repeated here: the
layout cases render the real screen components with `react-dom/server`, resolve the real Tailwind
CSS with Tailwind's own compiler, and measure the boxes a browser would lay out — including
one-sided auto margins and a document scroll width over every laid-out box; the model's own contract
is pinned by `layout-model-contract.test.ts`; AC-1.5 runs the real `bun run layout:check` against a
branch and a base-commit dev server and asserts its exit codes; AC-1.6 runs `bun run typecheck`,
`bun test` and `bun run build`.

## Results

Head `6b945b2`, tests under `tests/end-to-end/login-wide-column/`.

| Criterion | Test | Result |
| --- | --- | --- |
| AC-1.1 sign-in column ≤768px and centred at 1280×800, 1024×768, 1440×900 | `login-wide-column.test.ts` | pass — 672px wide; viewport gaps 304/304, 176/176, 384/384 |
| AC-1.2 sign-in width within 1px of the profile column; profile capped and centred | `profile-wide-column.test.ts` | pass — sign-in 672px, profile 672px at all three viewports |
| AC-1.3 20px phone gutter and no sideways scroll at 390×844, 360×640, 320×568 | `phone-gutters-no-overflow.test.ts` | pass — gutter 20px; document scroll width 390/360/320 against the same viewport widths |
| AC-1.4 copy and action blocks side by side at 844×390 | `landscape-split.test.ts` | pass — two different boxes on one row, spanning the 796px content width |
| AC-1.5 `bun run layout:check` fails on the base commit, passes after | `check-fails-on-base-commit.test.ts` | pass — unknown surface exits 2; branch run exits 0 with `PASS layout/login-wide-column`; base-commit run exits 1 with `FAIL layout/login-wide-column` as the only failing case; the live-browser case is skipped in this sandbox, as recorded below |
| AC-1.6 `typecheck`, `bun test` and `build` pass; no console error on the sign-in surface | `gate-typecheck-and-tests.test.ts` | pass — surface renders one heading and one action with zero console errors; the three gates exit 0 |

Commands run in this worktree, from a fresh `bun install --frozen-lockfile`:

| Command | Result |
| --- | --- |
| `bun test tests/end-to-end` | 11 pass, 1 skip, 0 fail (8 files) |
| `bun test` (whole suite) | 17 pass, 1 skip, 0 fail, 47 assertions, 9 files |
| AC-1.6's `bun run typecheck` | exit 0 (sandboxed fallback: `tsc --noEmit` for `tsconfig.app`, `tsconfig.worker`, `tsconfig.node`, reusing the generated `worker-configuration.d.ts`) |
| AC-1.6's `bun run build` | exit 0 (sandboxed fallback: the Vite build the script runs, with an empty temporary `postcss.config.mjs` because the sandbox denies Vite's upward PostCSS search; removed again) |

The one skip is AC-1.5's live-browser case: this agent sandbox can launch neither Chromium nor a
reachable dev server. The always-on case still executes `bun run layout:check` and asserts its
exit-code contract; the gate runs the browser case outside the agent sandbox.

## Revert check

With `src/screens/login-screen.tsx` restored to `ae51078c39d91dff3be39f142e0ccdcc4a6dea8b` and the
tests left in place:

```
8 pass
1 skip
3 fail
```

- AC-1.1 fails (the column is the full-width surface, so the viewport gaps are 0 and 1280).
- AC-1.2 fails (1280px against the profile column's 672px).
- AC-1.6 fails (its inner `bun test` runs the failing tests above).
- AC-1.5's skipped browser case asserts exit 0 on the branch and would fail on the base layout; on
  `main`, where the check does not exist, the always-on AC-1.5 case fails as well.

The regression guards — phone gutters, landscape split, clean mount, the model contract and the
pre-existing smoke tests — still pass on the base commit, as they must.

## Test-plan review

No case was missing from `TEST-PLAN-FEAT-0001` for S1 and none was added this round. The three
browser-only cases recorded in QUALITY-0001 (OAuth alert at wide width, Turkish copy at wide width,
focus order under `display: contents`) remain desirable for a live-browser run and are still not
written as passing tests, because this stage's model measures boxes, not text or focus.

## Defects

None. No open critical or high defect.

## Limits of this evidence

- AC-1.1 to AC-1.4 are measured from the rendered markup and compiled stylesheet plus a box model,
  not by a browser engine: text wrapping and real font metrics are outside it. The model's fidelity
  on the two things AC-1.1 and AC-1.3 turn on — one-sided auto margins and boxes wider than the
  viewport — is pinned by `layout-model-contract.test.ts`.
- AC-1.5's browser case needs Chromium and a loopback dev server; where neither exists it is
  skipped, not passed.
