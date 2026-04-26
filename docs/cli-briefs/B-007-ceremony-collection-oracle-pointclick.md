# B-007: Ceremony, Collection, Achievements, Voiced Oracle, Point-and-Click Adventure

> Combined brief from Vanessa's "make it feel rewarding" feedback (2026-04-26 evening). Five pieces, all approved. Ambitious but doable in one overnight CLI run after B-006 wraps.

## Goal

Transform the demo from "type 4 things, watch a story" into something kids look forward to playing. Three emotional hooks: **special** (each creation feels earned), **collect** (their realms accumulate into a trophy shelf), **surprise** (achievements + secret endings drive replay). Plus a fully voiced Oracle character and full point-and-click adventure mechanics in play mode.

## Five Pieces (all in this batch)

| # | Piece | Approach | Effort |
|---|---|---|---|
| 1 | Ceremony around creation | Dramatic reveal animation when generation completes: scroll unfurls, particles, title carved in glowing script, magical audio sting, "Behold: <title>" announcement | ~2 hr |
| 2 | Realm Trading Cards + Collection | Auto-generated card on play completion with rarity badge; profile becomes Pokemon-card-style grid; cards are downloadable PNGs | ~3-4 hr |
| 3 | Achievements + Secret endings | 15-20 server-tracked achievements with pop-up celebrations; secret endings unlocked by ingredient combos or choice patterns; "Mysteries Discovered" counter on profile | ~3-4 hr |
| 4 | Voiced Oracle persona | Illustrated Oracle character on every page; speaks lines aloud via ElevenLabs TTS at key moments (greet, intro realm, react to choices, congratulate); cached audio per line | ~3-4 hr |
| 5 | Point-and-click adventure mode | /play becomes Myst-style: click any clickable object to explore. Inventory tracks collected items. Items combine/use on targets. StoryTree choices become discoverable interactables instead of buttons. | ~6-10 hr |

## Decisions Locked
- 1A: Oracle voice ON (ElevenLabs TTS permission already enabled on the API key)
- 2B: Heavy point-and-click adventure mode (choice buttons mostly retired, replaced by clickable scene objects)
- All five pieces ship in one overnight CLI run

## Architectural Decisions

### Story tree as scaffolding, not gameplay

The B-005 StoryTree (5 scenes, branching choices, endings) stays as the data structure Claude generates. **What changes:** instead of rendering choices as buttons, each `StoryChoice` becomes a discoverable interactable in the scene (a door, a path, a glowing object). Player navigates scenes by clicking objects rather than tapping choice buttons.

Mapping example:
- Scene narration: "You stand at the edge of the Coral Library."
- Choices in StoryTree:
  - `enter_library` → next scene `inside_library`
  - `swim_around` → next scene `secret_grotto`
- In the scene render: a glowing door icon and a glowing waves icon appear over the background
- Click door → transition to `inside_library` scene
- Click waves → transition to `secret_grotto` scene

