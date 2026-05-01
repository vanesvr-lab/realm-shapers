# Morning Checklist — B-019 (Supreme Shop, Skills & Build, ending egg economy, left button rail)

Built and deployed 2026-05-01. Smoke tests below were not performed by the agent. Walk through each before considering B-019 green.

Production URL: https://realm-shapers.vercel.app

## What changed

Four interconnected feature areas. The play view picks up a sandbox layer that lets the kid earn coins, buy raw materials, prompt their way to a built item, and use that item to satisfy build-gated choices on existing scenes. The egg ending now costs 200 coins AND a proof item. Snatched and lost endings render as a stripped realm card.

1. **Left button rail** at bottom-left of the play view. Vertical stack of four buttons: Map (existing from B-018), Hints (running list of every Oracle hint heard this run), Supreme Shop (global material shop), Skills & Build (build prompt panel). The standalone Map button is gone; Map is now the first rail entry. The Oracle pin stays at bottom-right and is NOT in the rail.
2. **Supreme Shop**, opened from the rail. Modal listing 7 raw materials priced 30-100 coins. Buy decrements coins, plays the existing coin chime, drops the material into inventory. Per-scene markets (river fisher, cave hermit) are unaffected.
3. **Skills & Build panel**, opened from the rail. Kid types a multi-line prompt; a heuristic 1-5 scorer rates it live as they type (material, role, constraint, use case, specifics). Submit consumes the required materials and adds a `built_<target>` pickup at the recorded level to inventory. Builder XP accumulates the sum of every level and surfaces as an Apprentice / Builder / Master Builder / Legendary tier label. 7 build targets (raft, ladder, kite, torch, sword, fishing_net, music_box).
4. **Egg ending economy**. "Take the egg" now costs 200 coins AND requires one of `dragons_lullaby`, `rare_gem`, or `built_music_box` (new `requires_any` choice gate). Three new build-gated alternates: built ladder skips the rope gate at the cliff path, built raft crosses the wide river without raw wood + rope, built music box appeases the dragon. A level-5 music box unlocks a new **Composer** ending. A "Snatch the egg" choice is always available; it routes to the existing Snatcher narration (`ending_success`) but the realm card renders **stripped** (no ingredients grid, no coins, no trophies, just the tier label and a regret line). Lost endings (starvation, dehydration, lost) also strip.

Code-side changes:
- `components/LeftRail.tsx` (new) — fixed vertical stack of 4 buttons; map / hints / shop / build with badges for hint count and builder tier.
- `components/HintsPanel.tsx` (new) — full-screen modal with the running hint log keyed by scene title.
- `components/SupremeShop.tsx` (new) — full-screen modal listing every catalog pickup with `purchase_price`. Disable when short, label "Need N" coins.
- `components/BuildPanel.tsx` (new) — read-only materials display, multi-line prompt input, ? icon for an example level-5 prompt, live level indicator with rubric tick marks, build button, target reference panel.
- `components/StoryPlayer.tsx` — replaced the standalone Map button with `<LeftRail/>`; new state for `heardHints`, `builderXp`, `builtLevels`, panel-open booleans; subscribes to oracle bus to capture every "hint" kind line; new `buyMaterial` and `handleBuild` callbacks; `tryActivate` extended for `requires_any` and consume-time level-tier flags.
- `components/RealmCard.tsx` — when `economy.isStripped` is true, hide ingredients grid and economy block, show ending tier label + a regret line in their place.
- `lib/builds-catalog.ts` (new) — 7 build targets with required materials, prompt keywords, and (for music_box only) consume-time level-tier flag mapping.
- `lib/build-scorer.ts` (new) — heuristic 1-5 scorer reading material vocab from `pickups-catalog`, plus level-tuned Oracle feedback lines.
- `lib/pickups-catalog.ts` — `Pickup` type gains `purchase_price?: number` and `kind?: "material" | "built"`. 7 material entries (wood, rope, iron, cloth, wax, feather, leather) and 7 built entries (raft, ladder, kite, torch, sword, fishing_net, music_box). New `SHOP_MATERIALS` and `MATERIAL_IDS` exports.
- `lib/claude.ts` — `StoryChoice` gains optional `requires_any?: string[]` (unlocks when at least one of the listed pickups is in inventory).
- `lib/adventures/index.ts` — registry validator extended to check `requires_any` ids.
- `lib/adventures/hunt-dragon-egg.ts` — three new build-gated choices (ladder on forest_path, built raft on river_crossing, music box on dragon_chamber); take_egg gated on coins+items via `requires_any`; new snatch_egg choice; new `ending_composer` scene; new flags `composer_masterwork`, `music_box_basic`, `snatched_egg`; endings array updated with snatched at the top, composer between snatched and friend, plus appeased fallbacks for music_box_basic and bare grabbed_egg.
- `public/pickups/*.svg` (14 new) — placeholder iconic SVGs for the 7 materials and 7 built items.

