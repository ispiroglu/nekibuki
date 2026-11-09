---
id: QUALITY-0001
type: quality-attributes
title: Quality attributes bound to the bounded contexts
context: shared
issue: 7
related: [CONTEXT-APP, CONTEXT-API, CONTEXT-SHARED, ADR-0001]
supersedes: null
---

# Quality attributes

Each attribute names one context, one criterion a person can measure, and how it is measured.
An attribute without a number in its `Criterion:` line is not an attribute; it is a wish.

## Usability

### NFR-UX-001 Wide-viewport content measure
**Context:** `app`
**Criterion:** At viewport widths 1024, 1280 and 1440px, the primary content column of the
login, onboarding and profile screens is at most 48rem (768px) wide, its left and right margins
are equal within 2px, and its width differs from the profile screen's column by at most 1px.
**Measure:** browser measurement of the rendered column box at the three widths, one run each.

### NFR-UX-002 Reading measure consistency
**Context:** `app`
**Criterion:** On a viewport at least 1024px wide, full-screen reading surfaces are capped at
the same measure within 6rem of each other (profile, history, report, legal); zero full-screen
reading surfaces are uncapped (content width equal to viewport width minus gutters).
**Measure:** audit of every full-screen route at 1280px width; count surfaces outside the band.

## Compatibility

### NFR-COMP-001 Phone layout unchanged
**Context:** `app`
**Criterion:** At 390×844, 360×640 and 320×568 the screen gutter is 20px on every side, the
short-landscape split layouts (844×390) keep two columns, and the document scroll width never
exceeds the viewport width by more than 0px.
**Measure:** browser measurement of gutter, column count and `scrollWidth` at each size.

### NFR-COMP-002 Onboarding content preserved
**Context:** `app`
**Criterion:** The onboarding still presents exactly 3 slides with the same 3 titles and body
copy; a change of more than 0 slides or 0 characters of copy fails this attribute.
**Measure:** comparison of rendered slide count and copy against the pre-change baseline.

## Performance

### NFR-PERF-001 Analysis latency
**Context:** `api`
**Criterion:** A photo-to-guide request completes at p95 under 20 seconds against a real vision
provider, and under 2 seconds in demo mode, measured over at least 50 requests.
**Measure:** timed requests against the hosted service; p95 of the sample.

## Reliability

### NFR-REL-001 Sign-in availability
**Context:** `api`
**Criterion:** 99.5% of sign-in attempts succeed over a rolling 7-day window, excluding attempts
the traveller cancelled; a failure is a request that ends without a session and without a
traveller-facing explanation.
**Measure:** share of successful sign-in completions in the service log over the window.

## Compatibility of the shared kernel

### NFR-COMPAT-001 One source of truth
**Context:** `shared`
**Criterion:** 100% of the guide, walk and report shapes used across `app` and `api` are declared
in the shared kernel; a shape declared twice in either context is 0.
**Measure:** review of the shape declarations on each change that touches the wire.

### NFR-COMPAT-002 Schema discipline
**Context:** `shared`
**Criterion:** 100% of payloads crossing the `api` boundary validate against the declared schema;
0 unvalidated provider payloads are stored.
**Measure:** validation at the boundary; count of stored records that fail the schema.
