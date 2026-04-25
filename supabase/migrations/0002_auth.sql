-- B-002a: profiles and worlds tables, RLS for kid-safe auth
-- See docs/superpowers/specs/2026-04-25-b-002a-auth-design.md

create extension if not exists citext;
create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  parent_email text not null,
  parent_consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table worlds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  narration text not null,
  ingredients jsonb not null,
  share_slug text unique not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_at timestamptz not null default now()
);

create index worlds_user_id_idx on worlds(user_id);

alter table profiles enable row level security;
alter table worlds   enable row level security;

create policy "profiles owner select" on profiles for select using (auth.uid() = id);
create policy "profiles owner insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles owner update" on profiles for update using (auth.uid() = id);

create policy "worlds owner select" on worlds for select using (auth.uid() = user_id);
create policy "worlds owner insert" on worlds for insert with check (auth.uid() = user_id);
create policy "worlds owner update" on worlds for update using (auth.uid() = user_id);
create policy "worlds owner delete" on worlds for delete using (auth.uid() = user_id);
