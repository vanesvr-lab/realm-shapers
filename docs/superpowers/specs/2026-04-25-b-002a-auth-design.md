# B-002a: Kid-Safe Auth (Parent-Fronted, COPPA-Aware)

> Design spec. Approved by Vanessa on 2026-04-25 via brainstorming session.
> Read alongside CLAUDE.md (project constitution), docs/design-doc.md (product vision),
> and docs/cli-briefs/B-001-project-scaffold.md (the now-shipped scaffold).

## Goal

Add real authentication and persistent identity to Realm Shapers, sized to ship before the
Friday 2026-05-01 hackathon deadline, without violating COPPA, GDPR-K, or the UK Children's
Code. Kids must be able to play anonymously, then upgrade to a real account that lets them
return to their worlds and share them via link.

## Scope Decomposition

The original "auth" ask covered four subsystems: identity, share-by-link, public gallery, and
profile + avatar. Decomposed as follows.

- **B-002a (this spec):** Identity + profile-lite (username only) + share-by-link.
- **B-003 (post-hackathon):** Avatar picker, world deletion UI, account deletion UI.
- **Phase 3 (post-hackathon, requires moderation plan):** Public gallery.

The SVG map render that was originally going to be B-002 is renumbered to B-002b and follows
this batch.

## Regulatory Context

The user base is children, including users under 13. This triggers:

- **COPPA (US):** Verifiable parental consent (VPC) is required before collecting personal
  information from a child under 13. Personal information includes username (when it functions
  as an identifier), persistent IDs (auth user_id, session cookies that recognize a returning
  user), IP addresses, and email.
- **UK Children's Code:** Privacy on by default, no behavioral profiling, plain-language
  notices, kid-appropriate defaults.
- **GDPR-K (EU):** Parental consent under age 16 (some member states lowered to 13).

The "email plus" VPC method, accepted by the FTC, is what this design implements: send an
email to the parent, the parent must respond with an action confirming consent (in our case,
clicking a magic link plus a Continue button on a disclosures page).

## Architectural Decisions (with rationale)

### Path 2: parent-fronted accounts

Three paths were considered.

1. **Path 1: No-auth, device-only saves.** No accounts, worlds in localStorage. Closest to the
   existing CLAUDE.md MVP plan, but no cross-device, lose worlds on cookie clear.
2. **Path 2: Parent-fronted accounts.** Kid plays anonymously by default. To save, parent
   gives consent via magic link, then kid plays under that account. Khan Academy Kids /
   Duolingo ABC pattern.
3. **Path 3: Hackathon demo carve-out.** Kid username + PIN behind a "13+ only" age gate.
   Cannot be used by Anaya (11) or Kellen (11) on the live demo.

**Chose Path 2** because it lets the kid designers actually use the deployed product, tells a
"kid-safe by default" story to judges, and is only marginally more work than Path 3.

### Login mode C: no kid credentials

When kid returns on a new device, parent re-authenticates via magic link rather than the kid
typing a username + PIN. Three options were considered.

- **A. Username + PIN for the kid.** Roblox style. Compliant under COPPA once the parent has
  consented, but stores credentials for a child and adds attack surface (PIN reset flow,
  brute-force protection).
- **B. Magic link to parent every login.** Most COPPA-pure, worst UX.
- **C. Cookie-based session on the consented device, parent re-auths on new devices.** No kid
  credentials stored. Tradeoff: "play at a friend's house" needs a parent.

