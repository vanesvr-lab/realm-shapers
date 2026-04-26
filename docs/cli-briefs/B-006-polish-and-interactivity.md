# B-006: Polish + Interactivity Pass

> Combined brief from kid-tester feedback (Anaya and Kellen, 2026-04-26 evening). Four asks, all approved by Vanessa.

## Goal

Address the four pieces of kid feedback after they played B-005 with real PNG assets:
1. "Give me ideas" hangs for 3-4 sec; should feel instant.
2. Generation wait is dead time; want a quick mini-game.
3. Graphics still feel bland; want richer visual style.
4. Play mode is too passive; want to click on stuff in the scene.

## Decisions Locked

| Ask | Approach | Effort |
|---|---|---|
| 1. Instant ideas | Hardcode 8-10 starter ideas per slot, show instantly. Keep "Give me more ideas" button below them for the Claude-generated bonus list. | ~1 hr |
| 2. Quick game during loading | Tap-the-falling-stars: stars drop from top, tap to score, timer counts up. Auto-skips when generation completes. | ~3-4 hr |
| 3. Better graphics | Regenerate the 95-asset library with a richer Flux Schnell prompt. Cheap path first; if kids still call it bland after this, plan a real visual overhaul as B-007. | ~30 min + ~12 min wall time for re-gen |
| 4. Click-to-interact in play | Each scene's props become clickable hotspots in play mode. Click → small CSS animation + a one-shot Claude-generated narration line specific to that prop in this scene. | ~3-5 hr |

## Files To Touch

### New
- `lib/ingredient-seeds.ts` — hardcoded starter ideas per slot (setting, character, goal, twist), 8-10 each, kid-friendly and matching the tone of Claude-generated suggestions
- `components/StarTapGame.tsx` — the mini-game: animated CSS stars falling from top, tap-to-pop, score counter, timer counts up. Self-contained. Accepts an `onSkip` prop or auto-mounts inside the loading state.
- `app/api/prop-interaction/route.ts` — POST endpoint. Body: `{ world_id, scene_id, prop_id }`. Returns `{ narration: string, animation: "wiggle" | "pulse" | "glow" | "open" }`. Calls Claude with the scene context + prop, asks for a 1-sentence reaction. Caches per `(world_id, scene_id, prop_id)` so re-clicks are instant.
- `components/InteractiveProp.tsx` — wraps a prop image with a click handler that fires the interaction API + plays the chosen CSS animation + shows the returned narration in a brief speech-bubble overlay.

### Modified
- `components/IdeasButton.tsx` (or wherever the give-me-ideas button lives in `LandingForm.tsx`) — show the static seed list immediately on open, with "Show me more from the Oracle" button below that triggers the existing Claude flow. Existing flow stays intact, just no longer the only path.
- `components/LandingForm.tsx` (or the loading-state component) — embed `<StarTapGame />` while `loading` is true. Skip on completion.
- `components/StoryPlayer.tsx` — render scene's `default_props` not as static decoration but as `<InteractiveProp>` instances. On click, prop animates and a temporary speech bubble pops up.
- `lib/asset-library.ts` — update `STYLE_SUFFIX` and `SCENE_STYLE_SUFFIX` constants with richer Flux prompt language. Suggested rewrite (subject to spot-check after a few generations):
  - Background: `"in soft Studio Ghibli watercolor style, magical children's book illustration, warm golden hour lighting, atmospheric depth, no people, no characters, wide landscape composition, gentle and inviting"`
  - Characters/Props: `"in soft Studio Ghibli watercolor style, magical children's book illustration, warm friendly lighting, painted texture, kid friendly, white background, no text, no letters, no words, no weapons, no scary elements, centered, full body"`
- `scripts/generate-assets.ts` — keep CONCURRENCY=1 + 11s throttle from the rate-limit fix earlier today. After updating prompts, re-run with `--force` to regenerate all 95.
- `app/api/ideas/route.ts` — no change needed; just no longer the only path to ideas.

### Deleted
- None.

## Implementation Notes

### 1. Ingredient seeds

Hardcode in `lib/ingredient-seeds.ts`:

```ts
export const INGREDIENT_SEEDS: Record<IngredientSlot, string[]> = {
  setting: [
    "An underwater library carved from coral",
    "A floating market on the back of a giant turtle",
    // ... 8-10 total
  ],
  character: [...],
  goal: [...],
  twist: [...],
};
```

Each entry should be 4-12 words, vivid, kid-friendly, and span tones (cozy, adventurous, whimsical). Anaya and Kellen's Canva work and the existing Claude prompt give the right vibe.

In the IdeasButton modal: render the seeds first (instant), then a "🔮 Show me more from the Oracle" button at the bottom that fetches Claude's 3 suggestions and appends them. Cap Claude calls at 3 per session per slot per the existing logic.

