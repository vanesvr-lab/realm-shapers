# Morning Checklist for Vanessa — B-002a Verification

> Built and deployed overnight by the CLI agent. Code passes TypeScript strict + production build, but no human ever clicked through the auth flows. That's what this list is for. Goal: 15 to 25 minutes in the browser.
>
> If anything fails, do not panic. Each section ends with the most likely cause and where to look. Ping me back in chat with the failing step number and I'll dig in.

Production: https://realm-shapers.vercel.app

---

## 0. Security: rotate the leaked Supabase service role key (do this first, takes 2 min)

The `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` was selected/displayed in the chat transcript at the start of last night's session, so the agent saw it. Anything in transcripts should be considered exposed.

- [ ] Supabase dashboard → Settings → API
- [ ] Click "Reset" next to the service_role secret
- [ ] Copy the new value
- [ ] Update `.env.local` in VS Code (only the SUPABASE_SERVICE_ROLE_KEY line)
- [ ] In terminal:
  ```
  vercel env rm SUPABASE_SERVICE_ROLE_KEY production
  vercel env rm SUPABASE_SERVICE_ROLE_KEY preview
  vercel env add SUPABASE_SERVICE_ROLE_KEY production
  vercel env add SUPABASE_SERVICE_ROLE_KEY preview
  vercel --prod --yes
  ```
  (Paste the new value when prompted twice. Re-deploy picks up the new env.)

If you'd rather defer the rotation until after the May 1 demo (similar to the ANTHROPIC_API_KEY note from B-001), that's fine. Just keep this in mind for the post-demo cleanup pass.

---

## 1. Confirm the deployed build is alive (30 sec)

- [ ] Open https://realm-shapers.vercel.app/test in a fresh incognito window
- [ ] Page loads, says "Setting up your session..." then "Anonymous session ready."

If "Anonymous session ready" never appears, open browser devtools → Console. Most likely cause: Supabase Anonymous Sign-Ins toggle is off (check Authentication → Providers → Anonymous Sign-Ins, must be ON), or the production env vars aren't reaching the runtime (check `vercel env ls production` shows all 4 vars).

---

## 2. Flow A — anonymous play (1 min)

- [ ] On https://realm-shapers.vercel.app/test, click "Generate Test World"
- [ ] After 3-8 seconds, JSON block appears with `title`, `narration`, `id`, `share_slug`
- [ ] "Saved as world id ..., share slug ..." line appears below
- [ ] Open Supabase dashboard → Table Editor → `worlds`. New row exists with the world you just generated. `user_id` is a UUID corresponding to an anonymous user in `auth.users`.

If 401 from `/api/generate`: the cookie isn't reaching the server. Most likely the middleware isn't running. Check that `middleware.ts` exists at the repo root (not under `app/`).

If 500 from `/api/generate`: check the response error text. Either Anthropic key issue or Supabase RLS issue. RLS would say something like "new row violates row-level security policy".

---

## 3. Flow B — upgrade to consented account (3 min)

- [ ] Same window from step 2. Click "Save your worlds"
- [ ] Modal opens, says "Save your worlds" with email input
- [ ] Type a real email you can check (your own personal email is fine)
- [ ] Click "Send link"
- [ ] Modal flips to "Check the grown-up's email"
- [ ] Open the inbox. Magic link arrives within 30 seconds (subject usually "Confirm Your Signup" or similar Supabase default). If it doesn't arrive, check spam.
- [ ] Click the magic link
- [ ] You land on https://realm-shapers.vercel.app/consent (NOT localhost — if it goes to localhost, the Supabase Site URL is misconfigured; fix in Authentication → URL Configuration)
- [ ] `/consent` shows the disclosures. Your email appears in the "You're signing in as" line.
- [ ] Click "Continue" → land on `/setup-username`
- [ ] Try `admin` → rejects with "That name is reserved. Pick another."
- [ ] Try `ab` → rejects with "Use 3 to 20 lowercase letters, numbers, or underscores."
- [ ] Try `dragon92` (or any valid handle) → success, redirects to `/profile`
- [ ] `/profile` shows your username AND the world you generated in step 2
- [ ] In Supabase Table Editor → `profiles`, row exists with `username = dragon92`, `parent_email = your@email.com`, `parent_consent_at` is a timestamp.
- [ ] In `worlds`, the row's `user_id` matches the `id` of your row in `profiles` (and the row in `auth.users` now has `is_anonymous = false`).