**Chose C** for data minimization (UK Children's Code principle), smaller attack surface, and
the strongest "kid-safe by default" story. Acceptable because the target audience (11-year-olds)
mostly plays on their own laptop or family iPad.

### Anonymous to account upgrade: auto-claim all

When a kid plays anonymously and then upgrades, all anonymous worlds attach to the new account
silently. The Supabase Anonymous Auth model makes this a no-op: the `auth.users` row already
exists with `is_anonymous = true`; upgrade flips that flag to false and links an email, the
`user_id` foreign key on `worlds` never changes.

### Single kid per parent account (multi-kid deferred)

For two siblings, parent uses two emails (or Gmail `+` aliases like
`parent+anaya@gmail.com`, `parent+kellen@gmail.com`). One kid per account. Profile-picker UI is
Phase 2.

### Share-by-link: anyone with link, no username on shared page

Sharing is read-only and unauthenticated; anyone with the URL can view. The shared page renders
title, narration, and ingredients only, never the kid's username, to minimize the
"child identifier published on the open web" COPPA exposure.

## Architecture

Use Supabase Anonymous Auth as the foundation. Every visitor gets a real `auth.users` row from
the moment they hit the site, with `is_anonymous = true`. Worlds are owned by `user_id` from
day one; no separate session table.

The parent-consent flow is a wrapper around Supabase magic-link auth, not a parallel system:

1. Kid hits "Save your worlds".
2. App collects parent email.
3. Supabase emails a magic link via `auth.linkIdentity({ provider: 'email', email })`.
4. Parent clicks link.
5. Callback lands on our COPPA consent page (not the default Supabase post-login redirect).
6. Continue button writes `parent_consent_at` and routes to "Pick a username".
7. Subsequent logins from a new device skip the consent page (already consented, recorded by
   timestamp).

Sharing is a separate read path: each saved world gets a short slug, and `/w/{slug}` reads via
the Supabase service-role key on the server (bypassing RLS) so anyone with the link can view
without authenticating.

## Data Model

New migration `supabase/migrations/0002_auth.sql`:

```sql
create extension if not exists citext;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  parent_email text,
  parent_consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table worlds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  narration text not null,
  ingredients jsonb not null,
  share_slug text unique not null default substr(gen_random_uuid()::text, 1, 8),
  created_at timestamptz not null default now()
);

create index worlds_user_id_idx on worlds(user_id);

alter table profiles enable row level security;
alter table worlds   enable row level security;

create policy "profiles owner select" on profiles for select using (auth.uid() = id);
create policy "profiles owner update" on profiles for update using (auth.uid() = id);
create policy "profiles owner insert" on profiles for insert with check (auth.uid() = id);

create policy "worlds owner select" on worlds for select using (auth.uid() = user_id);
create policy "worlds owner insert" on worlds for insert with check (auth.uid() = user_id);
create policy "worlds owner update" on worlds for update using (auth.uid() = user_id);
create policy "worlds owner delete" on worlds for delete using (auth.uid() = user_id);
```

Notes on the choices.

- `profiles.id = auth.users.id` (1:1) so we never need to look up "which profile belongs to
  this user".
- `username` uses `citext` so `Dragon92` and `dragon92` collide. Kids retype with random
  capitalization.
- `parent_email` is captured separately from `auth.users.email`. Reason: `auth.users.email` is
  the login credential and the only place the email is used for magic links.
  `profiles.parent_email` is our own copy stored under our control so a future "delete my
  child's data" request can find the account even if the parent later changes the login email.
- We deliberately do not collect parent name. The "email plus" VPC method does not require it,
  and it works against the data-minimization principle.
- `share_slug` is 8 chars from a uuid (no collisions in practice, no enumeration), short
  enough to fit in a friendly URL.
- `on delete cascade` on both: if Supabase deletes the `auth.users` row (account deletion),
  profile and worlds go with it.
- Public viewing of shared worlds is NOT done via RLS. It is done by a server-side route
  handler using the service-role key, so RLS stays strict and we don't have to model
  "shareable but not gallery" as a policy.

## User Flows

### Flow A: First visit (anonymous play)

1. Kid lands on `/`. Client checks Supabase session. None exists.
2. Client calls `supabase.auth.signInAnonymously()`. New `auth.users` row created with
   `is_anonymous = true`. Cookie set.
3. Kid fills 4 ingredients, hits Generate.
4. `POST /api/generate` reads the cookie session server-side, calls Claude, gets
   `{title, narration}`, inserts a row into `worlds` with `user_id` of the anonymous user,
   returns the world JSON plus `world_id` and `share_slug`.
5. Kid sees the world. No signup yet.

### Flow B: Upgrade (anonymous to consented)

1. Kid clicks "Save your worlds" (button visible on any world view).
2. Modal: "To save your worlds across devices, ask a grown-up to type their email."
3. Submit calls `supabase.auth.linkIdentity({ provider: 'email', email })`. Same
   `auth.users.id` is preserved; an email identity is added; magic link is sent.
4. Modal flips to "Check the grown-up's email."
5. Parent clicks magic link. Supabase callback at `/auth/callback` confirms email, refreshes
   session, kid is now authenticated as the same user, `is_anonymous = false`.
6. Callback redirects to `/consent`. Page shows COPPA-required disclosures (see below). Single
   Continue button. On click, server upserts `profiles` with `parent_email = the linked email`
   and `parent_consent_at = now()`.
7. Redirect to `/setup-username`. Kid types a handle, validates, saves to `profiles.username`.
8. Redirect to `/profile`. Kid sees their handle and a list of their worlds (auto-claimed
   because the row was always under their `user_id`).

### Flow C: Returning kid, new device

1. Kid lands on `/`. No cookie session.
2. Client calls `signInAnonymously()` (new throwaway anon user created).
3. Kid clicks "Sign me in". Modal asks for parent email. `linkIdentity` triggers magic link.
4. Parent clicks link. Supabase callback notices this email is already an identity on a
   different `auth.users` row, signs in as the existing user, the throwaway anonymous user
   becomes orphaned.
5. Callback sees `profiles` row already exists (`parent_consent_at` is set), skips `/consent`,
   skips `/setup-username`, goes directly to `/profile`.

Tradeoff: worlds the kid made on the new device while anonymous (between step 2 and step 4)
are stranded under the discarded throwaway user and lost. We tell the kid up front: "Sign in
first if you want to save what you make on a new device."

Orphaned anon users are cleaned up by a periodic job:
`delete from auth.users where is_anonymous = true and last_sign_in_at < now() - interval '7 days'`.
For B-002a we do not implement the cron; rows accumulate harmlessly on Supabase free tier at
demo scale. Cron is a follow-up batch.

### Flow D: Share link

1. Kid on `/profile` clicks Share next to a world. Modal shows the URL
   `https://realm-shapers.vercel.app/w/{share_slug}` and a Copy button.
2. Grandma opens the URL on any device, no auth.
3. `/w/[slug]/page.tsx` runs server-side, uses the service-role Supabase client to look up
   `worlds where share_slug = ?`, returns title, narration, and ingredients.
4. Page renders the shared world view. No username, no profile link, footer says "Made on
   Realm Shapers".

## Files

### New

```
supabase/migrations/0002_auth.sql           # profiles + worlds tables, RLS, citext
lib/supabase.ts                             # browser, server, service-role factories
lib/auth.ts                                 # signInAnon, requestParentLink, completeConsent
app/login/page.tsx                          # parent magic-link entry (used by Flow C)
app/auth/callback/route.ts                  # Supabase callback handler, routing logic
app/consent/page.tsx                        # COPPA disclosures + Continue
app/setup-username/page.tsx                 # kid picks handle
app/profile/page.tsx                        # username + worlds list + share buttons
app/w/[slug]/page.tsx                       # public shared world view
app/privacy/page.tsx                        # one-page Privacy Notice
components/SaveYourWorldsModal.tsx          # the upgrade prompt
components/UsernameInput.tsx                # validation + "no real names" hint
components/ShareWorldButton.tsx             # the per-world share button + copy modal
```

### Modified

```
app/api/generate/route.ts                   # also writes a worlds row, returns id + share_slug
app/test/page.tsx                           # add "Save your worlds" button + link to /profile when logged in
README.md                                   # add Supabase env vars, add COPPA notice
.env.local                                  # add NEXT_PUBLIC_SUPABASE_URL, anon key, service role
docs/design-doc.md                          # add Auth section pointing to this spec
```

### Not Modified (deliberately, to keep scope tight)

```
app/page.tsx                                # stays as the Next.js default splash from B-001. B-003 replaces this with the real kid landing page (4-ingredient form). Until then, /test remains the surface where the kid generates worlds, with the Save button living there.
```

### Dependencies

- `@supabase/ssr` (new) for App Router server-side auth cookie handling. Already have
  `@supabase/supabase-js`.

## COPPA Disclosures (content for `/consent` page)

The page renders the following sections in plain language (target reading age: a parent, not a
kid). These are content requirements; final wording should be reviewed before public launch by
someone with privacy-law experience. For the May 1 hackathon, this is best-effort
hackathon-grade copy.

- **What we collect.** The kid's chosen username, the worlds the kid creates (title,
  narration, the four ingredients), and the parent's email address.
