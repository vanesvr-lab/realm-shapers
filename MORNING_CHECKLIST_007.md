# Morning Checklist — B-007

> Run through this when you wake up. The overnight CLI agent built five things at once: ceremony reveal, voiced Oracle, achievements, Realm trading cards, and a full point-and-click rebuild of play mode. Build is green and deployed, but no human has clicked through any of it yet.

Production: https://realm-shapers.vercel.app
Latest commit: `a8297f3` (add ceremony reveal, voiced Oracle, achievements, RealmCard, point-and-click play)

## Step 0: Apply migration 0004 (5 minutes)

The new SQL **must** be applied before Oracle voice or achievements will work. Without it, `/api/oracle-voice` returns errors and `/api/check-achievements` silently inserts nothing.

1. Open Supabase dashboard → SQL editor.
2. Paste the contents of `supabase/migrations/0004_achievements_and_oracle.sql` and run.
3. Verify in **Database → Tables**: a new `user_achievements` table exists with RLS enabled.
4. Verify in **Storage → Buckets**: a new `oracle_voice` bucket exists (private).

If the `oracle_voice` insert step fails because Supabase Cloud blocks direct writes to `storage.buckets`, fall back to creating the bucket in the dashboard manually:
- Storage → New bucket → name: `oracle_voice`, public: off.

## Step 1: Cold-load the landing page

1. Open https://realm-shapers.vercel.app in **a fresh incognito window** (no cached session).
2. Expect to see:
   - The 4-ingredient form (cozy beige page).
   - The Oracle portrait sitting in the bottom-right corner (a watercolor face).
   - A `🔊 Oracle` toggle below the portrait.
3. **Optional sanity tap**: click the Oracle portrait. A bubble should pop up that says something like "I am the Oracle. Tap me any time you wish to hear me again." Audio may or may not play depending on browser autoplay policy on first interaction. The bubble alone confirms the dispatch wiring works.

## Step 2: Run the full kid flow once (10 minutes)

This is the headline demo path. Kid types four ingredients, watches the ceremony, plays the adventure, gets a card.

1. From the landing page (still incognito), fill all four ingredients. Try something like:
   - Setting: a glowing underwater library
   - Character: a forgetful octopus librarian
   - Goal: find the stolen Book of Tides
   - Twist: the thief is her own shadow
2. Click "Shape my realm." The star-tap mini-game from B-006 should appear during loading.
3. **Watch the ceremony.** When generation completes, you should land on a full-screen takeover: dark background with sparkles, scroll unfurls, the title appears in glowing serif script, and the Oracle voices "Behold... [your title]." It auto-dismisses after 5 seconds; tap anywhere after the 2-second mark to skip.
   - **If the ceremony does not appear**: the URL probably lost `?ceremony=1`. Open the dev console and check that the redirect goes to `/play?world=<uuid>&ceremony=1`. If it does but no overlay shows, hard refresh and try again — it's gated to `?ceremony=1` and we strip it on dismiss.
   - **If the Oracle voice doesn't play but the bubble appears**: that's the autoplay policy degrading gracefully. Click the avatar once to confirm voice is working; subsequent lines play.
4. **Edit mode loads.** You should see the editor (scene 1 canvas + asset palette) and the Oracle in the corner. Optionally drag in a few props.
5. Click "▶ Play your story."
6. **Point-and-click play opens full screen.** Verify:
   - Background image fills the screen, character is centered low.
   - Glowing icon overlays appear at the bottom of the scene (one per choice, with kind-specific emoji: 🚪 door / 🎁 chest / 🌿 path / ✨ sparkle / 🐾 creature).
   - If the scene has pickups, they sit higher up, glowing with a sparkle pulse.
   - Inventory bar reads "🎒 Pockets are empty." (or similar) at the top-left.
   - Scene narration card reads at the bottom; Oracle voices the first sentence after a brief pause.
   - Tutorial banner says "✨ Click the glowing things to explore." Tap it to dismiss.
