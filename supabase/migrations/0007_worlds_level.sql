-- B-010 scope 7: track per-world difficulty level. The "Go Deeper" button on
-- the Realm Card regenerates the same world_id at level+1 (more scenes, more
-- choices per scene, ending gated behind 2 of 5 minimum pickups). New worlds
-- default to 1 so all pre-B-010 worlds replay normally.

alter table worlds add column if not exists level integer not null default 1;

create index if not exists worlds_user_level_idx on worlds(user_id, level);