If the magic link flow stalls (you click the link but land somewhere wrong), most likely cause is one of:
- Supabase Site URL still points to a Supabase default. Fix: Authentication → URL Configuration → Site URL = `https://realm-shapers.vercel.app`.
- Production redirect URL not whitelisted. Fix: same screen → Redirect URLs add `https://realm-shapers.vercel.app/auth/callback`.
- "Secure email change" Supabase setting is ON, requiring double confirmation. Fix: Authentication → Settings → Secure email change → OFF (per Task 6 step 1 in the plan; the agent could not toggle this).

---

## 4. Flow D — share link works without auth (2 min)

- [ ] On `/profile`, click "Share" next to a world. Button briefly says "Copied!"
- [ ] Open a different browser (or another incognito window with cookies cleared)
- [ ] Paste the URL (it should look like `https://realm-shapers.vercel.app/w/xxxxxxxx`)
- [ ] Page renders the world: title, narration, four ingredients, footer "Made on Realm Shapers"
- [ ] Confirm: NO username appears anywhere on the page. Search the page source if unsure.
- [ ] Edit the slug to a fake one like `/w/aaaaaaaa` → 404

If 500 instead of 404 for a missing slug, the service-role env var is missing in Vercel. Check `vercel env ls production`.

---

## 5. Flow C — returning kid on a new device (3 min)

- [ ] Open a third incognito window (or clear cookies for realm-shapers.vercel.app in your main browser)
- [ ] Visit https://realm-shapers.vercel.app/login
- [ ] Page shows "Sign me in" with email input
- [ ] Type the SAME email you used in Flow B
- [ ] Click "Send magic link" → message says "Check the grown-up's inbox..."
- [ ] Open inbox, click the new magic link
- [ ] Land directly on `/profile` (consent step skipped, username step skipped)
- [ ] Your worlds from Flow B are still listed

If you land on `/consent` instead of `/profile`, the callback route's profile lookup isn't finding your profile row. Possible cause: a different `auth.users` row was created (Supabase didn't recognize the email as an existing identity). Check `auth.users` table for two rows with your email.

---

## 6. /privacy renders (10 sec)

- [ ] Visit https://realm-shapers.vercel.app/privacy → loads, shows "Privacy Notice"

---

## 7. Local dev still works (optional, 30 sec)

If you plan to keep building today:

- [ ] In the realm-shapers terminal:
  ```
  unset ANTHROPIC_API_KEY && npm run dev
  ```
- [ ] Visit http://localhost:3000/test → same flow as step 1, "Anonymous session ready"
- [ ] Generate a world locally → succeeds

---

## What to tell me when we're back in chat

Either:

- "All seven sections green, B-002a is done." → I'll start brainstorming B-002b (SVG map render) or B-003 (kid landing page replacing `/test`), your call which is higher priority before the May 1 deadline.
- "Step N failed: [paste error or describe what happened]." → I'll dig in.

---

## Things the agent did NOT do, by design

- Did not toggle Supabase "Secure email change" (you should verify it is OFF if Flow B's magic link doesn't arrive).
- Did not click any magic links. Every browser-based flow above is unverified by the agent.
- Did not create `.env.local.example` or update README.md with env-var docs (Task 1 of the plan was skipped per your instructions; the docs side of Task 1 was bundled with that).
- Did not rotate the leaked service role key. That's section 0 above.
- Did not update the project-memory file about the shell-shadow gotcha or other open threads. Same setup as before.
