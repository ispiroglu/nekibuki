---
id: QUALITY-0001
type: quality-assurance
title: Quality Assurance — introduction content sits in the wide-viewport column
context: app
issue: 12
related: [FEAT-0001, SPEC-FEAT-0001, TEST-PLAN-FEAT-0001, APP-REQ-NEW-2, APP-REQ-NEW-3, APP-REQ-NEW-4, APP-REQ-NEW-5, APP-REQ-NEW-6, S2]
supersedes: null
---

# Quality Assurance — introduction content sits in the wide-viewport column

Story S2 of FEAT-0001 (issue #12). The change under test is the branch
`oasis/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/S2` at commit `290f57f`, whose net
change against the base commit `ae51078` is the three containers of
`src/screens/onboarding-screen.tsx` plus the S2 tick in the change's `tasks.md`.

## Result

The change is verified in a real browser. Every acceptance criterion of S2 has an executable
end-to-end test in `tests/end-to-end/`, all of them pass on the change branch, and the wide-column
test fails on the base commit at all three wide viewports, so it measures the change rather than
restating it.

The suite runs exactly as the Quality gate runs it: `bun test tests/end-to-end` reports
14 pass, 0 fail (the new file plus the pinned `smoke.test.ts`). The repository regression suite
`bun test` reports 20 pass, 0 fail across three files.

## Environment

The tests measure the rendered page, as the change's test plan requires. Each run starts the
repository's own Vite dev server in-process (`createServer`, ephemeral port) and drives it with
Playwright's Chromium, the same stack as `scripts/screenshot.mjs`. Three accommodations, all
no-ops outside a sandboxed runner:

- Chromium launches with a short timeout per launch shape and falls back to
  `--single-process --no-zygote --disable-gpu`, because a sandboxed macOS runner blocks the Mach
  ports a multi-process Chromium needs. The harness detects the factory sandbox from its
  `sandcastle-seatbelt` TMPDIR (or `E2E_SANDBOX=1`) and tries that shape first; the gate needs no
  switch and runs the same file.
- Vite gets an explicit empty PostCSS plugin list; the repository has no PostCSS config and Vite
  would otherwise search above the worktree.
- The tests answer `/api/**` with an empty session, so the static dev server's 401s do not pollute
  the console assertion, and they deny the camera, which the layout checks never use.

The surfaces need no credentials: demo auth is the default. The tests seed the demo user and the
onboarding state in `localStorage` before loading the surface under test.

## Tests

`tests/end-to-end/onboarding-wide-viewport.test.ts`, with the harness in
`tests/end-to-end/support/app.ts`. One file and one browser context, because the gate runs test
files concurrently and a single-process Chromium cannot open a second context in a sandbox. Each
test is named after the change's test-plan id:

| Test | Criterion | What it measures |
| --- | --- | --- |
| `layout/onboarding-wide-column` (1280×800, 1024×768, 1440×900) | AC-2.1, AC-2.2 | Header, slide area and footer boxes: width ≤ 768px, margins equal within 2px, the three boxes on the same width and edges; then the profile column at the same viewport: ≤ 768px, centred within 2px, within 1px of the introduction column |
| `layout/profile-wide-column` (same viewports) | AC-2.2 | The profile column stays capped and centred |
| `onboarding/three-slides-preserved` | AC-2.3 | Exactly three steps in the `Onboarding steps` group, each step's aria-label, and each slide's title and body equal to the base-commit copy |
| `layout/phone-gutters-no-overflow` (390×844, 360×640, 320×568) | AC-2.4 | First content edge 20px from the viewport, `scrollWidth ≤ viewport` |
| `layout/landscape-split` (844×390) | AC-2.4 | Artwork and copy side by side and vertically overlapping, not stacked |
| `gate/typecheck-and-tests` | AC-2.5 | Signing in from the login surface and walking all three slides collects no console error and no uncaught page error |

The columns are located without class names: a column is the widest ancestor narrower than the
viewport, so the tests assert a rendered measure, not a utility class.

The build half of AC-2.5 (`bun run typecheck`, `bun run test`, `bun run build`) is the repository
gate command (`.oasis/checks/regression.yaml`, `implementation-complete.yaml`,
`gap-analysis-scans.yaml`), re-run by oasis outside the sandbox; the test's executable half is the
console-and-page-error assertion.

## Traceability

| Criterion | Test | Result |
| --- | --- | --- |
| AC-2.1 At 1280×800, 1024×768 and 1440×900 the introduction header, slide area and footer share one column ≤ 768px wide, centred, margins equal within 2px | `layout/onboarding-wide-column` | pass — 672px at all three (margins 304/304, 176/176, 384/384), header/slide/footer edges equal within 1px; the same test fails on base commit `ae51078` at all three viewports (column spans the viewport) |
| AC-2.2 At the same viewports the introduction column is within 1px of the profile column, and the profile column stays centred and capped | `layout/onboarding-wide-column`, `layout/profile-wide-column` | pass — introduction and profile columns are both 672px with equal edges at all three viewports; the profile column is ≤ 768px and centred within 2px |
| AC-2.3 Exactly three steps, each title and body equal to the base-commit text | `onboarding/three-slides-preserved` | pass — 3 step buttons, `Step 1..3 of 3` labels, titles and bodies equal to the `ae51078` copy |
| AC-2.4 At 390×844, 360×640 and 320×568 the gutter is 20px with no horizontal overflow; at 844×390 the slide area keeps the two-column split | `layout/phone-gutters-no-overflow`, `layout/landscape-split` | pass — gutter 20px and `scrollWidth ≤ viewport` at all three; artwork and copy side by side at 844×390 |
| AC-2.5 `bun run typecheck`, `bun test`, `bun run build` pass and no console or page error while signing in and walking the three slides | `gate/typecheck-and-tests` | pass — zero console errors and zero page errors through sign-in and all three slides; the build commands are the repository gate command |

## Run evidence (this sandbox)

```sh
bun install --frozen-lockfile
bun test tests/end-to-end                      # 14 pass, 0 fail, exit 0 (new file + smoke)
bun test                                       # 20 pass, 0 fail, exit 0 (3 files, regression)
```

These are the gate's own commands, run unchanged. The sandbox ordering of the browser launch
shapes is detected, not requested, so the same file runs outside the factory too.

With the same tests overlaid on the untouched base commit `ae51078` in a separate git worktree,
`bun test tests/end-to-end` exits 1 with 10 pass and 4 fail: `layout/onboarding-wide-column` fails
at 1280×800, 1024×768 and 1440×900. The fourth red case is the console assertion, which reported
mock-auth session-probe noise in that worktree and is not used as the revert proof. The
preservation and profile cases pass on both trees.

## Defects

None. No open critical or high defect. No environment or product blocker remains: the end-to-end
tests are checked in where the gate runs them.
