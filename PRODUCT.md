# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Travellers standing in front of something they cannot name — a monument, a façade, a landscape,
a street corner — usually on a phone, outdoors, often one-handed and in a hurry. They want to
understand what they are looking at without typing a search query or reading a generic article
that never mentions the thing in their frame.

## Product Purpose

Nekibuki turns a photo into a short, photo-aware guide: identify the place, give a brief
introduction, four trivia cards, and a few detailed sections that point at details visible in the
photograph. Success means the traveller looks up from the phone with a better answer than "it's
old", remembers one specific thing, and can ask a follow-up without leaving the place.

## Positioning

The guide is built from the photo, not from a place database. Its explanations name the details
the camera actually caught — the minarets in frame, the arch in the foreground, the colour of the
dome — and the chat keeps that photo in context. A generic travel encyclopedia cannot truthfully
copy that mechanism.

## Operating Context

- The capture happens on location, frequently with poor connectivity and strong sunlight.
- The core loop is camera → analysing → report → question → history.
- The app is installable (PWA), mobile-shaped, and three horizontally swiped screens:
  You, Camera, Places.
- Saved guides, photos and conversations remain readable offline.
- Google is the only sign-in method; login is mandatory.

## Capabilities and Constraints

- Camera capture and gallery import, with torch, grid, zoom presets and a location chip.
- Vision providers are swappable: Gemini 2.5 Flash or a deterministic mock used for demos and
  offline previews. The default demo requires no keys or accounts.
- Every report is validated against the zod schemas in `shared/schema.ts`; the contract requires
  exactly four trivia cards, a brief introduction, and detailed sections tied to visual references.
- History supports search, saved-only filtering, deletion, and a per-place conversation.
- Guide output is available in English and Turkish; the interface chrome is English.
- Appearance: light, dark, or follow the device. Haptics can be turned off.
- Supabase auth and storage are optional; local IndexedDB is the default repository.

## Brand Commitments

- Name: Nekibuki. The tagline is "A quiet guide for the places you walk past."
- Voice: quiet, specific, quietly curious; never breathless or listicle-loud. Prefer a concrete
  detail over an adjective.
- The existing visual direction is an editorial field guide: warm paper, near-black ink, a single
  deep green accent, a high-contrast serif for editorial text, and system sans for chrome.
- Motion should feel Apple-calm: interruptible, spring-based, never bouncy or showy.

## Evidence on Hand

- Three seeded demo reports with real photography: Eiffel Tower, Colosseum, Blue Mosque
  (`shared/mock-reports.ts`).
- Screenshot tours in `scripts/screenshot.mjs` and `scripts/brand-shots.mjs`.
- No testimonials, press, customer logos, usage benchmarks, or pricing evidence. Future work must
  not invent them.

## Product Principles

1. **The photo is the source.** Every claim should be traceable to something visible in the frame.
2. **Quiet beats loud.** One accent, one idea per screen, no decorative noise.
3. **Answer first, detail second.** A traveller should get the gist before scrolling.
4. **Works where the traveller is.** Camera-first, offline-tolerant, one-handed, sunlight-readable.
5. **Never break the report contract.** Four trivia cards, real references, no filler.

## Accessibility & Inclusion

- WCAG AA for text and interactive controls; pinch zoom must remain available.
- Touch targets at least 44×44px on the camera, navigation and report annotations.
- `prefers-reduced-motion` must preserve state changes without decorative motion.
- The guide content must remain readable in both appearance modes and at large text sizes.
