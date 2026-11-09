---
id: GAP-0001
type: gap-analysis
title: Gap analysis — sign-in content sits in the wide-viewport column (S1)
context: app
issue: 10
related: [FEAT-0001, SPEC-FEAT-0001, TEST-PLAN-FEAT-0001, QUALITY-0001, TWI-0001, ADR-0001]
supersedes: null
---

# Gap analysis — sign-in content sits in the wide-viewport column (S1)

## Scope and evidence

Story S1 of FEAT-0001, branch
`oasis/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/S1`, base commit
`ae51078c39d91dff3be39f142e0ccdcc4a6dea8b`. The Story's implementation diff against the base
commit is `src/screens/login-screen.tsx` (one centred content wrapper), `scripts/layout-check.mjs`
(new browser instrument), `package.json` (the `layout:check` script), the S1 tick in
`docs/changes/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/tasks.md`, and the S1 tests under
`tests/end-to-end/login-wide-column/`. The remaining files in the branch diff are the change
folder, ADR-0001, the architecture/context documents and the QA report from the earlier stages.

Evidence produced in this stage:

| Check | Result |
| --- | --- |
| Scan `install` (`bun install --frozen-lockfile`) | exit 0 |
| Scan `static-analysis` (`bun run typecheck`, three tsc projects) | exit 0 |
| Scan `bundle` (`bun run build`, typecheck + Vite production build) | exit 0 |
| `bun test tests/end-to-end` | 11 pass, 1 skip, 0 fail |
| `bun test` (whole suite) | 17 pass, 1 skip, 0 fail, 47 assertions |
| Revert check: `src/screens/login-screen.tsx` restored to `ae51078`, new tests kept | 6 pass, 1 skip, 3 fail — exactly AC-1.1, AC-1.2 and AC-1.6 fail; worktree restored afterwards (`git status` clean) |
| `bun run layout:check login` in a browser | not runnable in this agent sandbox (no Chromium, no loopback dev server); the checked-in test runs it where a browser exists, and the Quality gate runs it outside the agent sandbox — recorded verdicts 0 on this branch, 1 on `ae51078` |

## Gaps

Every acceptance criterion is implemented and verified on the branch:

| Criterion | Status | Evidence |
| --- | --- | --- |
| AC-1.1 sign-in column ≤768px and centred at 1280×800, 1024×768, 1440×900 | met | `login-wide-column.test.ts` passes: column 672px, viewport gaps 304/304, 176/176, 384/384 on the compiled Tailwind stylesheet of the rendered screen. Fails when the screen is reverted to the base commit. |
| AC-1.2 sign-in width within 1px of the profile column; profile capped and centred | met | `profile-wide-column.test.ts` passes: both columns 672px at the three viewports, profile margins equal within tolerance. Fails on the reverted screen (1280 vs 672px). |
| AC-1.3 20px phone gutter, no sideways scroll at 390×844, 360×640, 320×568 | met | `phone-gutters-no-overflow.test.ts` passes: gutter 20px, document scroll width equals the viewport. Also passes on the base commit, as a preserved-behaviour guard must. |
| AC-1.4 copy and action blocks side by side at 844×390 | met | `landscape-split.test.ts` passes: two different boxes on one row spanning the content width; the wrapper becomes `display: contents` under the existing `orientation:landscape and max-height:560px` query. Passes on the base commit too. |
| AC-1.5 `layout:check` measures the columns, fails on the base commit, passes after the change | met for this Story's surface | `check-fails-on-base-commit.test.ts` runs the real command: unknown surface exits 2; on this branch `bun run layout:check login` exits 0 with `PASS layout/login-wide-column`; on a checkout of `ae51078` the same command exits 1 with `FAIL layout/login-wide-column` as the only failing case. The browser case is skipped where Chromium or a loopback server is unavailable (finding F2); the recorded Quality-gate run has the verdicts above. |
| AC-1.6 `typecheck`, `bun test` and `build` pass; no console error on the sign-in surface | met | `gate-typecheck-and-tests.test.ts` runs the three repository scripts and asserts exit 0, plus the render/console check; this stage re-ran `bun test` (17 pass, 1 skip, 0 fail) and the three scanners above exited 0. |

