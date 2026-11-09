---
id: GAP-0002
type: gap-analysis
title: Gap analysis — sign-in content sits in the wide-viewport column (S1), redirect round
context: app
issue: 10
related: [FEAT-0001, SPEC-FEAT-0001, TEST-PLAN-FEAT-0001, QUALITY-0002, TWI-0001, ADR-0001, GAP-0001]
supersedes: GAP-0001
---

# Gap analysis — sign-in content sits in the wide-viewport column (S1), redirect round

## Human redirect — restore the sign-in entrance animation

The merge was rejected with: "The request is layout-only ('only the layout changes'). This PR removes
the login screen's entrance animation (the motion.div fade/slide became plain divs). Restore the
animation exactly as on the base commit and get the centred column by wrapping or placing
`mx-auto w-full max-w-2xl` around/inside the animated blocks instead of replacing them."

At the current head, `f94031f`, that is already the shape of the code, and this stage verified it
three ways:

1. **The diff against the base commit is only the wrapper.** `git diff -w
   ae51078c39d91dff3be39f142e0ccdcc4a6dea8b HEAD -- src/screens/login-screen.tsx` adds exactly
   six lines — one comment, the four-line opening
   `<div data-layout-column="login" className="mx-auto flex w-full max-w-2xl flex-1 flex-col
   [@media(orientation:landscape)_and_(max-height:560px)]:contents">` tag, and the matching
   `</div>`. Both `motion.div` blocks appear as unchanged context. The normal (whitespace-sensitive)
   diff shows those blocks as removed and re-added only because the wrapper re-indents them.
2. **The animation props are byte-identical to the base commit.** Extracting every `initial=`,
   `animate=` and `transition=` line from `ae51078` and from HEAD gives the same six lines, in the
   same order, including `initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}`,
   `animate={{ opacity: 1, y: 0 }}`, `transition={spring}` on the copy block and
   `transition={{ ...spring, delay: 0.06 }}` on the action block. No class, copy or media query on
   either block changed.
3. **The rendered surface ships the entrance state.** Server-rendering the real screen
   (`renderLogin()`) gives a column wrapper with the centred classes above, and two children —
   markup `div`, the server rendering of `motion.div` — with
   `style="opacity:0;transform:translateY(16px)"`. `tests/end-to-end/login-wide-column/entrance-animation.test.ts`
   pins exactly that on both blocks and passes; removing the initial state fails it.

The centred column is therefore obtained by wrapping the animated blocks, which is the shape the
redirect asks for, not by replacing them. No code change remained that would answer the redirect,
and this stage cannot make one: its write paths are `docs/gap-analysis/**` only. The person
reviewed this evidence, resolved the approval blocker and sent the work back to this stage; the
product code at `f94031f` is unchanged and still the shape the redirect asks for. If the earlier
revision is reviewed again, note that the re-indentation makes the base `motion.div` lines look
replaced in a side-by-side diff.

## Scope and evidence

Story S1, branch `oasis/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/S1`, base commit
`ae51078c39d91dff3be39f142e0ccdcc4a6dea8b`, head `f94031f`. The product diff is
`src/screens/login-screen.tsx` (one wrapper, nothing else), `scripts/layout-check.mjs` (browser
instrument), `package.json` (`layout:check`), the S1 tests under
`tests/end-to-end/login-wide-column/`, the S1 tick in `tasks.md` and the change-folder documents;
the rest of the branch diff is the change spec, ADR-0001, the architecture/context documents and the
Quality Assurance reports from earlier stages.

Evidence produced or re-checked in this stage:

| Check | Result |
| --- | --- |
| Scans `install`, `static-analysis`, `bundle` | exit 0 each (no open critical or high scan finding) |
| `git diff -w ae51078 HEAD -- src/screens/login-screen.tsx` | wrapper, one comment and closing `</div>` only |
| Animation props base versus head | identical |
| Rendered sign-in markup | column wrapper `mx-auto w-full max-w-2xl`; both blocks `opacity:0;transform:translateY(16px)` |
| `bun test tests/end-to-end/login-wide-column/{entrance-animation,login-wide-column,profile-wide-column}.test.ts` | 3 pass, 0 fail |
| `bun test tests/end-to-end` | 12 pass, 3 fail — the two live-browser cases (no Chromium in this sandbox) and AC-1.6's gate case, whose inner `bun test` includes them; with a browser the gate records 15 pass / 0 fail |
| Whole suite (`bun test`) | 18 pass, 3 fail locally — the same three browser-limited cases; the gate runs the pinned `bun test tests/end-to-end` suite, recorded as 15 pass / 0 fail with a browser |

## Gaps

Every acceptance criterion is implemented and verified; no requirement of the change spec is
missing:

