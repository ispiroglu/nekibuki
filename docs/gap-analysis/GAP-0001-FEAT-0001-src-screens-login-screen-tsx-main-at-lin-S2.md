---
id: GAP-0001
type: gap-analysis
title: Gap analysis — introduction content sits in the wide-viewport column
context: app
issue: 12
related: [FEAT-0001, SPEC-FEAT-0001, TEST-PLAN-FEAT-0001, QUALITY-0001, ADR-0001, APP-REQ-NEW-2, APP-REQ-NEW-3, APP-REQ-NEW-4, APP-REQ-NEW-5, APP-REQ-NEW-6, S2]
supersedes: null
---

# Gap analysis — introduction content sits in the wide-viewport column

Story S2 of FEAT-0001 (issue #12). Reviewed object: pull request #21, branch
`oasis/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/S2` at `ad213a0`
(`origin/main` is an ancestor, so the branch is 5 commits ahead and carries no stale base).

Diff against `origin/main` (5 files):

| File | Change |
| --- | --- |
| `src/screens/onboarding-screen.tsx` | +3/-3: `mx-auto` + `w-full` + `max-w-2xl` on the welcome header, the slide area and the footer container |
| `tests/end-to-end/onboarding-wide-viewport.test.ts` | new: Playwright layout and content tests for S2 (QA) |
| `tests/end-to-end/support/app.ts` | new: Vite + Chromium harness used by the tests (QA) |
| `docs/quality-assurance/QUALITY-0001-…-S2.md` | new: QA report |
| `docs/changes/FEAT-0001-…/tasks.md` | S2 ticked |

No other code, contract, Worker, store or dependency file changes. `src/screens/profile-screen.tsx`
is untouched, as the scope map requires.

## Gaps

Every acceptance criterion of the story is implemented and backed by an executed test. No open
gap remains.

| Criterion | Implementation | Verification | Status |
| --- | --- | --- | --- |
| AC-2.1 At 1280×800, 1024×768 and 1440×900 the introduction header, slide area and footer share one column ≤ 768px, centred, margins equal within 2px | All three containers carry `mx-auto w-full max-w-2xl` (42rem = 672px); the root stays full-bleed | `layout/onboarding-wide-column` ×3 — 672px at all three, margins 304/304, 176/176, 384/384, edges within 1px; same test fails on base `ae51078` | Implemented, verified |
| AC-2.2 Same viewports: introduction column within 1px of the profile column; profile stays centred and capped | The three containers use the identical utility set as `profile-screen.tsx:66` (`mx-auto w-full max-w-2xl px-5`) | `layout/onboarding-wide-column` (profile comparison in the same test) and `layout/profile-wide-column` ×3 — both 672px with equal edges | Implemented, verified |
| AC-2.3 Exactly three steps, each title and body equal to base-commit copy | `Slide[]` unchanged; the diff touches only class strings | `onboarding/three-slides-preserved` — 3 step buttons, `Step n of 3` labels, titles and bodies equal to the `ae51078` source text (re-checked against `git show ae51078:src/screens/onboarding-screen.tsx`) | Implemented, verified |
| AC-2.4 At 390×844, 360×640, 320×568 gutter 20px and no horizontal overflow; at 844×390 the slide area keeps the two-column split | `px-5 sm:px-6` gutters, `overflow-x-hidden` root and every `orientation:landscape` / `max-height:560px` query are unchanged; `max-w-2xl` is inactive below 672px | `layout/phone-gutters-no-overflow` ×3 and `layout/landscape-split` | Implemented, verified |
| AC-2.5 `bun run typecheck`, `bun test`, `bun run build` pass; no console or page error through sign-in and the three slides | No build-side file changed by S2 | Handed-over scans: static-analysis exit 0, bundle exit 0 (`bun run build` = typecheck + Vite build); QA ran the gate command `bun test tests/end-to-end` → 14 pass; `gate/typecheck-and-tests` asserts zero console and page errors. Re-checked here: `bun install --frozen-lockfile` exit 0 and `tsc --noEmit` for `tsconfig.app.json` and `tsconfig.node.json` exit 0 | Implemented, verified |

### Documented deviations (no functional gap)

- The test plan names `scripts/layout-check.mjs` (`bun run layout:check`) as the browser check.
  That file belongs to S1's scope map; S2's criteria are executed by the equivalent in-process
  Vite + Chromium suite in `tests/end-to-end/`, which is the directory the Quality gate runs.
  Recorded as a low finding below.
- S2 adds no `layout:check` script and no package dependency, as the scope map dictates.
- Commit `290f57f` reverted an earlier `package.json` workaround to its base content, so the
  branch's build is unmodified; the handed-over `bundle` scan, not a local hack, is the build
  evidence.

## Scans

Scanners handed over in `track.scans`; every one exited zero, so no scan finding exists.

| Scanner | Exit | Classification |
| --- | --- | --- |
| `install` (`bun install --frozen-lockfile`) | 0 | no finding |
| `static-analysis` (`bun run typecheck`: wrangler types + tsc over app, worker, node) | 0 | no finding |
| `bundle` (`bun run build`: typecheck + Vite production build) | 0 | no finding |

No open critical, high or medium scan finding. The repository configures no secret scanner and no
dependency-advisory scanner (`.oasis/checks/gap-analysis-scans.yaml`), so none was expected; the
change adds no dependency, no secret, no route and no data handling — it is three Tailwind
class strings on JSX containers — so the security exposure of this diff is nil.

## Test integrity

`track.test_signals` is empty: no test marker added, no test file deleted or renamed, no
assertion count reduced, no expected value changed. The only test change is additive (a new
end-to-end file and its harness). The pre-existing `tests/end-to-end/smoke.test.ts` and
`tests/walk-plan.test.ts` are untouched.

Judgement: no unit or integration test was weakened, so no weakened-test finding.

## Findings

### 1. Test plan names scripts/layout-check.mjs while the story's layout checks live in tests/end-to-end

- Severity: low
- Detail: `TEST-PLAN-FEAT-0001` and `APP-REQ-NEW-6` name `scripts/layout-check.mjs` and
  `bun run layout:check` as the browser instrument; the acceptance criteria `layout/onboarding-wide-column`,
  `layout/profile-wide-column`, `layout/phone-gutters-no-overflow` and `layout/landscape-split` are
  instead executed by `tests/end-to-end/onboarding-wide-viewport.test.ts`, which starts Vite
  in-process and drives Chromium. The S1 scope map owns `scripts/layout-check.mjs`, so S2 could not
  add it.
- Resolution: accepted. The substituted suite measures the same rendered boxes at the same
  viewports with the same tolerances, is the directory the Quality gate runs, fails on the base
  commit at all three wide viewports, and is recorded in the QA report. No criterion is unproven.

### 2. New end-to-end test code is outside every tsconfig project and is not typechecked

- Severity: low
- Detail: `tsconfig.app.json` includes `src` and `shared`; `tsconfig.node.json` includes only
  `vite.config.ts`; `tsconfig.worker.json` includes `worker` and `shared`. The 511 new lines under
  `tests/end-to-end/` are therefore not covered by `bun run typecheck`, and `bun test` strips types
  without checking them.
- Resolution: accepted. This is the repository's pre-existing convention (`tests/end-to-end/smoke.test.ts`,
  `tests/walk-plan.test.ts` are likewise outside the projects); the added code runs green in the
  gate command, and widening a tsconfig is outside this story's scope map and risk surface.

