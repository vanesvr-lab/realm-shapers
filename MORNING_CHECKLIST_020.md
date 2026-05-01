# Morning Checklist — B-020 (Shop food + drink, failure endings, low-supply warnings, raft UX, adventurer XP, realm card tier)

Built and deployed 2026-05-01. Smoke tests below were not performed by the agent. Walk through each before considering B-020 green.

Production URL: https://realm-shapers.vercel.app

## What changed

Six tightly-related playtest fixes on the post-B-019 build.

1. **Food and water are buyable from the Supreme Shop.** food_ration and water_bottle are now 30 coins each. Buying ticks the corresponding counter by 1 (clamped to max) instead of dropping a stack of inventory items.
2. **Failure endings narrate clearly.** ENDING_STARVATION and ENDING_DEHYDRATION rewrite spells out that the kid ran out of food / water and tap Play Again to retry. Stripped-card regret lines are sharper too ("Pack more food. Try again." / "Carry more water. Try again.").
3. **Low-supply warning fires once when food or water dips to ≤ 2.** The Oracle whispers "Your food is almost gone. Buy more at the Supreme Shop, or hunt an animal along the way." Same for water with a stream-finding line. Tracked in a fired-warnings set so the same hint never repeats in a run.
4. **Redundant build choices hide once the built equivalent is owned.** "Build a raft and cross" disappears when built_raft is in inventory; "Take the cliff shortcut" disappears when built_ladder is in inventory; "Sing the lullaby" disappears when built_music_box is in inventory. Hide is render-only via the new optional `hide_when_inventory_has` field on StoryChoice.
5. **Adventurer XP counter on the dragon-egg adventure.** +10 each time the kid clears a gated choice (any choice with `requires`, `requires_any`, or `coin_cost`). Counter renders in the top-left counter bar as "XP: N" alongside Food / Water / Coins. Building items in the Skills panel does NOT award adventurer XP — that has its own builder tier.
6. **Realm card shows the adventurer tier.** XP maps to Common (0-29) / Rare (30-59) / Epic (60-99) / Legendary (100+). New "Adventurer: N XP — Tier" line under the existing Coins / Trophies / Builder block, with a colour-coded badge (grey / blue / purple / gold). Both full and stripped cards render this line.

Code-side changes:
- `lib/pickups-catalog.ts` — Pickup type gains `grants_counter?: Record<string, number>` and `kind: "consumable"`. food_ration and water_bottle authored with `purchase_price: 30`, `kind: "consumable"`, `grants_counter: { food: 1 }` / `{ water: 1 }`.
- `components/SupremeShop.tsx` — footer copy updated ("Materials feed the Skills & Build panel. Food and water refill the road.").
- `components/StoryPlayer.tsx` — `buyMaterial` applies `grants_counter` when present (skips inventory add); new `firedWarnings` state + effect for the low-supply hints; `wasGated` flag drives +10 adventurer_xp through the existing counter-mutation block; choice rendering filters out choices whose `hide_when_inventory_has` overlaps inventory; EconomySummary gains `adventurerXp` + `adventurerTier`; updated stripped regret lines.
- `lib/claude.ts` — StoryChoice gains optional `hide_when_inventory_has?: string[]`.
- `lib/adventures/index.ts` — registry validator extended for `hide_when_inventory_has`.
- `lib/adventures/hunt-dragon-egg.ts` — failure ending narrations rewritten; new `adventurer_xp` counter_def; `hide_when_inventory_has` set on the raft, cliff, and lullaby choices.
- `lib/adventurer-tiers.ts` (new) — `adventurerTier(xp)` returns "Common" / "Rare" / "Epic" / "Legendary"; `ADVENTURER_TIER_BADGE` exposes Tailwind class fragments per tier.
- `components/RealmCard.tsx` — renders the new Adventurer line with a colour-coded badge on both full and stripped cards.
- `MORNING_CHECKLIST_020.md` (new), `CHANGES.md`.

Build is clean: `unset ANTHROPIC_API_KEY && npx tsc --noEmit`, `npm run lint` (0 warnings, 0 errors), validator prints `registry OK`, `unset ANTHROPIC_API_KEY && npm run build` clean. /play first-load JS unchanged at 42 kB / 260 kB shared (the new adventurer-tiers module is tiny and the rest of B-020 is in-place edits, no new component bundles). Production deploy succeeded.

