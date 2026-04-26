-- B-008: gameplay event log so achievements can fire from real play, not from
-- world creation. Each event from the play surface (scene_visited,
-- pickup_collected, world_completed, side_quest_completed,
-- secret_ending_discovered, summon_used, world_shared) appends a row here. The
-- check-achievements route then computes cumulative unlocks (Realm Walker,
-- Treasure Hunter, World Wanderer, etc) from cheap aggregations on this table.

create table if not exists gameplay_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists gameplay_events_user_kind_idx
  on gameplay_events(user_id, kind);
create index if not exists gameplay_events_user_created_idx
  on gameplay_events(user_id, created_at desc);

alter table gameplay_events enable row level security;

drop policy if exists "gameplay_events owner select" on gameplay_events;
drop policy if exists "gameplay_events owner insert" on gameplay_events;

create policy "gameplay_events owner select" on gameplay_events
  for select using (auth.uid() = user_id);
create policy "gameplay_events owner insert" on gameplay_events
  for insert with check (auth.uid() = user_id);
