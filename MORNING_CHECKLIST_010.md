# Morning Checklist — B-010

> Overnight CLI agent shipped Kellen's playtest fixes plus Vanessa's "Continue Adventure" loop. Phantom-requires bug closed at the parser, character is now an 8-option picker, settings drive backgrounds via a tagged catalog with inline-SVG fallback, the kid can leave a realm mid-play, endings are gated behind 4 distinct scenes (structural + runtime), editor placements carry into scene 1, "Go Deeper" regenerates at level + 1 with bigger trees, choices have tap-to-show tooltips, the hero is clickable with thoughts and jokes in two voices, and progressive scene rendering is wired behind a feature flag. Walk these flows in order. Each step has a clear pass / fail signal.

Production URL: https://realm-shapers.vercel.app
Repo: https://github.com/vanesvr-lab/realm-shapers

## 0. Apply migrations 0007 + 0008 (BLOCKERS)

Both are required for the new features:
- `0007_worlds_level.sql` adds `worlds.level integer default 1`. Without it, /api/continue ("Go Deeper") fails on update.
- `0008_world_generation_status.sql` adds `worlds.generation_status text default 'complete'`. Without it, /api/generate insert fails when the column is referenced.

1. Open the Supabase dashboard for the project.
2. SQL Editor → New query.
3. Paste the contents of `supabase/migrations/0007_worlds_level.sql`. Run.
4. New query. Paste `supabase/migrations/0008_world_generation_status.sql`. Run.
5. Verify both columns: `select level, generation_status from worlds limit 1;`. Should return without error.

If you skipped migration 0006 (B-009) or 0005 (B-008), apply those first or the achievement layer will silently fail.

## 1. Confirm production deploy is live

1. Open https://realm-shapers.vercel.app in a fresh incognito window.
2. Page loads. The form now shows a character picker grid (8 hero thumbnails) instead of a free-text Character field.
3. View source / Network: build hash is recent.

## 2. Character picker locks the rendered hero (Flow A)

The bug Kellen surfaced: pick "purple dragon", play the realm, get "default girl in green cape" instead. With the picker, this should be impossible.

1. On the landing page, confirm the Character field is a 4x2 grid of 8 thumbnails: hero girl, hero boy, purple dragon, young wizard, sparkly fairy, friendly robot, astronaut, clever fox.
2. Confirm the "Name your hero" text input sits below the grid (optional).
3. Pick the **purple dragon**. Fill the other ingredients. Click Shape my realm.
4. Play your story. Confirm the rendered hero in scene 1 is THE PURPLE DRAGON, not a fallback hero.
5. Repeat with **hero boy** in a fresh realm. Confirm hero boy renders.
6. Repeat with **fairy**. Confirm fairy renders.

PASS: every picker option renders the matching asset in play.

FAIL diagnostics:
- Network tab: confirm /api/generate POST body includes `character_asset_id`.
- /api/generate response: confirm `story.default_character_id` matches the picker selection.
- If the rendered hero differs: clear sessionStorage and refresh. The SceneEditor's character snapshot might be stale from a prior session.

## 3. Setting matcher chooses backgrounds (Flow B)

1. Generate a realm with setting "middle of the city". Confirm the rendered backgrounds across scenes lean urban (placeholder city SVG visible — has gray buildings, dusk sky, "placeholder: city" label in corner).
2. Generate one with "underwater coral cave". Confirm scenes use underwater or cave backgrounds.
3. Generate one with "secret moonlit bakery" (a setting with no library category match). Confirm scenes show inline-SVG backgrounds Claude generated for the kid (small hand-drawn-feeling SVGs that fit the bakery vibe), NOT a generic forest.

PASS: city → urban backgrounds, underwater cave → watery/cave, bakery → inline SVG fallback.

FAIL diagnostics:
- Inspect `/api/generate` response. Each scene has either a `background_id` matching a real asset OR an `inline_svg` string starting with `<svg`.
- If matcher returns no good match but Claude doesn't emit inline_svg: regenerate. Parser rejects scenes missing both, so retry should fire.

