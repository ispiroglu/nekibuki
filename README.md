# Nekibuki

**Live:** <https://nekibuki.thecrafter.io> — runs on the mock vision provider, so no API keys are
needed to try the full flow.

Point your camera at a monument, a landscape, a street. Nekibuki identifies what it is and
hands back a short guide that **refers to what is actually in your photo** — a brief intro,
four trivia cards, then detailed sections with the detail you are looking at called out.

It is a PWA: installable, camera-first, mobile-shaped, and it works offline for everything
already saved.

## Stack

| Layer | Choice |
| --- | --- |
| App | Vite 8 + React 19 + TypeScript, Tailwind v4, shadcn-style primitives, Motion (Framer) |
| State | Zustand (`src/store`) |
| Routing | React Router 7 (`/`, `/report/:id`, `/auth/callback`) |
| Edge API | Hono on a single Cloudflare Worker (`worker/index.ts`) |
| Data (optional) | Supabase — Google OAuth, Postgres, public `captures` storage bucket |
| Vision | Swappable `VisionProvider`: Gemini 2.5 Flash or the built-in mock |

One Worker serves both the built assets and `/api/*`, so a deploy is a single unit.

## Quick start

```bash
bun install
bun run dev          # vite on :5173  +  wrangler dev on :8787
```

Open <http://localhost:5173>. No accounts, keys, or services are required — the default setup
runs in **demo mode**: a fake Google sign-in, an on-device IndexedDB history seeded with three
example places, and a mock vision provider that answers instantly.

`bun run typecheck` regenerates Worker types and typechecks app, worker and node configs.
`bun run build` does that plus a production build into `dist/`.

## Modes

Two independent switches decide how auth and vision behave.

**Auth** — `VITE_AUTH_MODE` in `.env`

- `mock` (default) — instantly signs in a demo user. No Supabase needed.
- `supabase` — real Google OAuth via Supabase PKCE.

**Vision** — `VISION_PROVIDER` in `.dev.vars` (and in `wrangler.jsonc` vars / Worker secrets)

- `mock` (default) — deterministic reports chosen from the image bytes and GPS, from
  `shared/mock-reports.ts`.
- `gemini` — real vision calls. Set `GEMINI_API_KEY`, and swap `GEMINI_MODEL` to any
  vision-capable Gemini model.

If the Worker is unreachable, the client can fall back to the bundled mock analyzer with
`VITE_MOCK_ANALYSIS=true` — handy when previewing the UI without `wrangler dev`.

Copy the examples to get started:

```bash
cp .env.example .env
cp .dev.vars.example .dev.vars
```

## Going live

1. **Vision** — set `GEMINI_API_KEY` as a Worker secret and switch the `VISION_PROVIDER` var to
   `gemini`:

   ```bash
   bunx wrangler secret put GEMINI_API_KEY
   ```

   Adding a different model is one file: implement `VisionProvider` in `worker/services/` and
   register it in `worker/index.ts`. Nothing above the provider knows which model is in use.

2. **Supabase** (Google login + synced history) — follow [`supabase/README.md`](supabase/README.md).
   It covers the migration, the Google OAuth client, redirect URLs, and the client/Worker env
   values. With `VITE_AUTH_MODE=supabase`, history moves from IndexedDB to Postgres and photos to
   the `captures` bucket.

3. **Deploy**:

   ```bash
   bun run deploy     # builds, then wrangler deploy
   ```

## API

The Worker exposes three routes; the two data routes require a Supabase bearer token once
Supabase is configured.

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Liveness plus the active vision provider and model |
| `POST /api/analyze` | Photo (base64) + optional GPS → `AttractionReport` |
| `POST /api/chat` | Report + conversation + question → a photo-aware answer |

Every report is validated against the zod schemas in `shared/schema.ts` — including the rule
that exactly four trivia cards come back — so a model that drifts out of shape fails loudly
instead of rendering a broken screen.

## Project layout

```
src/
  screens/        camera, report, history, profile, login, onboarding, auth callback
  components/
    layout/       swipe deck, page dots, shell, splash
    report/       photo hero with tappable annotations, trivia carousel, chat panel
    capture/      capture controller, analyzing overlay
    ui/           shadcn-style primitives
  lib/            auth, api client, repositories (local + supabase), image, geo, motion
  store/          zustand stores (app, preferences, location)
worker/           Hono app, vision providers, prompts
shared/           domain types, zod schemas, mock reports (used by app and worker)
supabase/         migration + setup guide
scripts/          icon generation, screenshot tour
```

Navigation is a three-page swipe deck — **you**, **camera**, **your places** — built on a custom
gesture engine (1:1 tracking, rubber-banding, momentum projection, velocity handoff) rather than
a carousel library, so the animation stays interruptible mid-swipe.

## Tooling

- `bun run icons` — regenerates the PWA icons in `public/` from the aperture mark drawn in code
  (`public/icon.svg`, `public/icon-maskable.svg`), using the paper, ink and petrol roles.
- `bun run shots` — walks every screen with Playwright and writes screenshots to `SHOT_DIR`
  (needs a dev server on :5173).
- `bun run brand:shots` — captures the same screens under every brand preset and writes a
  contact sheet to `SHOT_DIR/index.html` (default `shots/brand`).

## Brand colour lab

The hue is a token, not a coat of paint. `src/index.css` gives it three roles:
`--brand` (fills on paper), `--brand-ink` (text on paper) and `--hud` (marks over a photo),
plus `--hud-fg` for the ink that sits on a HUD fill.

The default is **petrol** — the documented identity, and what the installed app, manifest,
browser chrome and icons use. Presets live next to those tokens (`petrol`, `clay`, `okra`,
`lapis`, `saffron`); `clay` is the opt-in terracotta experiment and never the default. Compare
them without touching code:

```bash
bun run dev:web
open 'http://localhost:5173/?brand=clay'     # the terracotta experiment
open 'http://localhost:5173/?brandlab=1'     # floating switcher, dev only
```

The choice is persisted in `localStorage`; omit the parameter (or use `?brand=petrol`) to return
to the default. The floating switcher is compiled out of production builds.

## Design context

- [`PRODUCT.md`](PRODUCT.md) — durable product truth, users, constraints and principles.
- [`DESIGN.md`](DESIGN.md) — machine-readable tokens plus the rules for using them.
- [`docs/design-findings.md`](docs/design-findings.md) — the Impeccable audit, split into
  file-owned workstreams for parallel implementation.

- `bun run smoke` — end-to-end check: sign in, capture, read the report, ask a question, confirm
  it reached history. Point it anywhere with `BASE_URL=https://nekibuki.thecrafter.io`.

## Status

UI-complete against [`requirements.md`](requirements.md) and running on mock data end to end:
camera → analyze → report → chat → history, with search, saved places, appearance (light/dark/
auto) and English/Turkish guide output. The Supabase and Gemini paths are wired but only
exercised once you supply credentials.