- **What we do not collect.** Real name, photo, geolocation, IP-based behavioral profile,
  third-party tracking.
- **How we use it.** So the kid can save and revisit their worlds, so the parent can be
  contacted for account-related requests.
- **Who sees it.** The kid sees their own worlds. Anyone with a share link can see a world's
  title, narration, and ingredients but never the kid's username. We do not sell or share data
  with third parties.
- **Parent rights.** Parent can email `support@<domain>` to review the data on the account,
  delete the account, or revoke consent at any time.
- **Link to full Privacy Notice** at `/privacy`.
- **Consent statement.** "By clicking Continue, I confirm I am the parent or legal guardian of
  this child and I consent to the collection and use described above."

The contact email (`support@<domain>`) needs a real inbox before public launch. For hackathon
demo, Vanessa's personal email or a Google Group is acceptable; this is a TODO for the README,
not a blocker for the implementation plan.

## Username Rules

- Regex: `^[a-z0-9_]{3,20}$`, lowercased on save.
- Uniqueness: enforced at DB layer (citext unique) and checked client-side before submit for
  fast feedback.
- Blocklist: small static list of about 50 entries (slurs, common adult-content terms,
  "admin", "moderator", "anthropic", "claude", "realm", reserved app paths). Maintained in
  `lib/username-blocklist.ts`.
