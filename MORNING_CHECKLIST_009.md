# Morning Checklist — B-009

> Overnight CLI agent shipped consequences and branching: Claude now defines 3-5 named flags per playthrough, mid-tree choice scenes that fork the story, narration variants and prop overrides keyed on flag state, and ranked endings selected at finale by the kid's flags. Three new achievements, one new log table, and a flag-derived RealmCard title suffix. Walk these flows in order. Each step has a clear pass / fail signal.

Production URL: https://realm-shapers.vercel.app
Repo: https://github.com/vanesvr-lab/realm-shapers

## 0. Apply migration 0006 (BLOCKER)

Until this is applied in production Supabase, the `world_completed_with_ending` event will silently fail. The route logs the error and returns `{ unlocked: [] }`, so Two Realms / All Three Endings achievements will never fire.

1. Open the Supabase dashboard for the project.
2. SQL Editor → New query.
3. Paste the contents of `supabase/migrations/0006_world_endings.sql`.
4. Run. Should report success.
5. Verify: `select * from world_endings limit 1;` (zero rows is fine; the query running is the success signal).

If you skipped applying migration 0005 yesterday, apply that one first (B-008). Migration 0006 depends on the worlds table existing, which it always does, but the `gameplay_events` table is a separate prerequisite for ANY achievement to fire.

## 1. Confirm production deploy is live

1. Open https://realm-shapers.vercel.app in a fresh incognito window.
2. Page loads. Form is visible.
3. View source / Network: build hash is recent.

## 2. Explicit choice moment fires flag and routes (Flow A)

This is the headline B-009 feature: a mid-tree choice scene with two big buttons that route the kid down different branches.

1. Generate a new realm. Use ingredients with at least one moral fork hint, e.g. ("dragon's lair", "young dragonkeeper", "decide the dragon's fate", "the dragon speaks in dreams"). Claude should pick this up and produce a choice scene.
2. Wait through ceremony / star-tap / loading. Click Play your story.
3. Walk forward through the early scenes. Look for a scene whose narration sets up a moral or path fork. Instead of normal glowing path icons, two large amber-gradient buttons should appear in the lower-middle of the screen, each labeled with a 2-6 word option ("Set the dragon free", "Claim the treasure", etc).
4. The bottom hint reads "A moment of choice. Pick a path."
5. Click one of the two buttons. Oracle voices "you chose: [your option]." The next scene loads. Watch the network tab: `/api/check-achievements` POST with `kind: "choice_made"` should return `unlocked: [{ id: "forked_path", ... }]` the first time.
6. **Forked Path** achievement toasts.

PASS: choice scene renders two buttons, picking one routes correctly, Forked Path unlocks once.

FAIL diagnostics:
- If no choice scene appears anywhere in the tree: Claude probably didn't honor `is_choice_scene`. Check `/api/generate` response body in the network tab; look for any scene with `is_choice_scene: true` in the JSON. If absent, regenerate; if present but UI didn't render, hard refresh and try again.
- If the buttons render but clicking does nothing: open the console; the `goes_to` target may not exist in scenes. The parser should have rejected this at generation; if it didn't, file a follow-up.

## 3. Narration variants render based on flags (Flow B)

After making a choice, later scenes whose `narration_variants` match should swap their text.

1. Continuing from Flow A, walk past the choice scene to the next 2-3 scenes.
2. At least one of them should show narration that references the choice you made. Example: if you chose "set the dragon free" and the flag was `tamed_dragon`, a later scene might say "the dragon's kin greet you at the cave mouth" instead of the default narration.
3. Refresh the page mid-playthrough. The flag state should persist (sessionStorage key `realm-shapers:flags:{world_id}`). The variant narration still shows.
4. Replay (use the "Play again" button on the Realm Card) and pick the OTHER choice. The same later scene should now show different narration (or the default narration if no variant matches the new flag combo).

PASS: narration text changes based on which choice was made earlier.

FAIL diagnostics:
- If narration looks identical across both choices: Claude may not have emitted `narration_variants` for any scene. Inspect the world's JSON in `/api/generate` response. If absent, regenerate.
- If the variant fired on the wrong flag: check `lib/scene-resolver.ts` `pickVariant` is using `matchesWhen` correctly.

## 4. Prop overrides swap visible scene props (Flow C)

This is the visible-change layer: same background, different props on stage when a flag matches.

1. In the same playthrough, look at scene-by-scene visuals. One mid-or-late scene should have a noticeably different prop set when a flag is set vs not.
2. Concrete example to look for: a scene whose default props include `bridge` (a broken bridge) and whose `prop_overrides` include `{ "when": { "helped_villager": true }, "props": ["bridge", "flower"] }` (mended bridge with a flower nearby), or similar visible swap. Compare across two replays.
3. Replay the same world picking different flag-setting actions. The same scene should show different visible props.
4. Confirm the FIRST scene of any playthrough has NO prop_overrides. The parser rejects overrides on the starting scene; if you can see scene 1 visibly change between replays, that's a parser regression.

PASS: prop sets visibly differ between two playthroughs of the same world based on flag state.

