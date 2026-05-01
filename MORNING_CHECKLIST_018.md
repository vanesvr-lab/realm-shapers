# Morning Checklist — B-018 (Oracle pin, per-gate hints, explored-path map)

Built and deployed 2026-05-01 in the same CLI session that shipped B-017. Smoke tests below were not performed by the agent. Walk through each before considering B-018 green.

Production URL: https://realm-shapers.vercel.app

## What changed

Three medium UI changes that change how the kid asks for help and how they understand where they have been.

1. The inline 🔮 Ask Oracle button in the top-right of the play view is gone. The global OracleAvatar at bottom-right now wears the Ask Oracle role: a small purple badge over the oracle face shows remaining hints (3 → 2 → 1 → hidden when 0). Tapping the avatar in play fires the realm's hint flow; outside play (landing, profile, etc.) the avatar still greets normally.
2. Gated choices now carry their own `oracle_hint` field. When the kid taps the Oracle on a scene where they are missing the pickup for a choice, the gate's hint is preferred over the scene-level one. Cheapest-to-resolve wins (fewest missing pickups), scene-order tie break. Authored on every gate in the dragon-egg adventure.
3. New 🗺️ Map button at bottom-left of the play view opens a node-graph overlay of the realm. Visited scenes filled and labelled, current scene pulses, one-hop unvisited scenes outlined (no spoilers), rest hidden. Tap a node, the backdrop, or Close to dismiss.

Code-side changes:
- `lib/oracle-pin-bus.ts` (new) — small bus for play-mode oracle state.
- `components/OracleAvatar.tsx` — subscribes to the pin bus; renders badge and reroutes tap when in play mode.
- `components/StoryPlayer.tsx` — `askOracle` callback (per-gate aware), publishing effect for the bus, removed the inline button, new Map button + overlay mount.
- `components/MapOverlay.tsx` (new) — full-screen modal with SVG node-graph. BFS layout from `starting_scene_id`.
- `lib/claude.ts` — `StoryChoice.oracle_hint?: string` (optional, unused on Claude worlds).
- `lib/adventures/hunt-dragon-egg.ts` — authored `oracle_hint` on 15 gated choices.

Build is clean: `unset ANTHROPIC_API_KEY && npx tsc --noEmit`, `npm run lint`, `registry OK`, `unset ANTHROPIC_API_KEY && npm run build` all pass. /play first-load JS at 37.2 kB / 254 kB shared (was 35.5 kB after B-017; +1.7 kB covers MapOverlay + per-gate hint logic + oracle-pin bus). Production deploy succeeded.

## Smoke walkthrough (run in order)

### A. Oracle pin renders + badge
1. Open https://realm-shapers.vercel.app in incognito.
2. Pick the Castle theme + any starting place. Step through the prologue + starter pick.
3. Land in the first adventure scene (now titled "The Enchanted Forest" per B-017).
4. The OracleAvatar at bottom-right should show a small purple circle badge with "3" on the upper-right corner of the oracle face.
5. The 🔮 Ask Oracle button at the top-right is GONE. The right-side controls now show only: Editor (if shown), Ambient mute (if on a scene with ambient), Leave realm.

### B. Tap the pin to fire a hint (decrement)
1. From step A, tap the Oracle avatar at bottom-right.
2. The Oracle should speak the scene's `oracle_hint` ("It runs through the forest you came from. Listen for its bed of stones, and its mouth at the sea.") via the bubble + voice (if not muted).
3. The badge should now read "2".
4. Tap again on a different scene to confirm consistent behavior.

### C. Per-gate hint preference (the key new behavior)
1. From scene A, walk through the riddle (any answer) to "The Forest Path". Take the riverbank route. From riverbank, the cliff backtrack is gated on rope IF the kid did not start with one. To force a gated state, restart and pick `sword + lantern + food_ration` as your starter trio (so you have NO rope).
2. Get to the riverbank. Don't grab anything yet. Tap the Oracle. The hint you should hear is the per-gate one for the rope-gated waterfall climb: **"Climbs ask for rope. A coil from home, or a coil left where the river bends."** (NOT the scene-level riverbank hint about gourds and fish traps.)
3. Verify the badge still decrements correctly.

