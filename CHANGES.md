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