FAIL diagnostics:
- If props look identical: Claude may not have used prop_overrides. Inspect `/api/generate` response; look for `prop_overrides` arrays. If absent everywhere, regenerate. Some realms simply won't use them since they're optional in the spec.

## 5. Ending divergence and RealmCard title suffix (Flow D)

Endings are picked at finale from `tree.endings` based on flag state. The ranked list resolves to a winning scene_id; if none match, the LAST entry (whose `requires` is `{}`) is the fallback.

1. Walk to an ending in the playthrough where you made a clear flag-setting choice. The ending narration should reflect that choice (the ending scene_id picked by `selectEnding`).
2. RealmCard appears. The title should include a flag-derived suffix when applicable, e.g. "[World Name], the Dragon Tamer" or "[World Name], the Kind Helper". The suffix list is in `lib/flag-titles.ts` and matches against common flag id substrings (dragon → "the Dragon Whisperer", treasure → "the Treasure Seeker", etc).
3. Click "Play again". Make the OPPOSITE choice this time. Reach an ending. The ending narration AND the suffix should be different (e.g. "[World Name], the Treasure Seeker" instead).
4. Watch the network tab: `/api/check-achievements` POST with `kind: "world_completed_with_ending"` should fire on each ending, with `ending_scene_id` reflecting the resolved ending. After the second different ending is reached, **Two Realms, Two Endings** should toast.
5. Replay a third time aiming for the third ending (if the realm has 3 endings). After reaching it, **All Three Endings** should toast.

PASS: ending narration changes between replays, RealmCard suffix appears, Two Endings + All Three Endings unlock.

FAIL diagnostics:
- If the same ending narration appears across replays: check the JSON at `/api/generate`. Look for `endings: [...]` at the tree level. If only one entry, Claude regressed; regenerate.
- If suffix never appears: the kid's flag ids may not match any rule in `lib/flag-titles.ts`. The mapping is intentionally narrow (substring rules cover common motifs only). Consider adding more rules later, or accept that some realms will have no suffix.
- If Two Endings doesn't unlock after two distinct endings: confirm migration 0006 is applied. The handler upserts into `world_endings`; if the table doesn't exist, the upsert errors and the cumulative check returns 0.

## 6. Three new achievements unlock from real gameplay (Flow E)

Same checklist condensed:
- **Forked Path** — fires on first explicit choice scene click. Trigger: `choice_made`.
- **Two Realms, Two Endings** — fires after reaching two distinct endings of the SAME world (different `ending_scene_id` for the same `world_id`). Trigger: `world_completed_with_ending`.
- **All Three Endings** — fires after reaching three distinct endings of the same world.

Verify the Profile page (`/profile`):
1. Refresh the page after triggering each.
2. The achievements panel should show new badges with their icons (🔀 🪞 🌈).
3. The badges persist across reloads (they're in `user_achievements`).

## 7. Regression spot check: B-008 features still work

These were the wins from B-008. Make sure B-009 didn't break any of them.

- **Adhoc summoning**: open the Summon button in the inventory bar. Type "a key" → matched, sparkle, Oracle says "Granted!". Counter goes up.
- **Side quests**: a scene marked `is_side_quest` shows the "✨ side quest" pill in its title bar. Side quest interactables on main path scenes wear a "✨ side" badge.
- **Side Quester achievement**: completing your first side quest scene triggers the toast.
- **Achievement timing**: zero achievements fire at world creation / ceremony / edit screens. Only at play.
- **8-10 scene length**: the kid should reach an ending after ~6-9 scene clicks (some side quests, some main path).
- **Old realms still play**: from Profile, click an old B-007 era card. The play surface loads. The old world has no flags / endings / choice scenes; the resolver falls through to base narration and default props. No crash.

PASS: all B-008 features still work as documented in `MORNING_CHECKLIST_008.md`.

## 8. Edge cases worth a quick sanity check

- **Flag state persistence**: refresh mid-playthrough. The current scene + the flags you've set should resume. Inventory/visited resets (those are React state, not session-stored — same as B-007 behavior).
- **Replay clears flags**: hit "Play again" on the Realm Card. flags reset to {} for this world. The next playthrough starts fresh.
- **Switching worlds**: from one world's Realm Card, hit "Make another", generate a new realm. The new world's flag state starts empty (each world has its own sessionStorage key keyed on `world_id`).
- **Choice scene cannot be the starting scene**: Claude should never make scene 1 a choice scene; the parser rejects this. If it happens, it's a parser bug.
- **Prop overrides forbidden on scene 1**: same. The parser rejects.
- **Fallback ending**: Claude must include an ending entry with `requires: {}` as the LAST entry. If no flag combo matches at finale, the fallback fires. The parser rejects trees missing the fallback.

## 9. If everything passes

Mark B-009 done. The hackathon demo now has the full consequence + branching loop:
- Implicit flags from pickups and side quests
- Explicit choice scenes
- Narration callbacks
- Visible scene changes via prop overrides
- Branching endings with title suffixes
- Three replay-encouraging achievements

The May 1 deadline is Friday, 3 PM ET. After this verification, the demo is feature-complete.

If something broke, file a quick note at the top of `CHANGES.md` under a `B-010 followups` heading and we'll triage from there.