## Architecture conformance

Conforms. No cross-context reference is added.

- The changed module `src/screens/onboarding-screen.tsx` imports only `app`-context modules
  (`@/components/brand/logo`, `@/lib/auth`, `@/lib/motion`, `@/lib/utils`, `@/lib/ui-language`,
  `@/store/preferences`) plus `motion` and `react`. It imports nothing from `worker/` or `shared/`,
  so no contract mediation is required; the change adds no call, payload, stored value or new
  cross-context dependency (`docs/strategy/context-map.md`, `docs/contexts/app/README.md`).
- The new test harness imports only dev tooling (`vite`, `playwright-core`) and repository-relative
  paths; it is test infrastructure, not a context dependency.
- The measure reuses the existing centred-column pattern instead of a shared layout layer or a
  global width rule, as ADR-0001 decides; the camera stays full-bleed and the report and legal
  surfaces are untouched.
- No contract document changes: `app` publishes no OpenAPI/AsyncAPI document, and `shared/` is not
  edited. `docs/contexts/api/contracts/` is not touched.
- Coding standards: utility classes follow the file's existing Tailwind order and the profile
  screen's pattern; no new abstraction, no dead code, no comment churn.

## Merge readiness

- PR #21 branch equals the reviewed commit (`ad213a0`); `origin/main` is an ancestor, so the
  branch has no conflict with the integration branch.
- Handed-over scanners are all green; no critical or high finding exists.
- Remaining items owned outside this stage: a person's merge approval on PR #21, and flipping the
  PR from draft to ready — this sandbox has no GitHub credentials (`gh` is unauthenticated), so
  neither can be produced here.

Release note: The introduction now centres its welcome header, slide area and footer in the same
42rem column as the profile screen at 1024px and wider; phone gutters and the short-landscape
split layout are unchanged, and all three slides and their copy are preserved.
