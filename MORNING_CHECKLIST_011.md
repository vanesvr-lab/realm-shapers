# Morning Checklist — B-011

> Overnight CLI agent shipped the theme + sub-scene graph library. The landing page is now a step-by-step disclosure (theme → setting → character → goal → twist → prompt preview), the kid picks a starting place from a 15-card sub-scene grid (or types one), 8 catalog characters get a "great match" badge for theme-fit, and Claude generates trees that walk the catalog's geographic adjacency for scenes 2-4. Walk these flows in order. Each step has a clear pass / fail signal.

Production URL: https://realm-shapers.vercel.app
Repo: https://github.com/vanesvr-lab/realm-shapers

## 0. Apply migration 0009 (BLOCKER)

`0009_worlds_theme.sql` adds the `worlds.theme text` column. Without it, EVERY new world insert fails with `column "theme" of relation "worlds" does not exist` — including legacy free-text generation, since /api/generate always sets the column (null for legacy worlds).

1. Open the Supabase dashboard for the project.
2. SQL Editor → New query.
3. Paste the contents of `supabase/migrations/0009_worlds_theme.sql`. Run.
4. Verify the column: `select theme from worlds limit 1;`. Should return without error.
5. If you skipped migrations 0007 + 0008 (B-010) or 0006 (B-009), apply those first too.

## 1. Confirm production deploy is live

1. Open https://realm-shapers.vercel.app in a fresh incognito window.
2. Page loads. The form now shows a "Step 1 — Pick a world" header with 6 theme cards: Castle and Dragons, Forest, Candy Land, City, Space, Underwater.
3. No other steps are visible yet — only step 1 shows.

## 2. Theme picker (Smoke 1)

1. The 6 theme cards render with thumbnail + label + 1-line description.
2. Tap **Castle and Dragons**. Card highlights with an amber ring + "picked" pill.
3. Tap **Forest**. The Castle card de-highlights, Forest highlights. Only one theme is selected at a time.
4. Step 2 is NOT visible until a theme is picked. After picking a theme, step 2 reveals.

PASS: every tap toggles the selection. Step 2 only appears after step 1 is done.

## 3. Setting picker reveals + swaps with theme (Smoke 2)

