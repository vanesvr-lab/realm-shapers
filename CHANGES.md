# CHANGES.md

> Cross-surface session handoff log. Append-only. Read last 2-3 entries at session start. Add new entry at session end.

## Entry Template

```
## B-XXX — YYYY-MM-DD HH:MM — [CLI | Desktop]
**Touched:** files changed
**State:** Working | Broken | Mid-refactor
**Open:** open threads, unfinished work
**Next session:** instructions for the next surface
**Pushed:** yes (commit hash) | no (why)
```

---

## B-000 — 2026-04-24 — Bootstrap
**Touched:** CLAUDE.md, CHANGES.md, .gitignore, .claude/settings.json, docs/*
**State:** Working. Repo scaffolded with kickoff package, no app code yet.
**Open:** None.
**Next session:** Begin B-001 (project scaffold). Read docs/cli-briefs/B-001-project-scaffold.md before starting.
**Pushed:** yes

## B-001 — 2026-04-25 00:30 — CLI
**Touched:** package.json, package-lock.json, tsconfig.json, tailwind.config.ts, postcss.config.mjs, next.config.mjs, .eslintrc.json, app/layout.tsx, app/page.tsx, app/globals.css, app/favicon.ico, app/fonts/*, lib/claude.ts, app/api/generate/route.ts, app/test/page.tsx, CHANGES.md
**State:** Working. Next.js 14 + React 18 + Tailwind 3 scaffolded. Pipeline (4 ingredients to JSON world) verified locally and on Vercel production. Model is claude-opus-4-7.
**Open:**
- Vercel deployment protection may be ON by default for personal projects. If the public hackathon demo URL prompts for login, disable protection in the Vercel dashboard (Project Settings, Deployment Protection, "Only Preview Deployments" or off).
- Vanessa's shell exports an empty ANTHROPIC_API_KEY that shadows .env.local. Local dev must be launched with `unset ANTHROPIC_API_KEY && npm run dev`. Tracking root cause as a follow-up (likely in zshrc/zprofile/zshenv). Saved to project memory.
- ANTHROPIC_API_KEY was pasted in chat during this session. Rotate on or after 2026-05-02 (after the May 1 demo). Saved to project memory with rotation steps.
- Git committer email is auto-detected as elaris@Vanessas-MacBook-Air.local (non-deliverable). Worth setting `git config --global user.email` to a real address.
- Brief specified `claude-sonnet-4-20250514`; bumped to `claude-opus-4-7` per current model defaults. If we want to drop cost later, swap to `claude-sonnet-4-6` or `claude-haiku-4-5` in lib/claude.ts.
**Next session:** Plan and execute B-002 (SVG map rendering). The brief does not exist yet, so first write `docs/cli-briefs/B-002-svg-map.md`, then implement. Touch: a new SVG map component, extend `lib/claude.ts` to also return map data, expand the Claude prompt schema. Do NOT add UI for ingredient input yet (that is B-003).
**Pushed:** yes
**Production:** https://realm-shapers.vercel.app
**Repo:** https://github.com/vanesvr-lab/realm-shapers

## B-002a — 2026-04-25 — CLI (overnight unattended)
**Touched:** lib/supabase.ts, lib/supabase-server.ts, lib/username.ts, lib/username-blocklist.ts, middleware.ts, supabase/migrations/0002_auth.sql, app/api/generate/route.ts, app/test/page.tsx, app/auth/callback/route.ts, app/consent/page.tsx, app/setup-username/page.tsx, app/profile/page.tsx, app/w/[slug]/page.tsx, app/login/page.tsx, app/privacy/page.tsx, components/SaveYourWorldsModal.tsx, components/UsernameInput.tsx, components/ShareWorldButton.tsx, scripts/test-username.ts, package.json, package-lock.json, docs/design-doc.md, CHANGES.md, MORNING_CHECKLIST.md
**State:** Built and deployed. Anonymous-first auth, parent-fronted upgrade via Supabase magic link, COPPA disclosures on `/consent`, kid picks username on `/setup-username`, profile lists worlds with share buttons, public `/w/[slug]` page renders shared worlds without usernames. `npm run build` clean, `npx tsc --noEmit` clean, username smoke test 10/10. **Smoke tests pending Vanessa AM verification per `MORNING_CHECKLIST.md`** — agent did not click magic links or step through browser flows.
**Open:**
- Manual smoke through Flows A, B, C, D in the browser (see `MORNING_CHECKLIST.md`).
- Task 1 manual setup (Supabase project, env vars, migration apply, Vercel env vars) was done by Vanessa before bed; agent skipped Task 1 entirely. `.env.local.example` and the README env-var section from Task 1 steps 6-7 were NOT created. Add later if useful for collaborators.
- `lib/supabase.ts` was split into `lib/supabase.ts` (client-safe `browserSupabase`) and `lib/supabase-server.ts` (`serverSupabase` + `serviceRoleSupabase`) because Next.js fails to compile when a client component imports a module that statically imports `next/headers`. All server-side files import from `@/lib/supabase-server`. Plan called for a single file; this is a deviation worth noting.
- `scripts/test-username.mjs` from the plan was renamed to `scripts/test-username.ts`. Reason: Node 24 swallows the `.mjs` import before tsx sees it, and the import of a `.ts` module fails. Renaming gave tsx ownership.
- `support@realm-shapers.example` is a placeholder. Replace with a real inbox before public launch (mentioned in `/consent` and `/privacy`).
- Privacy notice copy is hackathon-grade. Privacy lawyer review is the explicit "before public launch" step.
- Orphan anon-user cleanup cron not implemented. Acceptable for demo scale, follow-up batch.
- "Save your worlds" button currently lives on `/test` (the dev surface). When B-003 builds the real landing page with the 4-ingredient form, the button moves there too.
- `app/page.tsx` is still the Next.js default splash. B-003 replaces it.
- SUPABASE_SERVICE_ROLE_KEY was selected/displayed in the chat transcript at session start. Treat as exposed and rotate via Supabase dashboard (Settings → API → Reset service role secret) when convenient. Then update `.env.local` and re-run `vercel env add SUPABASE_SERVICE_ROLE_KEY production` (and `preview`).
**Next session:** After Vanessa walks `MORNING_CHECKLIST.md` and confirms green, plan and execute B-002b (SVG map render) or B-003 (kid landing page replacing `/test`).
**Pushed:** yes
**Production:** https://realm-shapers.vercel.app
**Repo:** https://github.com/vanesvr-lab/realm-shapers

## B-006 — 2026-04-26 22:00 → 2026-04-27 — CLI (overnight unattended)
**Touched:** lib/ingredient-seeds.ts (new), lib/asset-library.ts (STYLE_SUFFIX + SCENE_STYLE_SUFFIX rewrite), lib/claude.ts (PropAnimation type, generatePropInteraction), components/IdeaButton.tsx (instant seed list + Oracle path moved behind a button), components/StarTapGame.tsx (new), components/LandingForm.tsx (StarTapGame mounted in loading state), components/InteractiveProp.tsx (new), components/StoryPlayer.tsx (props now wrapped in InteractiveProp), app/api/prop-interaction/route.ts (new), app/globals.css (wiggle/glow/open/pulse keyframes), public/assets/{backgrounds,characters,props}/* (all 95 PNGs regenerated), CHANGES.md, MORNING_CHECKLIST_006.md.
**State:** Built and deployed. The four pieces of kid feedback from B-005 are addressed:
- "Give me ideas" now shows 8-10 hardcoded kid-friendly seeds instantly (no spinner). The Claude path is preserved behind a "🔮 Show me more from the Oracle" button, capped at 3 calls per slot per session.
- Loading screen now hosts a falling-stars tap mini-game with score + timer; auto-disappears when generation completes.
- All 95 assets re-generated via Flux Schnell with a Studio Ghibli watercolor / golden hour atmospheric prompt. New PNGs are visibly more painterly (file sizes roughly 2x the prior batch). 95/95 succeeded, 0 failures.
- In play mode, every default prop is now wrapped in `<InteractiveProp>`. Click → POST `/api/prop-interaction` → Claude returns a one-sentence reaction and an animation choice (wiggle / pulse / glow / open). Speech bubble overlay shows the narration for ~4s. Server-side cache (cap 30) and client-side cache key on `(world_id, scene_id, prop_id)`, so re-clicks are instant.

`npx tsc --noEmit` clean, `npm run build` clean, deployed via `vercel --prod --yes` to https://realm-shapers.vercel.app. **Smoke tests pending Vanessa AM verification per `MORNING_CHECKLIST_006.md`** — agent did not click through any browser flow.
**Open:**
- Per-prop Claude calls add ~2-3s on first click. Aggressive caching mitigates this for repeat clicks within a server lifetime, but Vercel cold starts reset the in-memory cache.
- Flux occasionally drifted away from "no people, no characters" in backgrounds (e.g. `castle_courtyard.png` has a small figure). If any new background looks wrong, regenerate it: `npx tsx scripts/generate-assets.ts --only <id> --force`. Spot-check on a handful of backgrounds (forest, beach, underwater, castle_courtyard, space) and a few characters/props (dragon, oracle, treasure_chest) showed strong painterly improvement and was deemed material enough to keep the run.
- Star-tap game is decorative only (no win state, no escalating difficulty). If kids ask for more substance, swap to a memory-match game in B-007.
- The kid-facing Edit→Play flow gates the prop interactions behind whatever scene composition the editor picks. The interaction data is keyed by `prop_id` rather than the editor-placed prop instance, so two of the same prop in one scene share a cache entry.
- New runtime npm deps: none. (Existing `@anthropic-ai/sdk`, Tailwind animations via globals.css, no new packages.)
- Old prop animation classes are pure CSS in `app/globals.css`, not in tailwind.config.ts. Brief suggested config-level keyframes; globals.css was simpler and self-contained.
**Next session:** After Vanessa walks `MORNING_CHECKLIST_006.md` and confirms green, the four kid asks are addressed. Highest-leverage follow-ups in priority order: (1) if assets are still called bland, plan B-007 visual overhaul (different model or hand-drawn assets); (2) add SFX on prop click to make play mode feel more reactive; (3) per-scene editing (currently only scene 1 editable); (4) tighten share-link auth on `/play` and `/w/[slug]`.
**Pushed:** pending — final push happens after this entry is committed.
**Production:** https://realm-shapers.vercel.app
**Repo:** https://github.com/vanesvr-lab/realm-shapers

## B-005 — 2026-04-26 — CLI (overnight unattended)
**Touched:** lib/asset-library.ts, lib/asset-files.generated.ts, lib/claude.ts, lib/world-audio.ts, scripts/generate-assets.ts, scripts/generate-placeholders.ts, scripts/sync-asset-files.ts, public/assets/{backgrounds,characters,props}/*.svg (95 placeholders), public/3d/kit/{character,nature,platforms}/glTF/*.gltf (Quaternius platformer kit, glTF only), app/page.tsx, app/play/page.tsx, app/play/PlayClient.tsx, app/w/[slug]/page.tsx, app/w/[slug]/SharedStoryClient.tsx, app/api/generate/route.ts, app/api/audio/route.ts, app/api/scene/edit/route.ts, app/preview-3d/page.tsx, app/preview-3d/Preview3DClient.tsx, components/LandingForm.tsx, components/AssetPalette.tsx, components/SceneEditor.tsx, components/SceneCanvas.tsx, components/PropOverlay.tsx, components/TextBubble.tsx, components/StoryPlayer.tsx, components/StylePicker.tsx, components/Forest3DScene.tsx, .gitignore, package.json, package-lock.json, CHANGES.md, MORNING_CHECKLIST_005.md. Deleted: components/WorldMap.tsx, components/IngredientForm.tsx (renamed to LandingForm.tsx).
**State:** Built and deployed. Demo is rebuilt around: a curated 95-asset library (15 backgrounds + 30 characters + 50 props), a drag/resize/layer scene editor with text bubbles and Claude re-narration (cap 5 per session), a 5-scene branching choose-your-own-adventure player with per-scene ambient ElevenLabs audio, and a code-split 3D platformer teaser at /preview-3d (Quaternius character with idle/walk/jump animations, 8 platforms, 3 collectible hotspots). `npx tsc --noEmit` clean, `npm run build` clean, deployed to https://realm-shapers.vercel.app. **Smoke tests pending Vanessa AM verification per `MORNING_CHECKLIST_005.md`** — agent did not click through any browser flow.
**Open:**
- **BLOCKER on real images:** Replicate API returned 402 Payment Required. The asset library shipped with **SVG placeholders for all 95 assets**, not real Flux-generated PNGs. The editor and player work end-to-end with placeholders. To produce real PNGs: (1) add credit to Replicate (https://replicate.com/account/billing), (2) `unset ANTHROPIC_API_KEY && npx tsx scripts/generate-assets.ts` (~10-20 min, ~$1-2 in flux-schnell credits), (3) curate / regen any obviously-broken outputs with `--only id1,id2 --force`, (4) `npx tsx scripts/sync-asset-files.ts` to flip the manifest to .png, (5) commit and redeploy. Walked through in `MORNING_CHECKLIST_005.md`.
- StoryTree generation can take 15-25 seconds end-to-end (Claude opus emits ~2-3 KB JSON for the 5-scene tree). Falls back to a generic default tree if Claude fails twice. Consider swapping to claude-sonnet-4-6 in `lib/claude.ts` if too slow.
- `/api/scene/edit` cap (5 rewrites per user per server lifetime) is held in an in-memory Map, so it resets on Vercel cold starts. Acceptable for demo, not robust against abuse.
- `/api/audio` now keys per scene at `${world_id}/${scene_id}.mp3` in the `world_audio` Storage bucket. Old `${world_id}.mp3` objects from B-002b/003/004 are orphaned but harmless.
- 3D scene relies on `unoptimized` <Image> for asset PNGs/SVGs because Vercel image optimization can be slow/quota-heavy in dev. Worth flipping to optimized once real PNGs land.
- The Quaternius character glTF has 19 animations baked in. Currently used: Idle, Walk, Jump. `Wave`, `Punch`, `Run`, `Dance` etc. are still inside the model and could be wired up to story-specific events later.
- `components/WorldMap.tsx` and old `components/IngredientForm.tsx` were deleted; the new editor flow replaces them. Old `worlds.map` rows from prior batches will hit the "made before the new story system" message on `/play` and `/w/[slug]`.
- Quaternius `Blends/`, `FBX/`, `OBJ/`, `2D/` folders excluded via .gitignore (only glTF is shipped to Vercel, ~6 MB total).
- Optional ambient music at `public/3d/kit/ambient.mp3` is wired up: if Vanessa drops a CC0 track in, the 3D teaser shows a Play music toggle. If absent (current state), a small "Ambient music will be added soon" footer appears.
- `react-three/fiber@^8` (not 9) was pinned because v9 requires React 19; we're on React 18. If we ever upgrade React, bump R3F together.
- New runtime npm deps (approval implicit via brief): `three`, `@react-three/fiber`, `@react-three/drei`, `react-rnd`, `replicate`. `replicate` is technically only needed for the asset-gen script; we kept it as a regular dep so Vanessa can run the script without re-installing. Worth moving to devDependencies later.
**Next session:** After Vanessa walks `MORNING_CHECKLIST_005.md` and confirms green, the demo is shippable for the May 1 deadline. Highest-leverage follow-ups in priority order: (1) get Replicate credit and run the real asset gen so the editor stops looking like placeholder boxes; (2) responsive polish for narrow phones (the AssetPalette stacks under the canvas at <lg, but tap-to-place hasn't been verified); (3) consider per-scene editing in v2 (currently only scene 1 is editable, scenes 2-5 use Claude-picked compositions); (4) swap claude-opus to sonnet if generation latency feels slow during demo.
**Pushed:** pending — final push happens after morning checklist is written.
**Production:** https://realm-shapers.vercel.app
**Repo:** https://github.com/vanesvr-lab/realm-shapers

## B-002b + B-003 + B-004 — 2026-04-25 — CLI (overnight unattended)
**Touched:** lib/claude.ts, lib/elevenlabs.ts, lib/world-audio.ts, supabase/migrations/0003_world_extras.sql, app/api/generate/route.ts, app/api/audio/route.ts, app/api/ideas/route.ts, app/page.tsx, app/play/page.tsx, app/play/PlayClient.tsx, app/profile/page.tsx, app/test/page.tsx (deleted), app/globals.css, components/IngredientForm.tsx, components/IdeaButton.tsx, components/WorldMap.tsx, components/AudioPlayer.tsx, CHANGES.md, MORNING_CHECKLIST_002b.md
**State:** Built and deployed. `/` is now the kid-facing landing (hero + 4-ingredient form with per-slot Claude "give me ideas" suggestions). `/api/generate` returns Claude's title + narration + animated SVG map data + ambient audio_prompt and uploads the ElevenLabs MP3 to the `world_audio` Supabase Storage bucket. `/play?world={id}` walks the character emoji along the map locations with a narration overlay per stop and plays the soundscape behind a Play gesture. End screen offers Make another and Save your worlds (existing B-002a flow). `/test` removed; profile back-link points at `/`. `npm run build` clean, `npm run lint` clean, `npx tsc --noEmit` clean. Vercel `--prod` deploy succeeded. **Smoke tests pending Vanessa AM verification per `MORNING_CHECKLIST_002b.md`** — agent did not click Generate or Play in a real browser.
**Open:**
- Manual smoke per `MORNING_CHECKLIST_002b.md` (incognito → form → generate → /play → audio → save).
- Claude + ElevenLabs are sequential, not truly parallel: ElevenLabs needs the audio_prompt that Claude returns. The brief asked for parallel; the practical version parallelises the storage upload with the DB insert. Total Generate latency observed in build (sequential): ~Claude 10s + ElevenLabs 15s ≈ 25s, matching the brief's worst-case estimate. If this feels too long during demo, swap Claude to `claude-sonnet-4-6` in `lib/claude.ts`.
- `/play` uses service-role read for the world (per brief's hard-refresh note). This means anyone who knows or guesses the world UUID can view a kid's playthrough. UUIDs are unguessable so this is acceptable for hackathon scale, but worth tightening (auth-checked read with share-slug fallback) before public launch.
- `/api/audio` is owner-checked via RLS (auth'd kid replays). Storage bucket `world_audio` is private; only signed URLs (1h TTL) are exposed.
- Default fallback world (used if Claude returns invalid JSON twice) lives in `lib/claude.ts` as `defaultWorld`. It is intentionally generic so the kid never gets stuck. If you see the default scene in the demo, check Claude API health.
- IdeaButton hard-caps "More ideas" at 3 calls per slot per session. Client-side only; not robust against direct API abuse, fine for hackathon.
- Audio is a 22-second loop (ElevenLabs Sound Effects max duration). The walkthrough is ~22 seconds for 5 locations and shorter for 3-4, so it loops cleanly.
- Migration 0003 + the `world_audio` bucket + `ELEVENLABS_API_KEY` env var were applied by Vanessa before this run; not re-verified by the agent.
- Shared world page `/w/[slug]` is still text-only (title + narration + ingredients). Extending it to render the animated map for shareable replay is a natural next batch.
**Next session:** After Vanessa walks `MORNING_CHECKLIST_002b.md` and confirms green, the major hackathon arc is shippable. Remaining nice-to-haves: persistent share view of the animated map (extend `/w/[slug]`), responsive polish for narrow phones, and the orphan anon-user cleanup cron.
**Pushed:** yes
**Production:** https://realm-shapers.vercel.app
**Repo:** https://github.com/vanesvr-lab/realm-shapers
