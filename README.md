# Nekibuki

**Live:** <https://nekibuki.thecrafter.io> — runs on the mock vision provider, so no API keys are
needed to try the full flow.

Point your camera at a monument, a landscape, a street. Nekibuki identifies what it is and
hands back a short guide that **refers to what is actually in your photo** — a brief intro,
four trivia cards, then detailed sections with the detail you are looking at called out.

It is a PWA: installable, camera-first and mobile-shaped. The demo keeps everything on the
device; the hosted build syncs with the Worker.

## Stack

| Layer | Choice |
| --- | --- |
| App | Vite 8 + React 19 + TypeScript, Tailwind v4, shadcn-style primitives, Motion (Framer) |
| State | Zustand (`src/store`) |
| Routing | React Router 7 (`/`, `/report/:id`, `/auth/callback`) |
| Edge API | Hono on a single Cloudflare Worker (`worker/index.ts`) |
| Data | Cloudflare D1 (SQLite) for guides, chat and usage; private R2 for photos |
| Auth | Better Auth 1.7 + Google OAuth, sessions in a cookie |
| Vision | Swappable `VisionProvider`: Gemini 2.5 Flash (optionally via AI Gateway) or the built-in mock |

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
`bun run build` does that plus a production build into `dist/`. `bun run test` runs the pure
walk-planning unit tests (geometry, Overpass parsing, plan validation and ordering) without
touching the network or Workers AI.

## Modes

Two independent switches decide how auth and vision behave.

**Auth** — `VITE_AUTH_MODE` in `.env` (and `.env.production` for builds)

- `mock` (default in development) — instantly signs in a demo user. No Google setup needed.
- `google` — real Google OAuth through Better Auth on the Worker. Production builds use this.

**Vision** — `VISION_PROVIDER` in `.dev.vars` (and in `wrangler.jsonc` vars / Worker secrets)

- `mock` (default) — deterministic reports chosen from the image bytes and GPS, from
  `shared/mock-reports.ts`.
- `gemini` — real vision calls. Set `GEMINI_API_KEY`. The default is
  `gemini-3.1-flash-lite`, the cheapest current vision-capable model; swap
  `GEMINI_MODEL` for another Gemini model if needed.

If the Worker is unreachable, the client can fall back to the bundled mock analyzer with
`VITE_MOCK_ANALYSIS=true` — handy when previewing the UI without `wrangler dev`.

Copy the examples to get started:

```bash
cp .env.example .env
cp .dev.vars.example .dev.vars
```

## Going live

Everything runs on Cloudflare's free tier. The Worker serves the app and the API, D1 stores
guides and chat, and photos live in a private R2 bucket that is only reachable through an
authenticated route.

1. **Create the storage**

   ```bash
   bun x wrangler d1 create nekibuki          # copy database_id into wrangler.jsonc
   bun x wrangler r2 bucket create nekibuki-captures
   bun run db:migrate:local                   # optional: local D1 for `bun run dev`
   bun run db:migrate:remote                  # domain tables in production D1
   ```

2. **Vision** — set `GEMINI_API_KEY` as a Worker secret and switch the `VISION_PROVIDER` var to
   `gemini`:

   ```bash
   bun x wrangler secret put GEMINI_API_KEY
   ```

   Adding a different model is one file: implement `VisionProvider` in `worker/services/` and
   register it in `worker/services/provider.ts`. Nothing above the provider knows which model is
   in use. To route Gemini through Cloudflare AI Gateway, set `AI_GATEWAY_URL` to the gateway's
   full `/google-ai-studio/v1beta/models` path; without it the Worker calls Google directly.

3. **Google sign-in** — create an OAuth client in Google Cloud with these authorised redirect
   URIs, then set the three secrets:

   ```bash
   bun x wrangler secret put BETTER_AUTH_SECRET   # openssl rand -hex 32
   bun x wrangler secret put GOOGLE_CLIENT_ID
   bun x wrangler secret put GOOGLE_CLIENT_SECRET
   ```

   - `https://nekibuki.thecrafter.io/api/auth/callback/google`
   - `http://localhost:5173/api/auth/callback/google` (development)

   For local development, copy `.dev.vars.example` to `.dev.vars` and set
   `BETTER_AUTH_URL=http://localhost:5173`. The Vite proxy forwards `/api` to the Worker, so the
   browser sees the same origin in dev and production and session cookies just work.

