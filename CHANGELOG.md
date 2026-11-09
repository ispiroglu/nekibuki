# Changelog

Notable changes to Nekibuki, newest first. This is a product changelog, not a
commit log; the git history has the details.

## 2026-10-24 — On-the-fly guided walks

### From one fixed route to a tour of where you are

Before this change, “Adım adım” was a single hand-written route through
Dolmabahçe: twelve stops in `shared/walks.ts`, offered only when a report
happened to match the palace. The route was the same for every traveller, it did
not use the photo's position, and it was not stored against an account.

Now a photo with a location produces a new 5–8 stop tour from that point. The
Worker asks OpenStreetMap's Overpass API for named places within about 800 m,
lets Workers AI choose and narrate them from a strict candidate list, and
assembles the route in code. The first stop is always the nearest selected
place. The plan and progress live in a Durable Object, with an account index in
D1, so “Devam et” can pick the walk up later, including on another device.

Photos without a location still do not invent one: the report offers a matching
curated route, or asks for location.

### Added

- On-the-fly walk planner: Overpass discovery, strict JSON schema, one retry,
  deterministic coordinate/order/`arriveBy` composition.
- `GET /api/walks` returns the signed-in traveller's active walks; dynamic
  `POST /api/walks` starts a generated tour from `analysisId`/`location`.
- D1 `walks` index and Durable Object `plan_json` persistence.
- Report CTA handoff (title, summary, place, coordinates, language), active
  walks on Places, and a Walk screen that names the starting point.
- `OVERPASS_URL` and `WALK_PLANNER_MODEL` configuration.
- Unit tests for geometry, Overpass parsing, schema validation and route order.

### Changed

- The default Overpass endpoint is now
  `https://overpass.openstreetmap.fr/api/interpreter`, with
  `https://overpass-api.de/api/interpreter` as fallback.
- Walk plans can be `curated` or `generated`; existing `planId` requests keep
  working.
- Removed the unused Supabase client and migrations left behind after the
  API-backed repo.

### Fixed

- `overpass-api.de` answers 521 to Cloudflare Workers; generated walks would
  have failed in production. The French mirror is reachable from the edge and
  is now primary.

### Verified

- `bun run build`, `bun run test` (6/6), `bun run smoke` (13/13).
- Remote D1 migration applied; production deployed at version
  `9b5adfb1-822c-4be2-a7a7-919dd57c086c`.
- Live edge probe: 25 OSM candidates, 7 generated stops, real OSM IDs and
  coordinates, Turkish directions.

### Known limitations

- Generated walks still require a coordinate. A geocoded “representative start”
  for photos without GPS is not implemented yet.
- The live authenticated “continue on another device” path still needs a
  signed-in production check.
- The model's narrative order is preserved after the first stop; the live probe
  showed mild backtracking. A deterministic 2-opt pass is a possible follow-up.
