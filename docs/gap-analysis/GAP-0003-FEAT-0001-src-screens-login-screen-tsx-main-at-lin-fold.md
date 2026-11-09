---
id: GAP-0003
type: gap-analysis
title: Gap analysis — Fold & archive of FEAT-0001
context: app
issue: 9
related: [FEAT-0001, SPEC-FEAT-0001, TASKS-FEAT-0001, TEST-PLAN-FEAT-0001, QUALITY-0004, ADR-0001, BEHAVIOR-APP-READING-MEASURE, APP-DOMAIN-MODEL, APP-GLOSSARY, GAP-0001]
supersedes: null
---

# Gap analysis — Fold & archive of FEAT-0001

The Story under analysis is the Fold & archive track of FEAT-0001 (issue #9), pull request #23,
branch `oasis/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/fold` at head `87529ea`, whose
base is the released `main` tip `e844f79` (both releases, S1 and S2, landed there). The change spec
is `docs/changes/archive/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/`; its feature base
commit is `ae51078c39d91dff3be39f142e0ccdcc4a6dea8b`.

The diff `e844f79..87529ea` is 11 files and one line of product-adjacent change:

| File | Change |
| --- | --- |
| `docs/changes/archive/FEAT-0001-…/{scope,strategic,tactical,test-plan}.md` | moved unchanged from `docs/changes/FEAT-0001-…/` (0 content lines changed) |
| `docs/changes/archive/FEAT-0001-…/spec.md` | moved; front matter gains `verified_commit: e844f79…` |
| `docs/changes/archive/FEAT-0001-…/tasks.md` | moved; S1, S2 and Fold & archive ticked |
| `docs/contexts/app/behavior/reading-measure.md` | new — `APP-REQ-001`…`APP-REQ-006`, the folded rules and the provenance table |
| `docs/contexts/app/domain-model.md` | new — the app's model, and the statement that the change adds none of it |
| `docs/contexts/app/glossary.md` | new — the app's domain and layout terms |
| `docs/quality-assurance/QUALITY-0004-…-fold.md` | the Quality Assurance report for this track |
| `tests/end-to-end/fold-archive.test.ts` | new — the fold criterion as four executable cases |

No `src/`, `worker/`, `shared/`, `scripts/` or `package.json` line changes in this track's diff.
The cumulative feature diff (`ae51078..87529ea`) is the S1 and S2 code changes plus everything
above; those code changes were analysed in
`docs/gap-analysis/GAP-0001-src-screens-login-screen-tsx-main-at-lin-S1.md` and
`docs/gap-analysis/GAP-0001-FEAT-0001-src-screens-login-screen-tsx-main-at-lin-S2.md`.

## Scope and evidence

| Check | Result |
| --- | --- |
| Scans `install`, `static-analysis` (`bun run typecheck`), `bundle` (`bun run build`), handed over by oasis | exit 0 each — no open critical or high scan finding |
| `bun test tests/end-to-end/fold-archive.test.ts` on this branch | 4 pass, 0 fail, 34 `expect()` calls |
| The same file on a `git archive` checkout of the released `main` commit `e844f79` | 0 pass, 4 fail (exit 1) — the fold test fails when the change is reverted |
| `bun test` over the four non-browser specs (fold, smoke, entrance animation, layout model) | 10 pass, 0 fail, 60 `expect()` calls |
| Whole suite | not re-run here; QUALITY-0004 records 22 pass / 0 skip / 4 fail, where the four failures are Chromium launch failures of the browser specs, not assertions. Those specs run outside this sandbox at the gate |
| Test weakening signals (`track.test_signals`) | empty — no added skip/only markers, no deleted or renamed test file, no reduced assertion count, no changed expected value |
| Fold-diff deletions of tests | none: `git diff e844f79 HEAD -- tests/` is a single added file |

## Gaps

### The fold criterion

The track's criterion is "Living behavior, domain model, and glossary reflect the change; the
change spec is archived." It is implemented:

| What the fold must produce | Where it is | Status |
| --- | --- | --- |
| Living behaviour requirement for the sign-in measure | `APP-REQ-001` in `docs/contexts/app/behavior/reading-measure.md` | present, same rule, same source, same 2px/1px tolerances as `APP-REQ-NEW-1` |
| Living behaviour requirement for the introduction measure | `APP-REQ-002` | present, same rule and tolerances as `APP-REQ-NEW-2`, same profile reference |
| Living behaviour requirement retaining the profile measure | `APP-REQ-003` | present, same rule as `APP-REQ-NEW-3` |
| Living behaviour requirement for the three slides | `APP-REQ-004` | present, the three titles verbatim, dots/drag/button navigation named |
| Living behaviour requirement for phone and short-landscape layout | `APP-REQ-005` | present, the three phone viewports, the 20px gutter, no sideways scroll, the 844×390 split |
| Living behaviour requirement for the browser check | `APP-REQ-006` | present, the check and all seven viewports named; the console-clean clause of AC-1.6/AC-2.5 is added, which is stricter than the spec, not weaker |
| Provenance from change-spec ids | "Fold provenance" table | all six `APP-REQ-NEW-n` → `APP-REQ-00n`, and no `APP-REQ-NEW-` id survives as a living id |
| Domain model reflects the change | `docs/contexts/app/domain-model.md`, "Effect of the reading-measure change" | present: no aggregate, entity, value object, command, event or state transition added; reading measure declared presentation, not stored |
| Glossary reflects the change | `docs/contexts/app/glossary.md`, "Layout language" | present: reading measure, full-screen surface, sign-in surface, introduction, profile surface, gutter, wide viewport, short-landscape split, layout check |
| Change spec archived | `docs/changes/archive/FEAT-0001-src-screens-login-screen-tsx-main-at-lin/`, all six files | present; `docs/changes/FEAT-0001-…/` no longer exists |
| Verified commit stamped | `spec.md` front matter, `verified_commit: e844f7998f01ae9509d9d6d1d0136e9ce7682363` | matches the released `main` tip and the fold's parent |
| Tasks ticked | `tasks.md` | S1, S2 and Fold & archive all `[x]`, no unticked task |

No change-spec requirement is missing, renumbered against another living id, or weakened. The
only textual differences between the spec and the living rules are deliberate and harmless: the
spec's file-path parentheticals are dropped from the living rules (the rule text is unchanged),
"login surface" becomes "sign-in surface" (the glossary term), and `APP-REQ-006` gains the
console-clean clause the spec's acceptance criteria already required.

### The feature's acceptance criteria

The fold adds no behaviour, so the S1 and S2 criteria are covered by their own analyses and are
re-stated here only to close the loop: AC-1.1–AC-1.6 are met per GAP-0001 (S1) and AC-2.1–AC-2.5
are met per GAP-0001 (S2), both released on `main` at `e844f79`. The checks they name still exist
and still pass at this head: `layout/login-wide-column`, `layout/onboarding-wide-column`,
`layout/profile-wide-column`, `onboarding/three-slides-preserved`,
`layout/phone-gutters-no-overflow`, `layout/landscape-split`,
`layout/check-fails-on-base-commit` and `gate/typecheck-and-tests`.

### Test weakening

None. `track.test_signals` is empty, this track adds a test and changes no existing one, and no
test file is deleted or renamed anywhere in the feature diff. The new fold test is
discriminating: it passes 4/4 on the branch and fails 4/4 on the released `main` tree, which is
the property the criterion needs. Its coverage limit, not a weakening, is finding 3 below.

## Findings

Scan findings: none. `install`, `static-analysis` and `bundle` all exit 0, so there is no open
critical or high scan finding and nothing to classify beyond that.

Review findings (titles verbatim, one per row; all low; none blocks release):

1. Living behaviour doc says the report and legal surfaces keep longer measures than the glossary's reading-measure set, while both render at 42rem

   `docs/contexts/app/behavior/reading-measure.md` opens with "the report and legal surfaces keep
   their own longer measures", but the same fold's glossary defines a full-screen surface as one
   that "puts its content in the reading measure: sign-in, introduction, profile, history,
   report, legal", and the code agrees with the glossary: `src/screens/report-screen.tsx:422` and
   `src/screens/legal-screen.tsx:238` both cap at `max-w-[42rem]`, the reading measure, while it
   is `src/screens/history-screen.tsx:79` that is wider (`max-w-3xl`, 48rem). ADR-0001's
   constraint says "their own deliberate measures", not longer ones. Resolution: accepted for
   this fold — no folded requirement rests on that sentence and every `APP-REQ-00n` is accurate;
   reword it to "their own deliberate 42rem measures" in a later docs change.

2. DESIGN.md's Layout section does not name the sign-in and introduction surfaces the feature centred

   `DESIGN.md:237-238` still enumerates "the report is a single reading column capped at 42rem …
   history and profile content should cap at 42–48rem". After this feature the sign-in and
   introduction surfaces are part of that set, and the change spec's rationale leans on the
   DESIGN.md band; a reader of the root design document cannot see the new state. Resolution:
   accepted — DESIGN.md is outside the fold's declared deltas (the archived spec's MODIFIED is
   "None" because the band already prescribes the measure), and no acceptance criterion depends on
   it; worth naming the surfaces in a design-docs change.

