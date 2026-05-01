# B-021: Demo polish — theme/place locks, castle + dragon-egg art, picked-hero fix, prologue line

## Goal

Final polish batch before sending the demo link to judges. Tightens the landing page so the kid can only walk the one path we have art and content for, generates two fresh hero images, fixes the bug where the kid's picked hero gets ignored in adventure mode, and rewrites the prologue's last line to point the kid at the next scene.

1. **Lock every theme except Castle & Dragons** on the landing page.
2. **Castle & Dragons gets a fresh painted thumbnail** via Flux (the current art is OK but we want demo-grade).
3. **Replace the "Drawbridge" starting place** with a new "Collect the Dragon's Egg" tile. Generate fresh dragon-and-egg art for it. Lock every other castle starting place.
4. **Honor the kid's hero pick in adventure mode** (currently the adventure's hardcoded `default_character_id: "wizard"` overrides the picker selection).
5. **Lock any hero in the picker whose asset is missing** so kids cannot pick a placeholder.
6. **Prologue final line nudges to the enchanted forest** so the kid knows where they are heading.

## Project context

- Read `CLAUDE.md` first.
- Theme catalog: `lib/themes-catalog.ts`. `Theme` type has id, label, file_path, etc. Probably no `locked` field today — add one.
- Theme picker UI: search `components/LandingForm.tsx` for the step-1 theme grid. Tiles render thumbnails; need a locked variant (grayscale + 🔒 + "coming soon" tooltip; click is a no-op).
- Castle starting places: `lib/themes-catalog.ts` — there are ~12-15 sub-scenes for castle (drawbridge, courtyard, throne_room, etc.). Each is a SubScene with its own thumbnail. Lock all of them; add a new one for "Collect the Dragon's Egg" and leave only that unlocked.
- Hero catalog: `lib/characters-catalog.ts`. `Character` type already has `thumbnail_path`. Currently 8 entries, all `.png` (B-016 shipped real art).
- Hero picker UI: `components/LandingForm.tsx` step 3.
- Adventure default character: `lib/adventures/hunt-dragon-egg.ts:1332` — `default_character_id: "wizard"`.
- PlayClient hero plumbing: `app/play/PlayClient.tsx:579` — currently `heroCharacterId={isAdventure ? story.default_character_id : editorSnapshot.characterId}`. The adventure branch overrides the kid's pick.
- Editor snapshot character pick: `editorSnapshot.characterId` is set from the LandingForm regardless of theme; threads through PlayClient.
- Prologue: search the Hunt the Dragon's Egg adventure for `prologue` or the OraclePrologue component. Last spoken line is the one we tweak.

## Scope

### A. Lock 5 of 6 themes

Add an optional `locked?: boolean` (or `coming_soon?: boolean`) field to `Theme` in `lib/themes-catalog.ts`. Set it on all themes EXCEPT `castle`. Concretely: forest, candy_land, city, space, underwater all get `locked: true`.

Update the LandingForm theme grid:
- Locked tiles render with a grayscale filter (`grayscale opacity-60` or similar), a 🔒 icon overlay top-right, and a "coming soon" caption.
- Locked tiles have `disabled` button semantics (no click handler, no `picked` state).
- The "great match" badge logic skips locked themes.

### B. Castle & Dragons fresh thumbnail

Regenerate the Castle & Dragons theme thumbnail via Flux Schnell. Edit the prompt for the castle theme entry (or wherever it lives — likely `scripts/generate-assets.ts` or a theme-art generator) to a single rich prompt:

```
A grand stone castle silhouetted at golden hour, dragons circling a far tower, painted Studio Ghibli watercolor style, warm atmospheric depth, no people, no text, square composition.
```

Run the generation script for just this thumbnail. Confirm visual is demo-grade; if not, regenerate with `--force`.

### C. New "Collect the Dragon's Egg" starting place

In `lib/themes-catalog.ts`, add a new SubScene under the castle theme:

- id: `castle_dragon_egg_quest`
- label: `Collect the Dragon's Egg`
- file_path: `/backgrounds/castle/dragon_egg_quest.png`
- short description: `the dragon's nest cavern with a single glowing egg`
- (any required SubScene fields per the existing pattern)

Generate the art via Flux. Suggested prompt:

```
A glowing dragon's egg resting in a stone nest deep inside a torch-lit cavern, a great sleeping dragon coiled around it, painted Studio Ghibli watercolor style, warm amber light, atmospheric depth, no people, no text.
```

