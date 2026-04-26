# B-005: Asset Library + Scene Editor + Branching Story + 3D Teaser

> Combined brief for the May 1 demo rebuild. Replaces what shipped in B-002b/003/004 with a curated-asset Toca-Boca-style composer, branching choose-your-own-adventure story flow, and a hardcoded 3D preview link as a teaser. Driven by direct kid-tester feedback (Anaya and Kellen called the current build "antique" after playing Mario, Roblox, Minecraft).

## Goal

Ship the demo Anaya and Kellen would actually want to play. Curated illustrated asset library, drag-drop scene editor, choose-your-own-adventure story progression, plus a hardcoded 3D scene as a "coming soon" teaser.

## Decisions Locked In (from brainstorm)

| Question | Pick | Implication |
|---|---|---|
| Approach | Curated pre-generated asset library (Toca-Boca pattern) | No real-time image gen, no per-play cost, fast and reliable |
| Q1 composition depth | C: full scene editor (drag, resize, layer, text bubbles) | ~10 hours of UI work |
| Q2 narration loop | C: choice-driven branching story | Claude generates story tree upfront, instant transitions |
| Q3 visual style | C: kids pick from sample images. Start with image2 (bright cartoon storybook) for v1 | Library generated in chosen style; can regenerate later |
| Q4 3D character | A: Mixamo (free, rigged, walk/idle animations, easy Three.js integration) | Free, shippable, professional-looking |
| Q5 library size | C: 15 backgrounds + 30 characters + 50 props = 95 assets | ~2-3 hours to generate + curate |
| Q6 existing code | Keep auth/profile/privacy/share, replace /play and home, delete /test | Most of B-002a stays; B-002b/003/004 mostly gets replaced |

## What Gets Replaced from B-002b/003/004

- `app/page.tsx` (current landing) → new landing: "shape your realm" + the asset/style picker entry point
- `app/play/page.tsx` (current map walk-through) → new branching scene editor + story player
- `components/IngredientForm.tsx` → integrated into the new editor flow
- `components/WorldMap.tsx` → deleted (replaced by composed scenes)
- `components/AudioPlayer.tsx` → kept, repurposed for per-scene ambient
- `lib/claude.ts` `WorldMap` schema → replaced by story tree schema
- `app/api/generate/route.ts` → returns a story tree + scene compositions instead of a map
- `app/test/page.tsx` → deleted

## What Stays

- Auth (anonymous + parent-fronted upgrade), `/consent`, `/setup-username`, `/login`, `/profile`, `/privacy`
- `/w/[slug]` share-by-link page (updated to render the new story tree, not the old map)
- Supabase migrations 0002 + 0003 (worlds table is reused with the `map` column repurposed for story tree JSON)
- ElevenLabs Sound Effects integration (now used per-scene, ambient changes by scene background)
- All Vercel env vars

## New Pieces

### Asset library (one-time generation)

Generate 95 assets in image2 style (bright cartoon storybook):

- **Backgrounds (15):** forest, beach, underwater, desert, castle_courtyard, space, mountain_peak, cave, volcano, swamp, library, town_square, snowy_tundra, garden, sky_kingdom
- **Characters (30):** hero_girl, hero_boy, dragon, robot, wizard, knight, princess, alien, fairy, mermaid, octopus, fox, wolf, bear, owl, cat, dog, ghost, pirate, ninja, astronaut, scientist, chef, musician, gardener, librarian, oracle, witch, troll, butterfly_person
- **Props (50):** tree, rock, treasure_chest, sword, magic_wand, key, crown, gem, scroll, book, lantern, mushroom, flower, fish, bird, sun, moon, star, cloud, campfire, water_drop, ice_crystal, portal, signpost, tent, bridge, ladder, door, window_frame, fence, well, statue, cauldron, potion, map, compass, telescope, hourglass, mirror, throne, drum, flute, painting, basket, bag, ribbon, candle, lock, fountain, ship_sail

**Generation script:** `scripts/generate-assets.mjs` — calls Replicate Flux Schnell with a base style prompt suffix (e.g., "in bright cartoon storybook style, kid-friendly, soft colors, no text") for each asset. Outputs to `public/assets/{category}/{id}.png`. Manifest at `lib/asset-library.ts` with `{ id, category, tags[], filename, alt }`. Run once locally; commit the images and manifest.

**Curation step:** human review of generated images before commit. Regenerate any that are off-style or include unwanted elements (text overlays, weapons that look too violent, etc.).

### New schema in lib/claude.ts

```ts
export type StoryChoice = {
  id: string;
  label: string;          // 2-6 word kid-friendly button text
  next_scene_id: string;  // points to another scene id
};

export type StoryScene = {
  id: string;
  title: string;
  narration: string;             // 1-3 sentences
  background_id: string;         // asset library id
  ambient_audio_prompt: string;  // for ElevenLabs
  default_props: string[];       // 0-3 prop asset ids that appear in this scene by default
  choices: StoryChoice[];        // 0 (ending) or 2-3 (branch)
};

export type StoryTree = {
  title: string;
  starting_scene_id: string;
  scenes: StoryScene[];          // 5 scenes, 1 starting, 2-3 endings
};

export type GeneratedWorld = {
  title: string;
  story: StoryTree;
};
```