- Hint shown on the username input: "Pick a fun made-up name. No real names, phone numbers, or
  emails."

## Edge Cases

### Handled

- Username already taken: client-side check + DB unique constraint, friendly error.
- Username regex violation: friendly error explaining what's allowed.
- Parent email magic link expired (Supabase default 1h): friendly error, "ask the grown-up to
  try again" with a button that re-triggers `linkIdentity`.
- Parent clicks magic link in a different browser than the kid is using: link works in any
  browser, the email is what's authoritative; new browser becomes the consented session, kid
  must close the now-stale tab on the old browser.
- Kid hits Generate while anonymous, world saves; later upgrades. World is auto-claimed by
  virtue of `user_id` already being theirs.
- Service-role key accidentally committed: defended by `.gitignore` covering `.env*.local` and
  pre-commit grep (B-001 already proved the gitignore works).

### Deferred

- Parent loses access to email: out of scope for B-002a. "Contact support" via the email on
  the consent page is the only path. Manual recovery from Supabase dashboard.
- Kid wants to delete a world: defer to B-003.
- Two siblings on the same browser at the same time: out of scope (multi-kid is C, deferred).
- Share link gets shared on social media and goes viral: rate-limit the `/w/[slug]` route
  (basic Vercel edge limits suffice at hackathon scale) and consider a manual takedown path
  post-hackathon. No automated abuse handling in B-002a.
- Parent revokes consent later: email-based, manual deletion from Supabase dashboard is
  acceptable for hackathon scale; B-003 should add a self-serve flow.

## Out of Scope (this batch)

- Avatar picker (D, full)
- Multi-kid profile picker
- Public gallery
- World deletion UI
- Account deletion UI
- Parent dashboard
- Profanity filter on world titles or narration (Claude's training largely handles this; we
  rely on it for B-002a)
- Profanity filter on usernames beyond the small static blocklist
- SVG map rendering (B-002b)
- Soundscape (B-004)
- Real privacy-lawyer review of consent copy (best-effort hackathon-grade)
- Orphan anon-user cleanup cron

## Effort Estimate

Roughly 8 to 12 hours of focused work.

- Supabase Anonymous Auth setup + email linking: about 2 hours including reading the docs and
  verifying behavior on a fresh Supabase project.
- Migration + RLS policies + seed: about 1 hour.
- Auth callback + consent + setup-username flow: about 2 hours.
- Profile page + share button + share page: about 2 hours.
- Modal components + validation + blocklist: about 1 hour.
- README + privacy page + design-doc updates: about 1 hour.
- End-to-end manual smoke testing through Flow A, B, C, D plus production deploy and
  retest: about 1 to 2 hours.

## Definition of Done

- A fresh visitor can play anonymously, see a generated world, click "Save your worlds", enter
  a parent email, the parent receives a magic link, clicks it, sees the consent page,
  continues, the kid picks a username, and lands on a profile page that shows their saved
  world from the anonymous session.
- A returning user on a different device can sign in via parent magic link and see their
  saved worlds, with the consent step skipped.
- A share link works in an incognito window, shows the world without a username, and is
  copyable from the profile.
- All flows work both locally (`npm run dev`) and on the production Vercel deploy.
- TypeScript strict passes (`npx tsc --noEmit`).
- ESLint passes (`npm run lint`).
- CHANGES.md has a B-002a entry.
- The repo at https://github.com/vanesvr-lab/realm-shapers contains the work, pushed to main.

## Risks and Mitigations

- **Risk:** Supabase Anonymous Auth + identity-linking semantics differ from what's described
  here in some subtle way (the docs describe behavior for upgrade flows but real behavior may
  differ at the edges, particularly orphan handling). **Mitigation:** Test the upgrade and
  cross-device flows on Supabase first, before wiring UI. If behavior diverges, document the
  divergence in the implementation plan and adjust.
- **Risk:** Magic link routing through `/auth/callback` then to `/consent` for first-time
  users vs. directly to `/profile` for returning users requires conditional logic on the
  presence of a `profiles` row with `parent_consent_at`. **Mitigation:** Single decision
  point in the callback handler; centralize the "where do I go next" logic in
  `lib/auth.ts`.
- **Risk:** RLS policies are easy to get wrong (return empty arrays silently). **Mitigation:**
  Write a quick smoke test that hits the API as the owner and as a different user (or as
  unauthenticated) and verifies the right rows come back / are blocked. CLAUDE.md already
  flags this as a known gotcha.
- **Risk:** Hitting the Friday deadline. **Mitigation:** This batch is sized at 8 to 12 hours
  with explicit cuts; if any one piece blows out, the share-by-link feature (Flow D) is the
  obvious cut, since it's a stretch goal anyway.
