-- B-010 scope 10: progressive scene rendering. Worlds are written in two
-- phases when NEXT_PUBLIC_PROGRESSIVE_GEN=true: phase 1 saves a shell tree
-- (placeholder scenes the kid sees immediately) with status='phase_1', and
-- /api/finalize swaps the full tree in with status='complete'. Pre-B-010
-- worlds default to 'complete' so they continue to play normally.

alter table worlds add column if not exists generation_status text not null default 'complete';

create index if not exists worlds_generation_status_idx on worlds(generation_status);
