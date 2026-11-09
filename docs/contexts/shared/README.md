---
id: CONTEXT-SHARED
type: context-canvas
title: shared — the vocabulary both sides import
context: shared
issue: 7
related: [CONTEXT-MAP, CONTEXT-APP, CONTEXT-API]
supersedes: null
---

# shared — context canvas

## Purpose

The vocabulary both sides must agree on. It is a shared kernel, not a service: it has no
runtime, no process and no storage. It exists so that a guide, a walk plan and a report mean
exactly the same thing on the device and at the edge, and so that a mismatch is a compile error
rather than a bug found in production.

## Language

- **Report** — the produced reading about one place: intro, trivia, sections, location, kind.
- **Analysis** — a stored report together with its photo, messages and timestamps.
- **Walk plan / walk record** — the planned route and the progress kept against it.
- **Mock guide** — a deterministic report used when the vision provider is absent or demo mode
  is on.

## Inbound communication

None at runtime. The vocabulary is imported at build time by `app` and `api` and bundled into
each. The one dependency is the wire format of the vision provider's answer, which `api` maps
into these shapes at its boundary.

## Outbound communication

None at runtime. A change here is a source-level change to both contexts, so it is judged as one
change with two owners and never as a local edit.

## Contracts

The shared kernel is the contract. There is no OpenAPI or AsyncAPI document because there is no
endpoint. A breaking change to these shapes is breaking for both `app` and `api`, must be marked
as such in the change, and needs a human approval at the Strategic design gate.

FEAT-0001 changes no shape in this kernel.

## Quality attributes bound to this context

- **NFR-COMPAT-001 One source of truth** — 100% of the guide, walk and report shapes used across
  `app` and `api` are declared here; a shape is duplicated in either context zero times.
- **NFR-COMPAT-002 Schema discipline** — every shape that crosses the wire validates against the
  declared schema at the `api` boundary; zero unvalidated provider payloads are stored.

## Boundaries

- Owns `shared/`: type declarations, schemas, mock data.
- Owns no behaviour, no I/O, no configuration and no secrets.
- May not import from `src/` or `worker/`.
