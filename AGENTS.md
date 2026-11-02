# Agent notes

## Commands
bun install --frozen-lockfile
bun test
bun run typecheck

## Rules
- Leave changes in the working tree. Agents do not commit, push or deploy.
  The runner commits the wi-<n> branch before verify; that is expected.
- Never touch secrets or env files.
- Change only what the work item asks for.
- Every behavior change has a test that fails without it.

## Other scripts (from package.json)
- `bun run dev` — web (vite) + api (wrangler dev --port 8787) together
- `bun run dev:web` / `bun run dev:api` — one side only
- `bun run build` — typecheck, then vite build
- `bun run deploy` — build, then wrangler deploy
- `bun run types` — `wrangler types` (regenerates `worker-configuration.d.ts`)
- `bun run smoke` — `bun scripts/smoke.mjs`
- `bun run perf` — `bun scripts/perf-check.mjs`
- `bun run db:migrate:local` / `bun run db:migrate:remote` — D1 schema
