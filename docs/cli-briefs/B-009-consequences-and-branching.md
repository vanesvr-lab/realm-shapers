# B-009: Consequences, Choice Moments, and Branching Endings

> Vanessa's feedback after planning B-008: per-scene play needs consequences. What the kid does in scene 3 should change scene 5, and the ending should reflect their path. Approved as a follow-up to B-008 to keep both batches reviewable.

## Goal

Make playthroughs feel like the kid's choices matter. Earlier actions ripple forward as narration callbacks, visible scene changes, and ending divergence. Pure additive on top of B-008.

## Decisions Locked

- **3-5 named flags per playthrough**, picked by Claude during tree generation, story-specific (e.g. `tamed_dragon`, `helped_villager`, `chose_treasure`)
- **Implicit + explicit flag setting** (Choice C from brainstorm): pickups + side quest completion fire flags silently; 1-2 scenes per tree are explicit forks with two-button choices
- **All three layers of consequence** (Choice D from brainstorm): narration callbacks + visible prop swaps + ending divergence
- **Hybrid generation** (Choice C from brainstorm): full tree generated upfront with conditional content baked in; no on-the-fly Claude regeneration during play
- **Flag state lives client-side per playthrough only** (sessionStorage). Resets on replay. No DB schema changes. Matches B-007 inventory pattern.
- **2-3 endings per tree**, ranked; first matching flag combo wins at finale
- **Visible changes via prop swaps only** — same background, different prop list. No new asset gen.

## Architectural Decisions

### Schema additions (lib/claude.ts)

`StoryTree` gains:
- `flags: { id: string; description: string }[]` — 3-5 named flags Claude defines for this story
- `endings: { scene_id: string; requires: Record<string, boolean> }[]` — ranked, first matching flag combo wins; last entry should have empty `requires` as fallback

`StoryScene` gains (all optional):
- `flag_set?: string` — fires implicitly when the kid leaves this scene via any outbound interactable (pickups grabbed first if present). Side quest scenes fire on exit. Server-validated to reference a defined flag id.
- `narration_variants?: { when: Record<string, boolean>; text: string }[]` — picked in order; first matching `when` wins; falls back to base `narration` if none match
- `prop_overrides?: { when: Record<string, boolean>; props: string[] }[]` — same matching rule; replaces the scene's default prop list when matched
- `is_choice_scene?: boolean` — if true, scene shows ChoiceMoment UI instead of normal interactables
- `choices?: { label: string; sets_flag: string; goes_to: string }[]` — exactly 2 entries when `is_choice_scene` is true; each sets a flag and routes to a target scene_id

### Prompt update (lib/claude.ts story prompt)

Tell Claude:
- Define 3-5 story-specific flags up front, give each a one-sentence description
- Mark 1-2 scenes (mid or late, never first or last) as `is_choice_scene` with two clear options
- Sprinkle `narration_variants` across mid-late scenes so kids who set different flags see different text
- Optionally use `prop_overrides` for 1-3 visible scene changes (e.g. broken bridge, sleeping wolf gone)
- Define 2-3 endings keyed on flag combos; one of them must be the fallback (empty `requires`)
- Side quest completion scenes and pickup-bearing scenes should set a flag via `flag_set` so the rest of the tree can react

Parser validation (`lib/claude.ts`):
- Every `flag_set`, `sets_flag`, `requires` key must reference a flag in `tree.flags`
- Every `goes_to` must reference an existing scene_id
- Endings list must have at least one entry with empty `requires` (fallback)
- `is_choice_scene` requires exactly 2 `choices`

### Resolver (new lib/scene-resolver.ts)

Pure function: given `(scene, flags)`, returns resolved `{ narration, props, choices? }`. Variants matched in declaration order; first hit wins; default falls through. Endings selector: given `(tree.endings, flags)`, returns the matching ending scene_id.

### Flag state (new lib/flags.ts)

Helpers:
- `matchesWhen(when, flags): boolean` — every key in `when` must equal the flag value
- `pickVariant<T>(variants, flags, fallback): T` — first match or fallback
- `setFlag(state, id, value): newState` — immutable set
- `selectEnding(endings, flags): scene_id`

### UI changes

`ChoiceMoment` (new component): when scene is `is_choice_scene`, render two large buttons in the scene area instead of normal interactables. On tap: fire Oracle line "you chose [label]", set the flag, navigate to `goes_to`. Style consistent with the existing Interactable hover/glow language.

`StoryPlayer` rewrite (modify):
- Reads flag state from PlayClient (passed as prop)
- Calls `scene-resolver` per scene render to get narration/props
- On pickup collected: if `scene.flag_set` defined, fires `setFlag` callback up
- On side quest scene completion: same thing
- Renders ChoiceMoment when scene is a fork
- At finale (current scene is_ending): selects ending via `selectEnding`, passes ending narration to CeremonyReveal/RealmCard flow

`PlayClient` (modify):
- Owns `flags: Record<string, boolean>` state, initialized empty per world load
- Persists to `sessionStorage` under key `realm-shapers:flags:{world_id}` so refresh mid-playthrough doesn't reset
- Cleared on world change
- Computes `flag_title_suffix` for RealmCard based on dominant flag (e.g. "the Dragon Tamer") — simple lookup table from a small `lib/flag-titles.ts` keyed on common flag ids; falls back to no suffix

`RealmCard` (modify): accepts optional `flag_title_suffix` prop, appends to title when present.

### Achievement integration (depends on B-008)

Add new achievement defs in `lib/achievements.ts` (after B-008 ships):
- "Forked Path" — make your first explicit choice
- "Two Realms, Two Endings" — finish the same world with two different endings
- "All Three Endings" — discover all 3 endings in any single world

