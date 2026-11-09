---
id: SCOPE-FEAT-0001
type: scope-map
title: Scope map — center the login and onboarding screens at wide widths
context: app
issue: 7
related: [FEAT-0001, SPEC-FEAT-0001, TWI-0001, ADR-0001]
supersedes: null
---

# Scope map — center the login and onboarding screens at wide widths

Single context (`app`), presentation only. No `api` or `shared` file is touched.

## Files per Story

### S1 — Sign-in content sits in the wide-viewport column

- `src/screens/login-screen.tsx` — add the centred cap to the content wrapper inside `<main>`;
  keep `<main>`'s full-bleed background, safe-area classes and the
  `orientation:landscape`/`max-height:560px` grid classes on the element that carries them today.
- `scripts/layout-check.mjs` — new Playwright check that measures the login, introduction and
  profile columns; it is S1's test for this behaviour change (AGENTS.md: every behaviour change
  has a test). One case per `test-plan.md` test id.
- `package.json` — one script entry (`layout:check`) for the check, so it runs as
  `bun run layout:check`. No dependency is added: `playwright-core` is already a dev dependency.

### S2 — Introduction content sits in the wide-viewport column

- `src/screens/onboarding-screen.tsx` — add the same centred cap to the header, the slide area and
  the footer content; keep the root, the drag handling and all three slides and their copy.

The profile surface is the reference, not a change: `src/screens/profile-screen.tsx:66` already
carries `mx-auto w-full max-w-2xl`. It is measured by the check and expected untouched; a change
is allowed only to align the measure within the 1px tolerance, never to move it inside the panel
deck wrapper.

## Interfaces

None. No function signature, module export, prop, wire contract, OpenAPI/AsyncAPI document or
Worker route changes. The three screens keep their existing props and imports. The only new
entry point is the `layout:check` package script.

## Migrations

None. No database schema, no D1 migration, no stored-value shape, no `localStorage` key change.
The only stored data the change touches is the synthetic seed the check writes and clears.

## Feature flags

None. The change is unconditional; rollback is a revert (ADR-0001).

## Rollback points

- Per Story: S1 and S2 share no file, so either can be reverted alone.
- Whole change: revert the merge. No data, cache or contract to unwind, so a revert restores the
  base-commit layout exactly.
- `scripts/layout-check.mjs` and the `layout:check` script may stay in place across a revert; the
  check then fails on the old layout, which is the signal it exists to give.

## Blast radius

Three screens, watched explicitly by the check: the short-landscape split layout, the phone
gutters, the safe-area padding, and the 7rem bottom clearance for the floating navigation pill.
The camera surface, the report and the legal reading surfaces are not touched.

## Out of scope

Any desktop redesign, two-column composition, shared layout component or global width rule
(ADR-0001), copy edits, new slides, new settings, and `docs/` changes beyond this change folder.
