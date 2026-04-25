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
