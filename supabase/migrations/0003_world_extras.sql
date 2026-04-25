-- B-002b/003/004: extend worlds with map data and an audio prompt.
-- Nullable so B-001/B-002a rows still load.

alter table worlds add column if not exists map jsonb;
alter table worlds add column if not exists audio_prompt text;
