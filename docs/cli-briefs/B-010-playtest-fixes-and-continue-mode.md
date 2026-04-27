# B-010: Playtest Fixes and Continue Mode

> Kellen playtest 2026-04-26 surfaced two reproducible bugs (hero swap, phantom required items) and a missing exit option. Vanessa added a "Continue / Next Level" loop and a few UX upgrades alongside. This brief bundles them all because they touch overlapping files (claude prompt, StoryPlayer, RealmCard).

## Goal

Make Kellen's next playthrough work end-to-end: the hero he picks shows up, the items the game asks for actually exist, he can quit the game, and finishing a realm doesn't feel accidental. Then add a "Continue Adventure" loop that ramps difficulty inside the same world.

## Decisions Locked

(from Kellen's playtest + Vanessa's design adds)

- **Hero render bug:** the chosen character ingredient must drive the hero avatar in play. No silent fallback to the default girl-in-green-cape.
- **Phantom-requires bug:** parser must reject any tree where a `requires` item id is not present as a `pickup_id` somewhere in the same tree. Today the parser only checks flag refs, not item refs.
- **Realm Card needs an Exit button.** Add an in-game exit too so the kid can quit from inside a realm (Kellen had no escape from the brass-key dead end).
- **Min 4 distinct scenes before any ending fires.** Earning the ending matters; lucky 2-click finishes shouldn't trigger the Realm Card. Vanessa's intent: if the kid finishes in 4 it should feel earned (smart choices guided by tooltips), not random.
- **Tree structure rule baked into the prompt:** scenes 1-2 are explore/collect (no ending paths reachable from there), scenes 3-4+ are progression toward the goal. Endings can only exist at scene index 4 or later. Belt + suspenders: runtime min-4 gate stays as a safety check in case Claude breaks the rule.
- **Editor placements carry into play.** Props the kid drags into scene 1 via SceneEditor must render in scene 1 during the playthrough.
- **Continue button on Realm Card, label: "Go Deeper".** Same `world_id`, harder generation, 5 options per scene, ending gated behind 2 of 5 minimum pickups.
- **Continue level persists in DB.** New `worlds.level integer not null default 1` column (migration 0007). Allows future Realm Card thumbs to show "Lvl 2" badge.
- **Tooltips on choice options — tap-to-show, tap-again-to-commit.** Tap an interactable once → tooltip appears with the hint. Tap again → choice commits. More discoverable for kids than long-press.
- **Clickable hero with two voices (Kellen idea).** Tap the hero in any scene and they say something — inner thought or joke. ElevenLabs voices: **Fena** (`BlgEcC0TfWpBak7FmvHW`) for girl-coded characters, **Ryan** (`8Nfp0JhQpkjJB35HObeq`) for boy-coded characters. Genderless characters: Claude picks whichever fits, defaults to Ryan.

## Architectural Decisions

### 1. Phantom-requires parser hardening (most critical — blocks Kellen)

`lib/claude.ts` parser:
- After parsing the tree, collect the set of every `pickup.id` defined across all scenes.
- Walk every `choices[].requires` array and ensure every item id in it appears in that pickup-id set. If not, throw a parse error with a clear message ("requires references item id X which is not defined as a pickup anywhere in the tree") so the API retry path kicks in.
- Add the rule to the story prompt explicitly: "Any item id you reference in a `requires` array MUST exist as a pickup in some scene of this same tree. The kid must be able to find every item the game asks for."
- Same rule applied to the new "2 of 5 minimum pickups" gate on continue-mode trees: parser checks that the tree defines at least 5 distinct pickups before accepting a level-2 generation.

### 2. Hero render fix

Investigate where the hero avatar is rendered today:
- `components/StoryPlayer.tsx` and any HeroAvatar component.
- The asset map / fallback rule that picks "girl in green cape" when the character ingredient doesn't match a known asset.

Fix:
- Confirm the kid's character ingredient is plumbed from landing → world record → StoryTree → StoryPlayer. If it's lost somewhere, restore it.
- Replace the silent default with a smarter resolver:
  - First: match against an expanded asset map (dragon any color, wizard, knight, kid/child, princess/prince, robot, pirate, cat, fox — the obvious archetypes Kellen and other kids will pick). Substring/keyword match with priority by specificity.
  - If no match: render a neutral hero silhouette with the kid's character NAME visible as a label, NOT a mismatched specific character. Better to show "your hero: purple dragon" with a neutral icon than to lie with the green-cape girl.
- Add unit-style sanity check: passing "purple dragon" must not return the default asset.

### 3. Realm Card + in-game exit

`components/RealmCard.tsx`:
- Add an "Exit" or "Quit" button alongside "Make Another" and the new "Continue Adventure" button. Routes to `/`.
- No save-state cleanup needed (flags + inventory are session-scoped).

`app/play/PlayClient.tsx` (or `components/StoryPlayer.tsx`):
- Add a small top-corner exit button always visible during play. Tap → confirm dialog ("Leave this realm? Your progress here won't save.") → routes home. Prevents future Kellens from getting stranded on a phantom-requires bug.

### 4. Min-4 scenes ending gate (structural + runtime)

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

### 5. Editor placements carry into play

`components/SceneEditor.tsx`:
- Today the editor's placed-props snapshot lives in PlayClient state but isn't actually merged into the scene the kid sees during play.
- Confirm the snapshot is being captured (it should be, per B-007). Persist to sessionStorage under `realm-shapers:editor-props:{world_id}` so refresh doesn't lose it.

