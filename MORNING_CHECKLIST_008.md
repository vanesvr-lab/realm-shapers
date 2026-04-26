# Morning Checklist — B-008

> Overnight CLI agent shipped: longer stories (8-10 scenes with side quests), adhoc prop summoning, and gameplay-earned achievements. None of the browser flows have been smoke-tested yet. Walk through these in order. Each step has a clear pass / fail signal.

Production URL: https://realm-shapers.vercel.app
Repo: https://github.com/vanesvr-lab/realm-shapers

## 0. Apply migration 0005 (BLOCKER)

Until this is applied in production Supabase, achievements will silently fail to record on play. `/api/check-achievements` will return `unlocked: []` for every event because the insert into `gameplay_events` errors out.

1. Open the Supabase dashboard for the project.
2. SQL Editor → New query.
3. Paste the contents of `supabase/migrations/0005_gameplay_events.sql`.
4. Run. Should report success.
5. Verify: `select * from gameplay_events limit 1;` (returns 0 rows is fine; query running is what matters).

## 1. Confirm production deploy is live

1. Open https://realm-shapers.vercel.app in a fresh incognito window.
2. Page loads. Form is visible.
3. View source / Network: confirm there is a recent build hash.

## 2. Adhoc prop summoning (Flow A)

1. Fill the four ingredients ("forest", "fox", "find a lost song", "the trees hum back"). Click Shape my realm.
2. Wait through the loading + ceremony. Star-tap mini-game should appear.
3. Click Play your story.
4. In play mode, look at the inventory bar (top-left). You should see a purple/fuchsia ✨ Summon button with `0/5`.
5. Click Summon. A modal opens.
6. Type "a key" → Summon. Modal closes. Sparkle animation runs on the new inventory slot. Oracle says "Granted! A brass key appears in your pocket." Counter goes to `1/5`.
7. Open Summon again. Type "horse" → Summon. Modal closes. Oracle says "this realm does not yet hold a horse..." Inventory does NOT add a slot. Counter STAYS at `1/5` (denials don't consume the cap).
8. Try "a glowing flower" → should match `flower` (the matcher boost on id-token hits is what makes this prefer flower over lantern).
9. Try "treasure" → should match `treasure_chest`.
10. Hit cap by summoning 5 different things. Button goes grey, says "Summons used up", clicking it does nothing.

PASS: matched summons drop a sparkle and a granted line. Mismatched summons say "not yet in this realm." Cap enforces at 5.

## 3. Longer stories with side quests (Flow B)

1. Generate a fresh realm.
2. Confirm the Oracle weaves longer (~14-20 sec).
3. In play mode, scene 1 should have multiple interactables. At least one should wear a small "✨ side" badge (top-right of the icon ring).
4. Click the side-marked interactable. The destination scene should show a "✨ side quest" pill next to its title.
5. The Oracle says "you have earned the [thing]. The realm remembers." (only if the side scene has a pickup — most should).
6. Side quest scene should have a "Return to..." choice that points back to a main scene.
7. Try to play through all 8-10 scenes. Profile should show updated "Side Quests Completed" count after.

PASS: side quest tags visible, side quest narration runs, scenes total 8-10.

## 4. Achievements only fire from play (Flow C)

This is the most important verification — it's the bug Vanessa flagged.

1. Open profile (`/profile`) BEFORE generating a new world. Note the unlocked count and which badges are earned.
2. Go back to `/`, generate a fresh realm.
3. **At Generate / ceremony / edit screens, NO achievement toast should appear.** This is the success signal.
4. Click Play your story. Scene 1 loads. Within a second or two, "First Steps" should toast and Oracle says "You discovered First Steps!"
5. Pick up an item. No achievement on the FIRST pickup unless it triggers Treasure Hunter (10 distinct ever).
6. Click Summon, summon "a key", grant succeeds. "Summoner" achievement toasts.
7. Walk through to an ending. "Story Finisher" toasts.
8. If you took a side quest scene, "Side Quester" toasts.
9. If the secret ending fired (visit-all-scenes or all-pickups condition), "Secret Keeper" toasts.
10. Refresh `/profile`. Counts should reflect newly earned achievements. The "Side Quests Completed" stat card should show the side quest you took. The "Mysteries Discovered" card increments only if you triggered the secret ending.

PASS: zero achievements fire at world creation, all earned ones fire from play.

FAIL diagnostics:
- If toasts never appear: open the browser network tab and watch `/api/check-achievements` calls. Inspect the JSON response. If `{ unlocked: [] }` always, migration 0005 is probably not applied.
- If a toast appears at generation: this is a regression. Check `/api/generate` route to confirm `evaluateUnlocks` is gone.

## 5. Old worlds still play (Flow D)

1. From profile, click any realm card created in B-005, B-006, or B-007 (5-scene stories).
2. The play surface should still load — old worlds are loaded directly from the DB without going through the new parser.
3. The realm should NOT crash even though it lacks `is_side_quest` flags. Defaults to false on read.

PASS: old realms load and replay without errors.

## 6. Quick regression spot checks

- Edit mode still lets you drag the character + props.
- Re-narrate scene 1 still works (cap of 5 / session, B-005 logic).
- ElevenLabs ambient audio still plays per scene.
- 3D preview link still works.
- Save your worlds modal opens.

## 7. Optional: clear stale B-007 achievement rows

Old defs (first_realm, dragon_friend, etc.) no longer exist in `ACHIEVEMENT_DEFS`. The rows still in `user_achievements` are inert; the profile just won't render them. To purge:

```sql
delete from user_achievements
where achievement_id not in (
  'first_steps', 'realm_walker', 'world_wanderer',
  'story_finisher', 'five_worlds_strong', 'all_heroes_tried',
  'treasure_hunter', 'side_quester', 'secret_keeper', 'mystery_master',
  'summoner', 'master_summoner', 'share_realm'
);
```

Run only if you want a clean slate. Skip otherwise.

## 8. If everything passes

Mark B-008 done in the planning notes. The hackathon demo is now feature-complete with longer playthroughs, summoning, and earned achievements per Vanessa's playtest feedback.

If something broke, file a quick note in `docs/cli-briefs/B-009-consequences-and-branching.md` follow-up section before B-009 starts.
