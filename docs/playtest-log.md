# Playtest Log

> Notes from playtest sessions with Anaya and Kellen. Append-only.

## Template

```
## Playtest N — YYYY-MM-DD HH:MM
**Build version:** B-XXX (commit hash if relevant)
**Tested by:** Anaya | Kellen | Both
**What worked:**
**What confused them:**
**What they wanted:**
**Decisions made:**
```

---

(No playtests yet. First scheduled for Day 3 evening, after Layer 1 is functional.)

---

## Kellen — 2026-04-26
**Build version:** B-009 (deployed at https://realm-shapers.vercel.app)
**Tested by:** Kellen (age 11, systems design lead)

### First-realm moment
Did not answer directly. Kellen said "i will just play the game" both times the question was asked and went straight to playing. Suggests the play screen did not prompt an immediate "I think I'm supposed to do X" reaction worth narrating, OR he didn't want to stop and reflect mid-flow. Worth re-asking on a future playtest with a fresh build.

### Stuck moments
- **Phantom required item, realm 1 — hand mirror.** "I was trying to get another ending but I could not get it because I did not have the hand mirror and I searched for it everywhere but I couldn't find it." When asked how he knew about the mirror: "told me" (the game told him). He searched every scene, no mirror existed in the realm.
- **Phantom required item, realm 2 — brass key.** "It is asking for a brass key even though there is no brass key in the whole thing." Different realm, same bug. Could not finish the realm at all: "I am totally stuck."
- **Hero swap bug.** "I picked the purple dragon but it shows a girl with brown hair which is wearing a green cape which is the default hero." The character he chose at landing was not the one rendered during play. Default fallback hero replaced his selection.

### End-of-realm moment
Not reached. Kellen got stuck on the brass-key realm and could not complete a full playthrough during the session, so the Realm Card / collection question never came up.

### Replay drive
Not asked. Session wrapped before this question because Kellen got stuck and the conversation pivoted to capturing his bugs and ideas.

### Free comments
- **Wants the hero to be interactive.** "Can we have the character talk and be more interactive." Specifically: tap the hero, hear them say things. When asked what kind of things: "this is what i am thinking and jokes." Same surface as the Oracle but coming from the chosen character.

### Vanessa adds (after watching Kellen)
- **Min ~6 scenes before ending.** Sometimes a kid finishes a realm in 2-3 clicks and it doesn't feel earned, just lucky.
- **More options per choice.** Right now it's 2. Bump to 4-5 so it feels like a real challenge.
- **Tooltips on options.** Hover/tap shows a hint. Helps kids pick thoughtful options ("better prompt, better place").
- **Editor placements should carry into play.** What the kid drags into scene 1 in the pre-play SceneEditor doesn't actually show up during gameplay. It should.
- **Continue / Next Level button on Realm Card.** Same world_id, harder generation, 5 options per scene, must collect 2 of 5 pickups before ending unlocks.
- **No exit option on Realm Card.** Kid has no way to quit the game from the completion screen. Add one (and probably an in-game exit too — Kellen had no escape hatch when stuck on the brass-key realm).

### Decisions made
All of the above rolled into B-010 brief at `docs/cli-briefs/B-010-playtest-fixes-and-continue-mode.md`.
