# Morning Checklist — B-014 (Coins economy, 7 new scenes, mounts, sound)

Built and deployed overnight 2026-04-30 → 2026-05-01. Smoke tests below were not performed by the agent. Walk through each before considering B-014 green.

Production URL: https://realm-shapers.vercel.app

## What changed since B-013

The Hunt the Dragon's Egg adventure now has a coins economy. Players start with 50 coins, can collect treasures (coin pouch +50, treasure chest +150, rare gem +200), buy supplies at markets, hire mounts to skip challenges, leave a coin at a shrine for a blessing, or get robbed by a thief on the ash road. Every coin transaction plays a synthesized two-tone "ching" via the Web Audio API (no audio file needed). The adventure adds 8 new scenes (wolf encounter, waterfall climb, eagle nest, bone field, crystal chamber, dragon cubs, shrine, thief encounter) and one new ending (The Blessed). All forward paths now converge in a "dragon cubs" antechamber before the final cavern, giving the kid one last sneak / bribe / fight choice. The realm card at the end shows coins earned, coins remaining, trophies collected, and the ending tier label.

Build is clean: `npx tsc --noEmit`, `npm run lint`, registry validator, `npm run build` all pass. /play first-load JS is 252 kB (+5 kB from B-013, covering the sound bus, the new scene definitions, the realm card economy block, and the small inventory-derived flag map for narration variants).

## Smoke walkthrough (run in order)

### A. Fresh adventure run, basic flow
1. Open https://realm-shapers.vercel.app in incognito.
2. Pick the Castle theme (or whichever surface launches the Hunt adventure).
3. Confirm the Oracle prologue plays through in 6 lines, then the starter picker shows 5 candidates with "choose 3 to bring".
4. Pick rope + sword + food. Tap Begin.
5. Forest riddle scene appears. Confirm 3 answer buttons (river, snake, path).

### B. Counter bar shows coins
1. Any scene after the prologue should now show three rows in the counter bar (top-left): food (6 pips), water (6 pips), and a new "Coins: 50" text badge.
2. Confirm the coins row uses text display ("Coins: 50") rather than 9999 pips.

### C. Shrine, blessing, and ching
1. From forest_path, pick "Visit the small shrine" (3rd choice).
2. At the shrine, pick "Speak to the shrine, leave 50 coins". You should hear a quick two-tone bell (might be silent on first interaction due to Safari autoplay; if so, the second transaction will ching reliably).
3. Coins should drop from 50 to 0 in the counter bar.
4. You return to forest_path with the blessing flag set (no visible UI; it shapes later narration).

### D. Treasure pickup chings
1. From forest_path, take the cliff route (requires rope) → wolf_encounter.
2. Solve the wolf (sword, food, or coin bribe). All three lead onward.
3. At eagle_nest, tap the glowing coin pouch in the scene. Counter should show coins +50 and you should hear the ching.
4. Step onward to volcano_base.

### E. Mounts (coin-gated express paths)
1. Reset (Play Again) and run a new adventure. Take the riverbank route to gather coins via fishing-trap pickups, or grind the bone field for a rare_gem (+200) once at volcano_base.
2. Once coins are 200+, at riverbank pick "Pay 200 coins for a river pony" — should jump straight to volcano_base, skipping wood gathering and river crossing.
3. At ash_road, "Pay 200 coins for a desert lizard" should jump straight to dragon_cubs.

### F. Markets
1. At riverbank with 50+ coins, "Buy supplies from the river fisher (50 coins)" should set food and water to 4 each (clamped to max 6) and ching.
2. At cave_shortcut with 200+ coins, "Trade with the cave hermit for the lullaby (200 coins)" should add the dragon's lullaby to inventory and ching.

### G. Thief encounter
1. At ash_road, pick "A traveler approaches" → thief_encounter.
2. Try each of the 3 outcomes on different runs:
   - "Pay the toll, 100 coins" — coins drop by 100, return to ash_road.
   - "Fight back with your sword" (if you have one) — return to ash_road with no coin loss.
   - "Run, drop your purse" — coins go to 0, robbed flag set.

### H. Realm card economy summary
1. Complete a run (any ending).
2. The realm card at the end should show three new lines under the ingredients grid:
   - Ending: "The Friend" / "The Blessed" / "The Charmer" / "The Appeased" / "The Snatcher" / "The Lost" / "The Hatcher"
   - Coins: N earned, N remaining
   - Trophies: comma-separated list (Coin Pouch, Rare Gem, Glowstone, etc.) when present
3. Try the new "The Blessed" ending: visit shrine + leave 50 coins, then make it to dragon_chamber and "Take the egg".

### I. Play Again resets coins
1. From the realm card, tap Play Again.
2. Counter bar should reset to 6 food, 6 water, 50 coins. Inventory clears (apart from starter picks). Visited scenes reset.

### J. Regression sweep
1. Castle theme (Claude-generated) still loads and walks through normally; no coins counter visible (only adventures declare a coins counter).
2. Forest riddle still answers cleanly (the new optional fields are absent on Claude-generated trees).
3. Sound bus does not autoplay on page load. The first ching only fires after a tap.

## Image generation status

All 12 new images generated successfully via Replicate during the deploy session:
- 8 new scene backgrounds: wolf_encounter, waterfall_climb, eagle_nest, bone_field, crystal_chamber, dragon_cubs, shrine, thief_encounter
- 4 new pickup icons: coin_pouch, treasure_chest, rare_gem, glowstone

If any image looks wrong, regenerate with `npx tsx --env-file=.env.local scripts/generate-hunt-dragon-egg-art.ts --force` (force re-runs every entry; or pass `--only id1,id2` if the script supports it).

## Known imperfections (acceptable for hackathon)

- The "ending_blessed" scene reuses ending_appeased.webp as its background (no unique art). If you want unique art, add a prompt for `ending_blessed` to scripts/hunt-dragon-egg-prompts.ts and rerun the generator.
- Web Audio chings are silent on the very first tap on Safari due to the gesture policy; subsequent taps work. Acceptable; the first transaction is rarely the most memorable one.
- The riverbank scene now has 6 choices (river crossing, wood gathering, back, waterfall climb, fisher market, river pony). Six choices is a lot on small screens. If it feels visually noisy, consider consolidating later.
- Coins counter starts at 50 from a hidden start_at field on its CounterDef; max stays 9999 so the counter never visually caps. CounterBar renders text instead of pips when max>50.
- The dragon_cubs convergence may feel sudden the first time a kid arrives; the existing chamber narration variants still fire once they reach dragon_chamber.

## If something is broken

- Build still works locally: `unset ANTHROPIC_API_KEY && npm run build` should be clean.
- Type check: `unset ANTHROPIC_API_KEY && npx tsc --noEmit` clean.
- Validator: `npx tsx -e 'import("./lib/adventures/index").then(() => console.log("registry OK"))'` should print `registry OK`.
- Roll back the entire batch: `git revert 5e2db91 4859f41 f144cca 08f07a6 29b462f` (six commits, top to bottom).

## Next batch hints

- Add `ending_blessed.webp` art (one extra Replicate run).
- Optional thief follow-up: an ending tier ("The Robbed") gated on the `robbed` flag, currently unused.
- Consider adding a small "coin balance" toast when a transaction fires (currently silent except for the ching and the counter bar update).
- Optional: persist coins between runs as a "wallet" so kids who collect treasures across multiple Play Agains feel rewarded.
