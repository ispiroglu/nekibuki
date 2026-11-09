---
id: QUALITY-0004
type: quality-assurance
title: Quality assurance — Fold & archive of FEAT-0001
context: app
issue: 9
related: [FEAT-0001, SPEC-FEAT-0001, BEHAVIOR-APP-READING-MEASURE, APP-DOMAIN-MODEL, APP-GLOSSARY, QUALITY-0001, QUALITY-0002, TEST-PLAN-FEAT-0001]
supersedes: null
---

# Quality assurance — Fold & archive of FEAT-0001

The Story under test is the Fold & archive track of FEAT-0001 (issue #9) at branch
`oasis/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/fold`, commit `4adc6d5`, whose parent is
the released main tip `e844f79`. The net change against `e844f79` is `docs/**` only: the living
app behaviour doc, the app domain model, the app glossary, and the archived change spec.

## Result

The fold criterion is met. All six change-spec requirements are in the living behaviour doc under
real ids with their source and the test that checks each one, the domain model and glossary carry
the change, and the change spec is archived with its verified commit stamped and all three tasks
ticked. The regression suite passes everywhere this sandbox can run it; the four Chromium-dependent
cases fail only at browser launch, which is a sandbox limit and not a regression, and the gate
re-runs them outside the sandbox.

## Fold verification

| What the fold must reflect | Where it lives now | Result |
| --- | --- | --- |
| Sign-in reading measure (`APP-REQ-NEW-1`) | `APP-REQ-001` in `docs/contexts/app/behavior/reading-measure.md` | pass — same rule, source and 42rem cap |
| Introduction reading measure (`APP-REQ-NEW-2`) | `APP-REQ-002` in the same doc | pass — header, slide area and footer share one column |
| Profile measure retained (`APP-REQ-NEW-3`) | `APP-REQ-003` in the same doc | pass — profile stays the reference measure |
| Introduction content preserved (`APP-REQ-NEW-4`) | `APP-REQ-004` in the same doc | pass — the three slides named verbatim |
| Phone and short-landscape layout preserved (`APP-REQ-NEW-5`) | `APP-REQ-005` in the same doc | pass — gutters and split layouts kept |
| Wide-viewport browser check (`APP-REQ-NEW-6`) | `APP-REQ-006` in the same doc | pass — the check and its viewports recorded |
| Provenance from the change-spec ids | "Fold provenance" table in the same doc | pass — all six old ids map to the living ids |
| Domain model reflects the change | `docs/contexts/app/domain-model.md`, "Effect of the reading-measure change" | pass — no aggregate/entity/value object/command/event/state transition added; reading measure is presentation, not stored |
| Glossary reflects the change | `docs/contexts/app/glossary.md`, "Layout language" | pass — reading measure, surfaces, gutter, wide viewport, split layout, layout check defined |
| Change spec archived | `docs/changes/archive/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/` | pass — all six spec files moved; no copy remains under `docs/changes/` |
| Verified commit stamped | `spec.md` front matter, `verified_commit: e844f79` | pass — matches the parent commit and the released main tip |
| Tasks ticked | `tasks.md` | pass — S1, S2 and Fold & archive all `[x]` |

No requirement was dropped, renumbered against another living id, or weakened. The living doc's
requirement ids `APP-REQ-001`..`APP-REQ-006` do not collide with any other living requirement.

## Regression evidence

The diff is documentation only, so no runtime behaviour can change; the suite is run anyway to
prove nothing else moved.

| Command | Result |
| --- | --- |
| `bun install --frozen-lockfile` | exit 0 — second pass "Checked 824 installs across 816 packages (no changes)" |
| `npx wrangler types` | exit 0 — `worker-configuration.d.ts` written (gitignored) |
| `tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `tsc --noEmit -p tsconfig.worker.json` | exit 0 |
| `tsc --noEmit -p tsconfig.node.json` | exit 0 |
| `bun test` | 18 pass / 0 skip / 4 fail (22 tests, 12 files) |
| `bun test tests/end-to-end` | 12 pass / 0 skip / 4 fail (16 tests, 11 files) |
| `vite build` (via `node node_modules/vite/bin/vite.js build`) | exit 0 — 34 precache entries, PWA generated |

On the first install pass the `workerd` lifecycle script fails to spawn with
`CouldntReadCurrentDirectory` — the same sandbox limit that blocks Vite when it is spawned through
`bun --bun`; a second pass reports no changes and exits 0, and `wrangler types` then generates the
gitignored `worker-configuration.d.ts` directly. Without that generated file the worker project
correctly reports the missing `Env` type, so the three `tsc` results above are taken after
`wrangler types` ran.

The four failures are all one cause — no launchable Chromium in this seatbelt sandbox:

- `tests/end-to-end/onboarding-wide-viewport.test.ts` — suite-level browser case: "no browser
  launched: Executable doesn't exist at …/ms-playwright/chromium_headless_shell-1248/…".
- `tests/end-to-end/login-wide-column/layout-check-browser.test.ts` — "passes the wide sign-in
  column on this branch" and "fails on the base commit…", both fail at browser launch.
- `tests/end-to-end/login-wide-column/gate-typecheck-and-tests.test.ts` — AC-1.6's gate case,
  which re-runs `bun run typecheck`, `bun test` and `bun run build`; its inner `bun test` inherits
  the failures above (and the inner run reports the one deliberate skip, `test.skipIf(innerRun)`,
  that stops the gate case from recursing into itself).

The last recorded quality-gate run with a browser is 15 pass / 0 fail for the S1 suite, and the
S2 suite was verified in a real browser, so the browser cases have evidence from outside this
sandbox; this run does not repeat it and does not claim it.

## Test-plan review

The fold Story adds no behaviour, so its `regression` criterion needs no new test. The six folded
requirements each already name their checking test in the living doc
(`layout/login-wide-column`, `layout/onboarding-wide-column`, `layout/profile-wide-column`,
`onboarding/three-slides-preserved`, `layout/phone-gutters-no-overflow`, `layout/landscape-split`,
`layout/check-fails-on-base-commit`, `gate/typecheck-and-tests`), and those tests exist under
`tests/end-to-end/` and `scripts/layout-check.mjs`.

## Defects

None. No open critical or high defect. The browser-launch failures above are a sandbox limit
recorded under "Limits of this evidence", not defects in the change: they reproduce on the
untouched released code and cannot be caused by a docs-only diff.

## Limits of this evidence

- The browser-dependent cases (the suite-level onboarding case, the two live `layout:check`
  comparisons, and AC-1.6's inner gate run) cannot be executed here: Playwright reports no
  installed Chromium. They fail at launch, not at an assertion. They are `blocked` by the sandbox
  and are re-run by the quality gate outside it.
- `bun run typecheck` and `bun run build` are not directly runnable through bun in this sandbox
  because the spawned `wrangler`/`vite` process cannot read the worktree; their constituent steps
  (`wrangler types`, `tsc` over all three projects, and the Vite bundle) all exit 0 when invoked
  directly.
- The fold is a documentation change; its correctness was checked by reading the living documents
  against the change spec requirement by requirement, not by execution.
