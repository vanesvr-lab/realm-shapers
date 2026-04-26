# Morning Checklist — B-005

> Overnight unattended run completed 2026-04-26. The demo is rebuilt around the
> curated asset library + scene editor + branching story + 3D teaser. The agent
> did not run any browser smoke test, so this is your verification pass.

Production URL: https://realm-shapers.vercel.app

---

## Step 0 — Pull and inspect (2 min)

```bash
git pull
git log --oneline -6
```

You should see (most recent at top):
- `add 3D platformer teaser at /preview-3d`
- `rebuild around story tree, scene editor, and shared player`
- `add curated asset library manifest plus svg placeholders`
- (then earlier commits)

Open `CHANGES.md` and read the **B-005** entry — it lists every gotcha. The
short version is below.

---

## Step 1 — Generate the real asset images (BLOCKER, ~25 min total)

**This is the only thing standing between us and a "real-looking" demo.**

The 95-asset library shipped with **SVG placeholders** because Replicate returned
`402 Payment Required` last night. The editor and player render fine with
placeholders, but every prop / character / background looks like a colored
rectangle with a label.

### 1a. Add Replicate credit
Go to https://replicate.com/account/billing and add at least $5 of credit.
Flux Schnell is ~$0.003 per image; 95 images is roughly $0.30, plus regen
overhead. $5 covers regenerating the whole library a few times if needed.

Wait ~3 minutes after the charge for the credit to register on Replicate's
side (their docs warn about the lag).

### 1b. Run the asset generator
```bash
unset ANTHROPIC_API_KEY && npx tsx scripts/generate-assets.ts
```

This calls Replicate Flux Schnell concurrently (4 in flight) for all 95
assets. Expect 10-20 min. Output PNGs land at `public/assets/{category}/{id}.png`.
Each line is `[ok N/95] category/id`, `[skip] id (exists)`, or `[fail] id: ...`.
The script never overwrites unless you pass `--force`.

### 1c. Spot-check and curate
Open Finder at `public/assets/` and click through. The brief calls out that
Flux is fast but inconsistent. **Things to watch for and regen:**

- **Text overlays / letters.** Flux loves to paint nonsense words on top.
- **Multiple characters in a single character image** (e.g. `hero_girl.png`
  showing two figures). Should be one figure, full body, white-ish background.
- **Off-style.** A photoreal or 3D rendered output that breaks the cartoon
  storybook feel. The whole library should feel like one set.
- **Weapons.** `sword`, `magic_wand`, `lock` etc. are intentionally minor in
  the prompts ("toy sword with a star tip", "no weapon" added to characters).
  If something looks too violent, regen.
- **Backgrounds with characters in them.** Backgrounds should be empty
  landscapes; characters/props are layered on top.

To regen specific ones:
```bash
unset ANTHROPIC_API_KEY && npx tsx scripts/generate-assets.ts --only forest,hero_girl,dragon --force
```

To regen by category:
```bash
unset ANTHROPIC_API_KEY && npx tsx scripts/generate-assets.ts --category characters --force
```

If you don't like a prompt, edit `lib/asset-library.ts` (the `prompt:` field)
before regenerating.

### 1d. Flip the manifest to .png
Once you're happy:
```bash
npx tsx scripts/sync-asset-files.ts
```

This rewrites `lib/asset-files.generated.ts` so each asset id with a real PNG
on disk is set to `"png"`. The Asset library will now load `id.png` instead
of `id.svg`. Verify with:

```bash
git diff lib/asset-files.generated.ts | head -40
```

You should see lines flip from `"svg"` to `"png"`.

### 1e. Commit and redeploy
```bash
git add public/assets/ lib/asset-files.generated.ts
git commit -m "generate real PNG assets via Flux Schnell, manual curation pass"
git push
vercel --prod --yes
```

**Tip:** Don't `git add .` — only stage what you mean. The brief's git workflow
rule is in CLAUDE.md.

---

## Step 2 — Browser smoke test (10 min)

Open https://realm-shapers.vercel.app in **incognito** so you start fresh
(no cookie carry-over from prior sessions).

