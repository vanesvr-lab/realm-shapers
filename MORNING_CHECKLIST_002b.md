# Morning checklist — B-002b + B-003 + B-004

> The CLI built the kid-facing experience (landing, form, animated map, audio)
> overnight and pushed to production, but did not click anything in a real
> browser. Walk this list before opening the demo to anyone.

Production URL: https://realm-shapers.vercel.app

## 1. Pre-flight (under a minute)

- [ ] Vercel dashboard → Deployments → newest one shows **Ready** with no
      runtime errors in the last hour.
- [ ] `vercel env ls` (or dashboard → Settings → Environment Variables) shows
      `ELEVENLABS_API_KEY` set for **Production** as well as Preview/Dev.
- [ ] Supabase → Storage shows the `world_audio` bucket exists and is
      **Private**. (Public read would let any URL leak.)
- [ ] Supabase → Database → `worlds` table has columns `map jsonb` and
      `audio_prompt text` (migration 0003 applied).

## 2. Make-a-world flow (the demo path, ~3 minutes)

Open https://realm-shapers.vercel.app in an **incognito window**.

- [ ] Landing page renders: warm gradient, "Shape your own realm" hero, 4-input
      form below. No console errors in DevTools.
- [ ] Click **Give me ideas** on at least one slot. Modal opens, shows
      "Thinking up ideas...", then 3 Claude suggestions appear within ~5 sec.
- [ ] Tap a suggestion → input is filled, modal closes.
- [ ] Fill the other 3 slots (your own words or more "Give me ideas" clicks).
- [ ] Click **Shape my realm**. Button label changes to
      "Shaping your realm..." and the helper line "The Oracle is working.
      This usually takes about 20 seconds." appears.
- [ ] Within ~25 sec, page navigates to `/play?world=<uuid>`.

## 3. Play view

- [ ] Title + narration render at the top, both age-appropriate, no JSON
      garbage or fence characters leaked through.
- [ ] SVG map renders below: background colored from Claude's choice, soft
      terrain shapes, dotted line connecting location pins, character emoji
      sitting at the first location, all 3-5 location pins visible and
      reasonably spread (not clustered in one corner).
- [ ] Click **▶ Play**:
  - [ ] Soundscape starts (ambient audio, looped, no music or speech).
  - [ ] Character emoji slides smoothly to the next location every ~4.5 sec.
  - [ ] Narration overlay fades in at each stop with the location name and
        a 1-2 sentence description.
  - [ ] After the last stop, "The End" screen appears.
  - [ ] **Make another** and **Save your worlds** buttons appear.

## 4. Save flow regression (B-002a unchanged)

- [ ] Click **Save your worlds**. Existing modal opens.
- [ ] Type a parent email. Magic link arrives (check inbox).
- [ ] Magic link → /consent → Continue → /setup-username → /profile.
- [ ] Profile page lists the world you just made.
- [ ] Hit **Make a new world** on the profile page → routes back to `/` (the
      new landing, not the old `/test`).

## 5. Hard-refresh on /play

- [ ] Refresh the `/play?world=...` tab. Page re-renders with title,
      narration, map.
- [ ] Click Play again. Audio resumes (signed URL re-issued from storage,
      no second ElevenLabs charge).

## 6. Share-by-link regression

- [ ] On profile, click **Share** next to the world. Copy the link.
- [ ] Open it in an **incognito window** (no auth). The shared page renders
      title + narration + ingredients (no map yet — share view is text-only;
      that's a known follow-up, not a regression).

## If something is broken

| Symptom | Likely cause | Fix |
|---|---|---|
| `/api/generate` returns 500 with "Failed to save world" | Migration 0003 not applied | Run `supabase/migrations/0003_world_extras.sql` in Supabase SQL editor |
| Audio never loads on /play | `ELEVENLABS_API_KEY` missing on Vercel **production** env | `vercel env add ELEVENLABS_API_KEY production`, redeploy |
| Audio loads but kid sees "World has no audio_prompt" | Old world from before the schema bump | Make a new world; old worlds will not have audio |
| Character clusters in one corner of the map | Claude returned bad coords; `clampCoord` clamps to 5-95 but Claude may still pick close points | Re-run Generate; if persistent, tighten the prompt's "do not cluster" rule |
| Page shows "A Realm Half-Shaped" with generic locations | Claude returned invalid JSON twice; default fallback kicked in | Check Anthropic API status; check `lib/claude.ts` parser logs in Vercel function logs |
| Generate hangs >40 sec | Vercel function timeout looming (default 60s on hobby) | Check Vercel function logs; ElevenLabs may be slow. Acceptable for demo; consider Sonnet model for faster Claude |

## Once green

- Mark this batch closed in CHANGES.md (add a one-line note under the entry).
- Tweet/post the demo URL.
- Plan the next session: probably extending `/w/[slug]` to render the map
  for shared worlds, then mobile polish for the demo.
