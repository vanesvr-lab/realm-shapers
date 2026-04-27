# B-010: Playtest Fixes and Continue Mode

> Kellen playtest 2026-04-26 surfaced two reproducible bugs (hero swap, phantom required items) and a missing exit option. Vanessa added a "Continue / Next Level" loop and a few UX upgrades alongside. This brief bundles them all because they touch overlapping files (claude prompt, StoryPlayer, RealmCard).

## Goal

Make Kellen's next playthrough work end-to-end: the hero he picks shows up, the items the game asks for actually exist, he can quit the game, and finishing a realm doesn't feel accidental. Then add a "Continue Adventure" loop that ramps difficulty inside the same world.

## Decisions Locked

(from Kellen's playtest + Vanessa's design adds)

- **Hero render bug:** the chosen character ingredient must drive the hero avatar in play. No silent fallback to the default girl-in-green-cape.
- **Phantom-requires bug:** parser must reject any tree where a `requires` item id is not present as a `pickup_id` somewhere in the same tree. Today the parser only checks flag refs, not item refs.
- **Character input becomes a picker, not free text.** Replace the free-text character field on the landing form with an 8-option grid of available heroes. **At least 1 girl-coded + 1 boy-coded** required; the other 6 picked by CLI from existing assets in the codebase. Free-text character entry deferred to a later phase. Optional "name your hero" text field stays so the kid can name what they pick. Eliminates the purple-dragon → default-girl bug at the source: kids can only pick characters we have assets for.
- **Setting input drives backgrounds via matcher + library.** Free-text setting input is matched against a tagged background-asset catalog (categories + keywords). Best match per scene wins. If no library match clears the threshold, Claude generates an inline SVG background per scene as fallback.
- **Background library expansion uses placeholder SVGs for now.** Audit the existing ~15 backgrounds, tag them with categories. Add ~5 placeholder SVG backgrounds for common kid settings missing today (city/urban, school, modern home, sports field, lab/hospital). Placeholders are simple SVG layouts (color blocks, basic shapes, category label visible) so the matcher and category structure exist; real art can be swapped in later batches.
- **Realm Card needs an Exit button.** Add an in-game exit too so the kid can quit from inside a realm (Kellen had no escape from the brass-key dead end).
- **Min 4 distinct scenes before any ending fires.** Earning the ending matters; lucky 2-click finishes shouldn't trigger the Realm Card. Vanessa's intent: if the kid finishes in 4 it should feel earned (smart choices guided by tooltips), not random.
- **Tree structure rule baked into the prompt:** scenes 1-2 are explore/collect (no ending paths reachable from there), scenes 3-4+ are progression toward the goal. Endings can only exist at scene index 4 or later. Belt + suspenders: runtime min-4 gate stays as a safety check in case Claude breaks the rule.
- **Editor placements carry into play.** Props the kid drags into scene 1 via SceneEditor must render in scene 1 during the playthrough.
- **Continue button on Realm Card, label: "Go Deeper".** Same `world_id`, harder generation, 5 options per scene, ending gated behind 2 of 5 minimum pickups.
- **Continue level persists in DB.** New `worlds.level integer not null default 1` column (migration 0007). Allows future Realm Card thumbs to show "Lvl 2" badge.
- **Tooltips on choice options — tap-to-show, tap-again-to-commit.** Tap an interactable once → tooltip appears with the hint. Tap again → choice commits. More discoverable for kids than long-press.
- **Clickable hero with two voices (Kellen idea).** Tap the hero in any scene and they say something — inner thought or joke. ElevenLabs voices: **Fena** (`BlgEcC0TfWpBak7FmvHW`) for girl-coded characters, **Ryan** (`8Nfp0JhQpkjJB35HObeq`) for boy-coded characters. Genderless characters: Claude picks whichever fits, defaults to Ryan.
- **Progressive scene rendering to cut perceived wait time.** Generate scenes 1-2 fast, return them to the kid, keep generating scenes 3+ in the background while the kid plays. Target: kid sees the play screen in 5-7s instead of waiting the full 14-20s for the entire tree. Scenes 3+ stream in as the kid progresses; if the kid races ahead of generation, show a brief "the realm is still forming..." hold state on the boundary scene.