### 2a. Landing → editor (golden path)
1. **/** loads. You see "Shape your own realm", four ingredient inputs, and
   a `Use bright cartoon storybook` button (style picker stub). If you've
   visited before in this browser the picker is hidden.
2. Optional: tap a `Give me ideas` button next to any slot. You should get
   3 suggestions in 3-4 seconds. (If this hangs, ANTHROPIC_API_KEY env var
   is misconfigured on Vercel.)
3. Fill all four ingredients (sample below) and submit:
   - Setting: an underwater library carved from coral
   - Character: a forgetful octopus librarian
   - Goal: find the stolen Book of Tides
   - Twist: the thief is her own shadow
4. Loading state: "The Oracle is weaving 5 scenes... about 10 seconds." It's
   actually 10-25 sec (Claude generating the StoryTree).
5. Lands on `/play?world=...` in **Edit mode**. You should see:
   - Scene 1's chosen background as a wide canvas
   - Claude's chosen character on top of it (probably octopus or hero_girl)
   - 0-3 props placed near the bottom
   - A side palette with `Scenes / Heroes / Props` tabs and a search box
   - Scene 1 narration in an amber box below the canvas
   - Re-narrate scene 1 button (5 left this session)
   - "Play your story" button

### 2b. Edit interactions
1. Click the **Props** tab in the palette, then click any prop. It should
   appear in the center of the canvas, selected (amber ring + ✕ delete handle).
2. Drag it. It should snap inside the canvas bounds.
3. Drag a corner handle to resize. Aspect ratio is locked.
4. Click `💬 Add text bubble`, double-click it, type something. Click outside
   to commit.
5. Click the **Scenes** tab and pick a different background. The canvas
   should update immediately.
6. Click the **Heroes** tab and pick a different character. The character on
   the canvas should swap.
7. Click `✨ Re-narrate scene 1`. After 3-5 seconds the narration should
   rewrite to mention your placed props. The "5 left" counter should drop
   to 4.

### 2c. Play mode
1. Click **▶ Play your story**. A full-bleed scene takes over with the
   narration overlay at the bottom and 2-3 choice buttons.
2. Per-scene ambient audio kicks in after 5-15 seconds (ElevenLabs gen +
   storage upload). First playthrough of a scene = generation; subsequent =
   cached signed URL.
3. Tap a choice. It should fade to scene 2 with a different background.
4. Continue. You should hit an ending in 3-5 taps. The end shows "The End"
   and an `Edit my story` button that returns you to edit mode.

### 2d. Save your worlds (Flow B from B-002a, unchanged)
1. From the editor (Edit mode header bar), click `Save your worlds`.
2. Type a real grown-up email. You should get the existing magic-link modal.
3. Click the link from email → you should be back on the site, signed in,
   redirected through `/setup-username` if username not yet picked.

### 2e. Shared link
1. Sign in as a parent (any account works).
2. Go to `/profile`, click `Share` on a saved world. Copy the URL.
3. Open in incognito (logged-out viewer). The shared link should:
   - Render the StoryTree start scene full-bleed at the top
   - Show the title + scene title + narration + choice buttons
   - Let the viewer click through choices without signing in
   - Show the four ingredients below for context

### 2f. 3D preview
1. Click `🎮 Try our 3D preview` on `/play` (or the `/preview-3d` link in the
   header on `/`). Three.js bundle (~1 MB) loads, you see "Loading the forest..."
   then a small platformer scene.
2. Use arrow keys (or WASD) to walk the character. Space to jump. The character
   should play idle when standing still and walk while moving.
3. Drag the canvas with your mouse to orbit the camera around the trail.
4. Walk onto a glowing yellow gem. A modal pops up with placeholder narration.
5. Find all 3 hotspots. Each one only triggers once.

---

## Step 3 — Known limitations to be aware of during the demo

- **Latency on the first generate:** 15-25 sec while Claude builds the story
  tree. The loading message reassures the kid. If demo judges are watching,
  warm it up by running through once on a different incognito tab so the
  Claude API has cached compute.
- **Per-scene audio first-play:** scenes 2-5 each take 5-15 sec to generate
  ambient audio the first time. Cached afterwards. If demoing, walk through
  the full tree once before the demo so all 5 audio tracks are cached for
  that world.
- **Replicate credit:** if you skip Step 1, the demo will visibly look like
  placeholder boxes. Don't.
- **Re-narrate cap:** 5 per server lifetime. Won't be hit in a 3-min demo.
- **Old worlds:** rows saved before B-005 hit a "made before the new story
  system" placeholder on `/play` and `/w/[slug]`. Make a fresh world in the
  demo to avoid this.

---

## Step 4 — If something is broken

- **Generate hangs > 60s**: ANTHROPIC_API_KEY may be missing/empty on Vercel.
  Check `vercel env ls`; should be set in production (and preview).
- **No audio in /play**: ELEVENLABS_API_KEY may be missing on Vercel. Same
  check.
- **Asset palette renders no thumbnails**: `lib/asset-files.generated.ts`
  may have stale entries. Run `npx tsx scripts/sync-asset-files.ts`.
- **3D scene shows blank canvas**: Quaternius glTF files may not have been
  uploaded to Vercel. Check `https://realm-shapers.vercel.app/3d/kit/character/glTF/Character.gltf`
  loads (200 OK, JSON content). If 404, the deploy didn't include the kit;
  re-run `vercel --prod --yes`.
- **Re-narrate returns 429**: hit the 5-per-session cap. Open a new incognito
  to reset (server in-memory Map).

---

## Step 5 — When green

Add a comment to this file noting "verified green YYYY-MM-DD HH:MM by Vanessa"
and either commit or just leave it as a working note. The B-005 batch is
shippable for the May 1 deadline once Step 1 (real PNGs) is done.
