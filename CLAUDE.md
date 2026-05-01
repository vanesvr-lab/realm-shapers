# Realm Shapers

> READ FIRST, ALWAYS APPLY. This file is the project constitution. If conflicts arise, this file wins over conversation, web sources, or training defaults.

## Response Rules

- No recap tables, no "here's what I did" summaries.
- One-line confirmations after task completion. Trust tool outputs.
- No em dashes anywhere (project, code, comments, copy). Use commas, periods, parentheses.
- No filler ("certainly," "absolutely," "great question"). Plain language only.
- Ask before installing new libraries, refactoring working code, or expanding scope.
- If uncertain about product/UX/kid-facing copy, ask. Do not guess.
- Implementation plans (`docs/superpowers/plans/*.md`) should be brief and file-level, not full copy-paste code blocks. The CLI agent executing the plan can write the actual code. List files, responsibilities, smoke tests, and commit points. Exception: include verbatim copy when it is content the user reviews (e.g., COPPA disclosures, marketing copy).

## What This Is

AI-powered creative web game. Players input 4 ingredients (Setting, Character, Goal, Twist) and Claude generates a world rendered as an animated SVG map with AI soundscape. Hackathon submission for Women Build AI Build-A-Thon 2026.

**Deadline:** Friday May 1, 2026 @ 3:00 PM ET. Non-negotiable.

**Designed by:** Vanessa Rangasamy (builder/PM), Anaya age 11 (story design lead), Kellen age 11 (systems design lead). See `docs/design-doc.md` for full vision and `docs/roadmap.md` for layered scope.

## Stack

- Next.js 14 (App Router) + TypeScript strict mode
- Tailwind CSS + Framer Motion + Lottie (lottie-react)
- Supabase (Postgres + Storage)
- Anthropic Claude API via @anthropic-ai/sdk (model: claude-sonnet-4-20250514)
- ElevenLabs Sound Effects API
- Vercel hosting (free tier URL acceptable for hackathon)
- GitHub repo: `realm-shapers` (public)

## Build Commands

```
npm run dev          # local dev on :3000
npm run build        # production build
npm run lint         # eslint
npx tsc --noEmit     # type check (run before every commit)
vercel               # deploy to preview
vercel --prod        # deploy to production
```

## Project Structure

```
app/                 # Next.js routes (App Router)
  api/               # API routes ONLY here, never pages/api
components/          # React components
lib/                 # utilities, API clients, prompts
  claude.ts          # ALL Claude API calls go through here
  supabase.ts        # ALL Supabase calls go through here
  elevenlabs.ts      # ALL audio generation goes through here
types/               # shared TypeScript types
supabase/            # DB schema + migrations
docs/                # design docs, roadmap, briefs (see structure below)
```

## Conventions

- TypeScript strict. Never `any`. Use `unknown` + narrowing when type is genuinely unknown.
- Tailwind only, no CSS modules, no styled-components.
- Server components by default. Client components only when interactive state required.
- Custom hooks in `components/hooks/`, not `lib/`.
- Component files: PascalCase. Hook files: camelCase starting with `use`.
- Database columns: snake_case. TypeScript fields: camelCase. Conversion happens in `lib/supabase.ts`.
- Audio: NEVER autoplay. Always behind a user gesture.
- Animations: cap durations at 1.5s. Skippable when possible.

## Git Workflow Rule

This is the rule that prevents the "site shows old version" bug. Follow exactly.

- Never `git add .`. Only stage files you intentionally touched.
- Run `git status` before EVERY commit. Look for untracked files.
- Commit AND push at end of every session. No "I'll push later."
- Commit messages: imperative mood, no B-XXX prefix. Example: "add SVG map rendering"
- If a session is interrupted, push WIP commits with prefix `wip:` so the other surface can pick up.
- `git pull` at the START of every session. No exceptions.

## Cross-Surface Session Protocol