Build is clean: `unset ANTHROPIC_API_KEY && npx tsc --noEmit`, `npm run lint` (0 warnings, 0 errors), validator prints `registry OK`, `unset ANTHROPIC_API_KEY && npm run build` clean. /play first-load JS at 42 kB / 260 kB shared (was 37.2 kB after B-018; +4.8 kB covers LeftRail, HintsPanel, SupremeShop, BuildPanel, build-scorer, builds-catalog, the requires_any logic, and the RealmCard stripped variant). Production deploy succeeded.

## Smoke walkthrough (run in order)

### A. Left button rail renders 4 working buttons

1. Open https://realm-shapers.vercel.app in incognito.
2. Pick the Castle theme + any starting place. Step through the prologue + starter pick (any 3).
3. Land in the first adventure scene ("The Enchanted Forest").
4. The bottom-left of the play view should now show a vertical stack of 4 buttons: Map, Hints, Shop, Build. Each is at least 44px tall and visually consistent.
5. Tap each in turn. Map opens the existing realm graph (B-018 behavior, unchanged). Hints opens an empty list with "No hints yet." text. Shop opens the materials grid with "Coins: 50" in the header (the start_at). Build opens the prompt panel with "Builder tier: Apprentice (0 XP)".
6. Each panel closes via the Close button or by tapping the dark backdrop.

### B. Supreme Shop buy + insufficient-coins

1. Open Shop from step A. Verify all 7 materials render with their SVG icon, label, description, and a Buy button showing the price.
2. Tap "Buy 50" on Wood. Coin counter at the top-left should drop from 50 to 0. Coin chime plays. Inventory bar should now contain a small wood icon. Header in shop also updates to "Coins: 0".
3. Try to buy Iron (100 coins). Button should be disabled and labelled "Need 100" (because you have 0). Hover the button: aria-label says "Need 100 more coins for Iron".
4. Close the shop. Open it again. The disabled state persists (coins still 0). Wood is still in inventory.

### C. Build panel scoring

1. Walk to the riverbank (forest path → riverbank). Pick up the food_ration and water_bottle. Visit the fisher market for 50 coins, then optionally find more coins (waterfall climb if you brought a starter rope, or eagle nest after the cliff). Easiest test: restart and pick `climbing_rope + water_bottle + food_ration` as your starter, then walk: forest path → cliff (with rope) → wolf encounter → eagle nest → grab the coin pouch (50 coins). Now you have 100 coins.
2. Open the Shop, buy Wood (50) and Rope (30). Coins now 20. Both show in inventory.
3. Open the Build panel. The Materials on hand section should show Wood + Rope.
4. Type just "raft" in the prompt. Level should read 1/5. Tap Build. The Oracle says "You built a level 1 raft. It works. Mostly. Add more detail next time and your raft will be sturdier." Wood and Rope leave inventory. A Built Raft appears.
5. To re-test scoring: build something else. Buy Cloth + Rope (60 coins) and try a level-5 prompt for a kite, e.g., "Build me a kite. You are a skilled kite-maker. Use thick cloth and braided rope. The kite must hold steady in strong wind. Make it big enough for two children to fly together." Each tick mark in the rubric should fill as you type. Submit. Oracle says "You built a level 5 kite. A masterwork kite. The realm will respect this." Builder tier badge updates from Apprentice toward Builder (5+ XP).
6. Try an empty prompt: error reads "Type a few words about what you are building."
7. Try "build a wagon" (no matching target): error reads "Tell me what you are building. Try 'build a raft' or 'build a ladder'."
8. Try "build a kite" without the materials: error reads "Missing materials: Cloth, Rope. Visit the Supreme Shop."

