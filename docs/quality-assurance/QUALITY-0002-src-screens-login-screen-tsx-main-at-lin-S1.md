---
id: QUALITY-0002
type: quality-assurance
title: Quality assurance — sign-in content sits in the wide-viewport column (S1), redirect round
context: app
issue: 10
related: [FEAT-0001, SPEC-FEAT-0001, TEST-PLAN-FEAT-0001, TWI-0001, QUALITY-0001, GAP-0001]
supersedes: QUALITY-0001
---

# Quality assurance — sign-in content sits in the wide-viewport column (S1), redirect round

## Outcome

A person sent this Story back to Quality Assurance with three gaps in the end-to-end suite. All
three are done; the product code is untouched.

1. **The layout model now reads the containing block's own alignment.**
   `support.ts:measureColumn` resolved horizontal position from auto margins only, so a column
   centred by a flex parent's `justify-content: center` / `align-items: center` (or a grid parent's
   `justify-items: center`) measured as left-aligned. It now consults the parent's `justify-content`
   (horizontal main axis of a flex row), the item's `align-self` falling back to the parent's
   `align-items` (horizontal cross axis of a flex column), and `justify-self`/`justify-items` for a
   grid, after auto margins, which still win as the CSS cascade requires. `placeChildren` applies
   the same `justify-content` offset when a flex row does not fill its container. The extended
   `layout-model-contract.test.ts` pins it: the same 672px column now reads centred under
   `justify-center`, `items-center` and `justify-items-center`, and not centred under
   `justify-end`, `items-end`, `justify-items-start`, a default flex row or a default flex column.
   With the alignment reading stubbed out, that case fails; with it, it passes.
2. **The restored entrance animation is now under test.** `entrance-animation.test.ts` renders the
   real sign-in surface and asserts the two blocks inside the column ship their fade-and-slide
   initial state (`opacity: 0; transform: translateY(16px)`), read from the rendered inline style
   rather than a class name. Removing the `initial` state from the copy block's `motion.div` makes
   it fail (verified and restored).
3. **AC-1.5's browser case is no longer skipped.** The `test.skipIf(!hasBrowser)` case is gone from
   `check-fails-on-base-commit.test.ts`, which keeps the always-on part: the package script is
   `bun scripts/layout-check.mjs`, and an unknown surface exits 2. The browser measurement moved to
   `browser-check.ts`, a runnable script (`bun tests/end-to-end/login-wide-column/browser-check.ts`)
   that compares this branch (exit 0, `PASS layout/login-wide-column`) with a checkout of the base
   commit (exit 1, `FAIL layout/login-wide-column` as the only failing case). Where no browser can
   be launched it prints `BLOCKED` with the reason and exits 3 instead of skipping, so the suite has
   no skip that could read as a pass. In this sandbox it exits 3, and AC-1.5 is reported `blocked`.

No defect was found. The product change is exactly the base-story implementation: one column wrapper
with `mx-auto w-full max-w-2xl` in `src/screens/login-screen.tsx`, which becomes `display: contents`
in short landscape, and both `motion.div` blocks unchanged, keeping the base commit's entrance
animation.

## Results

Tests under `tests/end-to-end/login-wide-column/`, product code at `6b945b2`.

| Criterion | Test | Result |
| --- | --- | --- |
| AC-1.1 sign-in column ≤768px and centred at 1280×800, 1024×768, 1440×900 | `login-wide-column.test.ts` | pass — 672px wide; viewport gaps 304/304, 176/176, 384/384 |
| AC-1.2 sign-in width within 1px of the profile column; profile capped and centred | `profile-wide-column.test.ts` | pass — sign-in 672px, profile 672px at all three viewports |
| AC-1.3 20px phone gutter and no sideways scroll at 390×844, 360×640, 320×568 | `phone-gutters-no-overflow.test.ts` | pass — gutter 20px; document scroll width 390/360/320 against the same viewport widths |
| AC-1.4 copy and action blocks side by side at 844×390 | `landscape-split.test.ts` | pass — two different boxes on one row, spanning the 796px content width |
| AC-1.5 `bun run layout:check` fails on the base commit, passes after | `check-fails-on-base-commit.test.ts` (contract), `browser-check.ts` (measurement) | blocked — the exit-code contract passes (script wiring; unknown surface exits 2), but the browser measurement cannot run in this agent sandbox: `browser-check.ts` launches no Chromium and reports `BLOCKED`, exit 3. The check is runnable with `bun tests/end-to-end/login-wide-column/browser-check.ts` where a browser exists |
| AC-1.6 `typecheck`, `bun test` and `build` pass; no console error on the sign-in surface | `gate-typecheck-and-tests.test.ts` | pass — surface renders one heading and one action with zero console errors; `bun run typecheck`, `bun test` and `bun run build` exit 0 (sandboxed fallbacks named below) |