Lock every OTHER castle SubScene (drawbridge, outer_gate, courtyard, great_hall, throne_room, dungeon, kitchen, library, royal_chambers, tower_stairs, tower_top, royal_garden, secret_passage, dragons_lair, ancient_crypt) by adding a `locked: true` field and rendering them like the locked themes from scope A.

Also: update LandingForm step 2 to filter out or visually distinguish locked starting places. Only `castle_dragon_egg_quest` should be selectable on the demo path.

### D. Honor the kid's picked hero in adventure mode

In `app/play/PlayClient.tsx:579`, change:

```
heroCharacterId={isAdventure ? story.default_character_id : editorSnapshot.characterId}
```

to:

```
heroCharacterId={editorSnapshot.characterId ?? story.default_character_id}
```

Verify `editorSnapshot.characterId` is populated when the kid picks a hero on the landing form before entering an adventure. If the snapshot's character is somehow not threaded into the adventure flow, fix the threading at the source so the kid's pick survives.

Update `lib/adventures/hunt-dragon-egg.ts` `default_character_id` to remain "wizard" (unchanged) — it stays the fallback when no kid pick exists, e.g., if someone deep-links into /play.

### E. Lock heroes whose asset is missing

In `lib/characters-catalog.ts`, add an optional `locked?: boolean` (or compute it at render time by checking thumbnail_path resolves). Today all 8 are real, so leave them all unlocked. The change here is the LandingForm picker: if a character is locked OR their thumbnail file would 404, render with the same locked treatment as locked themes (grayscale + 🔒 + no click). This is defensive — if any character thumbnail is removed in the future, the picker will quietly disable that tile instead of showing a broken image.

Concretely: at runtime in the picker, attempt to load the thumbnail with an `onError` fallback that flags the tile as locked. Or add an `available: boolean` field defaulting to true and let LandingForm respect it.

### F. Prologue final line points at the enchanted forest

Find the Hunt the Dragon's Egg adventure prologue lines (likely in `lib/adventures/hunt-dragon-egg.ts` as `prologue: [...]` array, or in OraclePrologue component if it's centralized). Rewrite the final line of the prologue so it ends with a clear nudge:

> "Begin by heading into the Enchanted Forest. The egg waits beyond."

Or paraphrase to match the existing tone. The point is the kid hears WHERE to go after the prologue ends, not just a generic "good luck."

### G. Tests

1. `unset ANTHROPIC_API_KEY && npx tsc --noEmit` clean
2. `npm run lint` clean
3. `npx tsx -e 'import("./lib/adventures/index").then(() => console.log("registry OK")).catch(e => { console.error(e); process.exit(1); })'` prints `registry OK`
4. `unset ANTHROPIC_API_KEY && npm run build` clean
5. Smoke locally:
   - Landing form theme step: only Castle & Dragons is selectable. Other 5 are visibly locked, click does nothing.
   - Castle thumbnail looks demo-grade.
   - Step 2: only "Collect the Dragon's Egg" is selectable; other castle places are locked. Selected → its art shows.
   - Pick princess as hero, walk into the adventure. Confirm princess (not wizard) appears in scene.
   - Prologue plays end-to-end; the last line ends with the enchanted-forest nudge.

### H. Deploy

```
vercel --prod --yes
```

Append `CHANGES.md` entry. Write `MORNING_CHECKLIST_021.md` covering the six items plus regression on B-019/B-020 (shop + builds + XP + endings still work).

## Out of scope

- Magic link / `signInWithOtp` issues — separate batch.
- Adding more starting places beyond the Dragon's Egg quest.
- Any new themes beyond Castle (locked or unlocked).
- Voice-acting the prologue change.
- Adventure logic changes (build gates, XP, endings — all from B-019/B-020).

## Acceptance

- Only Castle & Dragons theme selectable; other 5 locked with grayscale + 🔒.
- Only "Collect the Dragon's Egg" castle starting place selectable; other ~14 locked.
- Castle and dragon-egg images are fresh, painted, demo-grade.
- Picking princess on landing → princess in adventure scene.
- Heroes whose thumbnail does not load are auto-locked in the picker.
- Prologue ends with a line nudging the kid toward the enchanted forest.
- Type check, lint, build all clean. Vercel deploy succeeds.
