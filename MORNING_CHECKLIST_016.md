# Morning Checklist — B-016 (Real art for the 7 placeholder picker characters)

Built and deployed 2026-05-01 in a CLI session, after B-015. Smoke tests below were not performed by the agent. Walk through each before considering B-016 green.

Production URL: https://realm-shapers.vercel.app

## What changed

The landing-page character picker (step 3) used to show 7 SVG placeholder circles plus the wizard's real PNG. Now all 8 tiles are real, transparent, watercolor-style PNGs. Knight, princess, astronaut, mer-kid, gingerbread kid, robot, and dragon now match the wizard.

Code-side changes:
- `lib/asset-library.ts` adds a `gingerbread_kid` character entry. Prompt: "a friendly gingerbread kid with white icing buttons, a candy belt, and a warm cinnamon smile". Library otherwise unchanged.
- `lib/asset-files.generated.ts` records `gingerbread_kid: png`.
- `scripts/remove-character-bgs.ts` rewritten as a generalization of the wizard one-off. It now dual-writes transparent PNGs to BOTH `/public/assets/characters/<library_id>.png` (HeroAvatar) AND `/public/characters/<picker_id>.png` (landing-page picker), with an explicit picker-to-library alias map (the only alias is `merkid` → `mermaid`). Default target is the 7 picker ids; wizard is excluded by default but accepted explicitly.
- `lib/characters-catalog.ts` swaps 7 `thumbnail_path` entries from `.svg` to `.png`.

Asset changes (8 new PNGs in /public/characters/, plus 1 new in /public/assets/characters/):
- `public/assets/characters/gingerbread_kid.png` (new, ~561 KB transparent)
- `public/characters/{knight,princess,astronaut,merkid,gingerbread_kid,robot,dragon}.png` (new mirrors of the asset-library versions, ~490-740 KB each, transparent)

Cleanup (deleted):
- `public/characters/{knight,princess,astronaut,merkid,gingerbread_kid,robot,dragon}.svg` (placeholder circles, no longer referenced)
- `public/characters/wizard.svg.bak` (leftover from the B-015 wizard one-off)

The `/public/assets/characters/{knight,princess,astronaut,mermaid,robot,dragon}.png` files were re-written by the bg-removal script but their bytes were identical to the previously committed versions (idempotent — the bg-remover is deterministic, and those characters were already bg-removed in earlier work). Git correctly reported them as unchanged.

Build is clean: `npx tsc --noEmit`, `npm run lint`, registry validator (`registry OK`), and `npm run build` all pass. /play first-load JS unchanged at 252 kB. Production deploy succeeded.

## Smoke walkthrough (run in order)

### A. All 8 picker tiles render real art
1. Open https://realm-shapers.vercel.app in incognito.
2. Walk the landing form to step 3 (character picker). On a fresh load, the form is the title page and "create" path; click through Setting + Goal + Twist to land on the character grid.
3. Confirm all 8 tiles show real, watercolor-style figures with transparent backgrounds (the picker card color shows through). No SVG circles, no broken-image icons, no dotted outlines on a square crop.
4. Open devtools network and reload step 3. Confirm each `/characters/<id>.png` returns 200 OK. No 404s on `<id>.svg`.

### B. Picker-to-asset-library alias check (mer-kid)
1. The mer-kid tile should render at `/characters/merkid.png` (per `lib/characters-catalog.ts`).
2. The HeroAvatar in /play resolves the same character through the asset library at `/assets/characters/mermaid.png`. (If you pick mer-kid and play through, the in-game avatar should be the mermaid render with transparent background.)

### C. HeroAvatar in /play for each newly-arted character
For each of the 7 newly-arted characters, run a short adventure:
1. Pick the character from the picker.
2. Land in /play.
3. Confirm the HeroAvatar in the lower-left of the scene shows the same figure as the picker tile, with subtle B-013 bob animation, and a transparent cutout (no hard edge box around the character).
4. Particularly important for `gingerbread_kid` since this is brand new in the asset library. Pick the candy_land theme since gingerbread_kid's `theme_fit` is `["candy_land"]`. Confirm the gingerbread shows up scaled and positioned consistently with the other characters.

