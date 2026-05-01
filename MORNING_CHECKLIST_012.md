# Morning Checklist — B-012

> Overnight CLI agent shipped Castle polish, required-pickup gates, and a Drawbridge showcase. Castle is now the demo theme: real iconography on all 15 sub-scene SVGs, 5 gates (rusty key → library, torch → dungeon, climbing rope → tower stairs, dragon's lullaby → dragon's lair, ancient tome → ancient crypt), level 1 jumps from 2 to exactly 3 outbound choices per scene, choice tooltips foreshadow soft consequence, and Drawbridge gets a hero idle bob, an ambient water + wind + banner loop, and a mute toggle. Other 5 themes intentionally untouched.

Production URL: https://realm-shapers.vercel.app
Repo: https://github.com/vanesvr-lab/realm-shapers

## 0. Migrations + secrets sanity (BLOCKER)

No new DB migration in B-012. Confirm the prior migrations (0006, 0007, 0008, 0009) are already applied; if not, apply them first, otherwise the kid's first realm will fail at insert time.

The new ambient route uses the existing `oracle_voice` Supabase storage bucket (writes to `ambient/drawbridge.mp3`). It auto-creates the bucket on first call, so nothing to do unless bucket creation fails (then create it manually as private).

Secrets needed: `ELEVENLABS_API_KEY` (already in Vercel from B-009), `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. No new env vars.

## 1. Castle theme art across all 15 sub-scenes (Smoke 1)

1. Open https://realm-shapers.vercel.app in a fresh incognito window.
2. Generate ~3 Castle realms (different entry sub-scenes each time). Walk every scene of each.
3. Confirm every Castle sub-scene shows recognizable castle iconography (stone blocks, iron portcullis, banners, hearth fire, bookshelves, four-poster bed, spiral stairs, parapet, hedges + fountain, hidden door, gold piles + dragon silhouette, sarcophagi). NOT abstract grey blobs.
4. Drawbridge is the B-013 webp render plus the entry video; the other 14 are detailed placeholder SVGs with the small "placeholder: castle_X" label bottom-right.

PASS: every Castle sub-scene reads as itself at a glance. No "what is this" moments.

FAIL diagnostics: If a sub-scene is still the old grey blob, hard-refresh (cmd+shift+R) to bypass cache. If still wrong, check `public/backgrounds/castle/{name}.svg` was actually committed — `git log --oneline -- public/backgrounds/castle/` should show the regen commit.

## 2. Drawbridge showcase (Smoke 2)

1. Generate a Castle realm with entry = Drawbridge.
2. On scene 1: the entry video plays once (B-013 behavior), tap-to-skip works, then crossfades to the still drawbridge.webp.
3. The Wizard (or whatever character was picked) bobs subtly up and down on a ~2.4s loop, 2px swing. Should feel alive, not bouncing.
4. After your first tap anywhere on the page, ambient sound starts: gentle moat water + distant wind + faint banner. Volume is quiet, around 30 percent. (No autoplay before the first tap; this is the no-autoplay rule.)
5. If Claude placed the rusty_key in scene 1 (likely on Drawbridge per the prompt), it appears as a glowing pickup tile. Tap to collect; it joins the inventory.
6. The scene shows exactly 3 outbound interactables (left, right, bottom-center).

PASS: scene feels alive. Hero bob, ambient sound after first tap, 3 interactables, optional Rusty Key glow.

FAIL diagnostics:
- No ambient: open DevTools, check `/api/ambient` returns 200 with a `url` field. First call generates the mp3 (slow, 10-20s); refresh the page after to use the cached upload. If the call 500s, look at the server log for the ElevenLabs failure detail.
- Hero not bobbing: check the HeroAvatar inner motion.div is in the DOM (inspect element); if it isn't there, the entrance animation may be eating the bob.

## 3. Drawbridge → Library gate (Smoke 3)

1. From Drawbridge, pick up the Rusty Key (visible as a glowing pickup if Claude placed it there). Confirm it lands in the inventory.
2. Walk the realm until you find a choice that leads to **Library**. The choice should NOT show a lock icon now that you have the key.
3. Activate it. The Library scene loads. Books, candle, scroll on floor.
4. Generate a fresh Castle realm. Intentionally do NOT pick up the Rusty Key (skip past it). Walk to the Library choice. The interactable now shows a lock icon.
5. Tap the locked choice. The tooltip should hint at the missing item ("Find Rusty Key first").

PASS: gate locks without the key, opens with the key, shows a clear hint.

FAIL diagnostics:
- If Library is reachable without the key: Claude may not have placed `requires: ["rusty_key"]` on the choice. Check the /api/generate response for the choice's `requires` array. Re-generate; the prompt's REQUIRED-PICKUP RULE should fire on retry.
- If the key never appears as a pickup anywhere: Claude failed to emit it. The prompt now lists it in the GATE PICKUPS block but compliance is not 100 percent. Note frequency in the open thread.

## 4. All 5 gates work (Smoke 4)

Same idea as smoke 3, for the other 4 gates. Each pickup should be findable in scenes 1-4; each gate is at scene 5+.

1. **Torch → Dungeon.** Generate a Castle realm with a Dungeon sub-scene reachable. Confirm torch as pickup early; locked Dungeon without it; unlocked with it.
2. **Climbing Rope → Tower Stairs.**
3. **Dragon's Lullaby → Dragon's Lair.**
4. **Ancient Tome → Ancient Crypt.**

PASS: 5/5 gates work end-to-end. (3/5 is acceptable on a single morning if some realms simply don't visit those sub-scenes; re-roll a few times.)

FAIL diagnostics: same as smoke 3.

## 5. Level 1 = 3 options per scene (Smoke 5)

1. Generate ~3 fresh level-1 Castle realms.
2. Walk every non-ending non-choice scene. Each should have exactly 3 outbound interactables, never 2.
3. Resize browser to 375px wide. Confirm the 3 interactables don't crowd or overlap. Hit targets stay tappable (≥44px).
4. Same check on Forest, Candy Land, City, Space, Underwater.

PASS: 3 interactables per scene across all themes; mobile layout clean.

FAIL diagnostics:
- If a scene has 2 choices: Claude returned a tree with 2 choices and the parser should have rejected it. Check the /api/generate response and the server log. The prompt now says "EXACTLY 3" but compliance can slip; the parser will throw and trigger a retry.
- Mobile crowding: inspect the existing CHOICE_POSITIONS in components/StoryPlayer.tsx. They are pre-calibrated for 3 interactables. If they overlap on a specific scene, capture a screenshot for the open thread.

## 6. Hint quality (Smoke 6)

1. Pick a choice. Tooltip should foreshadow MOOD or REWARD or SOFT CONSEQUENCE, not just say "go here" or "this path looks calm".
2. Sample 5 random scenes across 3 realms. Examples of good hints (per the new prompt):
   - "Cross openly. Heroes who pass through the gate are remembered, but the guards are watching."
   - "Slip through the side path. Quieter route, but you might miss the captain's news."
   - "Take the rusty key. Some doors only open with stubborn metal."
3. Hints can fall short of these examples but should clearly hint at experience, not just tone.

PASS: 4/5 hints feel like a thinking person wrote them, not a guesser.

FAIL diagnostics: open thread it for B-013+ if hints are too generic. Claude may regress here; the 3 examples in the prompt are anchors.

## 7. Other themes unchanged (Smoke 7)

1. Generate one realm in each of: Forest, Candy Land, City, Space, Underwater.
2. Each realm renders existing B-011 placeholder backgrounds (not the new Castle iconography).
3. Each level-1 realm has 3 outbound choices per scene (the bump applies to all themes).
4. No ambient sound starts on these themes (Drawbridge ambient is castle-specific).
5. No ambient mute button shows in the header.
6. No required-pickup gates appear in these themes.

PASS: 5/5 other themes still play through cleanly with their existing placeholders + new 3-option level 1.

## 8. Ambient mute toggle (Smoke 8)

1. On Drawbridge, the top-right header shows the ↩ Editor button, then a 🔊 Ambient toggle button, then 🚪 Leave realm.
2. Tap the 🔊 Ambient button. Audio fades to silent. Icon flips to 🔈.
3. Walk to scene 2 (anywhere outside Drawbridge). Audio is already stopped (we left the ambient track) — toggle button disappears since scene 2 isn't drawbridge-mapped.
4. Walk back to Drawbridge (if the realm has a path back). Audio resumes silent because the mute is sticky. The button shows 🔈.
5. Tap to unmute. Audio fades back in to 30 percent.
6. Refresh the page. The mute state persists in localStorage `realm-shapers:ambient-muted`. Confirm by hard-refreshing while muted: the next Drawbridge load is silent until you unmute.

PASS: mute is sticky across scenes and refreshes; toggle only shows on scenes with an ambient track.

## 9. Catalog validator throws on broken refs (Smoke 9)

1. Open `lib/themes-catalog.ts`. Find the `castle_library` sub-scene. Edit `required_pickups: ["rusty_key"]` to `required_pickups: ["nonexistent_pickup"]`.
2. Run `npx tsc --noEmit`. Type-check should still pass (it's a string field). Run `npm run dev`.
3. The Next.js server should refuse to start (or the first request should 500) with: `[catalog] sub-scene castle_library required_pickups references unknown pickup nonexistent_pickup`.
4. Revert the edit. `npm run dev` should start cleanly.

PASS: validator throws with a clear error and reverting fixes it.

## 10. Old worlds still play (Smoke 10)

Pre-B-012 worlds (B-011 and earlier) have `theme` either null (legacy) or a real theme id. None of them have required_pickups gates because that field didn't exist when they were generated.

1. Open /profile. Tap any pre-B-012 realm thumbnail.
2. The realm renders normally. Backgrounds load (theme catalog or asset library), scenes navigate, the hero appears.
3. No 500s in the network tab.
4. If the old realm was Castle-themed and you walked back through it, none of the choices should have lock icons (because Claude didn't emit `requires` for the gate items in the older tree).

PASS: legacy worlds render and play through without crashes.

## When all 10 smoke tests pass

1. Reply with: "B-012 morning checklist green. Castle is demo-ready. Ship it."
2. The CLI agent will mark this batch shipped in CHANGES.md and queue B-013+ planning (real Castle art via Replicate, scaling Drawbridge polish to other showcase scenes, etc.).

## When something fails

1. Capture: which step, which payload, which DevTools error.
2. Check the "Open" section in `CHANGES.md` for B-012 — it lists known tensions (Claude may not always emit gate pickups, ambient may need a re-generation pass for a tighter loop, water ripple + banner sway not implemented because Drawbridge is now a webp).
3. If the bug isn't in the Open list: open a new entry in `CHANGES.md` describing the failure for the next session.
