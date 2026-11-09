---
id: CONTEXT-API
type: context-canvas
title: api — the edge service
context: api
issue: 7
related: [CONTEXT-MAP, CONTEXT-APP, CONTEXT-SHARED]
supersedes: null
---

# api — context canvas

## Purpose

Answers the traveller's device. A single Cloudflare Worker serves the built app and every
service call: it establishes who the traveller is, accepts a photo, produces a validated guide,
keeps chat and walk state, and mediates every stored photo. It exists so that the device never
needs a provider key and never reads storage directly.

## Language

- **Session** — the authenticated traveller for the current request.
- **Guide** — a produced reading about one place, owned by one traveller.
- **Analysis** — the act of turning a photo plus its location into a guide.
- **Usage** — the per-traveller allowance that bounds provider spend.
- **Walk plan** — an ordered route with stops, produced on request and then recorded as progress.

## Inbound communication

- HTTPS and JSON from **`app`**: sign-in and sign-out, photo upload, analysis request, chat
  message, walk planning and walk progress.
- The shared vocabulary from `shared` is compiled in, not called.

## Outbound communication

- To the vision provider: one analysis request per accepted photo, validated and reshaped before
  it is trusted. The provider is optional at development time; a deterministic mock path exists
  and is the default in demo mode.
- To storage: D1 for guides, chat and usage; private R2 for photos. Neither is public.
- To `app`: only responses on the calls above; the service never pushes.

## Contracts

Route shapes and their request/response schemas are recorded as `openapi.yaml` under
`docs/contexts/api/contracts/` once a change touches them. FEAT-0001 does not: it is a
presentation change in `app` and touches no route, payload or stored value.

A breaking change is marked `x-breaking: true` in the contract and requires a human approval at
the Strategic design gate, because the app and the service ship together and a break cannot be
phased.

## Quality attributes bound to this context

- **NFR-PERF-001 Analysis latency** — a photo-to-guide request completes at p95 under 20 seconds
  on the hosted build with a real vision provider, and under 2 seconds in demo mode.
- **NFR-REL-001 Auth availability** — sign-in succeeds for 99.5% of attempts over a rolling
  7-day window, excluding traveller cancellation.

## Boundaries

- Owns `worker/`: routes, services, storage access, the walk durable object, the vision provider
  adapter.
- Does not own presentation, on-device history, or the wording the traveller reads.
- Never trusts provider output without validation; never exposes photo storage publicly.
