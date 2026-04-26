# Morning Checklist — B-006 (Polish + Interactivity)

Built and deployed overnight 2026-04-26 → 2026-04-27. Smoke tests below were not performed by the agent. Walk through each before considering B-006 green.

Production URL: https://realm-shapers.vercel.app

## What changed since B-005

1. **Instant ingredient seeds.** Every "Give me ideas" button now opens to a list of 8-10 hardcoded kid-friendly seeds (loads in <100ms, no spinner). A "🔮 Show me more from the Oracle" button below appends 3 Claude-generated suggestions at a time, capped at 3 calls per slot per session.
2. **Star-tap mini-game during loading.** When generation kicks off, a falling-stars tap game appears below "The Oracle is weaving..." with a score counter and elapsed timer. Auto-disappears the moment the generate request completes.
3. **Richer assets.** All 95 PNGs regenerated with a new Flux prompt (Studio Ghibli watercolor / golden hour atmosphere instead of the prior flat cartoon style).
4. **Clickable props in play mode.** Each scene prop is now tappable. First click sends `(world_id, scene_id, prop_id)` to a new `/api/prop-interaction` endpoint, which asks Claude for a one-sentence reaction + animation (wiggle / pulse / glow / open). The prop animates and a speech bubble pops up with the narration for ~4 seconds. Repeat clicks on the same prop are instant (server + client cache).

## Smoke walkthrough (run in order)

### A. Instant ideas
1. Open the production URL in incognito.
2. Tap "Give me ideas" next to **Setting**. Confirm the modal opens with 10 visible bullets in well under a second, no spinner. Tap one to fill the field.
3. Same for Character, Goal, Twist. Each shows 10 seed ideas instantly.
4. Tap "🔮 Show me more from the Oracle" on any slot. Confirm a Claude wait (~3-5s) and then 3 purple-tinted suggestions appended below the seeds.
5. Tap the Oracle button two more times. After the third call, the button disappears and a small note explains the cap.

### B. Star-tap mini-game
1. Fill in all four ingredients (any combination).
2. Tap **Shape my realm**. Confirm a starry box appears below the loading text, stars fall from the top, and tapping pops them with a +1 score and a colorful star burst.
3. The score and the running timer update visibly.
4. When generation completes (~10-25s), the mini-game vanishes and you land on `/play` in Edit mode.

### C. Asset quality
1. From the Edit screen, browse the asset palette. Tap into Backgrounds, Characters, Props panels.
2. Confirm the assets look painterly / watercolor / Ghibli-inspired, not flat cartoon. There should be visible atmospheric depth in backgrounds and softer painted texture on characters and props.
3. If anything looks markedly worse than the previous batch, flag it. Per-asset regen: `npx tsx scripts/generate-assets.ts --only id1,id2 --force`.

### D. Click-to-interact in play mode
1. From the Edit screen, tap **Play** in the SceneEditor (or the Play button wherever it lives in the editor flow).
2. In any scene, click a default prop in the lower portion of the scene. Confirm:
   - First click: small pulse while waiting (~2-3s), then the prop runs the chosen animation and a speech bubble appears above it for ~4s with a one-sentence reaction.
   - Second click on the same prop: instant cached response (no spinner).
   - Try props in 2-3 different scenes. Reactions should feel grounded in the scene's title / narration, not generic.
3. Confirm exiting play mode (✕ Exit) and re-entering still has the cached responses.

### E. Regression sweep
1. End-of-story flow still lands on the "Edit my story" panel.
2. Per-scene ambient audio still loads after a Play tap.
3. Save your worlds modal still works (B-002a flow).
4. Shared `/w/[slug]` page still renders.

## Known imperfections (acceptable for hackathon)

- One or two of the new backgrounds may have stray figures or characters baked in despite the "no people, no characters" prompt clause. Flux Schnell drifts. Fix by `--only <id> --force`-ing the offender.
- The prop interaction cache is in-memory per Vercel instance. Cold starts reset it. Acceptable for demo scale; first click on a prop after a cold start re-pays Claude.
- Animations are CSS-only and don't pause when the speech bubble is up; they fire once.
- Star game is decorative only. No win state.

## If something is broken

- **Build still works locally:** `unset ANTHROPIC_API_KEY && npm run build` should be clean.
- **Type check:** `unset ANTHROPIC_API_KEY && npx tsc --noEmit` clean.
- **Roll back the prop feature only:** `git revert <commit-hash-for-prop-interaction>` removes that commit; the rest of B-006 stays.
- **Roll back the asset re-gen only:** `git revert <commit-hash-for-asset-regen>` restores prior PNGs but keeps the new STYLE_SUFFIX (you can re-run the script if you want).

## Next batch hints

- If kids still call the assets bland after seeing the new Ghibli-inspired output, B-007 is a real visual overhaul (custom hand-drawn assets or a different model entirely, e.g. SDXL with a LoRA).
- Consider adding subtle SFX on prop click (B-006 was punted on this to keep scope small).
- Add a per-prop "first-touch reward" (small score / sparkle) if Anaya wants the play screen to feel more game-y.
