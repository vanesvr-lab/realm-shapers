# B-012: Castle Polish, Required-Pickup Gates, and Drawbridge Showcase

> Vanessa's call after testing B-011: rather than 6 mediocre themes, ship ONE great theme. Castle and Dragons is the demo theme. Drawbridge is the showcase scene (full polish: animations, ambient sound, themed props, 3 options). All 15 Castle sub-scenes get real castle iconography (not abstract blobs). Required-pickup gates between sub-scenes give exploration real meaning. Level 1 bumps to 3 options per scene. Other 5 themes keep current placeholders untouched.

## Goal

Make the Castle and Dragons realm feel demo-ready for the May 1 hackathon. A kid picking Castle should feel like they're really inside a castle: themed art across all 15 sub-scenes, key+torch+rope gating real exploration, polished showcase Drawbridge scene that screams "this is a real game." Other themes intentionally left at B-011 placeholder quality — the contrast is fine because Castle is what judges + Vanessa demo.

## Decisions Locked

- **Showcase scene: Drawbridge.** Full polish: animations (hero bob, banner sway, water ripple, scene fade-in), ambient sound (water + wind + distant castle), themed props (rusty key pickup, banner details, optional castle guard NPC line), 3 outbound options.
- **Level 1 = 3 outbound choices per non-ending non-choice scene.** Up from 2. Level 2 (Go Deeper) stays at 5. Parser updated.
- **Required-pickup gates inside Castle theme** (5 gates, all enforced via existing B-007 `choices.requires` mechanism — no new gating system needed):
  - Rusty Key → Library
  - Torch → Dungeon
  - Climbing Rope → Tower Stairs
  - Dragon's Lullaby → Dragon's Lair
  - Ancient Tome → Ancient Crypt
- **Other 5 themes (Forest, Candy Land, City, Space, Underwater): no changes.** Keep B-011 placeholders. Don't disable in the picker. Kids can still pick them; they'll just hit the meh experience. We accept that.
- **All 15 Castle sub-scenes get themed art**, not just Drawbridge. Real castle iconography (stone, banners, towers, etc.) replaces the current abstract grey blobs. Drawbridge gets MORE polish on top of this baseline.
- **No new DB migration.** `SubScene.required_pickups` is a TS-only field on the catalog. Pickup placement on scenes is driven by Claude using the catalog's hints, then enforced by the existing parser + B-010 phantom-requires check.
- **Pickups themselves get a small catalog** (`lib/pickups-catalog.ts`) so Claude knows what icons + descriptions to use for the 5 gating items + lets us reuse them across realms.

## Architectural Decisions

### 1. Castle SVG art regen — all 15 sub-scenes

Replace each Castle background SVG (`public/backgrounds/castle/*.svg`) with concrete castle iconography. CLI regenerates each one inline via Claude during implementation. Same dimensions (1600x900 viewBox), same file paths, just much better content.

Per sub-scene visual brief (CLI uses these as Claude prompts):

- **drawbridge:** stone gateway arch on either side, wooden plank bridge across the middle, iron chains hanging from above, dark moat water below with wave lines, distant castle wall behind, sky gradient overhead. **(Showcase — extra detail.)**
- **outer_gate:** large portcullis (vertical iron bars), stone wall on either side, royal banner draped, paving stones below.
- **courtyard:** cobblestone ground, central stone fountain, side doors, distant towers visible, flowering tree in corner.
- **great_hall:** tall stone columns receding into perspective, hanging banners, long carpet leading toward distant throne, vaulted ceiling lines.
- **throne_room:** elaborate throne center, stained glass window behind, royal banners flanking, crown motif.
- **dungeon:** dark stone walls, iron bars in foreground, hanging chains, dim torch flicker shapes, puddle on floor.
- **kitchen:** stone hearth with fire shapes, hanging pots and herbs, wooden prep table, sacks of flour, mortar and pestle.
- **library:** floor-to-ceiling bookshelves, reading desk with open tome, candle in candleholder, scroll on floor.
- **royal_chambers:** four-poster bed with curtains, ornate dresser, fireplace, tapestry on wall.
- **tower_stairs:** spiral stone staircase ascending, narrow window slits showing sky, torch sconce.
- **tower_top:** crenellated parapet, sky behind with clouds, distant landscape view, watchtower peak.
- **royal_garden:** trimmed hedges, rose bushes, central fountain, stone path, butterflies.
- **secret_passage:** hidden door ajar in a wall, stone tunnel descending into shadow, cobwebs, single torch.
- **dragons_lair:** large cavern arch, piles of gold coins, dragon silhouette curled in distance, scattered scales.
- **ancient_crypt:** stone sarcophagi, cobwebs, candle stubs, skeletal remains, narrow shaft of light from above.

