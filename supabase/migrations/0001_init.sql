-- Nekibuki · initial schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).

-- ─────────────────────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  language text not null default 'en',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are private" on public.profiles;
create policy "profiles are private" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Analyses (one row per captured place, with its conversation)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  report jsonb not null,
  location jsonb,
  language text not null default 'en',
  messages jsonb not null default '[]'::jsonb,
  saved boolean not null default false,
  image_path text,
  created_at timestamptz not null default now()
);

create index if not exists analyses_user_created_idx
  on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

drop policy if exists "analyses are private" on public.analyses;
create policy "analyses are private" on public.analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Capture storage bucket
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('captures', 'captures', true)
on conflict (id) do nothing;

drop policy if exists "captures are readable" on storage.objects;
create policy "captures are readable" on storage.objects
  for select using (bucket_id = 'captures');

drop policy if exists "captures are uploaded by owner" on storage.objects;
create policy "captures are uploaded by owner" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "captures are deleted by owner" on storage.objects;
create policy "captures are deleted by owner" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
