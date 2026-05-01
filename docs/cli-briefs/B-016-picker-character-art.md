# B-016: Real art for the 7 placeholder picker characters

## Goal

Replace the 7 placeholder SVG circles in the landing-page character picker (`/public/characters/<id>.svg`) with real, transparent PNG character art that matches the wizard's style. After this batch, all 8 picker characters render as real Studio-Ghibli-style figures with no background.

The 7 characters are: `knight`, `princess`, `astronaut`, `merkid`, `gingerbread_kid`, `robot`, `dragon`. (`wizard` already has real PNG art from the prior wallpaper run.)

## Project context

- Read `CLAUDE.md` first.
- Picker source: `lib/characters-catalog.ts` → each entry has `thumbnail_path` pointing at `/characters/<id>.<ext>`. Today 7 of the 8 point at .svg placeholders; wizard points at .png.
- Asset library mirror: `/public/assets/characters/<id>.<ext>` is used by `HeroAvatar` (resolved through `lib/asset-files.generated.ts`). It already has real PNGs for `knight`, `princess`, `astronaut`, `mermaid` (note: catalog calls the same character `merkid`), `robot`, `dragon`. It does NOT have `gingerbread_kid`.
- Existing scripts:
  - `scripts/remove-character-bgs.ts` — bg-removes asset-library characters in place. Currently leaves `/public/characters/` alone (per its header comment).
  - `scripts/remove-wizard-bg.ts` — the wizard one-off; dual-writes to both `/public/characters/` and `/public/assets/characters/`. Use this as the dual-write reference.
  - `scripts/generate-assets.ts` — Flux Schnell asset generator. Reads from `ASSET_LIBRARY` in `lib/asset-library.ts`; supports `--only <id>` and `--force`.
  - `scripts/sync-asset-files.ts` — refreshes `lib/asset-files.generated.ts` from disk after asset changes.
- Why this is split from B-015: the prior wallpaper commit fixed the wizard but didn't touch the other 7. They have always been placeholder circles since B-005 placeholder run.

## Scope

### A. Generate `gingerbread_kid` source art

`gingerbread_kid` has no source PNG in the asset library. Add it.

- Add a `gingerbread_kid` character entry to `ASSET_LIBRARY` in `lib/asset-library.ts` matching the existing character entries (id, alt, prompt that fits the watercolor / Studio Ghibli / golden-hour style used by the rest of the library).
- Run `npx tsx --env-file=.env.local scripts/generate-assets.ts --only gingerbread_kid` to produce `/public/assets/characters/gingerbread_kid.png`. Spot-check the output; rerun with `--force` if it looks wrong.

### B. Strip backgrounds and dual-write to `/public/characters/`

Extend or replace `scripts/remove-character-bgs.ts` so it produces transparent PNGs at BOTH `/public/assets/characters/<id>.png` AND `/public/characters/<picker_id>.png`. The picker filename uses the catalog id, which differs from the asset-library id for one character: `merkid` (picker) ↔ `mermaid` (asset library). Handle that alias.

- Run the script across all 7 ids: `knight`, `princess`, `astronaut`, `merkid`, `gingerbread_kid`, `robot`, `dragon`. Wizard is already done; safe to skip or re-run idempotently.
- Cost: ~$0.005 per char in Replicate credits, ~30 seconds each. Total ~$0.04 + ~3 minutes.
- After: run `npx tsx scripts/sync-asset-files.ts` to refresh the manifest.

### C. Update `lib/characters-catalog.ts`

Change the 7 affected entries' `thumbnail_path` from `/characters/<id>.svg` to `/characters/<id>.png`.

### D. Cleanup

Delete the now-unused placeholder files in `/public/characters/`:
- `astronaut.svg`, `dragon.svg`, `gingerbread_kid.svg`, `knight.svg`, `merkid.svg`, `princess.svg`, `robot.svg`
- `wizard.svg.bak`

These have been replaced by `.png` files. No code references them after the catalog update in C.

### E. Tests

1. `unset ANTHROPIC_API_KEY && npx tsc --noEmit` clean
2. `npm run lint` clean
3. `npx tsx -e 'import("./lib/adventures/index").then(() => console.log("registry OK")).catch(e => { console.error(e); process.exit(1); })'` prints `registry OK`
4. `unset ANTHROPIC_API_KEY && npm run build` clean
5. Smoke locally: `npm run dev`, open the landing form to step 3 (character picker), confirm all 8 characters render as real art.

### F. Deploy

```
vercel --prod --yes
```

Append a `CHANGES.md` entry. Write `MORNING_CHECKLIST_016.md` covering: picker tile sanity (all 8 real, transparent, no broken images), HeroAvatar in /play for each newly-arted character (especially `gingerbread_kid` since it's brand-new in the asset library), and a regression check that the existing 5 entry videos still play after the manifest refresh.

## Out of scope

- Replacing or restyling the wizard (already shipped).
- Changing the picker UX, layout, or copy.
- Generating new characters beyond the 8 in `characters-catalog.ts`.
- Re-running bg removal for other library characters (the in-game heroes like `hero_girl`, `hero_boy`, `dragon`, etc. are used by Claude-generated theme worlds and live separately from the picker).

## Acceptance

- All 8 picker tiles show real, transparent character art on production.
- `gingerbread_kid` exists in `/public/assets/characters/` and HeroAvatar renders it in /play.
- Type check, lint, build all clean.
- Vercel deploy succeeds.
- No remaining `.svg` files under `/public/characters/`.