For a stronger per-gate test:
1. Restart, pick `food_ration + water_bottle + lantern` (no rope, no sword). Walk to The Wide River. Tap Ask Oracle. Hint should be the build_raft per-gate hint: **"Rafts ask for two things: wood from the fallen pine off the trail, and rope from where the river bends."**

### D. Map button + overlay
1. From any scene in the adventure, tap the 🗺️ Map button at bottom-left.
2. A full-screen overlay appears with a dark backdrop and a node-graph rendered in amber.
3. Visited scenes are filled circles with the scene title underneath.
4. The current scene's circle pulses (an outer ring expands and contracts).
5. One-hop unvisited next steps appear as outlined circles (no label, no title — that's intentional; we don't want spoilers).
6. Edges between visited scenes are solid. Edges leading to outlined (unvisited) nodes are dashed.
7. Tap a visited node, the backdrop, or the Close button at top-right. The overlay dismisses.
8. Walk to a new scene. Re-open the map. The new scene is now filled and labelled; the previous one stays filled.

### E. Out of play, oracle reverts to greet
1. From any scene, tap "🚪 Leave realm" then confirm.
2. You return to PlayClient post-completion or to the landing page.
3. The OracleAvatar should NOT have a badge anymore.
4. Tap it. The Oracle should say "I am the Oracle. Tap me any time you wish to hear me again." (the original greet).

## Regression checks

### F. Pickups (B-017) still work
1. From step A's adventure, hover over a glowing pickup. The hint caption appears underneath.
2. Tap to pick up. The Oracle says the collection line + hint.
3. The pickup lands in the InventoryBar.

### G. Narration block (B-017) still right-aligned
1. The bottom narration card still hugs the right column with smaller font and 3-line clamp.
2. The bottom-left half of the scene is clear of the card so the new 🗺️ Map button is fully visible and not overlapped.

### H. Entry videos still play
1. forest_riddle_entry.mp4 should still play once on first scene entry per session.
2. Drawbridge entry video still plays (if the kid picks Drawbridge as start, then prologue, then enters the first scene).
3. dragon_chamber, dark_cavern, lava_river_crossing, volcano_base entry videos still play.

### I. Adventure flow (counter, gates, endings) intact
1. Walk a full path: starter pick → forest → riverbank → river crossing (build raft) → volcano base → vent path / lava → dragon chamber → tend wound + sing lullaby → take egg.
2. Confirm: counters tick correctly, coin gates fire (e.g., fisher market 50 coins), pickups work, ending fires (probably ending_friend or ending_charmed depending on flags).
3. The economy summary should appear on the realm card.

## Rollback

Two commits. To revert just B-018:

```bash
git revert dd2ab79
git push
vercel --prod --yes
```

To revert both B-017 and B-018:

```bash
git revert dd2ab79 40854b1
git push
vercel --prod --yes
```

For a partial revert (e.g., put the inline Ask Oracle button back without removing the map):
- Restore the inline button block in `components/StoryPlayer.tsx` (the diff shows the exact JSX).
- Disable the bus publish by changing the publishing useEffect to early-return.
- The OracleAvatar's pin behavior degrades gracefully when pinState stays null — it just renders the greet behavior, no badge.

## Open after this batch

- The right-side control stack feels a bit empty without the Ask Oracle button. A future small tidy-up could rebalance Editor + Ambient + Leave into a single row, or hide them behind a hamburger.
- Per-gate hints are only authored on the dragon-egg adventure. Claude-generated worlds quietly fall through to the scene-level hint. If we want Claude to start emitting choice oracle_hints, we'd extend the prompt and the parser.
- MapOverlay's BFS layout is fine for the dragon-egg path but back-edges (dragon_chamber → song_quest → dragon_chamber) put song_quest at depth+1 from first sighting, which can look slightly off. Vanessa to call out if a kid finds it confusing in playtest; otherwise leave alone.
- No pan/zoom on the map. The viewBox is auto-sized but if a future tree exceeds 6+ columns or 8+ rows, the labels may shrink past readability. Add pan/zoom only if needed.
