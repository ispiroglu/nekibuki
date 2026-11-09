---
id: FEAT-0001
type: strategic-design-brief
title: Center the login and onboarding screens at wide widths
context: app
issue: 7
related: [TWI-0001, ADR-0001, CONTEXT-APP, NFR-UX-001, NFR-COMP-001]
supersedes: null
---

# Strategic design brief — center the login and onboarding screens at wide widths

## Where this change sits

The change belongs entirely to the **`app`** context, the traveller's device experience. It is a
presentation change and stops at that boundary: it adds no call, changes no payload, and touches
no stored value, no shared vocabulary and no edge behaviour. The `api` and `shared` contexts are
unaffected, and the relationship map is unchanged.

Within `app`, the change is about the product's *reading measure* — the width of the column a
traveller reads in. The product is designed phone-first and presented as a calm, single-column
experience. A measure is therefore not a per-screen cosmetic choice; it is part of the design
system that makes the app feel like one product at every viewport. The profile and history
surfaces already honour that measure. The two surfaces a traveller meets first — sign-in and the
introduction that follows it — do not, and on a laptop or tablet the text starts at the far left
edge with an empty field beside it.

That is why the defect matters beyond its size: it is the first impression, formed on exactly the
viewports used by someone opening a shared link before installing the app. The fix restores
consistency with the surfaces the traveller already knows rather than introducing a new layout
language.

## The strategic question

Where does a reading measure belong, and how wide is it?

The design system gives a band (42–48rem) rather than a value. Three forces decide it:

- **First-impression consistency** pushes toward the profile surface's existing measure, because
  matching what the traveller already sees is the least surprising outcome and is what the
  request asks for.
- **The camera and long-form reading** push against a single global rule: the camera must stay
  full-bleed, and the report and legal surfaces deliberately carry longer measures. A global cap
  would need exceptions from day one.
- **Cost of abstraction** pushes against inventing a shared layout layer for three call sites. A
  repeated, visible pattern is cheaper and easier to reason about than a component nobody else
  needs yet.

ADR-0001 records the decision: one measure of 42rem, expressed per screen on the login,
introduction and profile surfaces, with no shared layout layer and no global rule. It is recorded
because it shapes every future full-screen surface, even though it is cheap to reverse.

## What must stay true

The change is deliberately narrow, so its quality bar is mostly about *not* changing things:

- On a wide viewport the three surfaces present one centred column at the same measure, with
  equal side margins (NFR-UX-001), and no full-screen reading surface is left uncapped
  (NFR-UX-002).
- The phone experience is untouched: 20px gutters, no horizontal overflow, the split layouts on
  short landscape viewports, and the bottom clearance for the floating navigation (NFR-COMP-001).
- The introduction keeps its three slides and their copy and artwork; only their container
  changes (NFR-COMP-002). No new onboarding, no settings, no desktop navigation model.

## What this change is not

It is not a desktop redesign, not a two-column composition, and not a refactor of the layout
system. The camera stays full-bleed; the report and legal surfaces keep their measures. If a
fourth surface needs the same measure, or if the surfaces drift apart, the shared-layer
alternative in ADR-0001 becomes worth revisiting — the quality attributes make that drift
visible rather than assumed away.

## Consequences across contexts

None for `api` or `shared`. The change ships in one release with no migration, and its rollback
is a revert of presentation only (see TWI-0001).