`components/StoryPlayer.tsx`:
- When rendering scene 1, merge the editor snapshot's prop list into the scene's resolved prop list (after `resolveScene`'s prop_overrides have run, OR before — pick the order that lets editor adds win, since the kid placed them deliberately).
- If the editor adds a prop that's also a pickup (the editor allows pickup-bearing props): make sure it becomes a real, collectable pickup in scene 1, not decorative.
- Editor placements only affect scene 1. Scenes 2+ stay as Claude generated.

### 6. Continue / "Go Deeper" mode

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
- Structural rule (from #4) still applies: no ending scene at index < 4.

`app/play/PlayClient.tsx`:
- When "Go Deeper" fires: call `/api/continue`, swap the tree to the new generation, reset flags + inventory + visited-scenes, preserve `world_id`, and read the new `level` from the response.
- The 4-scene min still applies; with 10-12 scenes available it's easy to satisfy.
- Apply the 2-of-5 pickup gate at completion: in addition to MIN_SCENES_BEFORE_ENDING, level-2+ trees require `inventory.size >= 2` before completion fires.

`supabase/migrations/0007_worlds_level.sql` (new):
- `alter table worlds add column level integer not null default 1;`
- No RLS change needed (existing policies cover it).
- Old worlds default to level 1, behave normally.

### 7. Tooltips on choice options (tap-to-show, tap-again-to-commit)

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

### 8. Clickable hero with thoughts + jokes

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

## Decisions Open

None at brief-write time. All five decision points were closed by Vanessa during planning (see Decisions Locked above). If new ambiguity surfaces during implementation, surface it in the CHANGES.md "Open" section at the end of the batch.

## Smoke Tests

After CLI implements, Vanessa walks:

1. **Hero render.** On landing, type "purple dragon" as the character. Generate. Enter play. Confirm the hero shown in scenes is a dragon (or at least not the default girl in green cape). Try with "wizard," "knight," "robot," "fox" — confirm the asset map handles all of them.
2. **Phantom requires.** Generate ~5 realms in a row. For each, walk every choice path. Confirm there is no `requires` gate referencing an item that isn't a pickup somewhere in the tree. Parser should catch this before it reaches the kid.
3. **Min-4 scenes + structural rule.** Generate ~5 realms. Confirm none have ending scenes at index < 4. As a runtime safety check, attempt to land on an ending after only 2-3 distinct scenes (if any path allows): confirm the Realm Card does NOT fire and an Oracle nudge appears instead.
4. **Editor placements.** From landing, click into SceneEditor. Drag a prop into scene 1. Enter play. Confirm the prop is visible in scene 1.
5. **Go Deeper mode.** Complete a realm at level 1. Click "Go Deeper" on the Realm Card. Confirm the new tree has 5 choices per scene, 10-12 scenes, and won't let the kid finish without collecting 2+ pickups. Confirm `worlds.level` was bumped to 2 in DB.
6. **Realm Card exit.** Complete a realm. On the Realm Card, click Exit. Confirm it routes to `/`.
7. **In-game exit.** Mid-realm, click the corner exit. Confirm the leave-realm dialog appears and routes home on confirm.
8. **Tooltips.** In any scene, tap a choice icon once. Confirm the hint tooltip appears and reads as flavor not spoiler. Tap the same icon again. Confirm the choice commits and the kid navigates. Tap a different icon mid-preview — confirm the new tooltip replaces the old.
9. **Hero clicks (Fena).** Generate a realm with a girl-coded character (e.g. "princess"). Tap the hero in any scene. Confirm a TTS line plays in Fena's voice (`BlgEcC0TfWpBak7FmvHW`).
10. **Hero clicks (Ryan).** Generate a realm with a boy-coded character (e.g. "knight"). Tap the hero. Confirm a TTS line plays in Ryan's voice (`8Nfp0JhQpkjJB35HObeq`).
11. **Hero clicks (neutral).** Generate a realm with a neutral character (e.g. "purple dragon"). Tap the hero. Confirm a TTS line plays in either Fena or Ryan (Claude's pick), and the voice is consistent across multiple taps in the same realm.

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
2. Hero render fix (StoryPlayer + asset map + neutral fallback when no asset matches)
3. Realm Card Exit button + in-game exit option (RealmCard, PlayClient/StoryPlayer)
4. Min-4 scenes ending gate, structural + runtime (claude prompt + parser + StoryPlayer)
5. Editor placements carry into play (SceneEditor + StoryPlayer + PlayClient)
6. "Go Deeper" mode + worlds.level migration (migration 0007 + new /api/continue route + claude prompt + RealmCard button + PlayClient)
7. Choice option tooltips, tap-to-show / tap-again-to-commit (Interactable + claude prompt + parser)
8. Clickable hero with thoughts + jokes, dual voice (Fena/Ryan) (HeroAvatar + hero-bus + claude prompt + elevenlabs voice ids + oracle-voice route accepts voice_id param)

Run `npx tsc --noEmit` and `npm run build` clean before EACH commit.
Keep commits small and reviewable. Do NOT bundle multiple scopes in one commit.

When all scopes are done:
- Apply migration 0007 (`supabase/migrations/0007_worlds_level.sql`) via Supabase SQL editor before testing scope 6 in production. Note this in CHANGES.md "Open" as a BLOCKER (matches the B-008/B-009 morning checklist pattern).
- Run `npm run lint`, `npx tsc --noEmit`, `npm run build` — must all be clean
- Append a B-010 entry to CHANGES.md with all touched files and Open threads
- Generate a `MORNING_CHECKLIST_010.md` mirroring the format of B-009's, listing the 11 smoke tests from the brief
- Push to main
- If any new Decisions Open surface during implementation, surface them in the CHANGES.md Open section; do not block on them

Do not autoplay any audio. Do not use em dashes in user-facing copy. Follow CLAUDE.md.
```
