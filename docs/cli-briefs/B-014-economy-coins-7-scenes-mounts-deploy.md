# B-014: Coins economy, 7 new scenes, mounts, sound, deploy

## Goal

Extend the hand-authored "Hunt the Dragon's Egg" adventure with a coins economy (treasures, markets, medicines, thieves, mounts), 7 new challenge scenes, and a Web Audio "ching" sound effect on every coin transaction. Then deploy to Vercel prod and write a morning checklist for Vanessa.

This batch should run end-to-end without human input. Vanessa is asleep. Use defaults from CLAUDE.md.

## Project context (read first)

- Project root: `/Users/elaris/realm-shapers`. Next.js 14 App Router, TS strict, Tailwind, Supabase, Anthropic.
- **READ** `CLAUDE.md` first — that's the project constitution. Critical rules:
  - **No em dashes anywhere** (project, code, comments, copy). Use commas, periods, parentheses.
  - **No `git add .`** Stage files you intentionally touched.
  - Always `git pull` at session start, push at end.
  - Run `git status` before EVERY commit.
  - **Don't autoplay audio.** Always behind a user gesture.
- **READ** `CHANGES.md` last 2 entries for cross-surface state, then append a new entry at end of this batch.
- Adventure data lives at `lib/adventures/hunt-dragon-egg.ts`. Registry + validator at `lib/adventures/index.ts`. Validator runs at module load, throws on broken refs.
- Schema for StoryTree, StoryScene, StoryChoice, ChoiceOption, BackgroundVariant, Prologue, StarterChoiceSet is in `lib/claude.ts`. **All optional fields you add must default to absent so Claude-generated trees still parse.**
- Counters: `lib/counters.ts` (CounterState, CounterDef, applyTick, applyReplenish, deriveCounterFlags, initialCounters).
- StoryPlayer: `components/StoryPlayer.tsx`. PlayClient: `app/play/PlayClient.tsx`. InventoryBar: `components/InventoryBar.tsx`. ChoiceMoment: `components/ChoiceMoment.tsx`.
- Image prompts: `scripts/hunt-dragon-egg-prompts.ts`. Replicate runner: `scripts/generate-hunt-dragon-egg-art.ts`. Run with `npx tsx --env-file=.env.local scripts/generate-hunt-dragon-egg-art.ts`. Skips files already on disk.
- Pickups catalog: `lib/pickups-catalog.ts`.
- Background resolver: `lib/background-resolver.ts`. Adventure scene background ids use the form `adventure:hunt-dragon-egg/<scene_id>` and resolve to `/adventures/hunt-dragon-egg/<scene_id>.webp`.
- **Dev script**: `npm run dev` in package.json runs `unset ANTHROPIC_API_KEY && next dev` (Vanessa's shell shadows the env). Honor that.
- **Plan file** with full background design: `/Users/elaris/.claude/plans/i-like-this-if-functional-moonbeam.md`.

Current adventure flow (already implemented):
```
forest_riddle → forest_path → cliff_climb OR riverbank
  riverbank → river_crossing OR wood_gathering OR back
  wood_gathering → riverbank (with wood_logs if sword)
  river_crossing → volcano_base (if rope+wood) OR back
volcano_base → dark_cavern OR lava_river_crossing OR ash_road OR back to forest
  dark_cavern → cave_shortcut (if lantern) OR back
  lava_river_crossing → lava_chamber (if rope+wood OR sword) OR back
  cave_shortcut / lava_chamber / ash_road → dragon_chamber → endings
```

Existing endings: `ending_starvation`, `ending_dehydration`, `ending_lost` (unused, no flag triggers it currently), `ending_friend`, `ending_charmed`, `ending_appeased`, `ending_success`, `ending_secret`. Flags include: `tended_wound`, `sang_lullaby`, `riddle_answered`, `riddle_failed`, `forest_riddle_passed`, `forest_riddle_failed`, `grabbed_egg`. Counters: food and water (max 6, critical_at 2). Starter pick: 3 of 5 from rope, sword, water_bottle, food_ration, lantern.

## Decisions baked in (Vanessa confirmed)

- Starter coins: **50** (small buffer)
- Sound: **synthesize via Web Audio API**, no audio file
- Mounts: **yes**, at riverbank and ash_road (200 coins each, skip downstream challenges)
- Vercel deploy: **`vercel --prod --yes`** after clean type check + build + lint
- After deploy: write `MORNING_CHECKLIST_014.md` (mirror `MORNING_CHECKLIST_006.md` format).

## Scope

### A. Schema additions in `lib/claude.ts`

Add four optional fields. All optional. Claude trees ignore them.

- `Pickup.coin_value?: number` — extend the Pickup type in `lib/pickups-catalog.ts` (NOT in claude.ts). When this pickup is collected via `pickup()` in StoryPlayer, add coin_value to the `coins` counter and play the ching sound. The pickup still goes to inventory as a trophy.
- `StoryChoice.coin_cost?: number` (in claude.ts) — when this choice fires, deduct coin_cost from coins counter. If coins < coin_cost, the choice is locked the same way `requires` is locked: visible but Oracle says "you do not have enough coins."
- `StoryChoice.grants_counter?: Record<string, number>` (in claude.ts) — values added to named counters, clamped to max, when the choice fires. Used for medicine purchases at markets.

You do not need a new pocket-tap-to-use mechanic. Markets buy and consume in the same choice tap.

### B. Coins counter

Add `coins` to the adventure's `counter_defs` in `lib/adventures/hunt-dragon-egg.ts`:
```ts
{ id: "coins", label: "Coins", max: 9999, icon_path: "/pickups/coin_pouch.webp", critical_at: 0 }
```

In `lib/counters.ts` `initialCounters`, the kid starts with full max. We want the kid to start with 50 coins, NOT 9999. Two options, pick the cleaner one:

1. Add a per-counter `start_at?: number` field to CounterDef. `initialCounters` uses start_at if set, falls back to max. Clean.
2. Hard-code starter coins in PlayClient when initializing for adventure mode.

Use option 1.

For coin counter ticks: counters tick down on scene entry per `tickedScenes`. Coins do NOT tick down. Don't add tick on any scene. Coins only change via pickups, choices, and (later) thief encounter.

The `deriveCounterFlags` helper currently emits `coins_critical` and `coins_empty` derived booleans because critical_at=0 and value <= 0. That's intentional but unused by narration variants. Fine.

### C. New pickups in `lib/pickups-catalog.ts`

Add three treasures plus existing entries' coin_value where applicable.

```ts
{ id: "coin_pouch", label: "Coin Pouch", description: "small leather pouch jingling with coins", icon_path: "/pickups/coin_pouch.webp", coin_value: 50 }
{ id: "treasure_chest", label: "Treasure Chest", description: "small wooden chest with brass clasps, full of coins", icon_path: "/pickups/treasure_chest.webp", coin_value: 150 }
{ id: "rare_gem", label: "Rare Gem", description: "a flawless cut gem, larger than a thumbnail, glowing softly", icon_path: "/pickups/rare_gem.webp", coin_value: 200 }
```

Existing pickups stay non-monetary (coin_value undefined or 0).

### D. Sound system

New file `lib/sound-bus.ts`:
- Exports `playChing()` — synthesizes a quick two-tone bell (e.g., 1318Hz then 1568Hz, ~150ms total) via Web Audio API. Reuses a single AudioContext lazy-initialized on first call.
- Honors a global mute flag mirroring `lib/ambient-bus.ts` mute pattern (sessionStorage key `realm-shapers:sound-muted`).
- Catches all errors silently (Safari autoplay policy, etc.).
- Triggered by:
  - StoryPlayer's `pickup()` when the picked pickup has coin_value > 0
  - StoryPlayer's `tryActivate()` when the choice has coin_cost > 0 OR grants_counter that includes "coins"
  - The thief encounter when coins are stolen (negative balance change)
- Do NOT autoplay on page load. Trigger only after user gesture (which the existing flow always has by the time a coin transaction happens; the kid has tapped at least once).

### E. New scenes (7)

Add these to `lib/adventures/hunt-dragon-egg.ts`. Each gets an entry in the SCENE const, a scene definition, and a slot in the scenes array. All have backtrack choices. All have oracle_hint.

1. **wolf_encounter** — slots between `cliff_climb` and `volcano_base`. The cliff_climb choice "Pull yourself up" now goes to wolf_encounter, not directly to volcano_base.
   - background_id: `BG("wolf_encounter")`
   - counter_tick: { food: 1 }
   - 4 choices:
     - "Fight with your sword" — requires: ["sword"], next_scene_id: volcano_base, hint: "the wolf yields to a clean strike", counter_tick on success: -1 food (already covered by scene tick)
     - "Throw it a food ration" — requires: ["food_ration"], consumes: ["food_ration"], next_scene_id: volcano_base, hint: "the wolf takes the meal and lets you pass"
     - "Toss it 50 coins" — coin_cost: 50, next_scene_id: volcano_base, hint: "the wolf bats the coins, distracted, and you slip past"
     - "Back down the cliff" — next_scene_id: cliff_climb, hint: "you can try the river route instead"

2. **waterfall_climb** — side-trip from `riverbank`. Add a 4th choice on riverbank: "Climb up alongside the falls" → waterfall_climb. Requires: climbing_rope.
   - background_id: `BG("waterfall_climb")`
   - counter_tick: { food: 1 }
   - pickups: ["treasure_chest"] (rewards 150 coins via the new coin_value pickup pattern)
   - 1 choice back: "Climb back down to the river" → riverbank

3. **eagle_nest** — slots in cliff_climb path AFTER wolf_encounter. Update wolf_encounter so successful pass-through goes to eagle_nest, not directly to volcano_base. Eagle_nest then exits to volcano_base.
   - background_id: `BG("eagle_nest")`
   - counter_tick: { food: 1 }
   - pickups: ["coin_pouch"] (eagle's nest has shiny things)
   - 3 choices:
     - "Hide quietly" — counter_tick on entry already covers cost, next_scene_id: volcano_base, hint: "wait for the eagle to leave; safe but slow"
     - "Fight with your sword" — requires: ["sword"], next_scene_id: volcano_base, hint: "the eagle backs off; pluck a feather later", grants: ["coin_pouch"] (an extra one) — actually no, just let the kid pick up the existing pickup
     - "Climb back down" — next_scene_id: cliff_climb, hint: "you can pick a different route"

4. **bone_field** — side-trip from `volcano_base`. Add a 4th choice on volcano_base: "Search the bone field" → bone_field.
   - background_id: `BG("bone_field")`
   - counter_tick: { food: 1, water: 1 }
   - pickups: ["rare_gem"] (200 coins)
   - 1 choice back to volcano_base

5. **crystal_chamber** — side-trip from `cave_shortcut`. Add a choice on cave_shortcut: "Explore the crystal passage" → crystal_chamber. Requires: lantern.
   - background_id: `BG("crystal_chamber")`
   - counter_tick: { food: 1 }
   - pickups: ["glowstone"] (new pickup, coin_value: 0, blessing-like). At dragon_chamber, IF kid has glowstone, narration_variant softens the dragon's first impression slightly.
   - 1 choice back to cave_shortcut

   Add `glowstone` to pickups-catalog: `{ id: "glowstone", label: "Glowstone", description: "a smooth crystal that glows with steady warm light", icon_path: "/pickups/glowstone.webp" }`. No coin_value. No mechanical use beyond a narration variant in dragon_chamber: when glowstone is in inventory, append a sentence to base narration: "The glowstone in your pocket pulses warmly, and the cavern feels less cold."

6. **dragon_cubs** — converges all forward paths before dragon_chamber. Update lava_chamber, cave_shortcut, ash_road exits to go to dragon_cubs instead of directly to dragon_chamber.
   - background_id: `BG("dragon_cubs")`
   - counter_tick: { food: 0, water: 0 }
   - 4 choices:
     - "Sneak past quietly" — counter_tick: scene-level water 1 already covers tension. next_scene_id: dragon_chamber, hint: "stay low, hold your breath"
     - "Distract them with food" — requires: ["food_ration"], consumes: ["food_ration"], next_scene_id: dragon_chamber, hint: "the cubs forget you, focused on the meal"
     - "Toss them 50 coins to chase" — coin_cost: 50, next_scene_id: dragon_chamber, hint: "the cubs scatter to chase the shiny coins"
     - "Turn back to the volcano" — next_scene_id: volcano_base, hint: "another path waits"

7. **shrine** — optional side-trip available from `forest_path`. Add a 3rd choice on forest_path: "Visit the small shrine" → shrine.
   - background_id: `BG("shrine")`
   - counter_tick: { food: 0, water: 0 }
   - 1 main choice + 1 back:
     - "Speak to the shrine, leave 50 coins" — coin_cost: 50, sets_flag: "blessing", next_scene_id: forest_path, hint: "the shrine glows; you feel watched over"
     - "Leave the shrine without paying" — next_scene_id: forest_path, hint: "the carved stones watch you go"
   - Add `blessing` to FLAG const.
   - Effect: at dragon_chamber, IF blessing flag, add another narration_variant ("the small blessing in your pocket steadies your hands") AND ADD a new ending `ending_blessed` requires `{ blessing: true, grabbed_egg: true }` ranked just below ending_friend in the endings array. Reuse `ending_appeased.webp` art for the new ending background_id (no new image needed; tells Vanessa to rerun a generator if she wants a unique one). Actually create a new ending_blessed scene that reuses BG("ending_appeased") as base + override narration — see "endings" below.

### F. Mounts (2)

Update `riverbank.choices` to add a 4th choice:
- "Pay 200 coins for a river pony" — coin_cost: 200, next_scene_id: volcano_base, hint: "the pony knows the way; she carries you fast around the wide river and the wood you would have chopped"

Update `ash_road.choices` to add a 3rd choice:
- "Pay 200 coins for a desert lizard" — coin_cost: 200, next_scene_id: dragon_cubs (or wherever ash_road currently leads — before B-014 it was dragon_chamber, now it leads to dragon_cubs after this batch), hint: "the lizard runs the heat-cracked road; you arrive in half the time, hot but whole"

Mounts are coin-gated express paths. Kids who hoarded coins can skip the harder challenges.

### G. Markets in existing scenes

In `riverbank`, add a 5th choice:
- "Buy supplies from the river fisher (50 coins)" — coin_cost: 50, grants_counter: { food: 4, water: 4 }, next_scene_id: riverbank (loop), hint: "the fisher sells fresh fish and clean water"

In `cave_shortcut`, add a choice:
- "Trade with the cave hermit for the lullaby (200 coins)" — coin_cost: 200, grants: ["dragons_lullaby"], next_scene_id: cave_shortcut (loop), hint: "the hermit will sing the song into your scroll, for a price"

Skip a market on the forest path; the shrine handles the early game coin sink there.

### H. Thief encounter

Add `thief_encounter` scene. Reachable via a NEW choice on `ash_road` (besides the existing forward / mount / back).
- 4th choice on ash_road: "A traveler approaches" → thief_encounter
- background_id: `BG("thief_encounter")`. Tells Vanessa to generate it (we'll add the prompt).
- counter_tick: { food: 1 }
- 3 choices:
  - "Pay the toll, 100 coins" — coin_cost: 100, next_scene_id: ash_road, hint: "the traveler nods, lets you pass"
  - "Fight back with your sword" — requires: ["sword"], next_scene_id: ash_road, counter_tick adds nothing extra. hint: "the traveler flees"
  - "Run, drop your purse" — sets_flag: "robbed", consumes_counter: { coins: 9999 } (caps to 0 via clamping), next_scene_id: ash_road, hint: "you escape but lose everything in your pouch"

Add `consumes_counter?: Record<string, number>` to StoryChoice schema (mirror grants_counter). When the choice fires, subtract from the named counter, clamp to 0.

Add `robbed` flag to FLAG const. No ending uses it currently; reserved for future use.

### I. Renderer wiring

In `components/StoryPlayer.tsx`:

1. **`pickup()` function** (around line 537): when picking up an item with coin_value > 0, ALSO add coin_value to the coins counter via the existing `onCountersChange` callback, then call `playChing()` from the new sound-bus. The pickup still lands in inventory as a trophy. Don't double-count.

2. **`tryActivate()` function** (around line 494):
   - Before checking `requires`, also check `coin_cost`. If `(coins counter value) < coin_cost`, gate the choice the same way: speakOracle "You do not have enough coins for this." and return.
   - When the choice fires successfully, apply effects in this order: deduct coin_cost (call onCountersChange), apply consumes_counter (deduct, clamp to 0), apply consumes (remove from inventory), apply grants (add to inventory), apply grants_counter (add, clamp to max). Then visitScene.
   - Play playChing() if any of the coin-related effects happened (coin_cost > 0, consumes_counter has coins, grants_counter has coins).

3. **`CounterBar.tsx`**: already renders all counter defs. The new "coins" counter will render as a third row. Verify the layout still looks OK. If 3 rows is too tall, consider rendering coins as a small badge separately at top-right corner instead. Use your judgment. The pip-row UI breaks for max=9999; switch coins display to "Coins: <value>" text instead of pips when max > 50. Add this conditional to CounterBar.

4. **InventoryBar**: trophies (gem, chest, pouch) appear in inventory after pickup. They have icons. Already handled by existing pickup-resolver pattern.

### J. RealmCard updates

`components/RealmCard.tsx` (read it first to understand its props/shape; you'll likely need to plumb new fields through StoryPlayer's onComplete `CompletionPayload` and PlayClient's `handlePlayerComplete`).

After ending, show a small breakdown line in the card:
- Coins earned (sum of coin_values of items collected; you'll track this in StoryPlayer or compute from inventory + catalog)
- Coins remaining (current counter value)
- Trophies collected (filter inventory for items with coin_value > 0 OR specific ids: coin_pouch, treasure_chest, rare_gem, glowstone)
- Ending tier label ("The Friend", "The Charmer", "The Appeased", "The Snatcher", "The Lost", "The Hatcher" for secret).

This is the lightest possible "scoring" surface. No total point number; just facts. Keep one line each.

### K. Image prompts

Update `scripts/hunt-dragon-egg-prompts.ts` to add 7 + 4 = **11 new prompts**.

Style trailer is the same `${STYLE}` constant already at the top of that file. Use these one-liners; expand to full prompts following the pattern of existing entries.

7 scenes (16:9 landscape):
- wolf_encounter — gray wolf blocking a narrow cliff path, snow-capped mountains, tense standoff vibe, no people
- waterfall_climb — cascading waterfall on a forest cliff with a small chest visible at the top under moss, golden mist, no people
- eagle_nest — high cliff with a great eagle on a stick nest, eggs and shiny coins glinting in the nest, distant volcano on horizon, no people
- bone_field — old skeletons of past adventurers scattered on volcanic ash slopes, ash drifts, a glinting gem half-buried, ash sky, no people
- crystal_chamber — bioluminescent cavern alcove full of clustered glowing blue and white crystals, a single warm-glowing crystal in the center, no people
- dragon_cubs — two small playful dragon cubs in a rocky antechamber outside a larger cavern, glowing scales, ribcage of an old beast in background, no people
- shrine — small ancient stone shrine in a forest clearing, soft sunlight, candles glowing, mossy carvings, no people
- thief_encounter — hooded traveler with hidden face standing on a hot dry road, ash drifting, hand resting on a curved knife at the hip, no figure of the wizard, distant volcano

4 pickup icons (1:1 square):
- coin_pouch — small leather drawstring pouch overflowing with gold coins, isolated on clean pale background
- treasure_chest — small wooden chest with brass corners and an open lid revealing gold coins, isolated on clean pale background
- rare_gem — single flawless cut gemstone glowing softly with inner light (color: light teal or amber, your choice), isolated on clean pale background
- glowstone — smooth round crystal stone glowing with warm steady amber light, isolated on clean pale background

Re-run the Replicate generator to fill them in:
```
npx tsx --env-file=.env.local scripts/generate-hunt-dragon-egg-art.ts
```
Existing files are skipped automatically. About 11 new images, ~$0.45 in Replicate credits, ~2 minutes. If the script fails midway, re-run; it picks up where it left off.

### L. Existing flow rewiring

After all the changes above, the flow becomes:
```
forest_riddle → forest_path
  cliff_climb → wolf_encounter → eagle_nest → volcano_base
  riverbank → river_crossing OR wood_gathering OR waterfall_climb OR forest_market OR mount-river-pony
    river_crossing → volcano_base
    wood_gathering → riverbank
    waterfall_climb → riverbank (with treasure_chest pickup)
    river-pony (mount, 200 coins) → volcano_base (skips wood + crossing)
  forest_path → cliff OR river OR shrine
volcano_base → dark_cavern OR lava_river_crossing OR ash_road OR bone_field OR back to forest
  dark_cavern → cave_shortcut (lantern)
  lava_river_crossing → lava_chamber (rope+wood OR sword)
  ash_road → dragon_cubs OR mount-lizard-fast OR thief_encounter
  bone_field → volcano_base (with rare_gem pickup)
  cave_shortcut → crystal_chamber OR dragon_cubs OR market-buy-lullaby OR back
  lava_chamber → dragon_cubs
dragon_cubs → dragon_chamber
dragon_chamber → endings via existing flag combinations + new ending_blessed
```

### M. Tests

Run sequentially. If any step fails, do NOT proceed to deploy. Stop, write CHANGES.md entry explaining what's broken, push the partial work, and create a MORNING_CHECKLIST_014.md noting deploy was skipped.

1. `npx tsc --noEmit` — must be silent (no errors)
2. `npm run lint` — must be clean (0 errors, 0 warnings)
3. `npx tsx -e 'import("./lib/adventures/index").then(() => console.log("registry OK")).catch(e => { console.error(e); process.exit(1); })'` — must print "registry OK". The validator already checks pickup ids, scene ids, ending requires shape, etc.
4. `npm run build` — must complete cleanly
5. Smoke test the dev server only if you have time: kill existing server, start with `npm run dev`, hit `http://localhost:3000` (or 3001 if 3000 taken), confirm landing page renders. Don't try to walk through the adventure (no kid here to click). Just confirm SSR renders.

### N. Deploy

If all tests pass:
```
vercel --prod --yes
```
This is the long-standing pattern (see CHANGES.md). The project is linked to https://realm-shapers.vercel.app. The deploy auto-confirms.

If `vercel --prod --yes` prompts for input (it shouldn't if .vercel/project.json exists, which it does), abort and write the morning checklist noting manual deploy needed.

After deploy completes, write `MORNING_CHECKLIST_014.md` at project root mirroring the format of `MORNING_CHECKLIST_006.md` (or 002b, or 005 — whichever exists in repo). Include:
- Production URL: https://realm-shapers.vercel.app
- What changed in this batch (one-paragraph summary)
- Smoke tests Vanessa should run in the morning:
  1. Open https://realm-shapers.vercel.app, pick Castle theme, walk through adventure.
  2. Confirm forest_riddle riddle appears.
  3. Confirm coins appear in counter bar (50 starter).
  4. Confirm at least one shop / mount / shrine choice works.
  5. Confirm ching sound plays on a coin transaction (might be silent on first interaction due to Safari autoplay — that's fine, second transaction should ching).
  6. Confirm the Realm Card at the end shows trophies/coins line.
  7. Try Play Again, confirm full reset.
- Known issues / followups (you may discover them during implementation; list here).
- Image generation status: how many of the 11 new images were generated, how many remain (Vanessa runs the script in the morning if any are missing).

### O. Commit + push protocol

Per CLAUDE.md:
- `git pull --rebase` at the start of this session.
- Stage files explicitly (not `git add .`). Commit at logical phase boundaries:
  - "B-014: schema additions and coins counter"
  - "B-014: sound-bus and economy renderer wiring"
  - "B-014: 7 new scenes plus shrine ending and image prompts"
  - "B-014: markets, mounts, thief encounter"
  - "B-014: realm card economy summary"
  - "B-014: morning checklist 014"
- Push at end. The plan file convention says imperative, no B-XXX prefix; but the existing CHANGES.md log uses "B-XXX" in body text. Either commit-message style is fine. Just be consistent within this batch.
- Append a new entry to `CHANGES.md` per the cross-surface protocol. Template: see top of CHANGES.md or mirror the most recent entry's format. Note any "open threads" if you couldn't finish a sub-piece.

## Risks / things to watch

- **Web Audio in Next.js**: AudioContext can only be created on the client. Guard with `typeof window !== "undefined"`. Lazy init on first call to playChing.
- **CounterBar layout**: Three counters might overflow on small viewports. If so, switch coins to a separate top-right badge (similar to inventory bar's column).
- **Choice gates with multiple effects**: A choice can have requires (gates), coin_cost (gates), consumes (after fire), grants (after fire), consumes_counter (after fire), grants_counter (after fire), sets_flag (after fire). Order matters. Apply in this order in tryActivate: gates check first (requires, coin_cost), then deduct (consumes, consumes_counter, coin_cost), then add (grants, grants_counter), then set_flag, then visitScene.
- **CHOICE_POSITIONS**: Currently 5 slots in StoryPlayer.tsx. Several scenes will hit 4-5 choices in this batch (riverbank ends up with: river_crossing, wood_gathering, waterfall_climb, market, mount, back — that's 6). Expand CHOICE_POSITIONS to 6 slots or refactor riverbank to consolidate. Suggested: drop the "to_river_crossing" forward and let the kid figure out forward via the mount or river_crossing label only. Or wrap longer choice lists into a vertical sidebar layout. Use your judgment, keep it visually clear.
- **MIN_SCENES_BEFORE_ENDING** in StoryPlayer (= 4) might not need updating; the new flow makes the path longer regardless. Confirm.
- **secretEligible heuristic**: visiting all main scenes triggers it. With 18+ scenes total now, the kid almost never hits "all visited." That's fine; the existing `allPickupsCollected` path still triggers it for completionists. No change needed.
- **Storage key format**: counters persist to `realm-shapers:counters:${worldId}` already. The `coins` key inside that JSON is just another counter id. No new sessionStorage keys needed.
- If the Replicate script fails (rate limit, payment, etc.), don't block deploy. Just note in MORNING_CHECKLIST_014.md that some images need a manual rerun.
- **Validator (lib/adventures/index.ts)** will need a small update: add coin_cost / coins_counter logic to the cross-check loops so the validator still passes. New scene ids must round-trip.

## Open creative decisions you may make

- The two pickup distractors on the forest_riddle are good. Don't change the riddle.
- For ending_blessed narration: write something kid-friendly along the lines of "you walked the road with luck on your side, and the egg came home gentle." Keep tone consistent with existing endings.
- Coin pickup placements: the locations I specified are reasonable defaults. You may tweak which scene has which treasure as long as you preserve at least one coin source in the early game (so kid has spending money for the shrine and first market).
- If you find a clear bug or rough UX in any earlier scene while working, fix it inline. Note in CHANGES.md.

## Acceptance criteria

- All schema additions are optional and don't break Claude-generated trees (test by running the existing claude flow once if you can; otherwise trust that Claude doesn't set the new fields).
- Adventure validator passes.
- `npx tsc --noEmit` clean.
- `npm run lint` clean (0 errors, 0 warnings).
- `npm run build` clean.
- Vercel deploy succeeds and reports a URL on https://realm-shapers.vercel.app/.
- `MORNING_CHECKLIST_014.md` exists with smoke-test instructions.
- `CHANGES.md` has a new entry summarizing the batch and listing any open threads.
- All 11 new image prompts are present in scripts/hunt-dragon-egg-prompts.ts (whether the .webp files exist on disk or not).

## Out of scope

- More image enrichment beyond the 11 prompts.
- Audio file (we synthesized).
- Backend/database schema changes (worlds.map column already holds JSON, no migration needed).
- Auth / multiplayer / sharing UX changes.
- Refactors of unrelated existing code.
- Achievements integration for new scenes (optional follow-up).

Done. Proceed.
