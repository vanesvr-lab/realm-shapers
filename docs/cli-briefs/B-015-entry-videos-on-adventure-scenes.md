# B-015: Entry videos on adventure scenes

## Goal

Wire up looped entry videos on adventure scenes so the dragon chamber, the speaking volcano, the lava river, the dark cavern, and the forest riddle scene each play a short MP4 clip on first visit before the static image takes over. Reuses the B-013 drawbridge pattern.

The MP4s themselves are generated separately (Vanessa runs `npx tsx --env-file=.env.local scripts/generate-hunt-dragon-egg-videos.ts` overnight or manually). This brief is the code-side wiring only.

## Project context

- Read `CLAUDE.md` first.
- Existing entry video pattern: theme catalog SubScene has `entry_video_path?: string`. StoryPlayer reads `SUB_SCENES_BY_ID[scene.background_id]?.entry_video_path` (`components/StoryPlayer.tsx` line ~162). Plays the video once per (worldId, sceneId) via sessionStorage key `realm-shapers:entry-video-played:${worldId}:${sceneId}`. Tap to skip. Crossfades to static image on end.
- Adventure scenes (in `lib/adventures/hunt-dragon-egg.ts`) currently have NO way to declare an entry video, because the lookup goes through SUB_SCENES_BY_ID which only knows theme-catalog sub-scenes.
- Video files (when generated) are at `/public/adventures/hunt-dragon-egg/<scene>_entry.mp4`. See `scripts/hunt-dragon-egg-videos.ts` for the planned filenames.

## Scope

### A. Schema addition in `lib/claude.ts`

Add one optional field to `StoryScene`:
- `entry_video_path?: string` — direct path to MP4 under `/public/`. Adventure scenes set this to e.g. `/adventures/hunt-dragon-egg/dragon_chamber_entry.mp4`. Optional; theme-catalog scenes leave it unset and rely on the existing SubScene.entry_video_path lookup.

### B. StoryPlayer update

In `components/StoryPlayer.tsx`, the `entryVideoUrl` lookup (around line 162) currently is:
```
const entryVideoUrl = SUB_SCENES_BY_ID[scene.background_id]?.entry_video_path ?? null;
```

Change to fall through:
```
const entryVideoUrl =
  scene.entry_video_path ??
  SUB_SCENES_BY_ID[scene.background_id]?.entry_video_path ??
  null;
```

Adventure scenes win when both happen to be set. No other changes needed; the existing video playback, crossfade, and once-per-session gating all still apply.

### C. Adventure data updates in `lib/adventures/hunt-dragon-egg.ts`

Set `entry_video_path` on these 5 scenes:
- `DRAGON_CHAMBER`: `entry_video_path: "/adventures/hunt-dragon-egg/dragon_chamber_entry.mp4"`
- `VOLCANO_BASE`: `entry_video_path: "/adventures/hunt-dragon-egg/volcano_base_speaks_entry.mp4"`
- `LAVA_RIVER_CROSSING`: `entry_video_path: "/adventures/hunt-dragon-egg/lava_river_crossing_entry.mp4"`
- `DARK_CAVERN`: `entry_video_path: "/adventures/hunt-dragon-egg/dark_cavern_entry.mp4"`
- `FOREST_RIDDLE`: `entry_video_path: "/adventures/hunt-dragon-egg/forest_riddle_entry.mp4"`

If an MP4 file does not exist on disk yet, the video element will fail to load and the `onError` handler in StoryPlayer ends the video gracefully, falling through to the static image. So this wiring is safe even before all videos are generated.

### D. Tests

1. `npx tsc --noEmit` clean
2. `npm run lint` clean
3. `npx tsx -e 'import("./lib/adventures/index").then(() => console.log("registry OK")).catch(e => { console.error(e); process.exit(1); })'` prints "registry OK"
4. `npm run build` clean
5. (Optional) start dev, hit `http://localhost:3001`, walk through Castle adventure to forest_riddle scene, confirm video plays if MP4 exists, or confirm static image renders if missing. No JS errors in console.

### E. Deploy

If all tests pass:
```
vercel --prod --yes
```

Append a CHANGES.md entry. Update or create `MORNING_CHECKLIST_015.md` if this is run in a separate session from B-014.

## Out of scope

- Generating the videos themselves (Vanessa runs `scripts/generate-hunt-dragon-egg-videos.ts`).
- Adding more adventure scenes with videos (just the 5 listed for this batch).
- Audio narration over the videos (videos play muted, like the drawbridge pilot).
- Background variants for video scenes (out of scope; if the kid is hungry or thirsty, we still play the same video).

## Acceptance

- StoryScene.entry_video_path field exists and is optional.
- StoryPlayer falls through to it before the SubScene lookup.
- Five adventure scenes declare a path.
- Type check, lint, build all clean.
- Vercel deploy succeeds.
- Site renders correctly with or without the .mp4 files on disk.
