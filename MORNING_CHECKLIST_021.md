# MORNING_CHECKLIST_021.md — Demo polish, theme/place locks, art, hero fix, prologue line

Vanessa, B-021 shipped overnight. Live at https://realm-shapers.vercel.app. The whole batch is built, type-checked, lint-clean, validator-green, and production-deployed, but the agent did NOT click through any browser flow. This checklist walks the six kid-facing changes plus quick regression spot-checks for B-019/B-020.

If anything in section A-F is broken, ping the CLI and the fix is straightforward. The new art (sections B and C) is the only thing that's irreversible spend if we want to regenerate.

## A. Locked themes on the landing page

Open https://realm-shapers.vercel.app/. Scroll to "Step 1 — Pick a world".

- [ ] Castle and Dragons is full color, hover lifts the border, click selects (amber ring).
- [ ] Forest, Candy Land, City, Space, Underwater are all visibly grayscale + dimmed, with a 🔒 pill in the top-right and "coming soon" subtitle.
- [ ] Clicking any locked tile does nothing (cursor is `not-allowed`, no selection ring, no Step 2 reveal).
- [ ] After picking Castle, Step 2 reveals.

Failure mode: if a locked tile renders full color or accepts clicks, the `Theme.locked` flag did not flow to `ThemeCard`. Worth checking before judges open the link.

## B. Castle theme thumbnail looks demo-grade

Same Step 1 grid.

- [ ] The Castle tile shows the new painted Studio Ghibli watercolor: grand stone castle at golden hour, dragons circling a far tower. Warm amber sky.
- [ ] No prior placeholder SVG vibe (flat color blocks).

If the tile looks wrong:
1. `unset ANTHROPIC_API_KEY && npx tsx --env-file=.env.local scripts/generate-b021-art.ts --force`
2. Inspect `/Users/elaris/realm-shapers/public/themes/castle.webp` in Finder/Preview.
3. If unhappy, edit the prompt at scripts/generate-b021-art.ts, rerun with --force, push.

## C. Dragon's Egg starting place

Pick the Castle theme. Step 2 ("Where do you start?") should reveal.

- [ ] Only "Collect the Dragon's Egg" tile is selectable. Painted glowing dragon egg in a torch-lit cavern with the mother dragon coiled around it. "great start" badge in the top-left.
- [ ] All 15 other castle starting places (Drawbridge, Outer Gate, Courtyard, Great Hall, Throne Room, Dungeon, Kitchen, Library, Royal Chambers, Tower Stairs, Tower Top, Royal Garden, Secret Passage, Dragon's Lair, Ancient Crypt) are grayscale + 🔒 + "coming soon".
- [ ] Clicking the Dragon's Egg tile lights the amber ring; clicking any other does nothing.

Same regen path as section B if the Dragon Egg art looks off.

## D. Picked hero shows up in the adventure

Walk the full demo flow on a fresh browser session:

1. Pick Castle theme.
2. Pick "Collect the Dragon's Egg".
3. **Pick Princess as the hero** (NOT wizard — princess is the regression case).
4. (Optional) name her.
5. Tap "Begin the Adventure".
6. Sit through the prologue (or skip).
7. Pick three starter items, confirm.
8. The first scene (forest_riddle) loads.

- [ ] The hero standing in the forest scene is the Princess, not the Wizard.
- [ ] The hero voice on narration matches the Princess (Fena), not the Wizard's (Fena, but with the Wizard cut you'll hear it on different beats — easier check is the visual).
- [ ] Repeat with Knight (Ryan voice) — knight should appear in the scene, not wizard.

If the wizard still appears: the override in `app/api/generate/route.ts` (lines around `pickedCharacterId`) didn't take. Check the network tab — the POST to /api/generate should include `character_id: "princess"` in the request body. If it's missing, the LandingForm payload regressed.

## E. Auto-lock heroes with missing thumbnails

This is defensive. Today all 8 catalog characters have real PNGs at `/public/characters/`, so this path stays dormant.

- [ ] All 8 hero tiles (Knight, Wizard, Princess, Astronaut, Mer-Kid, Gingerbread Kid, Robot, Dragon) render in full color, no 🔒.
- [ ] To prove the defense works without breaking prod: open the CLI, rename `public/characters/dragon.png` to `public/characters/_dragon.png.bak`, hard-reload locally on `npm run dev`. The Dragon tile should now grayscale + 🔒. Rename it back when done. (Skip this if you're short on time — the runtime guard is small and obvious in `LandingForm.tsx`.)

## F. Prologue final line

Continue the adventure flow from section D.

- [ ] After "The mother is fierce. But she has a heart. Remember this when you stand before her." the Oracle's last spoken line ends with: "Choose three things to bring. Then begin by heading into the Enchanted Forest. The egg waits beyond."
- [ ] The kid hears WHERE to go (Enchanted Forest), not just "good luck."

Pure data edit in `lib/adventures/hunt-dragon-egg.ts`. If a stale ElevenLabs cache replays the old line, expand the SAY-IT-AGAIN buffer.

## Regression spot-checks (B-019 + B-020)

These should still work — the B-021 changes do not touch the run-time economy, build, hint, shop, XP, or ending logic. Five-minute walk:

- [ ] Open the left rail. Map / Hints / Shop / Build buttons each open their panel.
- [ ] Buy a Trail Rations from the shop. Coin counter goes down by 30, food counter goes up by 1, ching plays, oracle confirms.
- [ ] Open Build, type a long detailed raft prompt, watch the rubric tick toward 5/5 live, submit. Builder XP goes up, built_raft enters inventory.
- [ ] Cross the river using the built raft (build-gated choice should be visible). Built raft is consumed.
- [ ] Run all the way to a known failure ending (e.g. clear food/water by walking the long route without buying). Confirm the new sharp narration ("Out of Food", "Out of Water") and the stripped realm card with "Adventurer: N XP — Tier" line.
- [ ] Take the egg gently (lullaby OR built music box OR rare gem) — earned ending plays, full realm card with adventurer tier badge.

If any of these fail, the regression is in B-021's edits to `LandingForm.tsx` or `PlayClient.tsx`. Most likely candidate: the heroCharacterId simplification on PlayClient.tsx around line 579 — should now be `editorSnapshot.characterId ?? story.default_character_id`. If `editorSnapshot.characterId` is null at run start, the fallback covers it.

## Files of interest if you need to dig

- `lib/themes-catalog.ts` — locked flag, new dragon-egg sub-scene
- `lib/characters-catalog.ts` — locked flag (defensive)
- `components/LandingForm.tsx` — locked rendering, runtime hero unavailable map, payload character_id for adventure
- `app/api/generate/route.ts` — adventure branch override of default_character_id
- `app/play/PlayClient.tsx` — line 579 hero resolution
- `lib/adventures/hunt-dragon-egg.ts` — last prologue line
- `scripts/generate-b021-art.ts` — Flux generator for the two new assets

## What's still open

Listed in CHANGES.md under `## B-021` → `**Open:**`. Highlights:
- Step 2 of the landing form is a one-tile picker now (kid still taps the Dragon Egg to advance). Cheap to skip later.
- `castle_dragon_egg_quest` connects_to drawbridge only because the validator demands a same-theme target. Edge is unused at runtime.
- The hero `<Image onError>` defense may be silent under next/image; consider a `fetch(HEAD)` probe later.

— end of checklist