Each SVG keeps a small "placeholder: castle_X" label in the bottom-right corner so it's clear these are still placeholders, just better ones. Real art swaps in later.

### 2. Drawbridge showcase polish

This is the ONE scene that gets full demo treatment. Other 14 Castle sub-scenes get the better art from scope 1 but no additional polish.

**Animations** (Framer Motion + CSS, no Lottie needed unless trivially better):
- Hero idle bob: subtle 1-2px vertical oscillation at ~2s period. Implemented in HeroAvatar component, only active on first scene render.
- Water ripple in the moat: SVG `<animate>` on the wave path's `d` attribute, slow 4-6s loop. Embedded in the drawbridge.svg directly.
- Banner sway: SVG `<animateTransform>` rotation on banner element, ~3s loop, small angle.
- Scene-enter fade-in: existing scene transition (verify it's working; tighten timing to feel intentional).
- Pickup glow on Rusty Key: pulsing radial gradient + slow rotation, signals "interactable here."
- Interactable hover pulse: already exists, just verify it's smooth on Drawbridge.

**Ambient sound** (new — uses ElevenLabs Sound Effects API per stack):
- Generate a single ambient loop track for Drawbridge: water lapping + distant wind + faint banner flap. ~10-15s seamless loop.
- Cache to Supabase `oracle_voice` bucket (same bucket, namespaced as `ambient/drawbridge.mp3`).
- New `lib/ambient-bus.ts` (mirror of oracle-bus.ts): plays/loops ambient track when scene is mounted, fades out on scene change.
- Volume: 0.3 (low background level). Mute toggle stored in localStorage `realm-shapers:ambient-muted` (separate from oracle mute).
- Respects browser autoplay policy: only plays after first user gesture (per CLAUDE.md "no autoplay" rule).

**Props on Drawbridge:**
- **Rusty Key pickup** (id: `rusty_key`). Visible on the wooden plank, glowing slightly. Tappable interactable. Once collected, no longer rendered. Goes to inventory.
- Optional **Castle Guard NPC**: small character silhouette near the gate. Tap for a single Oracle line ("None pass without the key, traveler. Look sharp."). Skip if it bloats — primary value is the key.

**3 outbound options** (per the new level 1 rule):
- Path A: cross to **Outer Gate** (forward, the obvious choice).
- Path B: slip around to **Royal Garden** (alternate forward, quieter bypass).
- Path C: pick up the **Rusty Key** (gating choice — kid needs this to enter Library later).

Tooltips on each (rich hints, see scope 6).

### 3. Pickups catalog + required-pickup gates

`lib/pickups-catalog.ts` (new):

```
Pickup {
  id: string                    // "rusty_key", "torch", "climbing_rope", "dragons_lullaby", "ancient_tome"
  label: string                 // "Rusty Key"
  icon_path: string             // "/pickups/rusty_key.svg"
  description: string           // "stubborn metal that opens stubborn doors"
}
```

5 entries for the Castle gates. Each pickup gets a small SVG icon (~64x64) at `public/pickups/{id}.svg`. CLI generates inline via Claude — simple shapes, recognizable silhouettes (key shape, lit torch, coiled rope, music notes, scroll).

`lib/themes-catalog.ts` updates — Castle's `SubScene` entries gain optional `required_pickups: string[]` field:

```
{ id: "castle_library", ..., required_pickups: ["rusty_key"] }
{ id: "castle_dungeon", ..., required_pickups: ["torch"] }
{ id: "castle_tower_stairs", ..., required_pickups: ["climbing_rope"] }
{ id: "castle_dragons_lair", ..., required_pickups: ["dragons_lullaby"] }
{ id: "castle_ancient_crypt", ..., required_pickups: ["ancient_tome"] }
```

Catalog validator (`lib/catalog-validator.ts`): extend to check that every `required_pickups` id references a real pickup in `pickups-catalog.ts`. Throws on init if broken.

`lib/claude.ts` story prompt (Castle-specific path):
- When the prompt builds the theme library block, include each sub-scene's `required_pickups` in the listing:
  > "- `castle_library` (Library): floor-to-ceiling bookshelves... Connects to: throne_room, royal_chambers. Entry: no. Ending: no. **Requires: rusty_key.**"
- Add hard rule in the prompt: "If a sub-scene has `Requires: X`, the player MUST be able to pick up X in some EARLIER scene before reaching that sub-scene. Place X as a pickup in scene index 1-4 (the geographic adjacency half). The interactable that leads INTO the gated sub-scene must have `requires: ["X"]` in its choice schema so the existing parser locks it until X is collected."
- Existing B-010 phantom-requires parser check covers the second half of this — it already validates that anything in `requires` exists as a pickup in the tree. Now we just need Claude to generate the right `requires` arrays based on the catalog's `required_pickups` hints.

In play (`components/StoryPlayer.tsx` + `Interactable.tsx`):
- Existing B-007 logic: an interactable with `requires: ["rusty_key"]` shows a lock icon and is disabled until the kid has the key in inventory. On tap (when locked), show a hint: "you need the rusty key to enter the library."
- Verify this still works after B-011's changes; if it broke, fix.

### 4. Level 1 = 3 options per scene

`lib/claude.ts`:
- Level 1 generation prompt: change "exactly 2 outbound choices per non-ending non-choice scene" to "exactly 3."
- Parser validator: same change (was `choices.length === 2` for level 1, now `=== 3`).
- Level 2 (Go Deeper) stays at 5.

`components/StoryPlayer.tsx` / wherever interactables are laid out:
- Verify the layout handles 3 interactables on mobile (375px wide). Should already, but double-check spacing — they shouldn't crowd or overlap.

`components/Interactable.tsx`:
- No code change expected. Just verify hit targets stay big enough (≥44px tap target per accessibility).

### 5. Tooltip prompt tuning

`lib/claude.ts` hint instruction:
- Old (B-010 scope 7): "give a one-sentence flavor hint per choice. Hint should suggest TONE, not consequence."
- New: "Give a one-sentence hint per choice that gives the player a real reason to pick THIS path over another. Hint at the EXPERIENCE: mood, what kind of trouble or reward, soft consequence. Don't spoil the ending, but make the kid feel like a thinking person, not a guesser. Examples: 'Cross openly. Heroes who pass through the gate are remembered, but the guards are watching.' / 'Slip through the side path to the garden. Quieter route, but you might miss the captain's news.' / 'Take the rusty key. Some doors only open with stubborn metal.'"
- Add the 3 examples literally in the prompt so Claude calibrates tone.

### 6. Other 5 themes — no regression

Confirm that picking Forest, Candy Land, City, Space, or Underwater still:
- Shows the theme's existing 15 sub-scene grid in step 2.
- Generates a realm with 8-10 scenes (level 1 now with 3 outbound choices each — they get the bump too).
- Renders the existing B-011 placeholder backgrounds.
- Plays through to a Realm Card.

Do NOT add Castle's gates, Drawbridge polish, ambient sound, or any other Castle-specific features to other themes. They stay as-is.

## Smoke Tests

After CLI implements, Vanessa walks:

1. **Castle theme art across all 15 sub-scenes.** Pick Castle, generate ~3 realms, walk every scene of each. Confirm every Castle sub-scene shows recognizable castle iconography (stone, banners, towers, etc), not abstract grey blobs.
2. **Drawbridge showcase.** When picking "Drawbridge" as setting (or generating a realm where scene 1 = drawbridge): hero bobs subtly, water ripples in moat, banner sways, ambient sound starts after first tap (autoplay rule), Rusty Key pickup visible and glowing, 3 outbound interactables visible.
3. **Drawbridge → Library gate.** From Drawbridge, pick up the Rusty Key. Navigate to Library (may take several scenes). Gate opens; kid enters. Now generate a fresh realm, intentionally skip the key, try to enter Library — interactable shows a lock icon, tap displays "you need the rusty key" hint.
4. **All 5 gates work.** Same test for Torch→Dungeon, Rope→Tower Stairs, Lullaby→Dragon's Lair, Tome→Ancient Crypt. Each pickup is found in scenes 1-4; each gate is at scene 5+.
5. **Level 1 = 3 options.** Generate ~3 level-1 Castle realms. Confirm every non-ending non-choice scene has exactly 3 outbound choices. Mobile layout (375px wide) doesn't crowd or overlap.
6. **Hint quality.** Tap a choice to see the tooltip. Hints should foreshadow flavor + soft consequence, not just say "go right." Sample 5 random scenes across 3 realms.
7. **Other themes unchanged.** Pick Forest, Candy Land, City, Space, Underwater in turn. Each still generates and plays to completion with its existing B-011 placeholders. Level 1 = 3 options applies to them too. No Castle-specific features leaked.
8. **Ambient mute.** On Drawbridge, kid sees a small ambient mute toggle (separate from Oracle mute). Toggle works, persists across scenes.
9. **Catalog validator.** Manually break a `required_pickups` reference in `lib/themes-catalog.ts` (e.g., point to a non-existent pickup id). Run `npm run dev` — confirm validator throws on init with a clear message. Revert.
10. **Old worlds still play.** Open a pre-B-012 world (theme = null). Confirm it renders via B-010 matcher fallback silently — no crashes, no blank scenes.

## Don't Touch

- Other 5 themes (Forest, Candy Land, City, Space, Underwater) — keep B-011 placeholders unchanged.
- B-009 flag/ending system. Stays.
- B-010 progressive rendering flag. Stays.
- B-010 hero voices (Fena/Ryan). Stays.
- B-011 catalog architecture. Just extend with `required_pickups` and add a pickups catalog.
- Realm Card share / download / Go Deeper / Exit. Stays.
- Achievements layer. No new achievements in this batch.
- 3D preview page. Out of scope.

## Decisions Open

None at brief-write time. All decisions resolved during the 2026-04-27 design session. If new ambiguity surfaces during implementation (e.g., a specific animation timing that feels wrong, an ambient sound that's too loud), use best judgment and surface in CHANGES.md "Open" section.

---

## CLI kickoff prompt

(Paste this into a fresh Claude Code CLI session in the realm-shapers project.)

```
Read CLAUDE.md and the last 3 entries of CHANGES.md (B-011 just shipped — read carefully so you know the catalog architecture you're extending).

Then read docs/cli-briefs/B-012-castle-polish-and-gates.md fully.
Skim docs/playtest-log.md for recent context.

All Decisions are LOCKED. Do not ask Vanessa to confirm any of the choices in the brief. Just execute.

Execute B-012 in this order. Each numbered scope ends in a commit.

1. Pickups catalog (lib/pickups-catalog.ts) with 5 entries: rusty_key, torch, climbing_rope, dragons_lullaby, ancient_tome. Each pickup gets a 64x64 SVG icon at public/pickups/{id}.svg (CLI generates inline — simple recognizable silhouettes).
2. Castle catalog extension: add required_pickups: string[] field to the 5 gated sub-scenes (library, dungeon, tower_stairs, dragons_lair, ancient_crypt). Update catalog validator to check required_pickups references real pickup ids.
3. Castle SVG art regen — all 15 sub-scenes. Replace each public/backgrounds/castle/*.svg with concrete castle iconography per the visual brief in scope 1 of the brief. Drawbridge gets extra detail (will be polished further in scope 4). Each SVG keeps the small "placeholder: castle_X" label.
4. Drawbridge showcase polish: animations (hero bob, banner sway, water ripple, scene fade-in, pickup glow), themed props (Rusty Key pickup, optional Castle Guard one-line NPC), 3 outbound options (Outer Gate, Royal Garden, pick up Rusty Key). Animations live in the drawbridge.svg or the StoryPlayer/HeroAvatar components as appropriate.
5. Ambient sound for Drawbridge: lib/ambient-bus.ts (mirror of oracle-bus.ts). ElevenLabs SFX-generated water+wind+banner ambient loop, cached to oracle_voice bucket as ambient/drawbridge.mp3. Mute toggle in localStorage realm-shapers:ambient-muted, separate from Oracle mute. Respects autoplay rule (no playback until first user gesture).
6. Level 1 bump to 3 choices per scene (lib/claude.ts prompt + parser). Level 2 stays at 5.
7. Tooltip prompt tuning (lib/claude.ts hint instruction): rewrite per scope 5 of the brief, include the 3 example hints literally in the prompt.
8. Verify other themes don't regress. Generate one realm in each of Forest, Candy Land, City, Space, Underwater. Confirm they still play through with their existing B-011 placeholders + new 3-option level 1.

Run `npx tsc --noEmit` and `npm run build` clean before EACH commit.
Keep commits small and reviewable. Do NOT bundle multiple scopes in one commit.

When all scopes are done:
- Run `npm run lint`, `npx tsc --noEmit`, `npm run build` — must all be clean
- Append a B-012 entry to CHANGES.md with all touched files and Open threads
- Generate `MORNING_CHECKLIST_012.md` mirroring B-011's format, listing the 10 smoke tests from the brief
- Push to main
- If any new Decisions Open surface during implementation, surface them in CHANGES.md Open section; do not block on them

Do not autoplay any audio. Do not use em dashes in user-facing copy. Follow CLAUDE.md.
```
