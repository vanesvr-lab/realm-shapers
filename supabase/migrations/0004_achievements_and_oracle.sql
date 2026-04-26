-- B-007: achievements table + Oracle voice cache bucket.

create table if not exists user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists user_achievements_user_id_idx on user_achievements(user_id);

alter table user_achievements enable row level security;

drop policy if exists "user_achievements owner select" on user_achievements;
drop policy if exists "user_achievements owner insert" on user_achievements;

create policy "user_achievements owner select" on user_achievements
  for select using (auth.uid() = user_id);
create policy "user_achievements owner insert" on user_achievements
  for insert with check (auth.uid() = user_id);

-- Storage bucket for cached Oracle TTS clips. Private; access via signed URLs.
insert into storage.buckets (id, name, public)
values ('oracle_voice', 'oracle_voice', false)
on conflict (id) do nothing;

-- worlds.map convention note (no DDL change):
-- worlds.map is the StoryTree JSON. Inventory and visited-scene state are
-- tracked client-side per playthrough (localStorage keyed by world id) and
-- not persisted to map. If we ever want server-side persistence, add a
-- worlds.player_state jsonb column in a future migration.
