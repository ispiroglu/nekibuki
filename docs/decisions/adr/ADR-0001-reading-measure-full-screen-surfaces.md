---
id: ADR-0001
type: adr
title: One reading measure for full-screen app surfaces
context: app
issue: 7
related: [CONTEXT-APP, NFR-UX-001, NFR-UX-002, TWI-0001]
supersedes: null
irreversible: false
---

# One reading measure for full-screen app surfaces

## Context

The product is designed phone-first and presented as a calm, single-column reading experience.
On a wide viewport — a tablet or a desktop browser — two of its full-screen surfaces, the login
screen and the introduction shown after first sign-in, still spread their content across the
whole width. The text therefore starts at the far left edge with a large empty field beside it.
The traveller's profile surface already centres its content in a capped column, and the design
system asks for exactly that on wide screens: history and profile content capped at 42–48rem
instead of stretching edge to edge.

The surfaces disagree about their measure, which means the product looks unfinished on exactly
the viewports where a first impression is formed (opening the link on a laptop before installing
it). The question is where the cap belongs and how wide it is: per screen, in a shared layout
layer, or not at all.

Constraints that shaped the decision:

- The camera is intentionally full-bleed and must not be capped.
- The report and legal reading surfaces already carry their own deliberate measures and must not
  be dragged to a new one by this change.
- Phone-width layout, including the 20px gutters and the split layouts used on short landscape
  viewports, is a deliberate design and must not change.
- The change must be cheap to undo: it is presentation only and touches no data, no call and no
  stored value.

## Decision

Adopt a single reading measure for full-screen app surfaces: a centred, single column capped at
42rem (the same measure the traveller's profile already uses), applied to the login, introduction
and profile surfaces. The cap is expressed on each surface by reusing the existing centred-column
pattern rather than by introducing a shared layout layer, and the full-bleed background stays
full-bleed while only the content is capped.

The measure is 42rem, the tighter end of the design system's 42–48rem band, because these
surfaces carry short lede copy rather than long-form reading, and because the profile surface is
the reference the change must match.

## Alternatives

1. **Leave the two surfaces stretched.** No work, no risk. Rejected: it contradicts the design
   system and is the visible defect being fixed; a desktop first impression stays "unfinished".
2. **Cap every full-screen surface through one global shell rule.** One rule, no per-screen
   repetition. Rejected: the camera must stay full-bleed and the report and legal surfaces
   carry their own longer measures, so a global rule would immediately need exceptions and
   would couple surfaces that change for different reasons.
3. **Introduce a shared layout component for the capped column.** Removes repetition at the cost
   of a new abstraction with three call sites and no other present need. Rejected for this
   change; revisit if a fourth surface needs the same measure or if the surfaces drift apart
   (see NFR-UX-002).
4. **Compose a two-column desktop layout** — imagery beside the copy — instead of centring the
   existing single column. Rejected: it exceeds the request, changes the information
   architecture of the introduction, and carries far more regression risk than centring.
5. **Cap at 48rem, matching the history surface.** Rejected: the request is to match the profile
   surface, and the design system gives a band rather than one value; 42rem reads better for
   short lede copy and is the surface travellers already see centred.

## Consequences

- On wide viewports the three surfaces present a centred column with generous side margins, and
  the product looks deliberate rather than stretched on a laptop or tablet.
- The profile surface is untouched; the other two adopt its measure, so the three surfaces agree
  within the tolerance set by NFR-UX-001.
- The centred-column pattern is repeated on three surfaces instead of being owned in one place.
  That is accepted for now and bounded: NFR-UX-002 audits every full-screen reading surface, so
  drift is detected rather than assumed away.
- Phone-width and short-landscape layouts are explicitly out of scope and guarded by
  NFR-COMP-001; the introduction keeps all three slides and their copy (NFR-COMP-002).
- No call, payload, stored value or shared type changes, so the decision is reversible by
  reverting one presentation-only change.