### D. Build-gate satisfies the river crossing

1. Buy Wood + Rope. Build a raft.
2. Walk forest_path → riverbank → wide crossing. Among the choices is a NEW one: "Cross on the raft you built". Tap it. The choice fires (consumes built_raft) and routes to volcano_base. Confirm built_raft is gone from inventory.
3. The existing "Build a raft and cross" (raw wood_logs + rope) still works as before; it is unaffected.

### E. Build-gate satisfies the cliff climb without rope

1. Restart. Pick `food_ration + water_bottle + lantern` (no rope). Walk to forest_path. The "Take the cliff shortcut" should be locked (Find Climbing Rope first).
2. Without rope, you can't visit the riverbank's waterfall, so the only legitimate coin path is the eagle nest after the wolf encounter, but the wolf needs sword/food/coins. With food_ration as starter: feed the wolf, climb past, grab the coin pouch (50 coins) at eagle nest. Walk back down to forest_path.
3. Open Shop. Buy Wood (50). Build "build a ladder strong enough to hold me, made of thick wood" (level should be ~3-4).
4. Back at forest_path, the new "Climb with the ladder you built" choice should be unlocked. Tap it. It consumes built_ladder and routes to cliff_climb.

### F. Egg ending paths

#### F1. Snatch path (stripped card)

1. Restart. Pick any starter. Walk a route that gets you to dragon_chamber without singing or tending (skip the cave shortcut and the ration tend). Most direct: forest → riverbank → river crossing (any way) → volcano base → ash road → dragon cubs (sneak / feed / bribe) → dragon_chamber.
2. At dragon_chamber, you should see five choices including a new one: "Snatch the egg and run". Take the egg should be locked (you don't have 200 coins or a token).
3. Tap "Snatch the egg and run". The ending fires. The realm card should be **stripped**: only the title, the ending art, the narration, the ending tier label "The Snatcher" prominently in rose, and a single regret line: "You took what wasn't earned. The realm will whisper." Ingredients grid is HIDDEN. Coins / trophies block is HIDDEN.
4. The Play Again button still works.

#### F2. Earned take with lullaby (full card with full economy)

1. Restart. Walk forest → cliff (with rope) → ... → cave_shortcut. Pick up the lullaby. Walk to dragon_chamber. Sing the lullaby. Tend her wound (need a food_ration). Now your inventory has lullaby + food consumed.
2. Earn or buy your way to 200 coins (via treasures, fisher, etc.). Confirm coins counter shows >=200.
3. Tap "Take the egg, with thanks (200 coins)". Should fire. Coin counter drops by 200. The lullaby is NOT consumed (the kid keeps it as a trophy).
4. The realm card should be the FULL Friend or Charmed card with ingredients grid, coins earned/remaining, trophies, builder tier (if any), and the "Friend" or "Charmer" tier label.

#### F3. Composer ending (the new one)

1. Restart. Buy Cloth (30) + Wax (40) + Feather (30) at the Supreme Shop (need 100 coins minimum; collect from waterfall + eagle nest).
2. Open the Build panel. Type a level-5 music box prompt, e.g., "Build me a music box. You are a master toymaker. Use thick polished wood lined with red cloth, soft wax for the cylinder, and three light feathers as plucking fingers. It must play one slow lullaby strong enough to calm a sleeping dragon without waking her." All 5 ticks should fill. Submit.
3. Walk to dragon_chamber. Tap "Play the music box you built". The choice consumes the built_music_box and sets `sang_lullaby + composer_masterwork` flags.
4. Earn 200 coins, take the egg with the now-empty lullaby slot satisfied by `requires_any` (built_music_box was consumed, so we need rare_gem or dragons_lullaby — collect one of those during the run, e.g., the bone field rare_gem). Take the egg.
5. The ending should be **The Composer** with the new narration ("You opened the music box you built..."). Full card.

For a level-3 music box, the path routes to Charmed. For a level-1 music box, it routes to Appeased.

#### F4. Lost endings strip too

1. Walk a path until food or water hits 0. The ending should fire as Starvation or Dehydration. The realm card should render stripped with the line "The road took more than you brought."

### G. Hints panel captures every hint

1. Restart. Open the Hints panel. Empty list, "No hints yet."
2. Walk into a scene with a coin gate the kid can't afford. Tap a locked choice (or the Oracle on a scene where you're locked on something). The Oracle speaks. The hint should now appear in the panel under that scene's title.
3. Walk to another scene. Hear another hint. The list should now have two entries in chronological order.