7. **Click a pickup.** It should disappear from the scene and appear in the inventory bar at top-left. Oracle voices "You collect the [thing]."
8. **Click a glowing choice.** Scene transitions, new background, Oracle reads the new scene's first sentence.
9. **Try a locked choice if one exists** (a 🔒 badge on the corner of the icon). Click it without the required item: a hint pops up ("Find [item] first") and Oracle says "Hmm, perhaps you need to find [item] first." Don't transition.
10. **Reach an ending.** A modal opens with the Realm Card: title in serif font, character + ending background composited in the center, ingredients below, rarity badge top-right (probably Common or Uncommon on a first run). Below the card: rarity reason text. Below that: a "⬇ Download as PNG" button.
    - **Click "Download as PNG."** A `.png` file downloads. Open it: the card should be visible. (If the image is blank, html2canvas tainted on cross-origin assets; check browser console.)
11. **Achievement toast** should appear at the top of the screen: "🌟 First Realm" (assuming this is the kid's first realm). It auto-dismisses in ~4 seconds; the Oracle voices "You discovered First Realm!"
12. Close the card modal via "Edit my scene" or "Make another."

## Step 3: Profile sanity check (5 minutes)

1. From the landing page, sign up and pick a username (or sign back into the kid account if you've used Realm Shapers before in incognito).
2. Open `/profile`.
3. Verify:
   - Header shows the kid's username.
   - "Your realm cards" grid shows the realm(s) you just made as Pokemon-style thumbnails (3:4 aspect, character + background + title + ingredient blurb).
   - Each thumbnail has a "Play" button (and "Share view" if a share slug exists).
   - "Achievements" panel below shows 18 badges total, with the ones you've earned in color (gradient amber background) and the rest grayscale + "?????".
   - "Mysteries Discovered" panel at the bottom shows a count (probably 0 unless you triggered a secret).
4. Click "Play" on one of the thumbnails. It should open `/play?world=<id>` and re-enter the editor mode for that world. (No ceremony this time — it only plays on creation.)

## Step 4: Trigger a secret ending (optional, 10 minutes)

Brief ways to fire the secret:
- Visit all 5 main scenes in one playthrough (some choice graphs make this easy, some don't).
- Pick up every pickup in the tree (also depends on the generated tree).
- Use a Legendary ingredient combo: e.g. setting includes "library" + twist includes "shadow." That triggers Legendary rarity directly without needing a secret discovery.

If you hit a secret ending: the play stays in the secret_ending scene, Oracle says "A hidden ending. The Oracle smiles. Few find this path.", and the card rarity is at minimum Epic. The "🔮 Secret Keeper" achievement should pop.

## Step 5: Mute toggle (1 minute)

1. Click the `🔊 Oracle` button below the avatar. It should flip to `🔇 Oracle muted`.
2. Trigger any Oracle line (click the avatar, navigate, etc.). Bubble appears, no audio plays.
3. Click `🔇 Oracle muted` to flip back. Refresh the page; mute state should persist.

## Things that might go wrong (in order of likelihood)

1. **`/api/oracle-voice` returns 500 with "bucket not found".** You skipped or partial-applied migration 0004. Re-run it, or create the bucket manually in Supabase dashboard.
2. **First Oracle line on landing page is silent.** Browser blocked autoplay. Click the avatar once; subsequent lines play.
3. **Ceremony reveal flashes for half a second then disappears.** This means React StrictMode double-render fired the dismiss timer twice. The reveal should still feel right; if not, set NODE_ENV check or remove StrictMode in `next.config.mjs`.
4. **Card download produces a blank PNG.** html2canvas tainted by a cross-origin image. Check the browser console; if asset URLs are coming from Supabase Storage, switch to local-only assets (current /public assets are local — should be fine).
5. **Achievement toasts don't pop after generation.** Migration 0004 not applied, or the user has already earned them on a previous run with a different seed. Check `user_achievements` table directly in Supabase.
6. **Old worlds in profile show "Older realm, no story tree."** Expected. Worlds created before B-002b don't have a `map` JSON.
7. **Profile shows nothing under "Achievements" while you've clearly earned some.** RLS policy on `user_achievements`. The migration creates owner-select / owner-insert policies; verify in Supabase Auth → Policies.

## When you're satisfied

If steps 1–3 work end to end, the demo is shippable. Note any rough edges in `CHANGES.md` (B-007 entry "Open" section already lists known limitations) so we can prioritize for any final pre-deadline polish.

If a step fails, paste the failure (browser console + network response) into the next CLI session. The agent has the full B-007 file map and can patch quickly.
