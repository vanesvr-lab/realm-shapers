# B-010: Playtest Fixes and Continue Mode

> Kellen playtest 2026-04-26 surfaced two reproducible bugs (hero swap, phantom required items) and a missing exit option. Vanessa added a "Continue / Next Level" loop and a few UX upgrades alongside. This brief bundles them all because they touch overlapping files (claude prompt, StoryPlayer, RealmCard).

## Goal

Make Kellen's next playthrough work end-to-end: the hero he picks shows up, the items the game asks for actually exist, he can quit the game, and finishing a realm doesn't feel accidental. Then add a "Continue Adventure" loop that ramps difficulty inside the same world.

## Decisions Locked

(from Kellen's playtest + Vanessa's design adds)

- **Hero render bug:** the chosen character ingredient must drive the hero avatar in play. No silent fallback to the default girl-in-green-cape.
- **Phantom-requires bug:** parser must reject any tree where a `requires` item id is not present as a `pickup_id` somewhere in the same tree. Today the parser only checks flag refs, not item refs.
- **Realm Card needs an Exit button.** Add an in-game exit too so the kid can quit from inside a realm (Kellen had no escape from the brass-key dead end).
- **Min ~6 distinct scenes before any ending fires.** Earning the ending matters; lucky 3-click finishes shouldn't trigger the Realm Card.
- **Editor placements carry into play.** Props the kid drags into scene 1 via SceneEditor must render in scene 1 during the playthrough.
- **Continue / Next Level button on Realm Card.** Same `world_id`, harder generation, 5 options per scene, ending gated behind 2 of 5 minimum pickups.
- **Tooltips on choice options.** Hover/long-press shows a one-sentence hint per interactable. Helps the kid pick thoughtful options without spoiling consequences.
- **Clickable hero (Kellen idea).** Tap the hero in any scene and they say something — inner thought or joke. Voiced via the existing TTS pipeline, different voice from Oracle.

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

### 4. Min-6 scenes ending gate

`components/StoryPlayer.tsx`:
- Track distinct scenes visited this playthrough (already tracked for achievements).
- Constant `MIN_SCENES_BEFORE_ENDING = 6`. Lives in a constant at top of file.
- When the kid lands on an ending scene (`scene.choices.length === 0` and `!is_choice_scene`):
  - If distinct-scenes count < MIN_SCENES_BEFORE_ENDING: do NOT trigger completion. Instead, route the Oracle to say something like "There's still more of this realm to explore — keep going." and either redirect them to a non-ending scene OR keep them on the current scene with re-enabled outbound interactables. Pick whichever feels less disruptive — recommend keeping them in the scene with a visible nudge.
  - If >= 6: completion fires as today.
- Applies to BOTH levels. Continue level keeps the same threshold; the bigger tree just makes it easier to satisfy.

### 5. Editor placements carry into play

`components/SceneEditor.tsx`:
- Today the editor's placed-props snapshot lives in PlayClient state but isn't actually merged into the scene the kid sees during play.
- Confirm the snapshot is being captured (it should be, per B-007). Persist to sessionStorage under `realm-shapers:editor-props:{world_id}` so refresh doesn't lose it.