## Regression checks

### H. B-014 per-scene markets still work
1. At riverbank with 50 coins: "Buy supplies from the river fisher (50 coins)" still grants food + water and deducts coins.
2. At cave_shortcut with 200 coins: "Trade with the cave hermit for the lullaby (200 coins)" still grants the lullaby.

### I. B-017 narration shrink + pickup hints still work
1. Bottom narration card still right-aligned, line-clamp-3, 3-line max with shrunk font.
2. Hovering a pickup glow shows the catalog hint caption underneath. Tap to pick up; Oracle confirms with "You collect the X. <hint>".

### J. B-018 oracle pin + map + per-gate hints still work
1. OracleAvatar at bottom-right shows the badge with remaining hints. Tap fires askOracle. Decrement only on a real line.
2. Map button (now the first entry in the left rail) opens the BFS node graph, current scene pulses, visited nodes labelled, one-hop unvisited outlined.
3. Per-gate oracle_hint preferred over scene-level when the kid is locked on a specific choice.

### K. Adventure flow (counters, gates, basic endings) intact
1. Counter ticks fire on first-entry per scene.
2. Coin gates (river fisher, hermit, mounts, shrine) deduct correctly.
3. Existing endings (Friend, Charmer, Appeased, Blessed, Hatcher) still fire when their flag conditions match.

## Open after this batch

- **No browser smoke test by agent.** Build is green and types/lint/validator all pass, but no kid-facing flow was clicked through. Sections A-K above are the smoke checklist.
- **Pickup art is placeholder SVG.** The 7 materials and 7 built items are simple iconic shapes (colored rounded squares with a stylized symbol). They render fine inline and download cleanly with html2canvas, but they are intentionally not the watercolor style of the existing webp art. Vanessa can rerun `scripts/generate-assets.ts` (or whichever path she uses) to swap in real Studio Ghibli style art when she's ready. The catalog `icon_path` strings will need to flip from `.svg` to `.webp` then.
- **The Composer ending reuses ending_charmed.webp** for art parity since both share the "Vex sleeps at dawn" beat. A unique generation pass for ending_composer.webp would be nicer but is out of scope this batch.
- **Build feedback is text only.** The brief explicitly defers ElevenLabs voice on build feedback and Claude-judged scoring to later batches. The heuristic scorer is stable and predictable but kids who write deliberately bad-but-detailed prompts can still hit level 5. That's fine for the sandbox; real Claude judging would catch nonsense.
- **Builder XP resets on Play Again.** Per the brief, persisting across runs is out of scope. The realm card credits the run's tier so the kid still gets recognition.
- **The shop list is fixed (7 materials).** No theme-aware swaps yet (e.g., underwater realms could sell coral / seashells / kelp instead of wood / iron). Out of scope for this batch.
- **Egg gating accepts the polite-take with rare_gem only.** That route falls through to ending_appeased ("Earned"), not Friend or Charmer. This is by design: the kid paid the price even without singing or tending, but they did not befriend Vex either.
- **Snatch_egg sets `snatched_egg` but NOT `grabbed_egg`.** This is intentional so the snatched ranking always wins over blessed (which is `blessing + grabbed_egg`). A kid who left a coin at the shrine and then snatches still gets the snatch tier, not the blessed tier. Confirms the shame-line read.

## Rollback

Four commits in order: 819cd0d (left rail), fb2008f (shop), 518d925 (build), f4ee4f0 (egg integration). To revert just B-019:

```bash
git revert f4ee4f0 518d925 fb2008f 819cd0d
git push
vercel --prod --yes
```

To revert just the egg gating while keeping shop and build:

```bash
git revert f4ee4f0
git push
vercel --prod --yes
```

This will also remove the StoryPlayer wiring of the panels, so the rail buttons would still render but the shop / build panels would be unwired. A cleaner partial revert would re-author the StoryPlayer wiring without the egg gate; ask if needed.
