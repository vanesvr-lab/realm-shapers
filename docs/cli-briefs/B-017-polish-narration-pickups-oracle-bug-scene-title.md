# B-017: Polish — narration overlap, pickup hints, oracle bug, scene title

## Goal

Four small playtest fixes from Vanessa, all kid-facing polish. None should change adventure logic.

1. Narration block at the bottom overlaps the glowing pickup. Shrink and right-align it.
2. Pickup glows are too mysterious. Add a per-pickup hint that surfaces both as a small caption near the prop AND inside the existing pickup speech bubble.
3. Ask Oracle button decrements the hint counter even when the oracle has no real hint to give. Bug fix.
4. Picking Castle theme + Drawbridge starting place dumps the kid into the forest scene "The Old Oak's Riddle" with no transition. Make the title match the rendered place.

## Project context

- Read `CLAUDE.md` first.
- Narration block: `components/StoryPlayer.tsx` lines ~1174-1192 (`<h2>{scene.title}</h2>` + `<p>{resolved.narration}</p>`).
- Pickup glow + speech bubble: `components/InteractiveProp.tsx` (catalog speech bubble) and pickup rendering inside `StoryPlayer.tsx` (look for `resolvePickupRender` / `getPickup` usage).
- Pickup catalog: `lib/pickups-catalog.ts`. Already has Pickup type with name, art, optional `coin_value`. No hint field today.
- Oracle hint flow: `components/StoryPlayer.tsx` ~1048-1066. `oracle_hint_budget` from story, decrements `oracleHintsLeft` per use, falls back to a generic line when scene has no `oracle_hint`. Bug: empty fallback still decrements.
- Adventure starting scene: `lib/adventures/hunt-dragon-egg.ts`, `FOREST_RIDDLE` at line 84. Title is "The Old Oak's Riddle".
- Castle theme starting places (drawbridge etc.) are in `lib/themes-catalog.ts`.

## Scope

### A. Narration block: shrink and right-align

In `components/StoryPlayer.tsx` around the narration container at line ~1174, restyle so:
- Narration text caps at ~2-3 lines on standard screens (clamp via Tailwind `line-clamp-3` or `max-h-` + overflow + ellipsis is acceptable; pick whichever doesn't truncate kid-readability badly).
- Font drops one Tailwind step (e.g., `text-base sm:text-lg` → `text-sm sm:text-base`).
- Block right-aligns so the bottom-left half of the scene stays clear for the pickup glow. Use `text-right` and shift the container's positioning to the right column.

Don't refactor the narration component. CSS-only change.

### B. Pickup hint copy (option c: caption + enriched bubble)

Add `hint?: string` to the `Pickup` type in `lib/pickups-catalog.ts`. Author short kid-friendly hints (one short sentence, non-spoiler) for the existing catalog entries. Examples:
- `coin_pouch.hint`: "A small leather pouch. Looks heavy."
- `treasure_chest.hint`: "An old chest, dust and a faint glow."
- `rare_gem.hint`: "Something glittering deep in the ash."
- `glowstone.hint`: "A stone with its own soft light."
- For non-coin pickups (rope, sword, food, lantern, etc.), use the same instinct.

Surface the hint:
- **Caption near prop** — when the kid hovers (desktop) or taps-and-holds the glowing prop, render a small caption under the prop showing the hint. No pickup occurs from hover/tap-and-hold; pickup is still the existing tap.
- **Speech bubble** — when the kid taps to pick up, the existing `InteractiveProp` speech bubble narration should incorporate the hint text alongside the pickup confirmation. If the existing flow already shows narration on pickup, prepend or append the hint.

Keep the hint pure data (no Claude calls).

### C. Oracle silent decrement bug

In `components/StoryPlayer.tsx` ~1048-1066, audit the fallback path. Today:
```
const hint = scene.oracle_hint ?? <fallback>;
speakOracle({ text: hint, kind: "hint" });
setOracleHintsLeft((n) => n - 1);
```
If `scene.oracle_hint` is empty/undefined and the fallback is also empty/whitespace, the counter still drops. Fix: do not decrement, and instead speak a meaningful default (e.g., "I have no whisper for you here. Try walking on.") OR leave the counter alone if the fallback would be empty.

Pick the path that matches existing UX: ask the bus to speak a real line, decrement only if the spoken line is non-empty.

### D. Scene title matches rendered place

When an adventure is active and the kid picked Castle theme + Drawbridge as their starting place, they now see "The Old Oak's Riddle" with a forest background. Two acceptable fixes — pick whichever you judge better:

- **Option 1 (rename):** Change `FOREST_RIDDLE.title` in `lib/adventures/hunt-dragon-egg.ts` from "The Old Oak's Riddle" to "The Enchanted Forest" (or similar). Single line edit. Title now matches the forest art the kid sees.
- **Option 2 (prologue transition):** Add a one-line transition narration to the adventure prologue or first scene that bridges drawbridge → forest ("You cross the drawbridge. The path winds into an enchanted forest, and ancient trees lean close…"). Bigger edit but preserves the riddle motif.

Default to Option 1 unless the riddle motif is load-bearing in later scenes.

### E. Tests

1. `unset ANTHROPIC_API_KEY && npx tsc --noEmit` clean
2. `npm run lint` clean
3. `npx tsx -e 'import("./lib/adventures/index").then(() => console.log("registry OK")).catch(e => { console.error(e); process.exit(1); })'` prints `registry OK`
4. `unset ANTHROPIC_API_KEY && npm run build` clean
5. Smoke locally: open the Castle theme → pick Drawbridge → confirm the title matches the rendered scene; pick a glowing prop → confirm hint shows on hover and in speech bubble; tap Ask Oracle on a scene without a specific hint → confirm a meaningful line plays AND the counter behaves correctly (no silent decrement).

### F. Deploy

```
vercel --prod --yes
```

Append `CHANGES.md` entry. Write `MORNING_CHECKLIST_017.md` covering the four scenarios above plus a regression check that pickups still pickup, oracle hints still fire when scenes have explicit `oracle_hint`, and the entry videos still play.

## Out of scope

- Oracle position changes (B-018 covers that).
- Map button (B-018).
- Skills & build, supreme shop, ending egg price (post-demo Phase 2).
- Touching `InteractiveProp` core animation logic.

## Acceptance

- Narration no longer overlaps the pickup glow on standard screens.
- Pickup hints are visible on hover and in the speech bubble for all catalog pickups.
- Ask Oracle never silently decrements the counter.
- The first adventure scene title reads sensibly given the rendered forest background.
- Type check, lint, build all clean. Vercel deploy succeeds.
