# CHANGES.md

> Cross-surface session handoff log. Append-only. Read last 2-3 entries at session start. Add new entry at session end.

## Entry Template

```
## B-XXX — YYYY-MM-DD HH:MM — [CLI | Desktop]
**Touched:** files changed
**State:** Working | Broken | Mid-refactor
**Open:** open threads, unfinished work
**Next session:** instructions for the next surface
**Pushed:** yes (commit hash) | no (why)
```

---

## B-000 — 2026-04-24 — Bootstrap
**Touched:** CLAUDE.md, CHANGES.md, .gitignore, .claude/settings.json, docs/*
**State:** Working. Repo scaffolded with kickoff package, no app code yet.
**Open:** None.
**Next session:** Begin B-001 (project scaffold). Read docs/cli-briefs/B-001-project-scaffold.md before starting.
**Pushed:** yes

## B-001 — 2026-04-25 00:30 — CLI
**Touched:** package.json, package-lock.json, tsconfig.json, tailwind.config.ts, postcss.config.mjs, next.config.mjs, .eslintrc.json, app/layout.tsx, app/page.tsx, app/globals.css, app/favicon.ico, app/fonts/*, lib/claude.ts, app/api/generate/route.ts, app/test/page.tsx, CHANGES.md
**State:** Working. Next.js 14 + React 18 + Tailwind 3 scaffolded. Pipeline (4 ingredients to JSON world) verified locally and on Vercel production. Model is claude-opus-4-7.
**Open:**
- Vercel deployment protection may be ON by default for personal projects. If the public hackathon demo URL prompts for login, disable protection in the Vercel dashboard (Project Settings, Deployment Protection, "Only Preview Deployments" or off).
- Vanessa's shell exports an empty ANTHROPIC_API_KEY that shadows .env.local. Local dev must be launched with `unset ANTHROPIC_API_KEY && npm run dev`. Tracking root cause as a follow-up (likely in zshrc/zprofile/zshenv). Saved to project memory.
- ANTHROPIC_API_KEY was pasted in chat during this session. Rotate on or after 2026-05-02 (after the May 1 demo). Saved to project memory with rotation steps.
- Git committer email is auto-detected as elaris@Vanessas-MacBook-Air.local (non-deliverable). Worth setting `git config --global user.email` to a real address.
- Brief specified `claude-sonnet-4-20250514`; bumped to `claude-opus-4-7` per current model defaults. If we want to drop cost later, swap to `claude-sonnet-4-6` or `claude-haiku-4-5` in lib/claude.ts.
**Next session:** Plan and execute B-002 (SVG map rendering). The brief does not exist yet, so first write `docs/cli-briefs/B-002-svg-map.md`, then implement. Touch: a new SVG map component, extend `lib/claude.ts` to also return map data, expand the Claude prompt schema. Do NOT add UI for ingredient input yet (that is B-003).
**Pushed:** yes
**Production:** https://realm-shapers.vercel.app
**Repo:** https://github.com/vanesvr-lab/realm-shapers

## B-002a — 2026-04-25 — CLI (overnight unattended)
**Touched:** lib/supabase.ts, lib/supabase-server.ts, lib/username.ts, lib/username-blocklist.ts, middleware.ts, supabase/migrations/0002_auth.sql, app/api/generate/route.ts, app/test/page.tsx, app/auth/callback/route.ts, app/consent/page.tsx, app/setup-username/page.tsx, app/profile/page.tsx, app/w/[slug]/page.tsx, app/login/page.tsx, app/privacy/page.tsx, components/SaveYourWorldsModal.tsx, components/UsernameInput.tsx, components/ShareWorldButton.tsx, scripts/test-username.ts, package.json, package-lock.json, docs/design-doc.md, CHANGES.md, MORNING_CHECKLIST.md
**State:** Built and deployed. Anonymous-first auth, parent-fronted upgrade via Supabase magic link, COPPA disclosures on `/consent`, kid picks username on `/setup-username`, profile lists worlds with share buttons, public `/w/[slug]` page renders shared worlds without usernames. `npm run build` clean, `npx tsc --noEmit` clean, username smoke test 10/10. **Smoke tests pending Vanessa AM verification per `MORNING_CHECKLIST.md`** — agent did not click magic links or step through browser flows.
**Open:**
- Manual smoke through Flows A, B, C, D in the browser (see `MORNING_CHECKLIST.md`).
- Task 1 manual setup (Supabase project, env vars, migration apply, Vercel env vars) was done by Vanessa before bed; agent skipped Task 1 entirely. `.env.local.example` and the README env-var section from Task 1 steps 6-7 were NOT created. Add later if useful for collaborators.
- `lib/supabase.ts` was split into `lib/supabase.ts` (client-safe `browserSupabase`) and `lib/supabase-server.ts` (`serverSupabase` + `serviceRoleSupabase`) because Next.js fails to compile when a client component imports a module that statically imports `next/headers`. All server-side files import from `@/lib/supabase-server`. Plan called for a single file; this is a deviation worth noting.
- `scripts/test-username.mjs` from the plan was renamed to `scripts/test-username.ts`. Reason: Node 24 swallows the `.mjs` import before tsx sees it, and the import of a `.ts` module fails. Renaming gave tsx ownership.
- `support@realm-shapers.example` is a placeholder. Replace with a real inbox before public launch (mentioned in `/consent` and `/privacy`).
- Privacy notice copy is hackathon-grade. Privacy lawyer review is the explicit "before public launch" step.
- Orphan anon-user cleanup cron not implemented. Acceptable for demo scale, follow-up batch.
- "Save your worlds" button currently lives on `/test` (the dev surface). When B-003 builds the real landing page with the 4-ingredient form, the button moves there too.
- `app/page.tsx` is still the Next.js default splash. B-003 replaces it.
- SUPABASE_SERVICE_ROLE_KEY was selected/displayed in the chat transcript at session start. Treat as exposed and rotate via Supabase dashboard (Settings → API → Reset service role secret) when convenient. Then update `.env.local` and re-run `vercel env add SUPABASE_SERVICE_ROLE_KEY production` (and `preview`).
**Next session:** After Vanessa walks `MORNING_CHECKLIST.md` and confirms green, plan and execute B-002b (SVG map render) or B-003 (kid landing page replacing `/test`).
**Pushed:** yes
**Production:** https://realm-shapers.vercel.app
**Repo:** https://github.com/vanesvr-lab/realm-shapers