3. fold-archive.test.ts pins folded requirement ids and provenance but not the rule text they carry

   The living-doc case asserts `### APP-REQ-00n ` headings and the six provenance rows, so a later
   edit to a folded rule's body would not fail it. Resolution: accepted — this stage compared the
   six rule bodies against the spec by reading (table above, no drift found), and a body-hash or
   literal-copy assertion would be brittle against the deliberate wording differences noted under
   "The fold criterion". The archive, tick and stamp cases remain exact.

## Code review

Against the change spec: the fold produces exactly what `SPEC-FEAT-0001` says it changes — nothing
modified, removed or renamed, six added requirements now living, `tactical: none` untouched
because the change adds no aggregate, entity, value object, command, event or state transition.
Against ADR-0001: the living doc records the per-surface 42rem column, the full-bleed background,
the untouched camera, report and legal measures and the reversible, presentation-only rollback; no
shared layout component is implied. Against contracts: there is no contract to change —
`docs/contexts/*/contracts/` holds no OpenAPI or AsyncAPI document, `CONTEXT-APP` records that the
app publishes none, and the app change is contract-neutral; no call, payload or shared type
changes. Against coding standards: no code, no dependency, no lockfile, no secret or env file is
touched; the new test imports only `bun:test` and `node:` modules; every new document carries
`id`, `type`, `title`, `context`, `issue`, `related` and `supersedes`, and none carries a `status`
field. No living document links to the unarchived `docs/changes/FEAT-0001-…/` path; the only
remaining mentions are the negative assertion in the fold test and the historical QA/gap reports.