4. **Create Better Auth's tables once** — the Better Auth CLI cannot reach D1 directly, so a
   guarded route runs its migration:

   ```bash
   bun x wrangler secret put MIGRATE_SECRET
   curl -X POST https://nekibuki.thecrafter.io/api/auth/migrate \
     -H "x-migrate-secret: $MIGRATE_SECRET"
   bun x wrangler secret delete MIGRATE_SECRET
   ```

5. **Deploy**:

   ```bash
   bun run deploy     # builds, then wrangler deploy
   ```

`.env.production` builds with `VITE_AUTH_MODE=google`, so a deployed build always uses real
accounts. Keep it that way: the Worker only accepts `/api/analyze` from a signed-in owner when
Google is configured.

### Privacy model

Every D1 query is scoped by `user_id`. Opening someone else's guide id returns 404, not 403, so
the API does not confirm that an id exists. Photos are stored under
`users/<user_id>/analyses/<analysis_id>/` in R2 and served only by
`GET /api/analyses/:id/image`, which checks ownership first. There are no public object URLs and
no shared buckets.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Liveness, vision provider, and whether D1/R2/auth are configured |
| `POST /api/analyze` | Photo + optional GPS → report; archives the photo and the guide when signed in |
| `GET /api/analyses` | The signed-in traveller's history, newest first |
| `GET/DELETE/PATCH /api/analyses/:id` | Read, delete, or save/unsave one guide |
| `DELETE /api/analyses` | Delete every guide and photo for the traveller |
| `GET /api/analyses/:id/image?variant=photo\|chat` | Owner-only photo stream from R2 |
| `POST /api/analyses/:id/chat` | Question → answer; the Worker reads the photo, report and history itself |
| `POST /api/chat` | Demo-only stateless chat (report travels in the body) |
| `GET /api/walks/plans` | Curated guided walks and their stop counts |
| `GET /api/walks` | The signed-in traveller's open walks (empty in demo mode) |
| `POST /api/walks` | Start a curated walk (`planId`) or generate one from a photo (`analysisId` + `location`) |
| `GET /api/walks/:id` | The walk's current stop, progress and transcript |
| `POST /api/walks/:id/message` | JSON text or multipart photo → the guide's answer, plus the new snapshot |
| `POST /api/walks/:id/advance` | Leave the current stop; deterministic next stop plus a transition answer |
| `POST /api/walks/:id/reset` | Fresh conversational context, same route progress |
| `ALL /api/auth/*` | Better Auth (Google OAuth, session, sign-out) |

`POST /api/analyze` takes a `captureId` idempotency key. A retry returns the guide already stored
for that capture instead of calling the model again. In demo mode the route stays stateless and
the client keeps its IndexedDB history.

Every report is validated against the zod schemas in `shared/schema.ts` — including the rule
that exactly four trivia cards come back — so a model that drifts out of shape fails loudly
instead of rendering a broken screen.

### Guided walks (Pi Durable)

The step-by-step walk is a separate path from a single photo analysis. Each walk is one
Durable Object (`WalkAgent`), which hosts a Pi harness over the object's SQLite database. Pi owns
the transcript, tool calls, retries and hibernation; `WalkStore` owns the route and progress.

Tours are now generated on the fly as well as curated. When the report CTA is pressed with a
photo location, `POST /api/walks`:

1. loads named places around the photo from OpenStreetMap (Overpass, ~800 m radius), sorted by
   walking distance;
2. asks `WALK_PLANNER_MODEL` to pick 5–8 of those candidates and write the stop narratives;
3. validates the answer against a strict JSON schema, retrying once;
4. builds the route in code — coordinates come from OSM, `arriveBy` is computed from distance
   and compass direction, and the nearest chosen stop starts the walk;
5. stores the plan JSON in the walk's Durable Object and indexes the walk in D1 so "Devam et"
   works from another device.

The model never invents a place or a coordinate: it can only choose candidate ids. Overpass and
the planner run in `worker/lib/overpass.ts` and `worker/walk/planner.ts`; the deterministic plan
assembly and arrival text are in `worker/walk/plan.ts` and `worker/lib/geo.ts`. Both are unit
tested under `tests/` without network calls.