| Criterion | Status | Evidence |
| --- | --- | --- |
| AC-1.1 sign-in column ≤768px and centred at 1280×800, 1024×768, 1440×900 | met | `login-wide-column.test.ts` passes: 672px column, viewport gaps 304/304, 176/176, 384/384 on the compiled Tailwind stylesheet of the rendered screen; fails on the base-commit screen. |
| AC-1.2 sign-in width within 1px of the profile column; profile capped and centred | met | `profile-wide-column.test.ts` passes: both columns 672px at the three viewports, profile margins equal within tolerance. |
| AC-1.3 20px phone gutter, no sideways scroll at 390×844, 360×640, 320×568 | met | `phone-gutters-no-overflow.test.ts` passes (and passes on the base commit, as a preserved-behaviour guard must). |
| AC-1.4 copy and action blocks side by side at 844×390 | met | `landscape-split.test.ts` passes: two boxes on one row spanning the content width; the wrapper becomes `display: contents` under the existing landscape query. |
| AC-1.5 `layout:check` measures the columns, fails on the base commit, passes after the change | met at the Quality gate | `layout-check-browser.test.ts` is an unskipped Playwright spec that runs `bun run layout:check login` against this branch (exit 0, `PASS layout/login-wide-column`) and a `git archive` checkout of `ae51078` (exit 1, `FAIL layout/login-wide-column` as the only failing case); `check-fails-on-base-commit.test.ts` keeps the always-on exit-code contract. The browser spec cannot launch Chromium in this agent sandbox; the gate's run is the evidence. |
| AC-1.6 `typecheck`, `bun test` and `build` pass; no console error on the sign-in surface | met | `gate-typecheck-and-tests.test.ts` runs the three repository scripts plus the render/console check; locally only its inner `bun test` fails on the two browser cases. The three scans (typecheck and build included) exit 0. |

The request's "only the layout changes" constraint holds: the product diff adds a wrapper around
the animated blocks and changes nothing else in the screen.

Test weakening: none. `track.test_signals` reports no added skip/only markers, no deleted or renamed
test files, no reduced assertion counts and no changed expected values; the branch only adds tests
and leaves `tests/end-to-end/smoke.test.ts` untouched. The suite has no skipped cases at HEAD.

## Findings

Scan findings: none (`install`, `static-analysis`, `bundle` all exit 0), so there is no open
critical or high scan finding.

Review findings, title verbatim (none is a product defect; the first is the open approval item):

1. Human merge approval rejected over a claimed removal of the sign-in entrance animation — The
   rejection states the `motion.div` fade/slide became plain divs. At head `f94031f` both
   `motion.div` blocks are present with the base commit's props and rendered initial state
   (`opacity:0;transform:translateY(16px)`), and the only added product lines are the centred
   wrapper, one comment and its closing tag. Resolution: resolved — the person reviewed this
   evidence, resolved the approval blocker and sent the work back; no code change was required.
2. AC-1.5 is met through the per-surface invocation, not the unqualified one — At S1's head,
   `bun run layout:check` with no surface name still exits 1 on `layout/onboarding-wide-column`,
   the introduction case owned by S2. Resolution: accepted by design; `test-plan.md` defines the
   per-surface invocation as the Story's green run and the unqualified run as the whole-feature
   gate after S2 lands.
3. AC-1.5's live-browser cases need Chromium the agent sandbox does not have — `layout-check-browser.test.ts`
   fails at browser launch here (Playwright reports no installed browser) while the dev servers
   answer. Resolution: recorded environment limit; the Quality gate runs the pinned suite outside
   the sandbox, where it records 15 pass / 0 fail, and the base-commit discrimination is also shown
   by the revert check (AC-1.1 and AC-1.2 fail on the base screen).
4. data-layout-column="login" is a test hook in shipped markup — The wrapper carries the attribute
   `scripts/layout-check.mjs` accepts as a column marker, although the check also finds it through
   its `mx-auto` + `max-w-*` classes. Resolution: accepted; documented in the check's header, no
   runtime effect, keeps the instrument stable if the column is ever centred by other classes.
5. The layout check filters Failed to load resource console errors — `gate/no-console-errors` in
   `scripts/layout-check.mjs` ignores resource-load errors so externally hosted artwork cannot
   decide a layout result; a missing app-owned asset would not fail that case. Resolution: accepted
   for this instrument; the Vite build resolves every import and the sign-in render/console case
   still asserts zero console errors for the changed surface.

Code review against the change spec, ADR-0001, contracts and coding standards: the change does what
ADR-0001 decides — one 42rem column expressed per screen by reusing the profile surface's
`mx-auto w-full max-w-2xl` pattern, no shared layout component, no global rule, background left
full-bleed (`<main>` keeps `bg-background`, safe areas and the landscape grid classes). No call,
payload, stored value, prop or export changes; no contract document exists or is needed for this
context; no new dependency (the check uses the existing `playwright-core`); no secret or env file is
touched. The entrance animation is unchanged from the base commit.

## Architecture conformance

Conformant. `contexts.yaml` maps `app` to `src/`, `api` to `worker/` and `shared` to `shared/`. The
only context-owned production file in the Story diff is `src/screens/login-screen.tsx` (`app`);
`scripts/layout-check.mjs`, `package.json` and `tests/end-to-end/` are repository tooling, not a
bounded context. The screen imports only `app`-internal modules (`@/components/brand/logo`,
`@/lib/auth`, `@/lib/motion`, `@/lib/ui-language`); the tests import the `app` screens and
presentation support, and the check drives the app through its own demo session. No `worker/` or
`shared/` file is touched, no cross-context call is added, no contract
(`docs/contexts/*/contracts/`) is added or altered, and the `app` context publishes no OpenAPI or
AsyncAPI document. The change is presentation-only and contract-neutral, as CONTEXT-APP and
ADR-0001 record.

## Release note

Sign-in content now sits in the same centred 42rem column as the profile surface at wide viewports,
with the base commit's entrance animation, the 20px phone gutters and the short-landscape split
unchanged, and `bun run layout:check` guards the measure in a browser.