## 4. Phantom-requires bug closed (Flow C)

Kellen's stuck-realm bug: a choice gated on a brass key that didn't exist. The parser should now reject these trees and retry.

1. Generate ~5 realms in a row.
2. For each, walk every choice path you can reach.
3. For every locked choice that names an item ("find the brass key first"), confirm that item IS findable somewhere in the tree (not necessarily the current scene; could be a side quest or earlier scene).
4. There should be NO realm where the game asks for an item that doesn't exist anywhere.

PASS: all 5 realms are completable; no phantom-required items.

FAIL diagnostics:
- If a phantom-required item appears: open the network tab, find the `/api/generate` response, search the JSON for the item id. If it appears only in a `requires` array and never in any `pickups`, the parser failed to catch it. File a follow-up.

## 5. Min-4 scenes ending gate (Flow D)

1. Generate ~5 realms. Inspect the JSON: every ending scene (empty choices) should be at scene array index 4 or later.
2. Try to land on an ending after only 2-3 distinct scenes. The Realm Card should NOT fire. Instead Oracle says "There is still more of this realm to explore. Keep going." Kid stays on the previous scene with its choices intact.
3. After visiting at least 4 distinct scenes, landing on an ending fires the Realm Card normally.

PASS: parser keeps endings at idx >= 4; runtime belt blocks early endings with the Oracle nudge.

## 6. Editor placements carry into play (Flow E)

1. From landing, generate a realm and enter SceneEditor (default mode after generation).
2. Drag 1-3 props into scene 1 from the AssetPalette.
3. Click "Play your story".
4. In scene 1, confirm the props you dragged are visible (decoration; same offsets as Claude-default props).
5. Refresh the page mid-edit. Re-enter the editor. Your prop placements should persist (sessionStorage `realm-shapers:editor-props:{world_id}`).

PASS: editor placements visible in scene 1; persist across refresh.

## 7. Go Deeper regenerates at level 2 (Flow F)

1. Complete a realm at level 1 (any path to ending).
2. On the Realm Card, click "Go Deeper".
3. Loading indicator. After 15-25s, the kid is back in edit mode with a NEW tree (same world_id). Header shows "Lvl 2" badge next to the title.
4. Enter play. Inspect the JSON via `/api/world-status?world_id=X`: tree should have 10-12 scenes, every non-ending non-choice scene has exactly 5 choices, at least 5 distinct pickups across the tree.
5. Try to finish without collecting any pickups. The ending should not fire; Oracle says "This deeper realm asks for more. Find 2 more things before the ending opens."
6. Collect 2 pickups. Now the ending fires.
7. In Supabase: `select level from worlds where id = '<world_id>';` returns 2.

PASS: Go Deeper regenerates the tree, level bumps to 2 in DB, 5 choices per scene, ending gated behind 2 pickups.

FAIL diagnostics:
- If the request hangs: check Vercel logs for /api/continue. Likely a generation timeout; bumped max_tokens to 9216 for level >= 2 trees, but Claude can still take 25s.
- If the column is missing: migration 0007 wasn't applied. See step 0.

## 8. Realm Card Exit + in-game leave-realm (Flow G)

1. Complete a realm. On the Realm Card overlay, click the new **Exit** button (slate gray, alongside Go Deeper / Play again / Edit my scene / Save / Make another). Confirm it routes to `/`.
2. Generate a fresh realm. Enter play. Top-right of the play screen now shows TWO buttons: "↩ Editor" (back to editor mode) and "🚪 Leave realm".
3. Click "🚪 Leave realm". Modal dialog appears: "Leave this realm? Your progress here will not save." with Stay / Leave realm buttons.
4. Click Stay. Modal closes; kid is still in play.
5. Click Leave realm. Routes to `/`.

PASS: both exits work, confirm dialog appears with the correct copy.

## 9. Choice tooltips (tap-to-show / tap-again-to-commit) (Flow H)

1. In play, tap any glowing choice icon ONCE. Confirm:
   - The icon visibly enters a "previewing" state (brighter glow ring).
   - A tooltip card appears above the icon with the label, Claude's flavor hint (or "Tap again to go here" if Claude omitted), and "tap again to go" microcopy.
   - The kid does NOT navigate.