## Architecture conformance

Conformant, and unchanged by this track. `contexts.yaml` maps `app` to `src/`, `api` to `worker/`
and `shared` to `shared/`. The fold diff contains no file under `src/`, `worker/` or `shared/` at
all — `git diff --name-only e844f79 HEAD -- worker shared src` is empty — so no cross-context
reference, call or import can have been introduced, and the documents added carry
`context: app`. The living behaviour doc names `api`-owned state and `shared/` vocabulary the way
`APP-DOMAIN-MODEL` already does, without reaching into either context's code. No contract document
is added, altered or needed: the app publishes none, and the change remains presentation-only and
contract-neutral as ADR-0001 and CONTEXT-APP record.

## Pull request and work items

Pull request #23 is the fold branch. Its checks are the three scans above, all green; mergeability
and the human merge approval are outside this stage's reach (no GitHub access, and this stage may
write only under `docs/gap-analysis/**`), so flipping the pull request to ready and approving it
remain with the person and the Release readiness gate. Project-management items this report
implies: Feature #9 closes with this release, Epic #8 (Engineering – app) closes once its last
Feature is closed, and intake #7 closes with the feature; Feature #9's body still points at the
now-archived `docs/changes/FEAT-0001-…/` path and reads more accurately as
`docs/changes/archive/FEAT-0001-…/`.

## Release note

Fold & archive of FEAT-0001 completes: the six reading-measure requirements now live in the app
behaviour, domain-model and glossary documents as `APP-REQ-001`…`APP-REQ-006` with their
provenance, the change spec is archived at commit `e844f79` with all tasks ticked, and
`tests/end-to-end/fold-archive.test.ts` pins the archive and the folded truth and fails on the
unfolded `main`.
