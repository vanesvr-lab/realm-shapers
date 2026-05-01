# Morning Checklist — B-017 (Polish: narration, pickups, oracle, scene title)

Built and deployed 2026-05-01 in a CLI session, after B-016 and before B-018. Smoke tests below were not performed by the agent. Walk through each before considering B-017 green.

Production URL: https://realm-shapers.vercel.app

## What changed

Four small playtest fixes Vanessa flagged. None changed the adventure's logic; all four are kid-facing polish.

1. The bottom narration card was overlapping the glowing pickups in the bottom-left of the scene. The card now lives in the right column, drops one font step (text-sm sm:text-base), and the narration paragraph clamps to 3 lines.
2. Glowing pickups were too mysterious. Each pickup in `lib/pickups-catalog.ts` now has a one-sentence kid-friendly `hint`. Hover (desktop) or tap-and-hold (mobile) the glow to surface the hint as a small caption underneath. The pickup-confirmation Oracle line also appends the hint, so the kid hears the clue either way.
3. The Ask Oracle button used to silently decrement the hint counter even when there was nothing meaningful to say. Now the counter only drops when a real line is spoken; empty `scene.oracle_hint` falls through to a meaningful default ("I have no whisper for you here. Try walking on, and look for the things that gleam.").
4. Picking Castle theme + Drawbridge starting place dumped the kid into a forest scene titled "The Old Oak's Riddle". The forest_riddle scene is now titled "The Enchanted Forest" so the title matches the rendered art. The riddle motif still lives in the narration body and downstream `forest_path` narration variants.

Code-side changes:
- `components/StoryPlayer.tsx` — narration block restyle (CSS only, around line 1171), new in-file `PickupGlow` component for hover/long-press captions, pickup confirmation line appends `pickup.hint` when present, Ask Oracle handler only decrements when a real line is spoken.
- `lib/pickups-catalog.ts` — `Pickup` type gains optional `hint?: string`. All 16 catalog entries authored.
- `lib/adventures/hunt-dragon-egg.ts` — single-line title rename on `FOREST_RIDDLE`.

Build is clean: `unset ANTHROPIC_API_KEY && npx tsc --noEmit`, `npm run lint`, registry validator (`registry OK`), and `unset ANTHROPIC_API_KEY && npm run build` all pass. /play first-load JS unchanged at 35.5 kB / 253 kB shared. Production deploy succeeded.

## Smoke walkthrough (run in order)

### A. Narration no longer overlaps the pickup glow
1. Open https://realm-shapers.vercel.app in incognito.
2. Pick the Castle theme and any starting place. Step through the prologue + starter pick.
3. Land in the first adventure scene. The narration card should sit in the right half of the bottom of the screen, not the full width.
4. Confirm the title is on the right side of the card and the narration paragraph clamps to 3 lines on a standard-resolution screen.
5. The bottom-left half of the scene should be visually clear of the narration card so any glowing pickup (e.g., riverbank's water_bottle and food_ration) is fully visible.

### B. Pickup hints (hover + long-press + bubble)
1. From step A, navigate to Riverbank (it has two pickups: water_bottle, food_ration).
2. **Desktop hover:** hover over the glowing water bottle. A small black caption pill should appear underneath the prop with the text "A leather bottle, cool to the touch." Hover off; the caption should disappear.
3. **Mobile/touch tap-and-hold:** on a phone or with touch emulation, press and hold the glow for ~400ms. The caption should appear. Lift your finger; the caption stays for ~1.5s then fades. The pickup should NOT have been collected.
4. **Normal tap pickup:** tap the glow normally (no hold). The pickup is collected; the Oracle says "You collect the water bottle. A leather bottle, cool to the touch." Both halves of the line should be present.
5. Repeat with the food ration. Hint should be "Dried bread and berries, wrapped tight."
6. **Treasure pickups:** navigate to Waterfall (climb up alongside the falls from Riverbank). The treasure_chest hint should be "An old chest, dust and a faint glow." Same hover + tap pattern.

### C. Ask Oracle counter behavior
1. Start a fresh adventure (the budget resets to 3 on each Play Again).
2. Tap Ask Oracle on the very first scene (forest_riddle). It HAS a scene-specific hint, so the Oracle should speak that hint and the counter should drop from 3 to 2.
3. Walk through to a scene that does NOT define `oracle_hint` (rare in this adventure since all scenes have one, but cubs antechamber DOES, ash road DOES, etc.). For full coverage, you can verify the bug fix manually by temporarily blanking a scene's hint in dev. In production, every adventure scene has a hint, so the fallback path is hard to hit organically; the unit-style check is "can you hit Ask Oracle 3 times and have the counter drop to 0 each time the Oracle speaks a real line, then on the 4th tap hear "I have told you all I can. The rest is yours to find." with no further decrement"?
4. Confirm: if you tap Ask Oracle and the Oracle speaks a non-empty line, the counter drops by 1. If the Oracle says nothing (should not happen in shipped scenes), the counter does NOT drop.

### D. Scene title matches rendered place
1. Restart from landing.
2. Pick Castle theme + Drawbridge starting place.
3. Step through the prologue + starter pick.
4. Land in the first scene. The narration card title should now read **"The Enchanted Forest"** (not "The Old Oak's Riddle"). The art is a forest. The title and art match.
5. The narration body should still describe the talking oak and pose its riddle ("I run but never walk..."). The riddle UX is unchanged; only the title was renamed.

## Regression checks

### E. Pickups still pickup normally
1. From any scene with a pickup, tap the glow once (no hover, no hold). The pickup should be collected; it should appear in the InventoryBar; the Oracle should narrate the collection with the appended hint.
2. Make sure the pickup glow is dismissed (not still hovering/glowing in place after collection).

### F. Oracle hints still fire when scenes have explicit oracle_hint
1. forest_riddle (the new "Enchanted Forest" scene) has the hint "It runs through the forest you came from. Listen for its bed of stones, and its mouth at the sea." Tap Ask Oracle on this scene; you should hear that exact line.
2. The counter should drop from 3 to 2.

### G. Entry videos still play
1. Pick Castle theme + Drawbridge. The Drawbridge background carries an entry video (drawbridge_entry.mp4). On first scene entry per session, the video should play once, then crossfade to the static image.
2. The forest_riddle scene also has an entry video (`forest_riddle_entry.mp4`). Same behavior: plays once on first visit, crossfades to the static.
3. dragon_chamber, dark_cavern, lava_river_crossing, volcano_base each carry their own entry videos. All should still play normally.

## Rollback

If any of the four scopes feels wrong in playtest:

```bash
git revert 40854b1
git push
vercel --prod --yes
```

If only one scope is wrong, the file-level isolation makes a partial revert easy:
- Narration overlap: revert just the narration block changes in `components/StoryPlayer.tsx`.
- Pickup hints: revert `lib/pickups-catalog.ts` and the `PickupGlow` + `pickup()` changes in StoryPlayer.
- Oracle decrement: revert just the Ask Oracle button handler in StoryPlayer.
- Scene title: revert just the FOREST_RIDDLE title line in `lib/adventures/hunt-dragon-egg.ts`.

## Open after this batch

- The `PickupGlow` long-press timer is 350ms. If kids find it too short or too long, the constant lives in `components/StoryPlayer.tsx` inside the `onTouchStart` handler.
- Caption truncates if too long. All shipped hints fit in one line, but new long hints would get cut off.
- `line-clamp-3` may cut Claude-generated worlds with very long opening narration. Hand-authored adventure scenes are short enough to fit. If a Claude scene gets cut, raise to `line-clamp-4` or swap to `max-h-` + `overflow-auto`.
