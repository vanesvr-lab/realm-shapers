# B-013: AI-Generated Art Pilot (Drawbridge + Wizard + 6 Pickups + Entry Video)

> Validation pilot. Vanessa's call after the B-012 sourcing discussion: AI image generation almost certainly produces better art than placeholder SVGs at trivial cost. Before committing to ~100 images across all themes, validate on ONE polished example: 1 Drawbridge background, 1 Wizard character, 6 pickup icons, plus 1 short entry video (drawbridge lowering on scene entry, image-to-video from the static Drawbridge). If the quality jump is real, B-014 scales to the full Castle theme. If quality disappoints, fall back to B-012's SVG regen approach.

## Goal

Generate ~8 demo-quality images via Replicate Flux 1.1 Pro plus 1 short entry video (image-to-video on Luma via Replicate), swap them into the existing catalog, and ship. Total cost: under $1. Total CLI time: under an hour. Vanessa reviews the rendered Drawbridge in the browser (with the entry video kicking off scene 1) and makes the go/no-go call on B-014.

## Decisions Locked

- **Provider: Replicate Flux 1.1 Pro.** Best quality-per-dollar (~$0.04/image). MIT-licensed outputs. Simple REST API. Already a familiar pattern from `lib/elevenlabs.ts`.
- **Pilot scope: exactly 8 images.** 1 Drawbridge background (1792x1024 landscape), 1 Wizard character portrait (1024x1024 square, transparent-ish background), 6 pickup icons (1024x1024 each, simple silhouettes on transparent or light backgrounds). No more — this is validation, not production.
- **Storage: local files in `public/`.** ~4-6 MB total, fine to commit. Path stays the same as current placeholders so swapping is a straight file replace + catalog update.
- **Style prompt suffix shared across all 8** for visual consistency: "painterly fantasy storybook art, soft lighting, vibrant kid-friendly colors, no text or watermarks." Same model, same seed family if Replicate exposes one.
- **No animations on the raster background in pilot.** Skip the SVG-overlay-for-animation complexity for now. Hero bob, pickup glow, scene fade, interactable hover stay (those are React/CSS, layer-independent). Water ripple and banner sway from B-012 scope 4 are DEFERRED — if AI art is gorgeous enough, they may not even be needed. Re-evaluate after Vanessa reviews.
- **Pickups (6):** rusty_key, torch, climbing_rope, dragons_lullaby, ancient_tome, dragons_egg (the 5 gates from B-012 + a goal item).
- **One entry video for Drawbridge** generated via the best current image-to-video model on Replicate. CLI picks the model at run time — recommended candidates in order of preference: (1) `kwaivgi/kling-v1.6-pro` or its current successor, (2) `lightricks/ltx-video`, (3) `stability-ai/stable-video-diffusion-img2vid-xt` as the proven-reliable fallback. CLI verifies the chosen model exists and accepts an image+prompt input before committing to it. Starting frame = the AI-generated drawbridge.webp. Motion prompt: "the drawbridge slowly lowers, water ripples in the moat, banners gently flutter on either side, soft warm sunset light, subtle camera push-in." Target duration: 5 seconds. Saved as `public/backgrounds/castle/drawbridge_entry.{webm|mp4}` — preserve whatever extension Replicate returns; the catalog and renderer read the actual extension. Cost: ~$0.10-0.50 depending on the model. Plays muted, plays once on scene 1 first-entry, fades into the static drawbridge.webp after the last frame. Skippable on tap.
- **Video scope is intentionally minimal: just one clip.** Other Castle sub-scenes get NO video at all. We're validating two things in this pilot: (a) does AI raster look great? and (b) does adding a 5s entry video to a single scene feel "wow" or feel like overkill? Both decisions inform B-014 scope.
- **No regression on other themes/scenes.** Only Drawbridge swaps to AI-generated raster + entry video. Other 14 Castle sub-scenes keep their B-012 SVG regen art (when it ships). Other 5 themes untouched.

## Architectural Decisions

### 1. New env var + provider client

`.env.local`:
- `REPLICATE_API_TOKEN=<paste from replicate.com/account/api-tokens>`