No requirement of the change spec is unimplemented. The only qualification is AC-1.5's invocation
(finding F1): the criterion is satisfied per surface (`bun run layout:check login`), while the
unqualified feature-wide run stays red on this branch because its introduction case belongs to S2.
That is documented in `test-plan.md` and does not weaken this Story's evidence.

Test weakening: none. `track.test_signals` reports no added skip/only markers, no deleted or
renamed test files, no reduced assertion counts and no changed expected values; the diff adds six
test files and leaves `tests/end-to-end/smoke.test.ts` untouched. The two conditional skips are
environment guards (no Chromium; recursion guard for the inner `bun test`), not weakened
assertions.

## Findings

Scan findings: none. `install`, `static-analysis` and `bundle` all exited 0, so there is no open
critical or high scan finding.

Review findings (all low; none blocks release):

1. **F1 — AC-1.5 is met through the per-surface invocation, not the unqualified one.** At S1's
   head, `bun run layout:check` with no argument still exits 1 on `layout/onboarding-wide-column`,
   the introduction case owned by S2. Resolution: accepted by design — `test-plan.md` defines
   `bun run layout:check login` as the Story's green run and the unqualified run as the
   whole-feature gate after S2 lands.
2. **F2 — AC-1.5's browser case is conditionally skipped without Chromium or a loopback server.**
   `check-fails-on-base-commit.test.ts` skips the case that starts dev servers and runs the check
   when no browser can launch; the always-on case then asserts only the unknown-surface exit code
   and the `layout:check` script wiring. Resolution: recorded limit — the Quality gate and the
   recorded implementation run execute the browser case outside the agent sandbox (branch exit 0,
   base exit 1), and the base-commit discrimination is independently re-proved here by the revert
   check that fails AC-1.1 and AC-1.2.
3. **F3 — `data-layout-column="login"` is a test hook in shipped markup.** The wrapper added to
   the sign-in surface carries the attribute that `scripts/layout-check.mjs` accepts as a column
   marker, although the check already finds the wrapper through its `mx-auto` + `max-w-*` classes.
   Resolution: accepted — the hook is documented in the check's header, has no runtime effect and
   lets the instrument survive a future implementation that centres the column by other classes.
4. **F4 — the layout check filters `Failed to load resource` console errors.** `gate/no-console-errors`
   in `scripts/layout-check.mjs` ignores resource-load errors so externally hosted artwork cannot
   decide a layout result; a missing app-owned asset would therefore not fail that case.
   Resolution: accepted for this instrument — the Vite build resolves every import, and the
   artwork's own availability is not the reading-measure subject; the sign-in render/console case
   in `gate-typecheck-and-tests.test.ts` still asserts zero console errors for the changed surface.

Code review against the change spec, ADR-0001, contracts and coding standards: the change does
what ADR-0001 decides — one 42rem centred column expressed per screen, reusing the profile
surface's existing `mx-auto w-full max-w-2xl` pattern, no shared layout component, no global rule,
background left full-bleed (the cap sits on a new inner wrapper, `<main>` keeps `bg-background`,
safe-area and landscape classes). No call, payload, stored value, prop or export changes; no
contract document exists or is needed for this context. The existing media queries and the 7rem
bottom clearance are kept. No new dependency is added (`playwright-core` was already a dev
dependency) and no secret or env file is touched.

## Architecture conformance

Conformant. `contexts.yaml` maps `app` to `src/`, `api` to `worker/` and `shared` to `shared/`.
The only context-owned production file in the Story diff is `src/screens/login-screen.tsx`
(`app`); `scripts/layout-check.mjs`, `package.json` and `tests/end-to-end/` are repository tooling,
not a bounded context. The screen imports only `app`-internal modules (`@/components/brand/logo`,
`@/lib/auth`, `@/lib/motion`, `@/lib/ui-language`); the new tests import the `app` screens and
presentation support, and the check drives the app through its own demo session. No `worker/` or
`shared/` file is touched, no cross-context call is added, no contract (`docs/contexts/*/contracts/`)
is added or altered, and the `app` context publishes no OpenAPI or AsyncAPI document. The change
is presentation-only and contract-neutral, as recorded in CONTEXT-APP and ADR-0001.

## Release note

Sign-in content now sits in the same centred 42rem column as the profile surface at wide
viewports, with the 20px phone gutters and the short-landscape split unchanged, and `bun run
layout:check` guards the measure in a browser.