## Smoke walkthrough (run in order)

### A. Shop sells food and water

1. Open https://realm-shapers.vercel.app in incognito.
2. Pick the Castle theme + any starting place. Step through the prologue + starter pick.
3. Walk to a scene that ticks counters down so food drops below max (e.g., riverbank → river crossing — that takes a tick of food and water).
4. Open Shop from the left rail. The list should now include Trail Rations and Water Bottle, each priced 30 coins, with descriptions "a hot meal for the road" / "fresh water from the spring".
5. Tap "Buy 30" on Trail Rations. The food counter (top-left) should tick UP by 1. Coin counter drops by 30. Coin chime plays. Inventory bar should NOT gain a food_ration item — counter only.
6. Tap "Buy 30" on Water Bottle. Same expected behavior on the water counter.
7. If a counter is already at max, the buy still succeeds (clamped) — kid wastes 30 coins, by design (no disable for full counters in this batch).

### B. Failure endings + Play Again

1. Restart. Pick a starter set without water_bottle or food_ration if possible (e.g., climbing_rope + sword + lantern), then walk every scene back-and-forth so food/water both deplete to 0.
2. As food hits 0, the next scene transition should route to ENDING_STARVATION. Confirm:
   - Title: "Out of Food".
   - Narration: "You ran out of food before the path ran out of road. The realm tugs you home; even brave adventurers must eat. Tap Play Again, and pack heavier next time, or stop at the Supreme Shop on the way through." (line-clamp-3 may trim the last sentence visually; tap to read full).
   - Realm card renders STRIPPED: title, ending tier "The Lost", regret line "Pack more food. Try again.", Adventurer tier line.
   - "Play again" button visible and works.
3. Repeat to verify dehydration: starve water to 0. Title "Out of Water", narration about the spring being too far, regret "Carry more water. Try again."

### C. Low-supply warnings

1. Restart with full counters. Walk a path that depletes food gradually (forest → riverbank → wood gathering → river crossing → volcano base → ash road).
2. As food drops to 2, the Oracle should speak: "Your food is almost gone. Buy more at the Supreme Shop, or hunt an animal along the way." This appears in the bubble AND in the Hints panel.
3. Continue depleting (food = 1, food = 0). The warning should NOT fire again. Only one nudge per counter per run.
4. Same for water: tick down to 2, warning fires. Continue, no repeat.
5. Hit Play Again. Counters reset. Walk again, warnings should fire fresh once more (firedWarnings set is reset by remount).

### D. Hide redundant build choices

1. Restart. Earn or buy enough coins to visit the Supreme Shop and build a raft. Suggested: pick climbing_rope as a starter so you can do the cliff path → wolf encounter → eagle nest → coin pouch (50 coins) loop. Plus visit the bone field (rare_gem 200 coins). With ~250 coins and the existing 50 starter, buy Wood (50) + Rope (30) and build a raft.
2. Walk to The Wide River. With built_raft in inventory, the "Build a raft and cross" choice should be HIDDEN. Only "Cross on the raft you built" and "Turn back to the riverbank" should remain.
3. Build a ladder (Wood, 50 coins). Walk to The Forest Path. With built_ladder in inventory, "Take the cliff shortcut" should be HIDDEN. Only "Climb with the ladder you built" should be the cliff route.
4. Build a music box (Cloth + Wax + Feather, 100 coins total). Walk to the Nesting Cavern (dragon_chamber). With built_music_box in inventory, "Sing the lullaby" should be HIDDEN. Only "Play the music box you built" appears.

### E. Adventurer XP counter rises 10 per gated clear

1. Restart. Open the counter bar at top-left. New row "XP: 0" should be visible alongside Food / Water / Coins.
2. Make a free choice (e.g., "Take the riverbank" with no requires). XP stays at 0. Free choices do NOT award.
3. Make a gated choice. Examples:
   - The fisher market at riverbank costs 50 coins → XP rises to 10.
   - "Take the cliff shortcut" requires climbing_rope → if rope is in inventory, clearing the gate fires +10. So XP = 20.
   - The shrine offer (50 coin_cost) → +10.
   - Singing the lullaby (requires dragons_lullaby) → +10.
   - Taking the egg (200 coins + requires_any) → +10.