Redirect-gap guards, outside the acceptance criteria but now part of the suite:

| Behaviour | Test | Result |
| --- | --- | --- |
| the layout model tells flex/grid alignment apart from auto margins | `layout-model-contract.test.ts` | pass — 8 alignment cases plus the 3 earlier contract cases |
| the sign-in blocks keep the base commit's fade-and-slide entrance | `entrance-animation.test.ts` | pass — both blocks ship `opacity: 0; transform: translateY(16px)`; fails when the initial state is removed |

Commands run in this worktree, from a fresh `bun install --frozen-lockfile`:

| Command | Result |
| --- | --- |
| `bun test tests/end-to-end` | 13 pass, 0 skip, 0 fail (9 files) |
| `bun test` (whole suite) | 19 pass, 0 skip, 0 fail, 59 assertions, 10 files |
| `bun tests/end-to-end/login-wide-column/browser-check.ts` | exit 3, `BLOCKED` (no Chromium in this sandbox) |
| `tsc --noEmit` for `tsconfig.app`, `tsconfig.worker`, `tsconfig.node` | exit 0 each (AC-1.6's `bun run typecheck` cannot resolve the worktree under the seatbelt, so the same programs are run directly) |
| the Vite build | exit 0 (the script's `bun --bun vite build`, with an empty temporary `postcss.config.mjs` because the sandbox denies Vite's upward PostCSS search; removed again) |

## Revert check

With `src/screens/login-screen.tsx` restored to `ae51078c39d91dff3be39f142e0ccdcc4a6dea8b` and the
tests left in place:

```
10 pass
0 skip
3 fail
```

- AC-1.1 fails (the column is the full-width surface, so the viewport gaps are 0 and 1280).
- AC-1.2 fails (1280px against the profile column's 672px).
- AC-1.6 fails (its inner `bun test` runs the failing tests above).
- The layout-model contract, the entrance-animation guard, the phone-gutter, landscape-split,
  clean-mount and pre-existing smoke tests keep passing, as they must: they guard behaviour the base
  commit already had or model behaviour independent of it.
- On `main`, where the check does not exist, the always-on AC-1.5 case fails on the script wiring.

## Test-plan review

The three redirect gaps are now covered by tests: the model's alignment reading
(`layout-model-contract.test.ts`), the restored entrance animation
(`entrance-animation.test.ts`), and the browser measurement as a runnable, explicitly-blocked check
(`browser-check.ts`). The three browser-only cases recorded in QUALITY-0001 (OAuth alert at wide
width, Turkish copy at wide width, focus order under `display: contents`) remain desirable for a
live-browser run and are still not written as passing tests.

## Defects

None. No open critical or high defect.

## Limits of this evidence

- AC-1.1 to AC-1.4 are measured from the rendered markup and compiled stylesheet plus a box model,
  not by a browser engine: text wrapping and real font metrics are outside it. The model's fidelity
  on everything those criteria turn on — auto margins, one-sided auto margins, flex/grid alignment,
  boxes wider than the viewport — is pinned by `layout-model-contract.test.ts`.
- AC-1.5's browser measurement is `blocked` in this sandbox (no launchable Chromium, no reachable
  loopback dev server). It is not skipped and not claimed as a pass; `browser-check.ts` states the
  block and exits 3, and the gate can run it where a browser exists.
- A server render shows the entrance's initial state, not the mounted animation; the test pins the
  initial state both blocks ship, which is what a removed animation changes.
