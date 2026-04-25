# B-002b + B-003 + B-004: Kid-Facing Experience Layer

> Combined brief. Ship the full kid experience: landing page, ingredient form,
> generated world with animated SVG map, ambient audio. Built on top of B-001
> scaffold + B-002a auth.

## Goal

Replace `/test` as the play surface. Build the demo a hackathon judge will
actually see: kid lands on `/`, enters 4 ingredients, clicks Generate, sees
their world come alive with title, narration, an animated SVG map, and ambient
audio.

## Scope

Three batches bundled into one execution because they integrate tightly.

- **B-002b** Animated SVG map (C-lite per brainstorm: static map + Play button + character walks predetermined path with narration overlays at each stop, no branching).
- **B-003** Kid landing page with 4-ingredient form (Q1 layout B: hero + form on same scrollable page) and "give me ideas" buttons per slot (Q4 B: Claude suggests 3 options per ingredient on click).
- **B-004** Ambient audio via ElevenLabs Sound Effects API, started in parallel with Claude generation (Q3 A) so it is ready when the kid clicks Play.

## Decisions Locked In

| Question | Choice | Implication |
|---|---|---|
| Q1 landing layout | B: hero + form same page | One scroll, no extra navigation |
| Q2 map detail | C-lite: animated walk-through, no branching | ~2-3 hr build, demos well |
| Q3 audio timing | A: parallel with text generation | Audio ready when kid clicks Play |
| Q4 form helpers | B: "give me ideas" per slot | Adds delight, ~1 hr |

## Architecture Changes

### lib/claude.ts: new response schema

Extend `GeneratedWorld` so Claude returns map data and an audio prompt in the
same call:

```ts
export type MapLocation = {
  id: string;          // slug like "coral_reef"
  name: string;        // human label like "The Coral Library"
  x: number;           // 0-100, percent of viewBox width
  y: number;           // 0-100, percent of viewBox height
  icon: string;        // single emoji, kid-friendly
  description: string; // 1-2 sentence narration shown when character arrives here
};

export type WorldMap = {
  background_color: string;   // hex, e.g. "#1e3a5f" for an underwater scene
  terrain_paths: string[];    // array of SVG path d attribute strings, rendered with a soft fill
  locations: MapLocation[];   // 3 to 5 locations, in walk order
  character_emoji: string;    // single emoji for the character
};

export type GeneratedWorld = {
  title: string;
  narration: string;
  map: WorldMap;
  audio_prompt: string;       // a short text prompt for ElevenLabs Sound Effects
};
```

Update `buildPrompt` so Claude returns this richer JSON. Keep the parser strict.
Coordinates clamped to 0-100. Locations array length 3 to 5. Single-emoji
validation (one grapheme).

### New API routes

- `POST /api/generate` extended to write map + audio_prompt into `worlds` table. Migration `0003_world_extras.sql` adds `map jsonb` and `audio_prompt text` columns to `worlds` (nullable, since B-001 rows do not have them).
- `POST /api/audio` new route. Body: `{ world_id }`. Reads `audio_prompt` from `worlds`, calls ElevenLabs Sound Effects, returns the MP3 binary. RLS: only the world owner can request audio for their world.
- `POST /api/ideas` new route. Body: `{ slot: "setting" | "character" | "goal" | "twist", current_values: WorldIngredients }`. Calls Claude for 3 ingredient suggestions tailored to the slot and existing ingredients. Returns `{ suggestions: string[] }`.

### New library file

- `lib/elevenlabs.ts` with `generateSoundEffect(prompt: string): Promise<Buffer>` calling the ElevenLabs Sound Effects API. Env var `ELEVENLABS_API_KEY`.

### Migration 0003

```sql
alter table worlds add column map jsonb;
alter table worlds add column audio_prompt text;
```

Vanessa applies via Supabase dashboard SQL editor before kicking off the CLI run, same pattern as B-002a Task 3.

## Files to Touch

### New

- `lib/elevenlabs.ts`
- `supabase/migrations/0003_world_extras.sql`
- `app/api/audio/route.ts`
- `app/api/ideas/route.ts`
- `app/play/page.tsx` (the result view: title, narration, map, Play button, audio playback)
- `components/IngredientForm.tsx` (4 inputs, "give me ideas" buttons, Generate button)
- `components/WorldMap.tsx` (the SVG map render + character animation + narration overlay)
- `components/IdeaButton.tsx` (the per-slot suggestion modal)
- `components/AudioPlayer.tsx` (controls the soundscape; never autoplay per CLAUDE.md)