1. With theme = Castle, step 2 shows a 15-card grid of castle sub-scenes: drawbridge, outer gate, courtyard, great hall, throne room, dungeon, kitchen, library, royal chambers, tower stairs, tower top, royal garden, secret passage, dragon's lair, ancient crypt.
2. Cards labeled "great start" (green badge top-left) are entry candidates: drawbridge + outer gate.
3. Below the grid: "Or describe a different starting place" free text field. Type **secret library**. After typing, the helper text below the field shows "Closest spot in the Castle and Dragons world: **Library**", and the Library card highlights with the amber "picked" pill.
4. Switch theme: scroll up, tap **Forest** at step 1. Step 2 grid swaps to 15 forest sub-scenes (forest edge, mossy path, old oak clearing, hidden pond, witch's cottage, etc). The Castle picks reset.
5. Type **stone ring**. Library helper highlights "Stone Circle".

PASS: grid filters to picked theme, free text matcher narrows correctly, switching themes resets downstream picks.

## 4. Character picker theme-match badges (Smoke 3)

1. With theme = Castle, step 3 shows all 8 character cards: knight, wizard, princess, astronaut, mer-kid, gingerbread kid, robot, dragon.
2. **knight, wizard, princess, dragon** show a "great match" green badge (matches Castle's theme_fit).
3. Tap **knight**. Card highlights with amber ring + "picked" pill.
4. Tap **astronaut**. Knight de-highlights, astronaut highlights. The "great match" badge does NOT appear on astronaut for Castle theme — astronaut shows no badge here.
5. Switch theme to Space at step 1 (this resets steps 2 + 3). At step 3, **astronaut, robot, wizard** now show "great match" badges. Switch to Underwater: only **mer-kid** shows the badge.
6. Picking any character (matching or not) is allowed. The picker grid does NOT block non-matching picks.

PASS: theme-fit characters get a green glow + "great match" badge; switching themes recalculates which characters match.

## 5. Prompt preview reveal + Summon (Smoke 4)

1. Pick: theme Castle, sub-scene Drawbridge, character Wizard, hero name "Elara", goal "find the dragon's lost egg", twist "the dragon is shy".
2. After all 5 inputs are filled, step 6 reveals a card with the assembled prompt:
   > "Create my realm in the **Castle and Dragons** world, starting at the **drawbridge**, starring my **wizard** named **Elara**. My goal is to **find the dragon's lost egg**. The twist is **the dragon is shy**."
3. Confirm bolded ingredients in the card.
4. Scroll up and edit any earlier step (e.g. swap the character to Princess). Confirm the prompt preview updates live with the new ingredient.
5. Click **Summon Realm**. The form shows "Shaping your realm..." and the falling-stars game.
6. ~10-20 seconds later, the play screen loads with a generated realm.

PASS: prompt preview composes correctly, edits live-update, Summon Realm generates and routes to /play.

## 6. Generated story scene 1 = picked entry sub-scene (Smoke 5)

The most important new constraint: scene 1's background MUST be exactly the kid's picked entry sub-scene.

1. Generate a realm with theme Castle, entry Drawbridge.
2. On the play screen, the first scene's background should be the placeholder Castle Drawbridge SVG (gray stone palette, mountain silhouettes, "placeholder: castle_drawbridge" label in the bottom-right corner).
3. Repeat with theme Forest, entry Mossy Path. Confirm scene 1's background is the placeholder forest mossy path SVG.
4. Repeat with theme Underwater, entry Coral Reef Edge. Confirm scene 1's background is the underwater coral reef edge placeholder.

PASS: every fresh generation lands the kid on their picked entry sub-scene as scene 1.

FAIL diagnostics:
- Inspect /api/generate response. `story.starting_scene_id` should be the id of a scene whose `background_id` equals the picked entry sub-scene id.
- If the parser rejected the tree and retried, the second attempt may have succeeded; if it kept failing, /api/generate falls back to the default story (which uses asset-library backgrounds, NOT theme sub-scenes).

## 7. Adjacency for scenes 2-4 (Smoke 6)

Scenes at indices 2, 3, 4 must each use a sub-scene that appears in the previous scene's `connects_to` list. Walk a few realms.

1. Generate ~5 realms across different themes. For each, expand the /api/generate response in DevTools.
2. For each realm, check scenes[2..4]: each scene's `background_id` should be in scenes[idx-1]'s sub-scene's connects_to array (look up via lib/themes-catalog.ts).
3. For one realm (Castle, drawbridge entry), the chain should look something like: drawbridge (idx 0) → outer_gate (idx 1) → courtyard (idx 2) → great_hall (idx 3) → throne_room or library (idx 4).
4. If any scene at index 2-4 fails adjacency, the parser should have rejected the tree. Confirm by repeating: a clean retry should produce an adjacent chain.

PASS: 5/5 sample realms walk the catalog's geographic adjacency for scenes 2-4.

## 8. Free-form for scenes 5+ (Smoke 7)

Scenes from index 5 onward can use any sub-scene from the picked theme — no adjacency required.

1. From the same 5 realms above: confirm scenes[5..n] sometimes use sub-scenes that are NOT in the previous scene's connects_to (e.g., a Castle realm might leap from kitchen at idx 4 to dragon's lair at idx 5 even though kitchen doesn't connect to dragon's lair).
2. If every realm walks pure adjacency through the whole tree, that's fine too; the parser doesn't require divergence, just permits it.

PASS: parser does not reject scenes 5+ for adjacency violations.

## 9. Endings use can_be_ending sub-scenes (Smoke 8)

Every ending scene's `background_id` must be a sub-scene with `can_be_ending: true`.

1. Generate ~3 realms. For each, find every scene where `choices.length === 0` and `is_choice_scene` is not true.
2. Look up each ending's `background_id` in lib/themes-catalog.ts. The matched sub-scene should have `can_be_ending: true`.
3. For the Castle theme, valid ending sub-scenes are: throne_room, dungeon, tower_top, dragons_lair, ancient_crypt. For Forest: witchs_cottage, fairy_glade, bears_den, ancient_tree, forest_heart. Etc.

PASS: all endings across 3 realms use can_be_ending sub-scenes.

## 10. Catalog validator throws on broken refs (Smoke 9)

1. Open `lib/themes-catalog.ts`. Find the castle drawbridge sub-scene. In its `connects_to: ["castle_outer_gate", "castle_secret_passage"]`, edit one id to a fake one like `"castle_nonsense"`.
2. Run `npm run dev` (or just `npx tsc --noEmit`). The catalog import should throw at module load with: `[catalog] sub-scene castle_drawbridge connects_to castle_nonsense but no such sub-scene exists in theme castle`.
3. Revert the edit. `npm run dev` should now start cleanly.

PASS: validator throws with a clear error and reverting fixes it.

## 11. Old worlds still play (Smoke 10)

Pre-B-011 worlds in the DB have `theme = null` and use asset-library background_ids (not sub-scene ids).

1. Open /profile. Tap any old realm thumbnail.
2. The realm renders normally — backgrounds load, scenes navigate, the hero appears.
3. Verify in DevTools: `worlds.theme` for that row is null.

PASS: legacy worlds render without errors and walk normally.

FAIL diagnostics:
- If a legacy world breaks: check the browser console for "background_id ... not in theme catalog" errors. The parser should NOT trigger theme-mode validation for ingredients without theme_id; if it does, lib/claude.ts resolveThemeContext is misbehaving.

## 12. Hero voice routes from catalog character (Smoke 11)

Voice was inferred by Claude in B-010; B-011 locks it to character.voice from the catalog. Princess and wizard → Fena. Knight → Ryan.

1. Generate a Castle realm with character = **Princess**. Play a few scenes, tap the hero. Speech bubble plays — voice should be Fena (girl-coded).
2. Generate another Castle realm with character = **Knight**. Tap the hero. Voice should be Ryan (boy-coded).
3. Generate a Space realm with character = **Astronaut**. Tap the hero. Voice should be Ryan.
4. Generate a Castle realm with character = **Wizard**. Tap the hero. Voice should be Fena.

PASS: voice matches the catalog's `character.voice` field for the picked character.

## 13. Mobile responsive (Smoke 12)

1. Resize the browser to 375px wide (or use Chrome DevTools device emulation, "iPhone SE" preset).
2. The theme grid reflows to 2 columns.
3. The sub-scene grid reflows to 2 columns.
4. The character grid reflows to 2 columns.
5. The prompt preview card wraps cleanly without horizontal overflow.
6. The "Summon Realm" button is full-width.

PASS: 2-column reflow at 375px wide for all three pickers.

## When all 12 smoke tests pass

1. Reply with: "B-011 morning checklist green. Migration 0009 applied. Ship it."
2. The CLI agent will mark this batch shipped in CHANGES.md and queue B-012 planning.

## When something fails

1. Capture: which step, which payload, which DevTools error.
2. Check the "Open" section in `CHANGES.md` for B-011 — it lists known tensions (gingerbread_kid + merkid hero divergence, can_be_entry advisory-vs-required, editor scene-1 swap bypassing theme adjacency).
3. If the bug isn't in the Open list: open a new entry in `CHANGES.md` describing the failure for the next session.