The route lives in code (`shared/walks.ts` for curated tours, a stored plan JSON for generated
ones), not in the model. The agent gets three small tools:

- `go_to_stop` — the traveller named a room, or the photo clearly shows a different stop.
- `finish_stop` — mark the current stop done and return the next unvisited one.
- `walk_status` — read where they are, what they have seen, what remains.

A photo is read once by the existing vision provider before Pi runs, and the result is folded
into the input as evidence. That keeps the vision layer swappable and stops the agent from
spending a tool round on something deterministic.

Setup notes:

- `wrangler.jsonc` needs the `AI` binding, the `WALK_AGENT` Durable Object binding, and a
  `new_sqlite_classes` migration. `WALK_MODEL` defaults to
  `@cf/qwen/qwen3.8-27b` for its Turkish quality; it takes ~30s per turn.
  `WALK_PLANNER_MODEL` defaults to `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and is used only
  for one-shot route planning, where speed matters more than prose.
- Run `bun run db:migrate:local` (or `:remote`) after pulling: the `walks` table indexes tours
  for the account. Existing deployments also add the `plan_json` column to the walk Durable
  Object automatically on first use.
- `OVERPASS_URL` is optional; the default is `https://overpass-api.de/api/interpreter`.
- Local `wrangler dev` cannot simulate Workers AI. Either sign in (and use
  `wrangler dev` with remote bindings) or accept that `/api/walks/:id/message` returns
  `walk_failed` until the binding can reach the model.
- `POST /api/walks/:id/message` accepts an `operationId` (JSON body or form field). The same id
  twice is one Pi submission, so a retried mobile request does not get two answers.
- Walk photos are stored under `walks/<user_id>/<walk_id>/` in R2. The object is only reachable
  through the owner-scoped `WALK_AGENT` name, never a public URL.


## Project layout

```
src/
  screens/        camera, report, history, profile, login, onboarding, auth callback
  components/
    layout/       swipe deck, page dots, shell, splash
    report/       photo hero with tappable annotations, trivia carousel, chat panel
    capture/      capture controller, analyzing overlay
    ui/           shadcn-style primitives
  lib/            auth, api client, repositories (local + api), image, image worker,
                  device tier, geo, motion
  store/          zustand stores (app, preferences, location)
worker/           Hono app, Better Auth, routes, vision providers, prompts, nearby lookup
worker/walk/      Pi Durable walk agent, route/progress store
worker/db/        D1 domain schema
shared/           domain types, zod schemas, walk plans, mock reports (used by app and worker)
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
- `bun run smoke` — end-to-end check: sign in, capture, read the report, ask a question, confirm
  it reached history. Point it anywhere with `BASE_URL=https://nekibuki.thecrafter.io`.
- `bun run perf` — the performance guard: the photo pipeline runs in the worker, the camera
  chrome keeps a cheap frost, the analysing overlay paints no full-screen blur, long content is
  painted lazily, and the shutter press costs no long frame.

## Performance

Three things carry the frame budget, and each has a guard.

**The photo pipeline runs in a worker.** Capturing, cropping, scaling and encoding a frame is
millions of pixels and a software JPEG encoder; on the main thread that stalls the frame the
traveller is looking at. `src/lib/image.worker.ts` does it with `OffscreenCanvas`, fed by a
zero-copy `ImageBitmap` handoff. Browsers without `OffscreenCanvas` fall back to the main thread.

**Nothing frosts a moving backdrop.** A backdrop filter is recomputed for every pixel it covers,
every frame. The live viewfinder gets its own short-blur token (`glass-dark-live`), the
analysing overlay paints a photograph once into a forty-pixel bitmap instead of blurring a
full-screen image on every frame, and the live video carries no filter at all.

**Weak devices get less decoration, never less information.** The power tier is read once,
before the first paint, and written to the document as `data-power`. On the lean tier the frost
is off and the scrim carries the contrast alone.

The measured effect, in a software rasteriser with a four-times CPU throttle: the analysing
overlay rasterises about half as much, and scrolling a guide rasterises about a third less.

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

## Status

UI-complete against [`requirements.md`](requirements.md) and running on mock data end to end:
camera → analyze → report → chat → history, with search, saved places, appearance (light/dark/
auto) and an English/Turkish interface and guide. The Google, Gemini, D1 and R2 paths are wired but only
exercised once you supply credentials.