2. Tap the SAME icon again. The choice commits and the kid navigates to the next scene.
3. Tap a choice once. While previewing, tap a DIFFERENT choice. Confirm the preview swaps to the new choice (old one returns to normal, new one enters previewing state).
4. Tap a choice once. While previewing, tap on the dark scene background (not on any interactable). Confirm the preview dismisses.
5. Confirm the hint reads as TONE not spoiler ("this path looks calm and quiet" not "this path leads to the secret ending").

PASS: every choice requires two taps; tooltips swap across choices; outside taps dismiss; hints feel like flavor.

## 10. Hero clicks (girl-coded picker option) (Flow I)

1. Pick a girl-coded hero on landing (hero girl OR fairy).
2. Generate. Enter play.
3. Tap the rendered hero (the character standing center-bottom of scene). Confirm:
   - A small "💭" badge bounces on the hero corner.
   - A speech bubble appears above the hero with one of Claude's hero_lines (a thought or joke).
   - TTS audio plays in **Fena's voice** (`BlgEcC0TfWpBak7FmvHW`).
4. Tap again. A different line. Repeat — confirm no immediate repeats.

PASS: girl-coded hero speaks in Fena.

## 11. Hero clicks (boy-coded picker option) (Flow J)

1. Pick a boy-coded hero on landing (hero boy OR wizard).
2. Generate. Enter play. Tap the hero.
3. Confirm TTS plays in **Ryan's voice** (`8Nfp0JhQpkjJB35HObeq`).

PASS: boy-coded hero speaks in Ryan.

## 12. Hero clicks (neutral picker option) (Flow K)

1. Pick a neutral hero (purple dragon OR robot OR astronaut OR fox).
2. Generate. Enter play. Tap the hero.
3. Confirm TTS plays in either Fena or Ryan (Claude's pick based on the character's vibe). Confirm the SAME voice plays consistently across multiple taps in the same realm.

PASS: neutral hero gets a consistent voice picked by Claude.

## 13. Progressive rendering (only if NEXT_PUBLIC_PROGRESSIVE_GEN=true) (Flow L)

This flow is BEHIND A FEATURE FLAG and OFF by default. To test:

1. In Vercel project settings → Environment Variables, set `NEXT_PUBLIC_PROGRESSIVE_GEN=true` for production.
2. Redeploy (or wait for the next deploy).
3. Open https://realm-shapers.vercel.app and generate a realm. Time it.
4. The play screen should appear in UNDER 8 seconds (vs current 14-20s for the full tree).
5. The first scene narration reads "The realm is forming..." with a "Forming..." purple banner above the editor.
6. Within 15-25 seconds, the banner disappears and the real tree swaps in (editor + player remount).
7. Confirm full functionality: choices, pickups, endings all work after the swap.

PASS: kid sees scene 1 in under 8s; full tree swaps in within 25s; everything works post-swap.

To turn off: remove the env var or set to "false" and redeploy.

KNOWN LIMITATION: the phase 1 shell is synthesized client-side (no Claude call), so the kid sees a placeholder "the realm is forming" scene initially, not the actual scene 1. Phase 2 generates the real tree the same way single-call generation does. The speed savings come from showing SOMETHING immediately while the real generation happens. A future iteration could have phase 1 be a real Claude call for just 2 scenes for a more polished initial experience.

---

If all 13 flows pass: B-010 is shipped. Highest-leverage follow-ups in priority order:
1. Replace placeholder background SVGs (city, school, modern home, sports field, lab) with real watercolor art via `npx tsx --env-file=.env.local scripts/generate-assets.ts --only city,school,modern_home,sports_field,lab_hospital`.
2. Audit Claude's actual hint quality across ~10 generations; tighten the prompt if hints lean too literal.
3. If progressive rendering proves stable, design a smarter phase 1 (real Claude call for 2 scenes instead of synthesized shell).
4. Consider raising the character picker from 8 to 12 options (still need ≥1 girl + ≥1 boy).