### Modified

- `lib/claude.ts` (new schema, new prompt, new parser)
- `app/api/generate/route.ts` (persist map + audio_prompt; trigger audio generation in parallel and store the resulting MP3 in Supabase Storage so the kid can replay)
- `app/page.tsx` (replace the auth-routing splash with the new landing: hero text + IngredientForm. Authenticated users still get routed to `/profile` if they have one; otherwise the new landing renders for everyone)
- `app/test/page.tsx` (delete; superseded by `/` + `/play`)
- `components/SaveYourWorldsModal.tsx` (mount on the new landing/play surface, not just `/test`)

### Not touched

- Auth, consent, login, profile, share-by-link pages: stable from B-002a.

## User Flow (the demo)

1. Kid lands on `https://realm-shapers.vercel.app/`.
2. Sees a warm hero ("Shape your own realm"), scrolls to a 4-input form.
3. Per input, can click "Give me ideas" → modal with 3 Claude-generated suggestions → tap to fill.
4. Clicks Generate.
5. Form disables, shows a "Shaping your realm..." state. Frontend calls `POST /api/generate` (kicks off Claude AND ElevenLabs in parallel server-side) and waits for the response.
6. Page transitions to `/play?world={slug}` showing title, narration, the static SVG map, and a Play button. Audio MP3 URL is included in the response.
7. Kid clicks Play.
8. Audio starts. Character emoji animates along the path through each location via CSS transitions (e.g., 4 sec per leg). At each location, the location's description fades in as an overlay.
9. After the last location, "The End" appears with two buttons: "Make another" (back to `/`) and "Save your worlds" (existing modal from B-002a).

## Audio Storage

ElevenLabs returns an MP3 Buffer. Two storage options:

- **Inline data URL** in the response. Simple, but bloats the JSON and re-fetches every time.
- **Supabase Storage** bucket `world_audio`, key = `{world_id}.mp3`. Returns a signed URL valid for 1 hour. Kid can replay without re-spending ElevenLabs credits.

Use Supabase Storage. Create bucket in dashboard before CLI run. RLS: service-role writes, public read on signed URLs only.

## "Give Me Ideas" Behavior

When kid clicks the button next to (e.g.) the Setting input:
1. Opens a modal "Pick one or write your own"
2. Shows a loading spinner while POST /api/ideas runs
3. Renders 3 suggestion buttons + a "type my own" close button
4. Tapping a suggestion fills the input and closes the modal

Cap at 3 calls per slot per session (cheap rate limit, prevents accidental loop).

## Out of Scope (this batch)

- Per-location story branching (Q2 C full was cut to C-lite)
- Interactive map editing
- Multiple maps per world
- Audio remixing
- Music (only Sound Effects, no Music Generation API)
- Avatar (deferred since B-002a)
- Public gallery (Phase 3)
- Mobile-specific layout polish (responsive defaults from Tailwind only)
- Animations beyond CSS transitions

## Definition of Done

- Visit `https://realm-shapers.vercel.app/` in incognito → land on the form.
- Fill 4 inputs (using "Give me ideas" at least once).
- Click Generate → within 15 seconds, transition to `/play` with title, narration, map, Play button, narration text reads age-appropriate.
- Click Play → audio plays, character walks the path, location descriptions appear in sequence.
- "Save your worlds" still works (Flow B from B-002a unchanged).
- Production deploy passes `npm run build`, `npx tsc --noEmit`, full smoke.
- CHANGES.md updated, pushed.

## Effort Estimate (honest)

- B-003 landing + form + ideas: ~3 hr
- B-002b map + animation: ~2 hr
- B-004 audio integration: ~2 hr
- Glue, deploy, build smoke: ~1 hr
- Total: ~8 hr CLI work, plus ~15 min Vanessa morning verification.

## Risks

- **ElevenLabs Sound Effects latency** (10-20 sec per CLAUDE.md). Parallel call with Claude masks this. If audio is slow, Generate response holds until both done, max ~25 sec total.
- **Claude returning bad map JSON** (out of bounds coords, missing locations, multi-codepoint emoji that breaks layout). Strict parser, retry once on parse failure, fall back to a default scene if retry fails (do not leave kid stuck).
- **Ideas endpoint cost** spikes if kid spams it. The 3-calls-per-slot cap is enforced client-side; not robust to API abuse but fine for hackathon.
- **`/play` page state on hard refresh.** The world slug is in the URL, so `/play?world=abc123` re-fetches via service-role client (same pattern as `/w/[slug]`). Audio URL re-issued on demand.