Replace the prompt to ask Claude for a 5-scene branching story tree using only valid asset library ids. Strict JSON parser. Retry once on parse failure, fall back to a default tree if retry fails.

### New API routes

- `POST /api/generate` (modified): returns a `StoryTree` + tagged with `default_character_id` (Claude picks one from the character library). Audio generation deferred per-scene to `/api/audio` (already exists, called when each scene loads).
- `POST /api/ideas` (existing): unchanged, still suggests ingredient text.
- `POST /api/scene/edit` (new): called when kid drags/adds/resizes a prop in the editor. Optionally re-narrates the scene with the new composition (calls Claude with current scene + new composition, returns updated narration). Cap to 5 calls per session.

### New pages and components

- `app/play/page.tsx` (rewritten): the editor + story player. Two modes:
  - **Edit mode**: shows current scene as composed image (background + character + props), palette on the side with all 95 assets categorized. Drag, resize, layer, delete. Text bubble tool. "Play" button starts the story.
  - **Play mode**: full-bleed scene, narration overlay, choice buttons. Tap a choice → fade transition to next scene. Editor available again at the end via "Edit my story".
- `components/SceneEditor.tsx`: the canvas + palette + tools.
- `components/SceneCanvas.tsx`: SVG or Canvas-based composition layer (recommend HTML5 Canvas with absolutely-positioned divs for each prop; simpler than SVG for drag-resize).
- `components/AssetPalette.tsx`: scrollable, categorized, searchable picker.
- `components/StoryPlayer.tsx`: the play-mode renderer. Background image + character + narration + choice buttons.
- `components/PropOverlay.tsx`: a single placed prop with drag-resize-rotate-delete handles in edit mode.
- `components/TextBubble.tsx`: kid-typeable text bubble that can be placed on the scene.
- `components/StylePicker.tsx`: shown on first-ever visit per session, displays 5-10 sample backgrounds in different styles, kid taps to pick. Stored in localStorage. (For v1 we only have one style, so this is a stub that defaults to image2; UI ships for forward-compat.)

### 3D teaser