Vanessa pastes her token directly in VS Code (per memory: don't terminal-heredoc secrets).

`lib/image-gen.ts` (new):
- Wraps Replicate's REST API for the Flux 1.1 Pro model.
- Helper: `generateImage({ prompt, aspect_ratio, output_format = "webp" }): Promise<{ url: string; bytes: Buffer }>`.
- Polls Replicate's prediction endpoint until status === "succeeded" (max ~60s).
- Returns the image URL + raw bytes for local saving.
- Errors logged + re-thrown; no silent fallback.
- Second helper: `generateVideoFromImage({ imageUrlOrBuffer, motionPrompt, duration = 5, modelSlug }): Promise<{ url: string; bytes: Buffer; extension: "webm" | "mp4" }>` — wraps a Replicate image-to-video model (slug passed in; CLI picks per the candidate list in Decisions Locked). Polls for ~180s max (videos take longer than images). Returns the video bytes + its actual extension for local saving with the right filename.
- The image2video helper should detect the response format and return the actual extension, not assume.

### 2. One-time generation script

`scripts/generate-pilot-art.ts` (new):

Uses `tsx --env-file=.env.local`. Generates the 8 pilot images sequentially:

1. Drawbridge — prompt: *"A medieval castle drawbridge at golden hour, wooden planks crossing a moat, stone archway with iron chains, distant castle wall, soft warm sunlight, painterly fantasy storybook art, soft lighting, vibrant kid-friendly colors, no text or watermarks."* — aspect 16:9, save as `public/backgrounds/castle/drawbridge.webp`.

2. Wizard — prompt: *"A young wizard with a kind face, wearing a blue starry robe and pointed hat, holding a wooden staff, full-body portrait, soft pale neutral background (light grey or cream), painterly fantasy storybook art, soft lighting, vibrant kid-friendly colors, no text or watermarks."* — aspect 1:1, save as `public/characters/wizard.webp`. Note: Flux doesn't reliably output transparent backgrounds, so we generate with a pale solid background. Acceptable for pilot; if the wizard reads as a "sticker" on top of scene backgrounds during smoke testing, B-014 follow-up will add a Replicate background-removal pass (e.g., `851-labs/background-remover`).

3-8. Pickup icons (1:1 aspect, simple iconic shapes):
- rusty_key: *"a small ornate rusty iron key with a heart-shaped handle, isolated on a clean pale background, painterly fantasy storybook art, vibrant colors, no text"*
- torch: *"a wooden torch with bright orange flame, isolated on a clean pale background, painterly fantasy storybook art, no text"*
- climbing_rope: *"a coiled brown climbing rope with a small grappling hook, isolated on a clean pale background, painterly fantasy storybook art, no text"*
- dragons_lullaby: *"a glowing musical scroll with golden notes floating around it, isolated on a clean pale background, painterly fantasy storybook art, no text"*
- ancient_tome: *"a thick leather-bound ancient book with brass clasps, isolated on a clean pale background, painterly fantasy storybook art, no text"*
- dragons_egg: *"a large speckled iridescent dragon egg in a nest of soft moss, isolated on a clean pale background, painterly fantasy storybook art, no text"*

Save to `public/pickups/{id}.webp`.

9. **Drawbridge entry video** — uses the just-generated drawbridge.webp as the starting image. Motion prompt: *"the drawbridge slowly lowers, water ripples in the moat, banners gently flutter on either side, soft warm sunset light, subtle camera push-in."* Target duration: 5 seconds. CLI picks the image-to-video model from the Decisions Locked candidate list, verifies it exists on Replicate, and runs it. Save the bytes returned by Replicate as `public/backgrounds/castle/drawbridge_entry.{actual_extension}` — the script reads the extension from the response (webm or mp4) and writes the file accordingly. Log the model slug used + final filename + bytes size.

Script logs each generation with cost estimate. Total expected: ~$0.40-0.80 (8 images at ~$0.32 + 1 video at $0.10-0.50 depending on model). Total under $1.

### 3. Catalog updates

`lib/themes-catalog.ts`:
- Castle's `drawbridge` sub-scene: change `file_path` from `/backgrounds/castle/drawbridge.svg` to `/backgrounds/castle/drawbridge.webp`.

`lib/characters-catalog.ts`:
- Wizard's `thumbnail_path` (and any avatar paths the renderer reads): point to `/characters/wizard.webp`.

`lib/pickups-catalog.ts` (created in B-012 scope 1, or create here if B-012 hasn't shipped yet):
- Each of the 6 pickups' `icon_path` points at `/pickups/{id}.webp`.

If B-012 hasn't merged yet, this brief creates the pickups catalog. If B-012 already merged, this brief just updates `icon_path` values.

### 4. Renderer compatibility

`components/StoryPlayer.tsx` and any place that resolves `scene.background_id` to a file_path:
- Today the renderer assumes SVG. With raster (.webp), it should still work via standard `<img>` or background-image — verify whichever pattern is in use handles both extensions.
- If the existing renderer hardcodes `.svg`, generalize it to use whatever extension the catalog returns.

`components/HeroAvatar.tsx` / character renderer: same — handle webp + svg interchangeably.

`components/InventoryBar.tsx` / pickup icon renderer: same.

### 4a. Entry video playback for Drawbridge

`lib/themes-catalog.ts`: add an optional `entry_video_path?: string` field to `SubScene`. Castle's `drawbridge` sub-scene gets `entry_video_path: "/backgrounds/castle/drawbridge_entry.webm"` (or `.mp4` to match what was saved). Other sub-scenes leave it undefined.

`components/StoryPlayer.tsx` (or wherever scene 1 first renders):
- On first mount of a scene, if the scene's sub-scene has `entry_video_path`, render the video instead of the static image. Use a standard `<video>` element with `autoPlay muted playsInline preload="auto"`. The static image (`file_path`) is the video's `poster` attribute so the first frame is identical.
- Track per-realm-session "have I played this entry video already?" in a React ref or sessionStorage key like `realm-shapers:entry-video-played:{world_id}:{scene_id}`. Replays during the same session do NOT replay the video.
- When the video's `onEnded` fires, swap from `<video>` to `<img src={file_path} />`. Use a small CSS opacity crossfade (200ms) to avoid a visual jump.
- Skippable on tap: if the kid taps anywhere on the scene during video playback, immediately swap to the static image (don't wait for it to finish). Same crossfade.
- Mobile autoplay caveat: muted videos generally autoplay on mobile, but verify on iOS Safari. If autoplay is blocked, just render the static image and skip the video for that user (no error UI — graceful degradation).
- The kid's interactables (paths, pickups) render ON TOP of the video. Tap-to-show tooltips work even during video playback (taps that hit interactables don't skip the video; taps on empty scene area DO skip it).

### 5. Old placeholders stay in repo

Don't delete the old SVG placeholders. Keep them at:
- `public/backgrounds/castle/drawbridge.svg.bak` (rename current → .bak before saving the .webp)
- Same for wizard.svg.bak and any pickup SVGs being replaced.

If pilot is rejected, revert the catalog `file_path` updates and the .bak files come right back. Easy rollback.

### 6. Documentation

Add a short note at the top of `lib/image-gen.ts`:

> "B-013 pilot: AI image generation via Replicate Flux 1.1 Pro. If pilot is approved, scale to B-014 (full Castle theme replacement). See docs/cli-briefs/B-013-ai-art-pilot.md."

## Smoke Tests

After CLI runs the script + commits:

1. **Files exist.** `public/backgrounds/castle/drawbridge.webp`, `public/backgrounds/castle/drawbridge_entry.webm` (or .mp4), `public/characters/wizard.webp`, and `public/pickups/{rusty_key, torch, climbing_rope, dragons_lullaby, ancient_tome, dragons_egg}.webp` all present. Images under ~1 MB; video under ~5 MB.
2. **Visual inspection (still images).** Vanessa opens each .webp directly in the browser. Rates each as "demo-worthy" / "decent" / "reject."
3. **Visual inspection (video).** Vanessa opens `drawbridge_entry.webm` directly in the browser. Plays smoothly, looks like the static image at the first and last frame, motion is plausible (drawbridge does lower, water ripples, banners flutter), no obvious AI artifacts. Rate "demo-worthy" / "decent" / "reject."
4. **In-game render.** Generate a Castle realm starting at Drawbridge. The entry video plays once on scene 1 first-entry, then crossfades to the static drawbridge.webp. Wizard character (if picked) renders with the new portrait. Inventory shows the new pickup icons when collected.
5. **Video skippable.** During the entry video, tap on empty scene area. Confirm video skips immediately and the static image appears.
6. **Video plays once per session.** Navigate away from scene 1 (forward to scene 2), then come back. Confirm the entry video does NOT replay; static image renders directly. Refresh the browser → entry video plays again (sessionStorage cleared).
7. **Mobile autoplay.** On a real iPhone (not Chrome devtools), open the deployed site, generate a Castle realm. Confirm the entry video autoplays muted. If it doesn't (iOS being iOS), confirm the static image renders gracefully and the kid still plays normally.
8. **Network/perf.** First page-load network panel: webp images load fast (<1 sec each). Video preloads in background (<3 sec). No 404s.
9. **Old worlds.** Open a pre-B-013 world. Confirm it renders fine via the matcher fallback (other backgrounds, not these new ones, no entry video).
10. **Animations.** Hero bob still works. Pickup glow still works. Scene fade still works. Banner sway and water ripple as SVG `<animate>` are intentionally absent — the entry video covers that motion for the showcase scene.

## The decision criterion

**Vanessa's call after viewing the rendered Drawbridge in the browser:**

- **"Yes, ship the rest"** → write B-014 to AI-generate the other 14 Castle sub-scenes + 7 other characters + any remaining pickups. Same approach.
- **"Quality is meh, fall back"** → revert .webp files to .bak SVGs. Continue with B-012's SVG regen as the baseline approach. Pilot cost: <$1.

## Don't Touch

- Other 14 Castle sub-scenes. They stay on B-012 SVG regen art (or current placeholders if B-012 hasn't shipped yet).
- Other 5 themes (Forest, Candy Land, City, Space, Underwater). No changes.
- B-012 scopes 4-8 (Drawbridge polish animations, ambient sound, gates, level 1, tooltips). All compatible with the new raster background.
- Generation latency. The catalog file_path swap doesn't affect Claude generation time.

## Decisions Open

None at brief-write time. Pilot scope is intentionally narrow.

---

## CLI kickoff prompt

(Paste this into a fresh CLI session in the realm-shapers project. Run AFTER B-012 finishes — don't interrupt B-012 mid-flight.)

```
Read CLAUDE.md and the last 3 CHANGES.md entries.

Then read docs/cli-briefs/B-013-ai-art-pilot.md fully.

This is a NARROW pilot. Total scope: 8 image generations + 1 entry video (Drawbridge) + catalog updates + sessionStorage-gated video playback for scene 1. Aim for under an hour. Total Replicate cost: under $1.

Decisions are locked. Don't expand scope. Don't touch other themes or scenes.

Execute in this order. Each numbered step ends in a commit.

1. Add lib/image-gen.ts (Replicate Flux 1.1 Pro client + Luma Dream Machine image-to-video helper). Add REPLICATE_API_TOKEN to .env.local — STOP and ask Vanessa to paste her token via VS Code (per project memory feedback_secrets_in_vscode.md). Don't proceed until the token is in place.
2. Add scripts/generate-pilot-art.ts. Generates 8 .webp images then 1 entry video (.webm or .mp4 — whichever the chosen image-to-video model returns). Before running, verify the chosen Replicate video model is reachable (curl the model page or Replicate's models endpoint). Run via `npx tsx --env-file=.env.local scripts/generate-pilot-art.ts`. Commit all generated files to public/. Total expected cost under $1.
3. Rename current Drawbridge SVG and Wizard SVG to .bak (preserves rollback path). Update catalog file_paths to point at the new .webp files. Update pickup catalog icon_paths. Add `entry_video_path` to Castle drawbridge sub-scene.
4. Verify renderer handles webp (check StoryPlayer, HeroAvatar, InventoryBar). If any place hardcodes .svg, generalize. Wire up entry-video playback per scope 4a in the brief: `<video>` element with autoplay/muted/playsInline, sessionStorage gate so it plays once per (world_id, scene_id), tap-to-skip, crossfade to static image on end.
5. Run npx tsc --noEmit and npm run build clean. Append a B-013 entry to CHANGES.md noting the pilot is awaiting Vanessa's go/no-go after browser inspection (include the chosen image-to-video model slug, total cost, and file sizes in the entry). Commit and push.

Do NOT delete the old SVG placeholders (.bak files stay until Vanessa says ship). Do NOT generate any other images or videos. Do NOT generate ambient sound (that's B-012 scope 5). Do NOT add entry videos to any other scene — Drawbridge only.

If the chosen video model fails or the result looks broken (rate-limit, content policy reject, garbage output), log the failure clearly in CHANGES.md and ship the rest of the pilot with NO video. Vanessa can review the still images alone and decide whether to retry video on a different model in B-013.5. Don't loop forever on video failures.

When done, write a one-line note for Vanessa: "Pilot art pushed, deployed at https://realm-shapers.vercel.app. Pick a Castle realm starting at Drawbridge with a Wizard character to see all 8 images + the entry video in context. Approve or reject."

Do not autoplay any audio. Do not use em dashes in user-facing copy. Follow CLAUDE.md.
```