### 2. Star Tap mini-game

Self-contained component. Stars fall from `top: 0` to `top: 100%` over 2-3 seconds with random `left` positions. Click pops the star (CSS transform: scale + fade out, +1 to score). Score and elapsed time displayed in corner. Pause/resume on visibility change. Stops automatically when parent unmounts (i.e., when generation completes and the page transitions).

Tailwind animations only; no game library. Spawn a new star every 600-900ms. Cap concurrent stars at 8-12 so it stays cute, not overwhelming.

Embed in the loading overlay below the "The Oracle is weaving 5 scenes..." text. Add a subtitle: "Pop some stars while you wait."

### 3. Asset re-generation

Update the two style suffix constants in `lib/asset-library.ts`. Then run:

```bash
export $(grep REPLICATE_API_TOKEN .env.local) && unset ANTHROPIC_API_KEY && npx tsx scripts/generate-assets.ts --force
```

Wall time: ~12 min for 95 images (95 × 11s throttle). Confirm sample in `public/assets/backgrounds/forest.png` looks materially better than current. If first 3-5 backgrounds look the same as before, kill the run, iterate the prompt, retry.

Commit the regenerated PNGs.

### 4. Click-to-interact in play mode

`StoryPlayer` currently renders `scene.default_props` as static `<img>` tags. Wrap each in `<InteractiveProp>` which:
- Renders the same image
- On click: fires `POST /api/prop-interaction` with `{world_id, scene_id, prop_id}` (cache by these three so re-clicks are instant)
- While the request is in flight, applies a CSS animation (default: `pulse`)
- On response: applies the returned animation (`wiggle`, `glow`, `open`, etc.) and shows the returned narration in a speech bubble overlay above the prop for ~4 seconds
- Bubble dismisses on tap-outside or auto

`/api/prop-interaction` Claude prompt: "You are the Oracle. The player just touched [prop_id] in scene titled '[scene.title]', which has narration '[scene.narration]'. Reply with a 1-sentence kid-friendly reaction (under 20 words). Also pick an animation from: wiggle, pulse, glow, open. Respond ONLY with JSON: { narration: string, animation: 'wiggle'|'pulse'|'glow'|'open' }"

Cache responses in-memory per `(world_id, scene_id, prop_id)` so the kid can re-click without re-paying. Cap to 30 unique interactions per server instance to bound spend.

Animations as Tailwind classes on the prop's `<img>`:
- `wiggle`: `animate-[wiggle_0.5s_ease-in-out]` (define in tailwind.config.ts)
- `pulse`: `animate-pulse` (built-in)
- `glow`: a custom `@keyframes` that adds drop-shadow glow
- `open`: scale + brief rotate (for treasure chest, books, etc.)

## Out of Scope (B-006)

- Full visual overhaul (B-007 if cheap-path graphics still aren't enough)
- Multiple mini-games during loading (just the star tap)
- Multiplayer interactions
- Sound effects on prop click (could add later if demo allows)
- Persistence of interaction state across replays

## Definition of Done

- Tap "Give me ideas" on any slot → 8-10 starter options visible in <100ms, no spinner
- Tap "Show me more from the Oracle" → adds 3 more suggestions after a normal Claude wait
- Submit ingredients → during the 10-25 sec generation, see a star-tap mini-game with score + timer
- Generation completes → mini-game auto-disappears, lands on /play in Edit mode (existing flow)
- Click Play → in any scene, click on a default prop → prop animates + a speech bubble appears with one-shot narration
- All assets visibly richer than the current Flux output (more atmosphere, more depth, more painterly)
- `npx tsc --noEmit` clean, `npm run build` clean, deployed to https://realm-shapers.vercel.app
- CHANGES.md updated, MORNING_CHECKLIST_006.md written, pushed

## Effort Estimate

- Ingredient seeds: ~1 hr
- Star Tap mini-game: ~3 hr
- Asset re-gen (script run + spot-check): ~30 min + 12 min wall
- Prop interaction (component + API + cache + animations): ~3-4 hr
- Glue, deploy, smoke: ~1-2 hr

**Total: 8-10 hours.** Fits in one overnight CLI run.

## Risks

- **Better Flux prompt might not move the needle.** The kids may still call the assets bland; B-007 visual overhaul becomes the next conversation.
- **Star Tap might feel out of place** for kids expecting a more substantial game. If so, swap to a memory-match game in B-007.
- **Prop interaction Claude calls add latency** (~2-3 sec per click first time). Mitigated by aggressive caching; first click in a scene is slow, repeated clicks are instant.
- **Per-prop interaction costs Claude tokens.** ~$0.001 per click on Opus 4.7. With 5 scenes × 3 props × 1 click = 15 clicks per playthrough = $0.015. Negligible.
