-- Nekibuki · D1 schema (domain tables)
--
-- Better Auth owns `user`, `session`, `account` and `verification`; it creates
-- them itself through POST /api/auth/migrate (see worker/auth.ts). Run this
-- file first, then the auth migration, so the foreign key below resolves.
--
--   bun x wrangler d1 create nekibuki
--   bun run db:migrate:local
--   bun run db:migrate:remote
--
-- Timestamps are Unix milliseconds (integer), matching Better Auth and the
-- client. JSON is stored as TEXT: D1 is SQLite, so there is no jsonb column.

PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────
-- One row per captured place. The photo lives in R2, never here.
-- ─────────────────────────────────────────────────────────────
create table if not exists analyses (
  id            text primary key,
  -- Client-generated idempotency key. A retried analyse returns the row it
  -- already wrote instead of charging the model and archiving a second copy.
  capture_id    text not null,
  user_id       text not null references user (id) on delete cascade,
  report        text not null,
  location      text,
  language      text not null default 'en' check (language in ('en', 'tr')),
  messages      text not null default '[]',
  saved         integer not null default 0 check (saved in (0, 1)),
  -- R2 object keys, always under users/<user_id>/. Never a public URL.
  image_key     text not null,
  chat_key      text,
  image_width   integer,
  image_height  integer,
  -- Which model wrote the guide, for cost analysis and fallback debugging.
  provider      text,
  model         text,
  created_at    integer not null,
  updated_at    integer not null
);

-- History is always read newest-first, filtered by owner.
create index if not exists analyses_user_created_idx
  on analyses (user_id, created_at desc);

create index if not exists analyses_user_saved_idx
  on analyses (user_id, saved, created_at desc);

-- One capture per traveller, no matter how many times the request is retried.
create unique index if not exists analyses_user_capture_idx
  on analyses (user_id, capture_id);

-- ─────────────────────────────────────────────────────────────
-- Per-user daily quota. Vision is the only real cost, so the limit is
-- enforced before the model is called, not after.
-- ─────────────────────────────────────────────────────────────
create table if not exists usage_daily (
  user_id       text not null references user (id) on delete cascade,
  day           text not null, -- YYYY-MM-DD, UTC
  analyses      integer not null default 0,
  chat_messages integer not null default 0,
  primary key (user_id, day)
);

create index if not exists usage_daily_day_idx on usage_daily (day);