If a scene has 0 choices (it's an ending), no interactables; just narration + completion ceremony.

Claude's prompt is updated to also output one `interactable_kind` per choice (door, chest, path, sparkle, creature, etc.) which we map to icon overlays.

### Inventory + item use

New schema: each scene can have `pickups` (asset ids that go into inventory when clicked) and `requirements` (item ids needed to interact with a clickable). Example: a chest is `locked: true, requires: ["key"]`. Clicking it without the key shows a hint; with the key in inventory, it opens.

Inventory is per-playthrough, persisted to `worlds.map.player_state` JSONB column on each scene transition.

For B-007 keep this lightweight: each playthrough generates 2-4 pickups and 1-2 requirements at most, woven into the StoryTree by Claude. Don't over-engineer combinable items.

### Voiced Oracle

ElevenLabs TTS via `/v1/text-to-speech` endpoint. Pick one warm, magical, kid-appropriate voice (e.g., a soft female narrator). Cache audio per `(text, voice_id)` in Supabase Storage bucket `oracle_voice` so identical lines never re-pay.

Oracle speaks at:
- First load on / when user has username: "Welcome back, <username>. Ready to shape another realm?"
- Generation reveal: "Behold... <title>." (paired with ceremony animation)
- Scene introduction: first line of each scene's narration
- Achievement unlocked: "You discovered: <achievement_name>!"
- Realm completion: a unique closing line based on the kid's path

Mute toggle in header (saved to localStorage).

### Trading Card design

When a playthrough completes (kid hits an ending scene), generate a "Realm Card":
- HTML/CSS composition (not server-side image gen) that we can download as PNG via html2canvas
- Top: realm title in calligraphy font
- Middle: the kid's chosen character + chosen background as a composed scene
- Bottom: ending narration (truncated), 4 ingredient labels, rarity badge
- Border styled by rarity: Common (silver), Uncommon (gold), Rare (purple gem), Epic (rainbow), Legendary (animated holographic shimmer)

Rarity calculation (server-side, hidden from player):
- Common: any realm
- Uncommon: 5+ unique props placed in editor
- Rare: hit a non-default ending
- Epic: discovered a secret ending
- Legendary: completed within a daily challenge window OR ingredient combo matches a hidden pattern

Profile page (`/profile`) becomes a Pokemon-card grid of all the kid's realms, sorted by date or rarity.

### Achievements

Server-side Supabase table `achievements` (kid earns) and `achievement_defs` (static definitions in code).

Static defs in `lib/achievements.ts`:
```ts
export const ACHIEVEMENT_DEFS = [
  { id: "first_realm", name: "First Realm", description: "Shape your first realm", icon: "🌟" },
  { id: "five_realms", name: "Realm Collector", description: "Shape 5 realms", icon: "📚" },
  { id: "all_backgrounds", name: "World Wanderer", description: "Use every background at least once", icon: "🗺️" },
  { id: "secret_ending", name: "Secret Keeper", description: "Discover a hidden ending", icon: "🔮" },
  // ...15-20 total
];
```

Schema:
```sql
create table user_achievements (
  user_id uuid references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
```

Pop-up celebration component shows on unlock: confetti, sound sting, badge image, name, description. Auto-dismisses in 4 sec or on tap.

### Secret endings

Hidden in the StoryTree generation: when Claude generates a tree, a small fraction of trees (or specific ingredient combos) include a 6th `secret_ending` scene that's not reachable through normal choices. Triggered by:
- Specific ingredient pattern (e.g., "shadow" appearing in a twist + "library" in setting → "Library of Shadows" secret ending)
- Or visiting all 5 main scenes in a single playthrough
- Or finding all pickups in a playthrough

When secret ending fires, dramatic reveal + Oracle line + special card rarity (Epic minimum).

Track `secrets_discovered` counter on profile.

## Files

### New
- `app/api/oracle-voice/route.ts` — POST endpoint, body `{ text, line_kind }`, calls ElevenLabs TTS, uploads MP3 to `oracle_voice` Supabase bucket keyed by SHA1(text), returns signed URL. Cache hit returns immediately.
- `components/OracleAvatar.tsx` — illustrated Oracle character (use Replicate Flux to generate one good portrait at the start, store in `public/oracle.png`), shown in a corner of every page. Animated idle (subtle bob, occasional blink).
- `components/OracleSpeaks.tsx` — shows a speech bubble + plays audio. Used at ceremony moments, scene intros, achievement pops.
- `components/CeremonyReveal.tsx` — full-screen takeover when generation completes: scroll unfurls, sparkles, title appears in script font, Oracle voice plays "Behold... <title>", auto-dismisses after 5 sec → kid lands on /play.
- `components/RealmCard.tsx` — the trading card design. Renders the realm in card layout. Has "Download PNG" button using html2canvas.
- `components/AchievementToast.tsx` — pop-up celebration on unlock.
- `components/InventoryBar.tsx` — slim sidebar showing collected items in current playthrough.
- `components/Interactable.tsx` — wraps a clickable scene element (door, chest, etc.) with hover hint, click handler, and item-requirement check.
- `lib/achievements.ts` — static defs + helpers for checking when achievements unlock based on world creation, completion, etc.
- `supabase/migrations/0004_achievements_and_oracle.sql` — `user_achievements` table + RLS, plus `worlds.map` schema notes (no schema change, just convention)
- `app/api/check-achievements/route.ts` — POST after a world creation or completion event; checks all unlock conditions, inserts new rows for any newly unlocked, returns the list. Frontend triggers AchievementToast for each.

### Modified
- `lib/claude.ts` — extend `StoryTree` schema to include `interactable_kind` per choice (door, chest, path, sparkle, creature) and `pickups` + `requirements` per scene. Update prompt accordingly. Add a `secret_ending` field. Bump default character_id picker to consider ingredient patterns for hidden triggers.
- `app/page.tsx` — wire OracleSpeaks to greet user with username on load (check localStorage to throttle to once per session)
- `app/play/page.tsx` (and `PlayClient.tsx`) — add CeremonyReveal as a transition from generation; replace choice button rendering with `<Interactable>` icons placed in the scene; add `<InventoryBar>`; trigger `OracleSpeaks` on scene entry; on completion, render `<RealmCard>` modal with download button + "Make another" + "Save your worlds"
- `app/profile/page.tsx` — replace flat list with a card grid of `<RealmCard>` thumbnails; add achievements section showing unlocked badges + locked silhouettes; add `secrets_discovered` counter
- `app/api/generate/route.ts` — after world insert, call `check-achievements` and include unlocked list in response
- `lib/asset-library.ts` — small additions if any new prop ids needed for typical interactables (door, glowing path); regenerate just those few
- `lib/elevenlabs.ts` — add `generateVoiceLine(text: string)` calling TTS, return MP3 buffer
- `package.json` — add `html2canvas` for trading card download
- `tailwind.config.ts` — add custom keyframes for ceremony reveal (scroll unfurl, sparkle, glow), inventory pulse, achievement bounce
- `CHANGES.md` — entry on completion

### Deleted
- None.

## User Flow (the new demo)

1. Kid lands on `/`. Oracle avatar appears in corner. Oracle speaks: "Welcome back, dragonbreath92" (if returning) or stays silent (if first visit).
2. Kid fills 4 ingredients. Optionally taps "Give me ideas" — instant seeds appear (from B-006). Submit.
3. Generation runs. Star-tap mini-game shows during wait (from B-006).
4. **Ceremony reveal:** screen takes over. Particles, scroll unfurls. Oracle speaks: "Behold... The Coral Library." Title appears in glowing script. 5-sec dramatic moment.
5. Lands on `/play`. Edit mode (still works as in B-005).
6. Kid composes scene. Hits Play.
7. **Play mode is point-and-click.** Scene fills the screen. Oracle speaks the scene's intro narration. Background + character + props visible. **Glowing icons** appear on certain props (the StoryChoice interactables): a door, a glowing chest, a path. Other props (like a flower or a tree) might be pickups (collectable, +1 to inventory) or just decoration.
8. Kid clicks the door → smooth transition to scene 2. Or clicks the chest → opens with sparkles, pickup added to inventory. Or clicks a flower → it's a pickup, added to inventory.
9. Scene 3: a locked door requiring the key the kid picked up earlier. If key in inventory: door opens. If not: subtle hint Oracle line "Hmm, perhaps you need to find a key first."
10. Kid hits an ending. Final Oracle line. **RealmCard appears** with rarity badge. Kid can download PNG, save world (existing flow), or "Make another."
11. **AchievementToast pops** if anything unlocked: "🌟 First Realm!" with confetti.
12. Profile shows the new realm card in their growing collection grid. Achievements panel shows badges earned + locked silhouettes for ones not yet earned.

## Out of Scope (defer to B-008+)

- Item combination logic (e.g., key + lock = open, just gate behind one item per requirement)
- Multi-step puzzles
- Realm sharing reactions (other kids leaving emoji on shared realms)
- Daily challenges with rotating prompts
- Pet/companion system
- Realm "world map" navigation (constellation of all your realms)
- Oracle character customization
- Multiple voice options for the Oracle

## Definition of Done

- New world generation triggers ceremony reveal with scroll, particles, voiced "Behold... <title>"
- Oracle avatar on every page; speaks greetings/scene intros/achievement pops with cached TTS
- Mute toggle works
- Play mode is point-and-click: clicking on door/chest/path interactables advances scenes; pickups go into inventory; locked interactables require items
- Reaching an ending shows a downloadable RealmCard with correct rarity
- Profile shows card grid + achievements panel; "Mysteries Discovered" counter
- Discovering a secret ending triggers Epic+ rarity card and unlocks the secret ending achievement
- All builds clean, deployed, smoke tested
- CHANGES.md updated, MORNING_CHECKLIST_007.md written, pushed

## Effort Estimate (post-calibration)

- Ceremony reveal component + audio integration: ~1.5 hr
- Trading Cards + Collection grid + html2canvas download: ~3 hr
- Achievements table + check API + toast + 15-20 def list: ~3 hr
- Oracle: avatar gen + OracleSpeaks + ElevenLabs TTS lib + bucket setup + cache: ~3 hr
- Point-and-click rebuild: Interactable component + scene rendering update + inventory + Claude prompt extension + state machine: ~6-7 hr
- Glue, deploy, smoke: ~1-2 hr

**Total: 12-15 hr CLI work** at the calibrated pace from B-005 (which finished in ~10 min for substantial work despite my earlier estimate of 2 hr). This batch is bigger but in line with what one overnight CLI run can deliver.

## Risks

- **Ceremony reveal might feel too long for kids who just want to play.** Auto-dismiss at 5 sec is the cap; kids can tap to skip after 2 sec.
- **TTS latency** for first-play of any line is 2-4 sec. Mitigate: pre-warm common lines (greeting, "Behold") at deploy time.
- **Point-and-click discovery: kids might not see the interactables.** Add a brief tutorial overlay on first scene of first playthrough ("✨ Click the glowing things to explore"). Show on first session only.
- **Achievement and secret ending logic could miss edge cases.** Default to "no false positives" and log unlock attempts so we can tune later.
- **Card rarity calculation** might confuse kids if it feels random. Show a small "Why is it Epic?" tooltip on the card with the criteria that triggered it.
- **B-006 + B-007 stacked latency**: each piece adds bundle size. Use Next dynamic imports for ceremony, RealmCard, OracleAvatar, Inventory to keep initial load fast.

## Pre-CLI Setup (Vanessa, before launch)

- ElevenLabs TTS permission: DONE per Vanessa 2026-04-26 evening
- Optional: pick a preferred voice ID from ElevenLabs library and tell the CLI which one. If not specified, CLI picks a default warm narrator voice.
