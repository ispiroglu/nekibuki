---
id: CONTEXT-APP
type: context-canvas
title: app — the traveller's device experience
context: app
issue: 7
related: [CONTEXT-MAP, CONTEXT-API, CONTEXT-SHARED, ADR-0001]
supersedes: null
---

# app — context canvas

## Purpose

What the traveller holds. The app is a mobile-shaped, installable experience: point the camera,
receive a short guide to what is in front of you, keep a personal collection of places, and join
a guided walk. It must feel calm and finished on a phone first, and must not look broken when the
same screens are opened in a tablet or desktop browser.

It is responsible for presentation and for local state. It is not responsible for identifying a
place, generating a guide, storing photos, or deciding what a traveller may see.

## Language

- **Guide** — the short reading about one photographed place: intro, trivia cards, sections.
- **Place** — a guide the traveller has kept, with where and when it was collected.
- **Walk** — an ordered set of stops the traveller can follow in one outing.
- **Onboarding** — the short introduction shown after first sign-in; it is not a tutorial and
  carries no configuration.
- **Reading measure** — the width of the column a traveller reads in. A design-system property,
  shared by every full-screen surface, not a per-screen choice.

## Inbound communication

- From **`api`**, over HTTPS and JSON: the traveller's session, guides, chat history, walk plans,
  and photo URLs. Every response is validated before it is shown; a failed call is a visible,
  recoverable state, never a silent empty screen.
- From **`shared`**, at build time: the guide, report and walk vocabulary, plus bundled mock
  guides for demo mode.
- From the device: camera, geolocation, install prompt, appearance and language preferences.
  All are optional; the app remains usable (demo or gallery path) when one is refused.

## Outbound communication

- To **`api`**: sign-in and sign-out, photo upload, guide creation, chat messages, walk
  planning and walk progress.
- To `shared`: nothing at runtime; the vocabulary is compiled in.
- To the device: no external notification channel. Nothing leaves the device except the calls
  above.

## Contracts

The app serves no API of its own, so it publishes no OpenAPI or AsyncAPI document. Its interface
obligations run one way: it consumes the service's routes and conforms to the shapes both sides
import from the shared kernel.

FEAT-0001 changes no call, no payload and no shared type. It changes only the layout of three
full-screen surfaces and is therefore contract-neutral; no contract document is added or
altered by it.

## Quality attributes bound to this context

- **NFR-UX-001 Wide-viewport content measure** — every full-screen surface centres its content
  in one column capped at the same measure as the profile screen (at most 48rem), with equal
  left and right margins, at 1024, 1280 and 1440px viewport widths.
- **NFR-COMP-001 Phone layout unchanged** — at 390×844, 360×640 and 320×568 the screen gutters
  stay at 20px, the short-landscape split layouts stay intact, and the document has no
  horizontal overflow.

Quality attributes are defined in `docs/architecture/quality-attributes.md`.

## Boundaries

- Owns `src/`: screens, components, local state, on-device history, image preparation.
- Does not own the network edge, authentication decisions, storage, or the vision provider.
- Never reaches storage or the model provider directly.
