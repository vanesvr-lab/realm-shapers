# B-008: Adhoc Prop Summoning + Longer Stories + Progress-Earned Awards

> Vanessa's feedback after testing B-007: stories end too soon, awards arrive at the start instead of being earned, and play needs more interactivity. Three pieces, all approved.

## Goal

Make playthroughs longer and more engaging. Kids invent props on the fly when they need them, side-quest scenes reward exploration, and achievements trigger from real gameplay milestones, not from clicking Generate.

## Three Pieces

| # | Piece | Effort |
|---|---|---|
| 1 | Adhoc prop summoning (Flavor B-lite, library-matched only, instant) | ~3-4 hr |
| 2 | Longer stories: 8-10 scenes with optional side quests | ~3-4 hr |
| 3 | Achievement timing fix: trigger from gameplay milestones, not generation | ~2-3 hr |

Total: ~8-11 hr CLI work, one overnight run.

## Decisions Locked

- 1B-lite (library-match only, instant); no fresh Replicate gen on summons
- Stories grow from 5 scenes to 8-10, with 2-3 of them being side quests
- Achievements never fire on world creation; they fire on gameplay events (scene visited, puzzle solved, ending reached, secret discovered, summon used)
- Background removal is happening in parallel via the bg-removal script (already running); not part of this brief

## Architectural Decisions

### Adhoc prop summoning

Inventory bar (B-007 component) gains a new "✨ Summon" button. Tapping opens a small text input: "What do you need?" Kid types ("a key", "some meat", "a glowing flower"). Submission calls `POST /api/summon-prop` with the text + current scene context.

Backend logic (no Replicate, no fresh gen):
1. Lowercase + trim the input
2. Run a similarity match against `ASSET_LIBRARY` prop ids and tags using a simple scorer (Levenshtein on id, tag overlap on plain words)
3. If best score above threshold: return that prop_id; frontend adds it to inventory immediately with a sparkle animation + Oracle voice line "Granted!"
4. If no good match: return `{ matched: false, suggestion?: "..." }`; Oracle line "this realm does not yet hold a [meat], but [a similar prop] lies somewhere ahead, perhaps."
5. Optional: also consult Claude with `tool_choice` for ambiguous matches (single short call, returns asset_id from a fixed list); skip if Levenshtein already gave a confident match

Cap to 5 successful summons per playthrough so the kid still has to find some things. Track `summons_used` in player_state.

### Longer stories with side quests

Update `lib/claude.ts` story prompt:
- 8-10 scenes total instead of 5
- 5-7 main path scenes leading to 1-3 endings
- 2-3 side quest scenes that branch off, give a reward (a unique pickup or a special narration), and either return the player to the main path or lead to a secret ending
- Side quest entries are marked `is_side_quest: true` in the schema; their entry interactable has a "✨" overlay so kid knows it is optional

Schema addition:
```ts
export type StoryScene = {
  // ... existing fields
  is_side_quest?: boolean;
  is_secret_ending?: boolean; // already in B-007, reaffirm
  pickups: string[]; // already in B-007
  requirements: { item_id: string }[]; // already in B-007, normalize shape
};
```

Update prompt to ask Claude for: "5-7 main scenes, 2-3 side quest scenes, 1-3 endings (one main, optionally a secret)". Validate count in parser.

UI changes:
- Side quest entries show a small "✨ side quest" tag in the scene
- After completing a side quest, gentle Oracle line: "you have earned the [prop name]. The realm remembers."
- Profile page shows side quests discovered counter

### Achievement timing fix

Audit `lib/achievements.ts` (B-007). Move every achievement that currently fires on world generation to fire on:
- `scene_visited` (count unique scenes ever visited across all worlds)
- `pickup_collected` (count unique pickup ids)
- `world_completed` (kid reached an ending in a world)
- `side_quest_completed` (kid completed a side quest scene)
- `secret_ending_discovered` (kid hit a secret ending)
- `summon_used` (kid used the new summon feature)

New `app/api/check-achievements/route.ts` becomes event-driven:
- Called from frontend on each gameplay event with `{ event_kind, world_id, payload }`
- Computes new unlocks by querying `user_achievements` + `worlds` (for cumulative counts)
- Returns newly unlocked achievement defs
- Frontend triggers `<AchievementToast>` for each

Event triggers added throughout the play flow:
- `<StoryPlayer>` calls check on scene entry
- `<Interactable>` calls check on pickup_collected
- Ending scene calls check on world_completed
- Summon button calls check on summon_used

Achievements rebalanced to feel earned (sample list, edit in place):
- "First Steps" — visit your first scene
- "Realm Walker" — visit 10 unique scenes across all your worlds
- "Story Finisher" — finish your first realm (reach any ending)
- "Five Worlds Strong" — finish 5 realms
- "Treasure Hunter" — collect 10 pickups across all worlds
- "Side Quester" — complete your first side quest
- "Secret Keeper" — discover a hidden ending
- "Summoner" — use the summon feature for the first time
- "World Wanderer" — visit every background at least once
- "All Heroes Tried" — play with at least 10 different characters
- "Master Summoner" — successfully summon 10 different props
- "Mystery Master" — discover 5 hidden endings