`components/StoryPlayer.tsx`:
- When rendering scene 1, merge the editor snapshot's prop list into the scene's resolved prop list (after `resolveScene`'s prop_overrides have run, OR before — pick the order that lets editor adds win, since the kid placed them deliberately).
- If the editor adds a prop that's also a pickup (the editor allows pickup-bearing props): make sure it becomes a real, collectable pickup in scene 1, not decorative.
- Editor placements only affect scene 1. Scenes 2+ stay as Claude generated.

### 6. Continue / Next Level mode

`components/RealmCard.tsx`:
- New "Continue Adventure" button (final label TBD with Vanessa — see Decisions Open).

`app/api/generate/route.ts` (or new `app/api/continue/route.ts` — pick whichever is cleaner):
- Accept current `world_id` and a `level: 2` parameter.
- Regenerate the StoryTree with elevated difficulty hints. Same world_id is preserved so achievements/endings tracking still works (per B-009 `world_endings` table — replays already supported there).
- Save the new tree back to the world's `map` column (overwriting). The old tree is gone, but flags/inventory were session-scoped anyway.

`lib/claude.ts` story prompt:
- Add a `level: number` parameter to the generation function.
- Level 2 hints in the prompt:
  - 5 choices per scene instead of 2 (i.e. 5 outbound interactables per non-ending non-choice-scene)
  - 10-12 scenes instead of 8-10
  - Ending unlock requires the kid to have collected at least 2 of 5 minimum total pickups
  - More flag combos, harder secret ending
- Parser: when level 2, require >= 5 distinct pickups across the whole tree, and require all non-ending scenes have exactly 5 outbound choices.

`app/play/PlayClient.tsx`:
- When Continue fires: call the continue API, swap the tree, reset flags + inventory + visited-scenes, but preserve `world_id` and increment `level`.
- Track `level` client-side in state. DB persistence is a Decision Open below — recommend NOT adding a column for hackathon scope.
- The 6-scene min still applies; with 10-12 scenes available it becomes natural.
- Apply the 2-of-5 pickup gate at completion: in addition to MIN_SCENES_BEFORE_ENDING, level-2 trees require `inventory.size >= 2` before completion fires.

### 7. Tooltips on choice options

`components/Interactable.tsx`:
- Add an optional `hint?: string` prop.
- Render a tooltip on hover (desktop) and on long-press (mobile, ~400ms). Style consistent with existing UI (Tailwind, no autoplay sounds on tooltip show).
- Tooltip text wraps under the icon, doesn't obscure other interactables.

`lib/claude.ts` story prompt + parser:
- Add `hint: string` field to the choice schema. Optional in the type.
- Prompt asks Claude to give a one-sentence flavor hint per choice. Hint should suggest TONE, not consequence: "this path looks calm and quiet" not "this path leads to the secret ending."
- If a choice has no hint, no tooltip renders. Old worlds with no hints work fine.

### 8. Clickable hero with thoughts + jokes

New or existing `components/HeroAvatar.tsx`:
- Wrap the rendered hero in a click target. On click, plays a TTS line via the existing `lib/oracle-bus.ts` (or a parallel `hero-bus` if voice routing wants to be cleaner).
- Lines come from `tree.hero_lines: { kind: "thought" | "joke"; text: string }[]` — new field on StoryTree.
- Click cycles through lines randomly. Track shown lines in a ref so no immediate repeats; reset when all seen.

`lib/claude.ts` story prompt:
- Tell Claude to generate 3-5 hero lines per realm — mix of "thought" (in-character musing about the situation) and "joke" (kid-friendly, age-11-appropriate).
- Lines should reference the realm specifically when possible ("I never thought I'd actually meet a real dragon").

`lib/elevenlabs.ts`:
- Add `DEFAULT_HERO_VOICE_ID` constant. Different voice from Oracle. Vanessa picks (see Decisions Open).
- TTS caching same as Oracle: `(text, voice_id)` keyed in the `oracle_voice` bucket (the bucket can hold both voices; key includes voice_id).

## Decisions Open (need Vanessa input before merging)

- **Continue level state:** client-only (sessionStorage `realm-shapers:level:{world_id}`) OR persist to a `worlds.level` column? Recommend client-only for hackathon. If kept server-side later, Realm Card thumbnails could show a "Lvl 2" badge.
- **Hero voice id (ElevenLabs):** different from Oracle (`21m00Tcm4TlvDq8ikWAM` Rachel). Suggest a kid-friendly voice — Vanessa to pick from elevenlabs.io/voice-library.
- **Tooltip mobile UX:** long-press (400ms) OR first-tap-shows-tooltip-second-tap-commits. Long-press feels right for hover parity but kids may not discover it. Open question.
- **Continue button label:** "Continue Adventure" / "Next Level" / "Go Deeper" / something kid-tested. Default to "Continue Adventure" unless Vanessa has a preference.
- **Min-6 scenes nudge UX:** when the kid hits an early ending, do we (a) keep them on the current scene with a visible Oracle line, (b) redirect them to a non-ending sibling scene, or (c) show a brief overlay ("not yet — explore more first") and re-enable outbound choices? Recommend (a) for least disruption.

## Smoke Tests

After CLI implements, Vanessa walks:

1. **Hero render.** On landing, type "purple dragon" as the character. Generate. Enter play. Confirm the hero shown in scenes is a dragon (or at least not the default girl in green cape). Try with "wizard," "knight," "robot," "fox" — confirm the asset map handles all of them.
2. **Phantom requires.** Generate ~5 realms in a row. For each, walk every choice path. Confirm there is no `requires` gate referencing an item that isn't a pickup somewhere in the tree. Parser should catch this before it reaches the kid.
3. **Min-6 scenes.** Pick the shortest path through a realm. Confirm hitting an ending in fewer than 6 scenes does NOT trigger the Realm Card; instead an Oracle line nudges to keep exploring.
4. **Editor placements.** From landing, click into SceneEditor. Drag a prop into scene 1. Enter play. Confirm the prop is visible in scene 1.
5. **Continue mode.** Complete a realm. Click Continue. Confirm the new tree has 5 choices per scene, 10-12 scenes, and won't let the kid finish without collecting 2+ pickups.
6. **Realm Card exit.** Complete a realm. On the Realm Card, click Exit. Confirm it routes to `/`.
7. **In-game exit.** Mid-realm, click the corner exit. Confirm the leave-realm dialog appears and routes home on confirm.
8. **Tooltips.** In any scene, hover (or long-press on mobile) a choice icon. Confirm the hint tooltip appears and reads as flavor not spoiler.
9. **Hero clicks.** In any scene, tap the hero. Confirm a TTS line plays (thought or joke), in a voice distinct from Oracle. Tap again, get a different line.

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

Execute B-010 in this order. Each numbered scope ends in a commit.

1. Phantom-requires parser hardening (lib/claude.ts) — most critical, blocks Kellen from finishing realms today
2. Hero render fix (StoryPlayer + asset map + neutral fallback)
3. Realm Card Exit button + in-game exit option (RealmCard, PlayClient/StoryPlayer)
4. Min-6 scenes ending gate (StoryPlayer)
5. Editor placements carry into play (SceneEditor + StoryPlayer + PlayClient)
6. Continue / Next Level mode (api route + claude prompt + RealmCard button + PlayClient)
7. Choice option tooltips (Interactable + claude prompt + parser)
8. Clickable hero with thoughts + jokes (HeroAvatar + claude prompt + elevenlabs voice id)

Run `npx tsc --noEmit` and `npm run build` clean before EACH commit.
Keep commits small and reviewable. Do NOT bundle multiple scopes in one commit.

When all scopes are done:
- Run `npm run lint`, `npx tsc --noEmit`, `npm run build` — must all be clean
- Append a B-010 entry to CHANGES.md with all touched files and Open threads
- Push to main
- Surface any of the Decisions Open items that you couldn't resolve, so Vanessa can call them

Do not autoplay any audio. Do not use em dashes in user-facing copy. Follow CLAUDE.md.
```