This project is built across Claude Code CLI (VS Code terminal) AND Claude Code Desktop App. `CHANGES.md` is the shared handoff file.

### At session start
1. `git pull`
2. Read the last 2-3 entries of `CHANGES.md`
3. Check "Open" threads from the most recent entry
4. If "Next session" instructions exist, follow them

### At session end
1. Append a new `CHANGES.md` entry (template at top of CHANGES.md)
2. `git status`, then commit only files you touched
3. `git push`
4. Report one-line summary in chat

### Hard rules
- Never end a session without pushing.
- If two surfaces are working at once, second one MUST `git pull --rebase` before working.
- Don't merge surfaces inside a single batch. One batch, one surface.

## CLI Handoff Prompts

Handoffs to a CLI session are pointers, not restatements. The brief is the contract; the kickoff prompt just frames autonomy and tree state.

Template:
> Read `CLAUDE.md` and `docs/cli-briefs/B-XXX-name.md`, then execute the entire brief end to end including [deploy / writing MORNING_CHECKLIST_XXX.md]. Run `git pull --rebase` at the start (origin is at `<SHA>`, plus any tree-state notes). Commit at the phase boundaries listed in the brief. Push at the end. If any test step fails (tsc, lint, build, validator), do NOT deploy, write the morning checklist explaining the failure and push the partial work. Vanessa is [asleep / awake]; [no questions, use defaults / ask only if genuinely ambiguous].

Do NOT include in the handoff: schema diffs, file paths, line numbers, scene names, literal test commands, the deploy command, or restated acceptance criteria. All of that lives in the brief.

## Batch Numbering

Sequential batch IDs (B-001, B-002, ...) tie planning briefs, CHANGES entries, and chat references together. Commit messages stay clean (no B-XXX prefix).

- Planning session writes `docs/cli-briefs/B-XXX-[name].md`
- Implementation session executes the brief
- Never mix planning + implementation in one session
- One batch may span multiple commits

## Key Gotchas

These are quirks that will burn you. Know them before they bite.

1. **Next.js App Router:** Server components cannot use `useState` or `useEffect`. Add `'use client'` directive at top of any file using React hooks.
2. **Supabase RLS:** Row Level Security is ON by default for new tables. Set policies explicitly or queries return empty arrays with no error. Always test reads after creating a new table.
3. **Vercel env vars:** `NEXT_PUBLIC_*` prefixed vars are exposed to client. Anything secret (Anthropic key, Supabase service key) must NOT have that prefix and must be set per-environment in Vercel dashboard.
4. **ElevenLabs latency:** Sound generation can take 10-20s. Always start the audio fetch in parallel with text generation, never sequentially.
5. **Anthropic SDK:** When streaming, errors come through as events not exceptions. Wrap in try/catch AND check for `error` event types.

## Dev Server Restart Pattern

When Tailwind classes don't apply, hot reload breaks, or strange caching occurs:

```
# Kill dev server, then:
rm -rf .next
npm run dev
```

If still broken, also clear node_modules cache:

```
rm -rf .next node_modules/.cache
npm run dev
```

## Known Future Migration

POC-only shortcuts that must NOT be treated as permanent:

- Auth: skipped for MVP. Worlds tied to anonymous session ID. Phase 2 will add real auth via Supabase Auth.
- Rate limiting: none for MVP. Phase 2 needs proper rate limits before public launch.
- Image generation: deferred to Phase 3. MVP uses SVG-only output.
- Multiplayer: deferred to Phase 2 stretch. MVP is single-player + async gallery.

## Anti-Patterns

- Don't add features outside the current Phase without confirming with Vanessa.
- Don't refactor working code unless asked.
- Don't autoplay audio.
- Don't use em dashes in user-facing copy.
- Don't store anything in localStorage that doesn't need to persist (use React state).
- Don't build shopkeeper NPCs (Kellen explicitly cut them).
- Don't add trading features (Anaya explicitly cut them).