Server-side enforcement: each achievement still has a unique row constraint so they only unlock once.

## Files

### New
- `app/api/summon-prop/route.ts` — POST, body `{ text, world_id, scene_id }`, returns `{ matched: bool, prop_id?: string, suggestion?: string }`
- `lib/prop-matcher.ts` — Levenshtein + tag-overlap matcher over ASSET_LIBRARY props
- `components/SummonButton.tsx` — wraps the inventory bar's new button + modal + handles the API call + dispatches to OracleSpeaks for granted/denied lines

### Modified
- `lib/claude.ts` — story prompt updated to 8-10 scenes with side quests; schema adds `is_side_quest`; parser validates new structure; allow secret endings as already done in B-007
- `lib/achievements.ts` — new defs, every def has explicit `trigger: "scene_visited" | "world_completed" | ...` field
- `app/api/check-achievements/route.ts` — event-driven dispatch instead of one-shot post-generation check; queries cumulative state from worlds table
- `app/api/generate/route.ts` — REMOVE the achievement check from the generation flow; it now happens on gameplay events only
- `app/play/PlayClient.tsx` (or `StoryPlayer.tsx`) — wire achievement check on scene entry, pickup, world completion; render side quest tag; cap summons at 5 per playthrough; show summons_used counter
- `components/InventoryBar.tsx` — add `<SummonButton>`; show summons_used / 5 indicator
- `app/profile/page.tsx` — add side quests discovered counter; achievements section now matters more since they unlock from play
- `CHANGES.md` — entry on completion

### Deleted
- None

## User Flow (post-B-008)

1. Kid generates a realm. **No achievements trigger on click Generate.**
2. Ceremony reveal → editor → composes scene → clicks Play.
3. Scene 1 loads. **First Steps** achievement unlocks (first scene ever visited). AchievementToast pops.
4. Sees a locked door (interactable with key requirement). No key in inventory. Decides to summon one.
5. Taps **✨ Summon** in inventory bar. Types "a key". Backend matches `key` prop id. Sparkle animation. Key in inventory. Oracle says "Granted!" **Summoner** achievement unlocks.
6. Clicks the door. With key in inventory, door opens. Transitions to scene 2.
7. Scene 2 has a "✨ side quest" interactable to a side scene. Kid takes it, finds a pickup. **Side Quester** achievement unlocks. Returns to main path.
8. Continues through 6-8 more scenes (main + optional side quests).
9. Reaches an ending. **Story Finisher** achievement unlocks. RealmCard renders.
10. Profile shows updated achievements + side quests counter + new card in collection.

## Out of Scope

- Fresh Replicate gen for summons (deferred; would add 15-30 sec latency, breaks flow)
- Combinable items (key + lock = open is the only requirement type for now; no key + meat = drugged-meat)
- Multiplayer trades
- Time-limited daily challenges
- Adaptive difficulty (puzzles always have clear hints)
- Voice for summon "granted/denied" beyond Oracle's existing line set (just reuses voiced Oracle from B-007)

## Definition of Done

- Generating a world no longer fires any achievement
- Visiting first scene fires "First Steps"
- Summoning fires "Summoner"; matched summons add prop to inventory + sparkle; unmatched summons trigger Oracle "not yet in this realm" line
- StoryTrees have 8-10 scenes including 2-3 side quests
- Side quest entries visually marked in the scene
- Reaching an ending fires "Story Finisher"
- Profile shows updated counters + new badges
- All builds clean, deployed, MORNING_CHECKLIST_008.md written, pushed

## Effort Estimate

- Summoning: matcher + API + button component + Oracle integration: ~3-4 hr
- Longer stories: prompt update + parser update + side quest UI tag + side quest reward narration: ~3 hr
- Achievement timing rewrite: ~2-3 hr
- Glue, deploy, smoke: ~1 hr

Total: ~9-11 hr.

## Risks

- **Library matching fails for common requests** (kid types "horse" but no horse in library). Mitigate: add a few obvious gaps like horse, ladder, rope to the library OR accept that "not yet in this realm" is the appropriate fallback.
- **Side quests confuse kids** if they don't know which entry is main vs side. Mitigate: clear "✨ side quest" tag + slight visual contrast.
- **Cumulative achievement queries may slow down** as kid plays many worlds. Mitigate: index `worlds.user_id` + `worlds.created_at`; queries use simple counts.
- **Achievement spam** if too many unlock at once. Cap visible toasts to 1 at a time, queue the rest.
- **Summons cap too low at 5**: tune up to 7-8 if playtesting shows kids running out too fast.