4. Verify the counter shows the running total throughout the run.

### F. Realm card shows adventurer tier

1. Complete a run with multiple gated clears. The realm card should show a new "Adventurer: N XP — Tier" line.
2. With XP < 30, tier reads "Common" with a grey badge.
3. With XP 30-59, tier reads "Rare" with a blue badge.
4. With XP 60-99, tier reads "Epic" with a purple badge.
5. With XP ≥ 100, tier reads "Legendary" with a gold/amber badge.
6. The line renders on the FULL card (Friend, Composer, Charmer, etc.) under Coins / Trophies / Builder.
7. The line ALSO renders on the STRIPPED card (Snatcher, Lost) below the regret line. Centered, smaller variant.

## Regression checks

### G. B-019 shop, build, ending egg still work

1. Materials wood / rope / iron / cloth / wax / feather / leather still buyable, still go to inventory (NOT to a counter). The shop list is bigger now (9 entries: 7 materials + food + water).
2. BuildPanel still scores 1-5, consumes materials, grants built_<target> with level. Builder tier line still renders on the realm card.
3. Take the egg with 200 coins + lullaby/gem/music_box still works. Snatch path still routes to ending_success stripped card. Composer ending still unlocks at level 5 music box.

### H. B-018 oracle pin, map, per-gate hints still work

1. OracleAvatar bottom-right still wears the play-mode badge with remaining hints.
2. Map (left rail's first button) still opens the BFS node graph.
3. Per-gate oracle_hints still preferred over scene-level when locked.

### I. B-017 narration shrink, pickup hints still work

1. Pickup glow + caption on hover/long-press still works.
2. Narration card layout intact (the post-B-019 polish moved it to the top-center; verify it doesn't collide with the new XP row in the counter bar at top-left).

### J. B-014 per-scene markets, treasures, mounts intact

1. River fisher market (50 coins → +4 food, +4 water) still works.
2. Cave hermit lullaby trade (200 coins) still works.
3. Treasures pickup (coin_pouch +50, treasure_chest +150, rare_gem +200) still chime on collection.
4. Mounts (river pony, desert lizard) still bypass scenes for 200 coins.

## Open after this batch

- **No browser smoke test by agent.** Build is green and types/lint/validator all pass, but the kid-facing flows (food/water buy, low-supply warning, hidden raft choice, +10 XP per gated clear, tier badge) were not exercised in a browser. Sections A-F above are the smoke checklist.
- **Adventurer XP icon reuses tarnished_medallion.webp** for the counter bar. It's a reasonable proxy ("achievements") but not custom art. A dedicated XP icon would be cleaner; out of scope.
- **No "stop buying when full" disable on counter-grant pickups.** A kid with 6/6 food can still buy a 30-coin Trail Rations and lose the coins. Cheap to add later if playtest shows kids hitting it.
- **Low-supply warning copy mentions hunting an animal**, but no hunt-an-animal mechanic exists in the adventure today. The brief explicitly defers real hunt gameplay; the line still reads as a sensible nudge ("hunt OR shop").
- **Hide rule is one-way.** Once a built item is consumed at its gate, the hidden raw-material choice would in principle reappear. Today the gate scene routes forward (volcano_base, cliff_climb, dragon_chamber loop) so the kid never returns to the previous scene's choice list, so this is not visible. If a future scene loops the kid back, the raw choice would show again — fine, since the kid no longer has the built item either.
- **Adventurer XP does not persist across runs.** Per the brief, resets on Play Again. The realm card credits the run's tier so the kid still gets recognition.
- **Tier thresholds are linear (30/60/100).** A run with ~10 gated clears hits Rare. 7-9 gated clears = Common. Vanessa to playtest and adjust thresholds in `lib/adventurer-tiers.ts` if the distribution feels off.

## Rollback

Six commits in order: 9af5ffc (shop food), 9766afc (failure narration), d028b6b (low-supply warning), b4ecec3 (hide redundant builds), dd18ca0 (XP counter), 0231b6b (adventurer tier on card). To revert just B-020:

```bash
git revert 0231b6b dd18ca0 b4ecec3 d028b6b 9766afc 9af5ffc
git push
vercel --prod --yes
```

Or revert subsets. Each phase commit is independent enough that reverting one (e.g., the XP counter) leaves the other five intact.