## Architectural Decisions

### 1. Phantom-requires parser hardening (most critical — blocks Kellen)

`lib/claude.ts` parser:
- After parsing the tree, collect the set of every `pickup.id` defined across all scenes.
- Walk every `choices[].requires` array and ensure every item id in it appears in that pickup-id set. If not, throw a parse error with a clear message ("requires references item id X which is not defined as a pickup anywhere in the tree") so the API retry path kicks in.
- Add the rule to the story prompt explicitly: "Any item id you reference in a `requires` array MUST exist as a pickup in some scene of this same tree. The kid must be able to find every item the game asks for."
- Same rule applied to the new "2 of 5 minimum pickups" gate on continue-mode trees: parser checks that the tree defines at least 5 distinct pickups before accepting a level-2 generation.

### 2. Input-driven assets (character picker + setting matcher + background library)

Vanessa's core insight: today the kid types a setting and gets a generic background; types a character and gets the default girl. The connection between input and output is too loose. Fix it on both axes. This scope runs early because every scope downstream (hero rendering, voice pick, Go Deeper regeneration, scene rendering) reads from these inputs.

**2a. Character picker (replaces free-text)**

`components/LandingForm.tsx`:
- Replace the free-text character field with an 8-option picker grid (recommend 4x2). Each option shows the actual rendered hero asset thumbnail + a label.
- Required: at least 1 girl-coded option + 1 boy-coded option. CLI picks the other 6 from existing assets in the codebase (audit `public/` and `lib/` for what's there).
- Below the grid: optional free-text "Name your hero" field. The picked asset is fixed; the name flows into Claude narration.

`lib/claude.ts` schema + prompt:
- World's character ingredient becomes `{ asset_id: string; name?: string }` instead of a string.
- Backwards compat: old worlds with string character coerce to `{ asset_id: <best fuzzy match or default>, name: undefined }` on read.
- Prompt receives both asset_id and optional name. Claude refers to the hero by name in narration when provided, by asset description otherwise.

`components/StoryPlayer.tsx` / HeroAvatar:
- Resolve hero asset from `world.character.asset_id` directly. Picker constrains to known ids, so no fuzzy fallback needed.
- Display the optional name under the avatar in scene 1 only ("Meet Elara the Dragon"), not every scene.

**2b. Setting matcher + background library**

`lib/backgrounds-catalog.ts` (new):
- Audit existing background assets. Tag each: `{ id, category, keywords[], file_path }`. Categories like "forest", "beach", "castle", "underwater", "space", "desert", "mountain" — whatever already exists. Source of truth for the matcher.

`lib/scene-matcher.ts` (new):
- Given a setting string, return ranked list of background ids by relevance. Use the same Levenshtein + keyword overlap pattern as `lib/prop-matcher.ts` from B-008.
- Threshold constant `MATCH_MIN_SIMILARITY = 0.5`. Top match below this → "no good library match."

**Background library expansion (placeholders only, real art later):**
- Add ~5 simple SVG placeholder backgrounds for common kid settings missing from existing 15: **city/urban**, **school**, **modern home**, **sports field**, **lab/hospital**. Adjust the list based on what existing 15 already cover.
- Placeholder spec: rectangular SVG sized to existing backgrounds, base color block + 2-3 silhouette shapes hinting at the category + a small category label text in the bottom corner ("placeholder: city"). Goal is the matcher and tagging system work end-to-end now; real art swaps in later.
- Each placeholder gets a catalog entry tagged with category + keywords.

`lib/claude.ts` story prompt:
- Before calling Claude, run the setting through `scene-matcher`. Pass the top 5 ranked background ids + their categories into the prompt: "the kid's setting is X. Choose backgrounds for each scene from this ranked list, using the closest fits first." Claude picks one per scene from the list and stores it in `scene.background_id`.
- New optional `scene.inline_svg?: string` field. If matcher returns NO match >= 0.5: instruct Claude in the prompt to generate an inline SVG background per scene (small, hand-drawn-feeling) that fits the kid's setting input. Inline SVG written into `scene.inline_svg`.
- Parser validates: every scene has either a valid `background_id` (referencing the catalog) OR a non-empty `inline_svg`. Throws if neither.

`components/StoryPlayer.tsx` / wherever scenes render:
- Render `inline_svg` directly when present (sanitize the SVG before injecting, or render via a safe SVG component pattern). Fall back to `background_id` lookup against the catalog otherwise.
- Old worlds without these fields fall back to whatever asset id they already have.

### 3. Hero render wiring fix (verifies scope 2 plumbing)

With the picker from scope 2, fuzzy character matching is no longer needed. But the WIRING from picker → world record → StoryTree → StoryPlayer render still needs to be correct.

`components/StoryPlayer.tsx` and any HeroAvatar component:
- Confirm the chosen `character.asset_id` is read on every render and resolves to the right asset.
- Add a sanity check: rendering with a known asset id (e.g. the boy-coded option) must NOT return the previous default girl.
- If the picker selection is somehow lost between landing and play (the original Kellen bug), restore the plumbing.

This scope is small if scope 2 is solid. Mostly verification.

### 4. Realm Card + in-game exit

`components/RealmCard.tsx`:
- Add an "Exit" or "Quit" button alongside "Make Another" and the new "Continue Adventure" button. Routes to `/`.
- No save-state cleanup needed (flags + inventory are session-scoped).

`app/play/PlayClient.tsx` (or `components/StoryPlayer.tsx`):
- Add a small top-corner exit button always visible during play. Tap → confirm dialog ("Leave this realm? Your progress here won't save.") → routes home. Prevents future Kellens from getting stranded on a phantom-requires bug.

### 5. Min-4 scenes ending gate (structural + runtime)

**Structural fix (preferred path) — `lib/claude.ts` story prompt and parser:**
- Tell Claude explicitly: scenes 1-2 are exploration / pickup-bearing scenes that DO NOT branch to any ending. Scenes 3-4+ are progression toward the goal, and only scenes at index 4 or later may be ending scenes (`choices.length === 0`).
- Parser validates: no ending scene exists at scene index < 4. Reject and retry if violated.
- This makes the runtime gate rarely fire, since the tree itself can't end early.

**Runtime safety belt — `components/StoryPlayer.tsx`:**
- Track distinct scenes visited this playthrough (already tracked for achievements).
- Constant `MIN_SCENES_BEFORE_ENDING = 4`. Lives at top of file.
- When the kid lands on an ending scene (`choices.length === 0` and `!is_choice_scene`):
  - If distinct-scenes < 4: do NOT fire completion. Keep the kid on the current scene with outbound interactables re-enabled, and route an Oracle line: "There's still more of this realm to explore — keep going."
  - If >= 4: completion fires as today.
- Applies to BOTH levels.

### 6. Editor placements carry into play

`components/SceneEditor.tsx`:
- Today the editor's placed-props snapshot lives in PlayClient state but isn't actually merged into the scene the kid sees during play.
- Confirm the snapshot is being captured (it should be, per B-007). Persist to sessionStorage under `realm-shapers:editor-props:{world_id}` so refresh doesn't lose it.

`components/StoryPlayer.tsx`:
- When rendering scene 1, merge the editor snapshot's prop list into the scene's resolved prop list (after `resolveScene`'s prop_overrides have run, OR before — pick the order that lets editor adds win, since the kid placed them deliberately).
- If the editor adds a prop that's also a pickup (the editor allows pickup-bearing props): make sure it becomes a real, collectable pickup in scene 1, not decorative.
- Editor placements only affect scene 1. Scenes 2+ stay as Claude generated.

### 7. Continue / "Go Deeper" mode

`components/RealmCard.tsx`:
- New button labeled exactly **"Go Deeper"** alongside the existing actions.

`app/api/continue/route.ts` (new — keeping `/api/generate` clean):
- Accept current `world_id`. Read the world's current `level` from DB (default 1 for old worlds), generate at `level + 1`, save back.
- Regenerate the StoryTree with elevated difficulty hints. Same `world_id` is preserved so achievements/endings tracking still works (per B-009 `world_endings` table — replays already supported there).
- Save the new tree back to `worlds.map` (overwriting) and bump `worlds.level`.

`lib/claude.ts` story prompt:
- Add a `level: number` parameter to the generation function (1 default, 2+ for Go Deeper).
- Level 2+ hints in the prompt:
  - 5 outbound choices per non-ending non-choice scene (instead of 2)
  - 10-12 scenes instead of 8-10
  - At least 5 distinct pickups in the tree; ending unlock requires the kid to have collected at least 2 of those
  - More flag combos, harder secret ending
- Parser: when `level >= 2`, require >= 5 distinct pickups across the whole tree, and require all non-ending non-choice-scene scenes have exactly 5 outbound choices.
- Structural rule (from #5) still applies: no ending scene at index < 4.

`app/play/PlayClient.tsx`:
- When "Go Deeper" fires: call `/api/continue`, swap the tree to the new generation, reset flags + inventory + visited-scenes, preserve `world_id`, and read the new `level` from the response.
- The 4-scene min still applies; with 10-12 scenes available it's easy to satisfy.
- Apply the 2-of-5 pickup gate at completion: in addition to MIN_SCENES_BEFORE_ENDING, level-2+ trees require `inventory.size >= 2` before completion fires.

`supabase/migrations/0007_worlds_level.sql` (new):
- `alter table worlds add column level integer not null default 1;`
- No RLS change needed (existing policies cover it).
- Old worlds default to level 1, behave normally.

### 8. Tooltips on choice options (tap-to-show, tap-again-to-commit)

`components/Interactable.tsx`:
- Add an optional `hint?: string` prop.
- New two-step interaction model on touch + click:
  - **First tap/click:** show the tooltip with the hint. The interactable visibly enters a "previewing" state (e.g. brighter glow, hint card visible). Don't navigate yet.
  - **Second tap/click on the same interactable:** commit the choice and navigate.
  - **Tap on a different interactable:** dismiss the previous tooltip and show the new one (the new one is now in "previewing" state).
  - Tap outside any interactable: dismiss tooltips.
- Style: tooltip card sits adjacent to the icon, doesn't obscure other interactables. Tailwind, no autoplay sounds on show.

`lib/claude.ts` story prompt + parser:
- Add `hint: string` field to the choice schema. Optional in the type for backwards compat.
- Prompt asks Claude to give a one-sentence flavor hint per choice. Hint should suggest TONE, not consequence: "this path looks calm and quiet" not "this path leads to the secret ending."
- If a choice has no hint, the second-tap-to-commit pattern still applies (single tap shows a generic "tap again to go here" microcopy or the interactable's own label). Old worlds without hints behave fine.

### 9. Clickable hero with thoughts + jokes

New or existing `components/HeroAvatar.tsx`:
- Wrap the rendered hero in a click target. On click, plays a TTS line via a parallel `lib/hero-bus.ts` (mirror of `lib/oracle-bus.ts` so voices don't collide if they ever speak at the same time).
- Lines come from `tree.hero_lines: { kind: "thought" | "joke"; text: string }[]` — new field on StoryTree.
- Click cycles through lines randomly. Track shown lines in a ref so no immediate repeats; reset when all seen.

`lib/claude.ts` story prompt + StoryTree schema:
- Add `hero_lines: { kind: "thought" | "joke"; text: string }[]` to StoryTree.
- Add `hero_voice: "Fena" | "Ryan"` to StoryTree.
- Tell Claude to:
  - Generate 3-5 hero lines per realm. Mix of `thought` (in-character musing about the situation) and `joke` (kid-friendly, age-11-appropriate). Lines should reference the realm specifically when possible ("I never thought I'd actually meet a real dragon").
  - Pick `hero_voice` based on the character ingredient. Use `"Fena"` for girl-coded characters, `"Ryan"` for boy-coded characters. For neutral characters (animals, robots, abstract beings), pick whichever fits the character's vibe; default to `"Ryan"` if truly ambiguous.

`lib/elevenlabs.ts`:
- Add two voice id constants:
  - `HERO_VOICE_FENA = "BlgEcC0TfWpBak7FmvHW"`
  - `HERO_VOICE_RYAN = "8Nfp0JhQpkjJB35HObeq"`
- Helper `heroVoiceIdFor(name: "Fena" | "Ryan"): string`.
- TTS caching same as Oracle: `(text, voice_id)` keyed in the `oracle_voice` bucket (the bucket holds both voices; cache key includes voice_id).

`app/api/oracle-voice/route.ts` or new `app/api/hero-voice/route.ts`:
- If reusing the Oracle endpoint, accept an optional `voice_id` query param (defaults to Oracle Rachel). Hero clicks pass the per-realm hero voice id.
- If splitting, mirror the Oracle endpoint exactly with the hero voice resolution.
- Pick whichever is cleaner; recommend reusing the Oracle endpoint with a `voice_id` param to avoid duplicating cache logic.

### 10. Progressive scene rendering (cut perceived wait)

Vanessa's framing: "render the first 2 pages and continue to render the rest while user is on the generated page so it can load faster and less wait." Today the kid waits 14-20s for the entire tree before the play screen appears. Goal: kid sees scene 1 in 5-7s, scenes 3+ stream in as they progress.

Recommended approach: **two-phase generation.** (Streaming partial JSON parsing is the alternative; pick whichever is cleaner. Two-phase is more robust and easier to reason about.)

`lib/claude.ts`:
- Split generation into two functions:
  - `generateWorldShell(ingredients, level)` — returns `{ world_metadata, hero_lines (subset of 1-2), hero_voice, scenes: [scene1, scene2], pending_scene_ids: [scene3.id, scene4.id, ...] }`. Phase 1 also returns a `story_summary: string` capturing the world's premise so phase 2 stays consistent.
  - `generateRemainingScenes(world_id, story_summary, level, completed_scene_ids)` — returns the remaining scenes 3+ with all flags / endings / requires / inline_svg / etc.
- Phase 1 prompt focuses on: world setup, hero, first 2 scenes (which per the structural rule are explore/collect, no endings), and the story spine (what the goal is, what the twist is, where this is heading). Caps tokens to ~2000 for fast return.
- Phase 2 prompt receives the full phase 1 output as context and fills in the rest. Caps tokens to whatever's needed for scenes 3-N.

`app/api/generate/route.ts`:
- Returns phase 1 immediately. Saves the partial world to DB with a `worlds.generation_status` column = `"phase_1"`. Triggers phase 2 in the background (server-side fire-and-forget; or queue it as a fetch from `app/api/finalize/route.ts`).
- Same `world_id` is used end-to-end.

`app/api/finalize/route.ts` (new):
- Server-side endpoint that runs phase 2 generation. Updates `worlds.map` with the full tree on completion. Updates `worlds.generation_status` to `"complete"`.
- Idempotent: if already complete, returns immediately.

`app/api/world-status/route.ts` (new) OR Server-Sent Events stream from finalize:
- Lightweight poll endpoint: `GET /api/world-status?world_id=X` returns `{ status: "phase_1" | "complete", scenes_ready: ["scene1", "scene2", ...] }`.
- Recommend SSE for cleaner UX, polling as fallback.

`app/play/PlayClient.tsx`:
- On enter: render scenes 1-2 immediately from phase 1 payload.
- Subscribe to world-status (SSE) or poll (every 1.5s) until `status === "complete"`.
- When the kid reaches a scene whose id is not yet in the loaded scenes (only possible if they race the phase 2 generation): show a brief "the realm is still forming..." hold state with a small Oracle line ("give the realm a moment to take shape") and resume when the new scene arrives.
- Once the world is `complete`, freeze the tree and play normally for the rest of the session.

`supabase/migrations/0008_world_generation_status.sql` (new):
- `alter table worlds add column generation_status text not null default 'complete';`
- Existing worlds default to `"complete"` so they continue to play.

**Risk and fallback:**
- If phase 2 fails (Claude error, network), serve the kid what we have plus a graceful "the realm couldn't fully form, here's what exists" path. Do NOT block on retries indefinitely.
- If two-phase consistency gets weird (scene 3 narration doesn't match scenes 1-2 setup): tighten the phase 2 context window. Consider passing the full phase 1 JSON as system context.
- This scope is high-leverage (perceived performance is everything in a kid demo) but also the most novel. **OK to ship behind a feature flag** if it's not stable by morning: `NEXT_PUBLIC_PROGRESSIVE_GEN=true` in env, default false. CLI's call.

## Decisions Open

None at brief-write time. All decisions were closed by Vanessa during planning (see Decisions Locked above). If new ambiguity surfaces during implementation, surface it in the CHANGES.md "Open" section at the end of the batch.

## Smoke Tests

After CLI implements, Vanessa walks:

1. **Character picker.** On landing, confirm the character field is a grid of 8 options (not free text). Confirm at least one girl-coded and one boy-coded option visible. Pick each one in turn across separate sessions and confirm THAT asset renders in play (no default girl substitution).
2. **Setting matcher.** Type "middle of the city" as setting. Confirm the rendered backgrounds across scenes lean urban/buildings (placeholder city SVG counts). Try "underwater cave" — confirm watery/cave-coded backgrounds. Try "secret moonlit bakery" (a setting we don't have library coverage for) — confirm the backgrounds are inline-SVG generated by Claude (not a generic forest).
3. **Phantom requires.** Generate ~5 realms in a row. For each, walk every choice path. Confirm there is no `requires` gate referencing an item that isn't a pickup somewhere in the tree. Parser should catch this before it reaches the kid.
4. **Min-4 scenes + structural rule.** Generate ~5 realms. Confirm none have ending scenes at index < 4. As a runtime safety check, attempt to land on an ending after only 2-3 distinct scenes (if any path allows): confirm the Realm Card does NOT fire and an Oracle nudge appears instead.
5. **Editor placements.** From landing, click into SceneEditor. Drag a prop into scene 1. Enter play. Confirm the prop is visible in scene 1.
6. **Go Deeper mode.** Complete a realm at level 1. Click "Go Deeper" on the Realm Card. Confirm the new tree has 5 choices per scene, 10-12 scenes, and won't let the kid finish without collecting 2+ pickups. Confirm `worlds.level` was bumped to 2 in DB.
7. **Realm Card exit.** Complete a realm. On the Realm Card, click Exit. Confirm it routes to `/`.
8. **In-game exit.** Mid-realm, click the corner exit. Confirm the leave-realm dialog appears and routes home on confirm.
9. **Tooltips.** In any scene, tap a choice icon once. Confirm the hint tooltip appears and reads as flavor not spoiler. Tap the same icon again. Confirm the choice commits and the kid navigates. Tap a different icon mid-preview — confirm the new tooltip replaces the old.
10. **Hero clicks (girl-coded picker option).** Pick a girl-coded character on landing. Tap the hero in any scene. Confirm a TTS line plays in Fena's voice (`BlgEcC0TfWpBak7FmvHW`).
11. **Hero clicks (boy-coded picker option).** Pick a boy-coded character. Tap the hero. Confirm a TTS line plays in Ryan's voice (`8Nfp0JhQpkjJB35HObeq`).
12. **Hero clicks (neutral picker option).** Pick a neutral character (e.g. dragon, robot). Tap the hero. Confirm a TTS line plays in either Fena or Ryan (Claude's pick), consistent across taps within the same realm.
13. **Progressive rendering perceived speed.** Time from "submit ingredients" → "play screen visible with scene 1." Target: under 8 seconds (vs current 14-20s). Confirm scenes 3+ either are already loaded or stream in seamlessly as the kid plays. If the kid races to a not-yet-loaded scene, confirm the "realm is still forming" hold state appears and resolves cleanly.

## Don't Touch

- B-009 flag/ending system. Leave intact.
- B-008 achievements layer. No new achievements in this batch.
- Realm Card share / download flow (B-007). Untouched.
- Oracle voice. Hero gets a separate voice; Oracle stays on Rachel.
- 3D preview page (`/preview-3d`). Out of scope.

---

## CLI kickoff prompt

(Paste this into a fresh Claude Code CLI session in the realm-shapers project.)

```
Read CLAUDE.md and the last 3 entries of CHANGES.md.

Then read docs/cli-briefs/B-010-playtest-fixes-and-continue-mode.md fully.
Also read docs/playtest-log.md (the Kellen 2026-04-26 entry) for the user-facing context behind this batch.

All Decisions are LOCKED. Do not ask Vanessa to confirm any of the choices in the brief — they were resolved during planning. Just execute.

Execute B-010 in this order. Each numbered scope ends in a commit.

1. Phantom-requires parser hardening (lib/claude.ts) — most critical, blocks Kellen from finishing realms today
2. Input-driven assets: character picker + setting matcher + background catalog + ~5 placeholder backgrounds + inline-SVG fallback (LandingForm + lib/backgrounds-catalog + lib/scene-matcher + claude prompt + StoryPlayer render). Run early — every scope below reads from these inputs.
3. Hero render wiring fix — verify scope 2's plumbing reaches the renderer (StoryPlayer / HeroAvatar). Should be small if scope 2 is solid.
4. Realm Card Exit button + in-game exit option (RealmCard, PlayClient/StoryPlayer)
5. Min-4 scenes ending gate, structural + runtime (claude prompt + parser + StoryPlayer)
6. Editor placements carry into play (SceneEditor + StoryPlayer + PlayClient)
7. "Go Deeper" mode + worlds.level migration (migration 0007 + new /api/continue route + claude prompt + RealmCard button + PlayClient)
8. Choice option tooltips, tap-to-show / tap-again-to-commit (Interactable + claude prompt + parser)
9. Clickable hero with thoughts + jokes, dual voice (Fena/Ryan) (HeroAvatar + hero-bus + claude prompt + elevenlabs voice ids + oracle-voice route accepts voice_id param)
10. Progressive scene rendering — two-phase generation, phase-1 returns first 2 scenes fast, phase-2 fills rest in background (lib/claude.ts split + /api/generate + new /api/finalize + new /api/world-status + migration 0008 generation_status + PlayClient subscribes/polls). HIGH-LEVERAGE for perceived speed but most novel scope; OK to ship behind feature flag `NEXT_PUBLIC_PROGRESSIVE_GEN` if not stable by morning.

Run `npx tsc --noEmit` and `npm run build` clean before EACH commit.
Keep commits small and reviewable. Do NOT bundle multiple scopes in one commit.

When all scopes are done:
- Apply migrations 0007 (`worlds.level`) AND 0008 (`worlds.generation_status`) via Supabase SQL editor before testing scopes 7 and 10 in production. Note both in CHANGES.md "Open" as BLOCKERS (matches the B-008/B-009 morning checklist pattern).
- Run `npm run lint`, `npx tsc --noEmit`, `npm run build` — must all be clean
- Append a B-010 entry to CHANGES.md with all touched files and Open threads
- Generate `MORNING_CHECKLIST_010.md` mirroring B-009's format, listing the 13 smoke tests from the brief
- Push to main
- If any new Decisions Open surface during implementation, surface them in the CHANGES.md Open section; do not block on them
- If progressive rendering (scope 10) has stability issues, ship it behind `NEXT_PUBLIC_PROGRESSIVE_GEN=false` default and call it out in CHANGES.md so Vanessa can flip the flag after morning verification

Do not autoplay any audio. Do not use em dashes in user-facing copy. Follow CLAUDE.md.
```