- `app/preview-3d/page.tsx`: full-bleed Three.js scene with react-three-fiber. Hardcoded "Forest Glade" with terrain, trees, a few interactive hotspots, and a Mixamo character with walk + idle animations. Arrow keys move character. Camera follows. Click hotspots → modal with placeholder narration. Banner at top: "Coming soon: full 3D worlds in v2."
- Mixamo character: download a free rigged character (e.g., "Y Bot" or a more kid-friendly choice from Mixamo library) with idle, walk, and run animations baked in. Export as GLB.
- Background music: one royalty-free MP3 looped.
- Link from main demo: small "🎮 Try our 3D preview" button on `/play` and `/profile`.
- Dependencies (NEW): `three`, `@react-three/fiber`, `@react-three/drei`. Ask before installing per CLAUDE.md (already implicit approval since it's in this brief).

### Files to touch

**New:**
```
scripts/generate-assets.mjs
lib/asset-library.ts
public/assets/backgrounds/*.png  (15 files)
public/assets/characters/*.png   (30 files)
public/assets/props/*.png        (50 files)
public/3d/forest-glade/character.glb
public/3d/forest-glade/ambient.mp3
app/play/page.tsx                (REWRITE)
app/preview-3d/page.tsx          (NEW)
components/SceneEditor.tsx
components/SceneCanvas.tsx
components/AssetPalette.tsx
components/StoryPlayer.tsx
components/PropOverlay.tsx
components/TextBubble.tsx
components/StylePicker.tsx
components/Forest3DScene.tsx     (the Three.js scene)
app/api/scene/edit/route.ts
```

**Modified:**
```
lib/claude.ts                    (new StoryTree schema, new prompt)
app/api/generate/route.ts        (returns StoryTree, persists to worlds.map jsonb column repurposed)
app/page.tsx                     (new landing copy + form)
app/w/[slug]/page.tsx            (renders StoryTree in read-only play mode for shared worlds)
package.json, package-lock.json  (three, @react-three/fiber, @react-three/drei, replicate for asset gen)
README.md                        (note Replicate API key needed for asset regeneration only, not runtime)
docs/design-doc.md               (add B-005 link)
docs/roadmap.md                  (mark Phase 1 visual-novel-with-3D-teaser scope)
CHANGES.md                       (entry on completion)
```

**Deleted:**
```
app/test/page.tsx
components/WorldMap.tsx
components/IngredientForm.tsx    (subsumed into SceneEditor)
```

## Demo Flow (judge-facing)

1. Kid lands on `/`. Hero text + 4-ingredient form. Optional "Show me ideas" buttons (existing from B-003).
2. Submits. Loading state ~5-10 sec while Claude generates the StoryTree + initial scene composition.
3. Lands on `/play`. Edit mode by default. Sees their composed scene (Claude picked initial character + background + 2-3 props). Asset palette on the side.
4. Kid drags more props on, resizes their character, adds text bubbles, swaps the background. As they edit, optionally taps "Re-narrate" to have Claude rewrite scene 1's narration to fit the new composition.
5. Clicks Play. Scene 1 plays full-bleed: composed image as background, narration overlays in, ambient audio fades in (cached per scene), 2-3 choice buttons appear.
6. Taps a choice. Fade to scene 2. Choice 2 sees new background (Claude picked from library), their same character, new ambient audio, new narration.
7. Continues 3-5 scenes deep. Hits an ending. "The End" + buttons: Edit my story / Make a new world / Save your worlds (existing modal).
8. Optional teaser: small "🎮 Try our 3D preview" button. Clicks → `/preview-3d`. Their kid loads, can walk a Mixamo character around a hardcoded Forest Glade with arrow keys, click 3 hotspots for placeholder narration. Banner: "Coming soon."

## Out of Scope (this batch)

- Per-scene editor (only scene 1 is editable; scenes 2+ use Claude-picked compositions for simplicity)
- Saving an edited story tree (only the auto-generated version persists; edits are visual-only and don't change the saved StoryTree)
- 3D in the main flow (only as a teaser link)
- Multiple realm themes in 3D (just one hardcoded Forest Glade)
- Asset library regeneration UI (script run by hand, results committed)
- Full Q3 C style picker (stub only, defaults to image2)
- Replicate API call at runtime (asset gen is offline only)
- Re-narration cap UI (just count server-side and return error)
- Mobile touch optimization (drag is mouse-first; tap-to-place is the touch fallback)

## Risks

- **Asset generation quality**: Flux Schnell is fast but inconsistent. Some assets will need regen. Budget 2-3 passes.
- **Three.js bundle size**: react-three-fiber + drei + three is ~1MB+ gzipped. Mitigated by code-splitting `/preview-3d` so it doesn't bloat the main demo. Use Next dynamic imports.
- **Mixamo character licensing**: free for personal use, but check the specific character's redistribution terms before shipping. If unclear, fall back to a different Mixamo asset or use Quaternius free CC0 models.
- **Scene editor complexity**: drag-resize-layer-text is a lot of UI surface. Use a library like `react-rnd` for drag-resize-rotate handles to avoid hand-rolling.
- **Story tree generation**: Claude needs to produce valid JSON referencing only known asset ids. Strict validation, retry once, fallback to a curated default tree.

## Effort Estimate

- Asset generation script + manual curation pass: 3-4 hours (mostly waiting on Flux + visual review)
- lib/claude.ts schema rewrite + new prompt: 2-3 hours
- New `/api/generate` + `/api/scene/edit`: 1-2 hours
- SceneEditor + SceneCanvas + AssetPalette + PropOverlay + TextBubble: 8-10 hours (the heavy UI)
- StoryPlayer + scene transitions: 2-3 hours
- New `app/page.tsx` landing + StylePicker stub: 1-2 hours
- 3D preview (Mixamo + Three.js scene + controls + hotspots): 6-8 hours
- Update `/w/[slug]` for new format: 1 hour
- Glue, deploy, smoke: 2-3 hours

**Total: 26-36 hours of CLI work.** Across 5 nights of CLI runs (Sat-Wed) at 4-7 hours per night, this fits with margin for the Thursday polish + Friday morning verification.

## Dependencies

New npm packages (need install, ask before adding):
- `three` (3D rendering)
- `@react-three/fiber` (React renderer for Three.js)
- `@react-three/drei` (Three.js helpers including GLTF loader, OrbitControls)
- `react-rnd` (drag-resize-rotate handles for the editor)
- `replicate` (asset generation script only, not runtime; could be dev dep)

External one-time setup (Vanessa, before CLI starts):
- Replicate account (https://replicate.com), API key, add to `.env.local` as `REPLICATE_API_TOKEN` (used only by `scripts/generate-assets.mjs`, never deployed)
- Download Mixamo character GLB (https://mixamo.com, free Adobe account required) with idle + walk animations baked in. Save to `public/3d/forest-glade/character.glb`
- Royalty-free forest ambient music MP3 (pixabay.com or freesound.org), save to `public/3d/forest-glade/ambient.mp3`

## Definition of Done

- Visit `/` in incognito, fill 4 ingredients, generate
- Land on `/play` in Edit mode, drag at least one prop, swap a background
- Click Play, see scene 1 with audio + narration + choices
- Tap through 3-5 scenes, see different backgrounds and accumulated story
- Hit ending, click "Edit my story" → return to editor
- Click "🎮 Try our 3D preview" → walk Mixamo character with arrow keys, click hotspots
- Save your worlds still works (Flow B from B-002a unchanged)
- `/w/[slug]` shared link plays the StoryTree in read-only mode for non-authed viewers
- All builds + type checks clean, deployed, smoke tested
- CHANGES.md updated, pushed
