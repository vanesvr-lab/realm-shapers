-- B-009: per-(user, world, ending) log of regular endings discovered. The
-- check-achievements route inserts a row on every world_completed_with_ending
-- event (skipped for secret endings, which the gameplay_events table already
-- tracks via secret_ending_discovered). Achievements like "Two Realms, Two
-- Endings" and "All Three Endings" read distinct ending_scene_id counts per
-- (user_id, world_id) from this table.

create table if not exists world_endings (
  user_id uuid not null references auth.users(id) on delete cascade,
  world_id uuid not null references worlds(id) on delete cascade,
  ending_scene_id text not null,
  reached_at timestamptz not null default now(),
  primary key (user_id, world_id, ending_scene_id)
);

create index if not exists world_endings_user_world_idx
  on world_endings(user_id, world_id);

alter table world_endings enable row level security;

drop policy if exists "world_endings owner select" on world_endings;
drop policy if exists "world_endings owner insert" on world_endings;

create policy "world_endings owner select" on world_endings
  for select using (auth.uid() = user_id);
create policy "world_endings owner insert" on world_endings
  for insert with check (auth.uid() = user_id);