These fire from gameplay events using B-008's event-driven dispatch. Tracking "two endings of same world" requires a small `world_endings` log table:

```sql
create table world_endings (
  user_id text references users(id),
  world_id uuid references worlds(id),
  ending_scene_id text not null,
  reached_at timestamptz default now(),
  primary key (user_id, world_id, ending_scene_id)
);
```

Migration `0006_world_endings.sql` adds this with RLS. Server inserts one row per (user, world, ending) combination on world_completed event.

## Files

### New
- `lib/flags.ts` — pure helpers for flag state and matching
- `lib/scene-resolver.ts` — pure resolver for variants and ending selection
- `lib/flag-titles.ts` — small lookup table from common flag ids to RealmCard title suffixes
- `components/ChoiceMoment.tsx` — two-button fork UI
- `supabase/migrations/0006_world_endings.sql` — log table for ending discoveries

### Modified
- `lib/claude.ts` — schema additions + prompt update + parser validation
- `lib/achievements.ts` — three new defs (Forked Path, Two Realms, All Three Endings) wired to B-008's event dispatch
- `components/StoryPlayer.tsx` — calls scene-resolver, fires implicit flags, renders ChoiceMoment
- `app/play/PlayClient.tsx` — owns flags state, persists, computes title suffix, picks ending
- `components/RealmCard.tsx` — accepts flag_title_suffix
- `app/api/check-achievements/route.ts` — handles new event kinds (`choice_made`, `world_completed_with_ending`); inserts into world_endings
- `CHANGES.md` — entry on completion

### Deleted
- None

## User Flow (post-B-009)

1. Kid generates a realm. Claude returns tree with 3 named flags: `tamed_dragon`, `helped_villager`, `chose_secret_path`.
2. Editor → Play. Scene 1 default narration plays.
3. Scene 2 has a side quest entry. Kid takes it, completes it. `helped_villager` flag fires silently.
4. Scene 3 is a `is_choice_scene` fork: "set the dragon free" / "claim the treasure". Kid picks "set free". `tamed_dragon` flag fires. Oracle voices "the dragon will not forget your kindness." Routes to scene 4.
5. Scene 4 has a `narration_variants` entry keyed on `tamed_dragon: true` — kid sees "the dragon's kin greets you at the cave mouth" instead of the default. **Forked Path** achievement unlocks.
6. Scene 5 has a `prop_overrides` entry keyed on `helped_villager: true` — the broken bridge is now mended (different prop list). Kid crosses without needing a side quest fix.
7. Final scene resolves via `selectEnding`. Kid's flag state matches the "kind hero" ending. RealmCard renders with title "[World Name], the Dragon Tamer."
8. Kid replays the same world. Picks the other choice. Reaches the "treasure hoarder" ending. **Two Realms, Two Endings** unlocks.

## Out of Scope

- Karma scores or numeric stats (just boolean flags)
- Combinable items (orthogonal feature, deferred)
- Multiplayer choices
- Choice scenes with more than 2 options
- Persisting flag state across replays (intentional reset for replay value)
- Voice acting per choice beyond Oracle's existing line set
- Choice timers
- Branching that affects scene 1 (always single intro)
- Database schema changes beyond the world_endings log table

## Definition of Done

- StoryTrees include `flags`, `endings`, and at least 1 explicit choice scene
- Implicit flag firing works (pickup or side quest completion sets the right flag)
- Explicit ChoiceMoment renders, fires flag, routes correctly
- Narration variants render based on flag state
- Prop overrides swap visible scene props based on flag state
- Ending selector picks correct ending based on flag combo at finale
- RealmCard shows flag-derived title suffix when applicable
- Three new achievements unlock from real gameplay
- Migration 0006 applied; world_endings table tracked
- All builds clean, deployed, MORNING_CHECKLIST_009.md written, pushed

## Effort Estimate

- Schema + prompt + parser: ~1.5 hr
- flags.ts + scene-resolver.ts + flag-titles.ts: ~1.5 hr
- ChoiceMoment + StoryPlayer wiring: ~2 hr
- PlayClient flag state + RealmCard suffix: ~1 hr
- Ending selector + finale wiring: ~0.5 hr
- Achievement defs + migration + event handler updates: ~1.5 hr
- Glue, deploy, smoke: ~1 hr

Total: ~9 hr.

## Risks

- **Claude generates inconsistent flag references** (sets a flag never defined, or gates an ending on an impossible combo). Mitigate: strict parser validation rejects invalid trees; agent retries up to 2x.
- **Choice scenes feel jarring** if they break the visual rhythm. Mitigate: ChoiceMoment styled to match Interactable language; Oracle voice line acknowledges the choice for emotional weight.
- **Prop overrides break the editor** if scene 1 has overrides (kid would never see their composition). Mitigate: parser rejects overrides on the first scene.
- **Replay friction** if flags persist by accident. Mitigate: sessionStorage key includes world_id; cleared on world change in PlayClient.
- **All-three-endings achievement requires three full playthroughs** of one world. May feel like a grind. Mitigate: ending narrations are distinct enough that kids who like the world will want to see them; achievement is a stretch goal not a core unlock.

## Dependencies

- **Requires B-008 to be shipped first.** This brief assumes the event-driven achievement dispatch from B-008 exists, that side quests exist (for implicit flag setting), and that the StoryTree schema already has the B-007/B-008 fields (pickups, requirements, is_side_quest).
- If B-008 ships clean, B-009 can run the next overnight without blockers.
