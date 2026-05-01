# Morning Checklist — B-015 (Entry videos on adventure scenes)

Built and deployed 2026-05-01 in a CLI session, after B-014. Smoke tests below were not performed by the agent. Walk through each before considering B-015 green.

Production URL: https://realm-shapers.vercel.app

## What changed

Five adventure scenes in Hunt the Dragon's Egg now play a short looped MP4 on first visit before crossfading to the static image, matching the B-013 castle drawbridge pattern.

Wired scenes:
- forest_riddle (`/adventures/hunt-dragon-egg/forest_riddle_entry.mp4`)
- dark_cavern (`/adventures/hunt-dragon-egg/dark_cavern_entry.mp4`)
- lava_river_crossing (`/adventures/hunt-dragon-egg/lava_river_crossing_entry.mp4`)
- volcano_base, the speaking volcano scene (`/adventures/hunt-dragon-egg/volcano_base_speaks_entry.mp4`)
- dragon_chamber (`/adventures/hunt-dragon-egg/dragon_chamber_entry.mp4`)

Code-side changes:
- `StoryScene` in `lib/claude.ts` gains an optional `entry_video_path` field. Adventure scenes set it directly. Theme-catalog scenes leave it unset and continue to use the existing `SUB_SCENES_BY_ID[scene.background_id]?.entry_video_path` lookup.
- `StoryPlayer.tsx` falls through `scene.entry_video_path` first, then the sub-scene catalog, then null. No other StoryPlayer changes; the existing playback, sessionStorage gating, tap-to-skip, crossfade, and onError fallback all still apply.
- `lib/adventures/hunt-dragon-egg.ts` adds `entry_video_path` on the five scene definitions above.

The forest_riddle MP4 is committed in this batch (was untracked from a previous overnight render); the other four MP4s were already on disk from earlier.

Build is clean: `npx tsc --noEmit`, `npm run lint`, registry validator (`registry OK`), and `npm run build` all pass. /play first-load JS is unchanged at 252 kB. Production deploy succeeded.

## Smoke walkthrough (run in order)

### A. Forest riddle plays its video on first visit
1. Open https://realm-shapers.vercel.app in incognito.
2. Pick the Castle theme and play the prologue + starter picker as usual.
3. Begin the adventure. The first adventure scene is the forest riddle.
4. The forest riddle background should start as a short looped video, then crossfade to the static painted image after the clip ends.
5. Tap the screen during the video. It should skip immediately to the static image (tap-to-skip).
6. Answer the riddle and walk forward.

### B. Once-per-session gating still works
1. Without closing the tab, navigate back to the forest riddle (loop a run, or use Play Again).
2. The video should NOT play this time; the static image renders directly. The sessionStorage key `realm-shapers:entry-video-played:<worldId>:forest_riddle` was set on the first visit.
3. Open a new incognito window. The video should play again on first visit there. (Different sessionStorage scope.)

### C. Each of the other 4 scenes plays its video on first visit
Run a single playthrough that hits all four:
1. Forest riddle → forest_path (gentle riverbank route): not video-gated, just walk.
2. Take the cliff route (rope) eventually onto volcano_base. **Volcano base video should play on first visit.**
3. From volcano_base, take the cave path → dark_cavern. **Dark cavern video should play.**
4. Light the lantern, push through to lava_chamber via cave_shortcut + dragon_cubs. (No videos on those.)
5. Alternately, run a different path that goes through lava_river_crossing on the way to lava_chamber. **Lava river crossing video should play.**
6. Reach dragon_cubs, then dragon_chamber. **Dragon chamber video should play.**

If any of those plays as a static image only (no video frame at all), open devtools network and look for the corresponding mp4 path. A 404 means the video file is missing on disk; the StoryPlayer onError handler will silently fall through to the static image, which is intended.

### D. Regression sweep
1. Castle theme drawbridge entry video still plays on first visit (B-013 pattern, unchanged).
2. Other castle sub-scenes (gate, courtyard, throne_room, etc.) continue to render the static SVG immediately, no video.
3. No console errors during any scene transition.
4. Audio: nothing autoplays. Videos are muted (per the B-013 pilot pattern); no narration over the clip.

## Known imperfections (acceptable for hackathon)

- Videos are muted. The kid does not hear the volcano speak; that's the static-image narration text and the Oracle voice. If you want voiced volcano dialogue, that's a future batch.
- Background variants (e.g. dragon_chamber_calm vs dragon_chamber_wounded) all play the same entry video. Per the brief, this is out of scope: "if the kid is hungry or thirsty, we still play the same video."
- First playback per scene per session can feel like a brief pause while the MP4 buffers. The crossfade hides most of it. If it's too long on slow connections in playtest, we'd revisit (preload the next scene's MP4, or cap the video to the crossfade window).
- The dragon_chamber MP4 is the largest at ~12 MB. It's still served as a static asset off Vercel's CDN, no streaming. Acceptable for a hackathon demo audience on wifi.

## Rollback path

If anything in this batch is broken in playtest:

```
git revert 529b6a8 e84ce0d
git push
vercel --prod --yes
```

That removes the entry_video_path field from the schema, reverts StoryPlayer to the SubScene-only lookup, and pulls the entry_video_path entries off the 5 adventure scenes. The MP4 files stay in /public/ harmless (no code references them post-revert).

## Files changed

- `lib/claude.ts` (StoryScene gains optional entry_video_path)
- `components/StoryPlayer.tsx` (entryVideoUrl fall-through)
- `lib/adventures/hunt-dragon-egg.ts` (5 scenes get entry_video_path)
- `public/adventures/hunt-dragon-egg/forest_riddle_entry.mp4` (new on disk; the other 4 MP4s were already committed in earlier batches)
- `MORNING_CHECKLIST_015.md` (this file)
- `CHANGES.md`

## Commits

- `e84ce0d` add scene-level entry_video_path and prefer it in StoryPlayer
- `529b6a8` wire entry videos for 5 hunt-dragon-egg scenes
- (this checklist + CHANGES commit follows)