### D. Wizard regression
1. Pick the wizard from the picker. The tile should be the same image as before B-016 (this batch did not regenerate the wizard).
2. Confirm wizard works in /play unchanged.

### E. Entry-video regression (B-015 still works)
1. Pick a wizard or knight + Castle theme. Walk into the Hunt the Dragon's Egg adventure (this is the path that has the entry videos).
2. The forest_riddle scene should still play its B-015 entry video on first visit, then crossfade to the static image.
3. Hit at least one more video scene (volcano_base or dragon_chamber). Both should still play.
4. Reason for this check: B-016 ran `sync-asset-files.ts` which rewrites `lib/asset-files.generated.ts`. That manifest does not reference any video paths, so videos should be unaffected, but worth a one-scene sanity check.

### F. SVG cleanup is complete
1. `ls public/characters/` should list 8 PNGs and nothing else (no .svg, no .svg.bak).
2. `git log -p HEAD -- public/characters/` should show the deletions in commit `69ef5f6`.

## Image sanity (already reviewed by agent)

The agent visually inspected the gingerbread_kid PNG before and after bg removal. Both looked correct:
- Before: warm cinnamon-colored figure with white icing buttons and a red-and-white candy belt, rendered in soft watercolor on a near-white background.
- After: same figure with the background fully transparent, edges clean. ~561 KB at 1024x1024.

The other 6 characters were already bg-removed and shipped in earlier batches; this run was idempotent for them and produced byte-identical output.

If any tile looks wrong on the production picker (cropping, border halo, color shift), the per-character regen path is:

```bash
unset ANTHROPIC_API_KEY
npx tsx --env-file=.env.local scripts/generate-assets.ts --only <library_id> --force
npx tsx --env-file=.env.local scripts/remove-character-bgs.ts <picker_id>
npx tsx scripts/sync-asset-files.ts
```

For mer-kid, library_id is `mermaid`; for the others picker_id == library_id.

## Known imperfections (acceptable for hackathon)

- Mer-kid is rendered from the `mermaid` asset-library entry; there is no separate `merkid` source. The picker label says "Mer-Kid" but the underlying art is the standard mermaid. This is the same as before B-016, just now wired through the alias map cleanly.
- Picker tile layout is unchanged. The 8 PNGs vary slightly in pose and crop (different Flux outputs) so the tile grid does not look perfectly uniform. Acceptable; the wizard set the precedent.
- The `/public/assets/characters/{knight,princess,astronaut,mermaid,robot,dragon}.png` re-write was a no-op in this batch (bytes identical), but it did consume Replicate credits (~$0.03 across 6 characters) and ~12 seconds of API time. Future runs of the bg-removal script can pass an explicit subset to avoid this if it matters.

## Rollback path

If anything in this batch is broken in playtest:

```bash
git revert 69ef5f6 484c95a
git push
vercel --prod --yes
```

That restores the placeholder SVG circles, removes the picker-mirror PNGs, and removes the gingerbread_kid asset-library entry. The wizard one-off from B-015 stays intact.

## Files changed

- `lib/asset-library.ts` (gingerbread_kid character entry added)
- `lib/asset-files.generated.ts` (manifest update)
- `lib/characters-catalog.ts` (7 thumbnail_path swaps, .svg → .png)
- `scripts/remove-character-bgs.ts` (rewritten to dual-write with picker alias map)
- `public/assets/characters/gingerbread_kid.png` (new)
- `public/characters/{knight,princess,astronaut,merkid,gingerbread_kid,robot,dragon}.png` (new picker mirrors)
- `public/characters/{knight,princess,astronaut,merkid,gingerbread_kid,robot,dragon}.svg` (deleted)
- `public/characters/wizard.svg.bak` (deleted)
- `MORNING_CHECKLIST_016.md` (new)
- `CHANGES.md`

## Commits

- `484c95a` add gingerbread_kid art and dual-write picker character pngs
- `69ef5f6` point picker thumbnails at the new png art and remove placeholder svgs
- (this checklist + CHANGES commit follows)
