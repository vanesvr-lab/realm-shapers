# B-018: Oracle pin, location-aware hints, explored-path map

## Goal

Three medium UI features that change how the kid navigates and asks for help.

1. Pin the Oracle as a fixed bottom-right icon (same asset as the landing page) with a small badge showing remaining hints. Replaces the inline Ask Oracle button.
2. When a choice is gated on a missing pickup (`requires`), Oracle's hint should point at where to find that pickup, theme-cue style ("look where the water runs slow"), authored per-gate.
3. Add a Map button on the left that opens a node-graph overlay of the adventure: visited scenes filled, current highlighted, edges drawn between connected scenes.

## Project context

- Read `CLAUDE.md` first.
- Existing oracle ask button: `components/StoryPlayer.tsx` ~1048-1066. Uses `oracle_hint_budget`, `oracleHintsLeft`, falls back to scene-level `oracle_hint`. (B-017 fixes the silent-decrement bug; this brief assumes that fix has landed first.)
- Oracle landing-page asset: same icon as the landing form's idea-suggester / Oracle UI. Find it in `components/LandingForm.tsx` or `components/IdeaButton.tsx`. Reuse the same path.
- Choice gates with `requires` live on `StoryChoice` in `lib/claude.ts`. Adventure scenes set them in `lib/adventures/hunt-dragon-egg.ts` (search for `requires:`).
- Visited scenes already tracked: `visitedScenes` Set in `StoryPlayer.tsx` (used for secret-eligibility logic).
- Adventure scene graph: each `StoryScene` has `choices: StoryChoice[]`, each choice has `next_scene_id`. Walking the graph from `starting_scene_id` produces nodes and edges.

## Scope

### A. Oracle pin (bottom-right, hint badge)

- Build a small `OraclePin` component (or inline if simpler) rendered fixed at bottom-right of the play view.
- Use the same Oracle asset as the landing page (find and reuse the path).
- Show a small circular badge on the icon with `oracleHintsLeft`. Hide the badge when `oracle_hint_budget` is 0 or `oracleHintsLeft` is 0.
- Tapping the icon triggers the existing Ask Oracle behavior (same `speakOracle` call, same gating).
- Remove the inline Ask Oracle button — the pin replaces it. If kept for accessibility, it must not duplicate state.
- Don't autoplay audio; the existing flow already needs a user gesture.

### B. Per-gate location hints

Add an optional `oracle_hint?: string` field to `StoryChoice` in `lib/claude.ts` (next to `requires`, `coin_cost`, etc.). Author hints on the gated choices in `lib/adventures/hunt-dragon-egg.ts`. Examples:
- A choice with `requires: ["rope"]` blocking the cliff route: hint like "If you need rope, the climbers' hut by the riverbank often has spare coils."
- A choice with `requires: ["sword"]` for the wolf encounter: hint like "Iron is found near the old soldiers' camp."
- A choice with `requires: ["raft"]` (if any) for river crossing: hint like "Raftwood floats down past the fallen pine."

Style guide for hints: theme cue, not a literal scene name. Short. Hint at terrain or who's there, not the scene's id.

When the kid taps Ask Oracle:
- If the current scene has a choice the kid is gated on (any choice with `requires` whose pickups they don't have) AND that choice has an `oracle_hint`, prefer that gate's hint.
- If multiple gated choices have hints, pick the cheapest-to-resolve (shortest pickup list) or the first one in scene order.
- Fall back to the scene-level `oracle_hint`, then to a generic line.
- The B-017 silent-decrement fix still applies: only decrement when speaking a real line.

### C. Map button (node-graph overlay)

Add a `Map` button on the left side of the play view (next to other controls; left-bottom or left-middle, not blocking pickups).

Build a `MapOverlay` component opened on tap:
- Full-screen modal with a translucent dark backdrop.
- Render each scene in the active story as a node. Visited scenes: filled (e.g., amber). Current scene: pulsing/highlighted. Unvisited but connected (one hop from a visited scene): outlined. Other scenes: hidden until reachable (no spoilers).
- Edges between scenes derived from `choice.next_scene_id` for each choice in each scene. Bidirectional edges where both scenes link to each other.
- Layout: simple. Two acceptable approaches — pick whichever you judge better:
  - **Hand-authored coords:** add an optional `map_position?: [number, number]` to the scene type; author coords on hunt-dragon-egg scenes; for Claude-generated theme worlds, fall back to auto-layout.
  - **Auto-layout:** simple BFS from `starting_scene_id`, depth = column, place nodes vertically within each column. Works for any story regardless of authoring.
- Tap a visited scene to dismiss the overlay (no jumping). Current scene tap also dismisses.
- Close button at top-right.

Don't render real geographic terrain or thumbnails. Abstract dots and lines is fine. Could add a small label per node (visited only) showing the scene title.

### D. Tests

1. `unset ANTHROPIC_API_KEY && npx tsc --noEmit` clean
2. `npm run lint` clean
3. `npx tsx -e 'import("./lib/adventures/index").then(() => console.log("registry OK")).catch(e => { console.error(e); process.exit(1); })'` prints `registry OK`
4. `unset ANTHROPIC_API_KEY && npm run build` clean
5. Smoke locally:
   - Oracle pin renders at bottom-right with the right asset and badge count.
   - Tapping the pin triggers a hint and decrements (per B-017 fix).
   - Visit a scene with a `requires`-gated choice (e.g., riverbank with a rope-gated cliff path); tap Oracle; confirm the gate hint plays, not a generic line.
   - Map button opens overlay; current scene highlighted; visited scenes filled; layout makes sense; closes cleanly.

### E. Deploy

```
vercel --prod --yes
```

Append `CHANGES.md` entry. Write `MORNING_CHECKLIST_018.md` covering the three features and a regression check that the existing entry videos, pickups, narration, and adventure flow are all intact.

## Out of scope

- Geographical map with thumbnails (deferred — node-graph for now).
- Saving the map's visited state across runs (in-memory only).
- Pan/zoom controls on the map (use scaled-to-fit layout).
- Replacing the Oracle's voice or prompt logic.
- Skills & build, supreme shop, ending egg price (post-demo Phase 2).

## Acceptance

- Oracle pin lives at bottom-right with the landing-page icon and a remaining-hint badge.
- Per-gate hints fire when the kid is gated on a missing pickup at the current scene.
- Map overlay opens, shows visited and current scenes, and reads cleanly.
- Type check, lint, build all clean. Vercel deploy succeeds.
