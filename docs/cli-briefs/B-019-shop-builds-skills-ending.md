# B-019: Supreme Shop, Skills & Build, ending egg economy, left button rail

## Goal

Four interconnected feature areas, one batch. Ships the sandbox layer Vanessa designed in playtest review:

1. **Left button rail** — vertical stack of buttons on the left side of the play view. Houses Map (already from B-018), Hints, Supreme Shop, Skills & Build.
2. **Supreme Shop** — global shop selling raw materials. Coexists with the existing per-scene markets (river fisher, cave hermit). Uses B-014 coins economy.
3. **Skills & Build** — chat panel where the kid types a prompt to build an item. Heuristic 5-level scoring based on prompt quality. Built items go into inventory and can satisfy 2-3 new build-gated choices on existing scenes. Builder skill XP accumulates and shows current skill level.
4. **Ending egg economy** — taking the egg costs coins AND the right item. Earning the egg the proper way produces a full realm card; snatching it produces a stripped card.

## Project context

- Read `CLAUDE.md` first.
- Coins economy and counter bar: B-014. Coins counter exists on hunt-dragon-egg with start_at 50, max 9999. Per-scene markets (`riverbank`, `cave_shortcut`) already pattern-match this brief.
- Pickups catalog: `lib/pickups-catalog.ts`. Add raw materials and built items here.
- Adventure scenes: `lib/adventures/hunt-dragon-egg.ts`. Build-gates and the ending egg sit on existing choices.
- StoryPlayer state: `components/StoryPlayer.tsx`. Inventory state, counters state, narration variants — all already wired. Add hooks for build-grant, materials-consume, build-gate satisfy.
- Realm card: `components/RealmCard.tsx`. EconomySummary already wired from B-014.
- Hint store: B-018 adds `oracle_hint` per gated choice. The Hints button on the left rail shows the running list of hints the kid has heard.
- Oracle pin: B-018 places the oracle at bottom-right; left button rail does NOT include the oracle.
- StoryPlayer text and pickup polish: B-017 covers narration shrink and per-pickup hints. Don't redo.

This brief assumes B-017 and B-018 have shipped first.

## Scope

### A. Left button rail

Build a `LeftRail` component, fixed-position vertical stack of buttons on the left side of the play scene. Buttons (top to bottom):
1. **Map** — existing from B-018; just relocate into the rail container if it isn't already.
2. **Hints** — opens a panel listing every Oracle hint the kid has heard this run, in chronological order. Read-only.
3. **Supreme Shop** — opens the shop panel (scope B).
4. **Skills & Build** — opens the build panel (scope C).

State for hints: track `heardHints: { sceneId, text, ts }[]` in StoryPlayer state. Append every time `speakOracle` is called with `kind: "hint"`. Persist for the run (resets on Play Again).

Buttons should be visually consistent (icon + short label), not block pickup glows or narration. Mobile: tap-target ≥ 44px.

### B. Supreme Shop

Shop panel opens as a modal/overlay. Lists materials with name, art, price, short description.

Catalog (add to `lib/pickups-catalog.ts` as new pickups with `coin_value: 0` and a new optional `purchase_price?: number`):
- **wood** — 50 coins. "Sturdy timber. The bones of rafts and ladders."
- **rope** — 30 coins. "Strong braid. Holds knots."
- **iron** — 100 coins. "Cold metal. The makings of blades."
- **cloth** — 30 coins. "Sail-worthy weave."
- **wax** — 40 coins. "Holds a candle's flame steady."
- **feather** — 30 coins. "Light and lifting."
- **leather** — 50 coins. "Tough and pliable."

Buy action:
- Decrement coins by `purchase_price`.
- Add the material to inventory (uses the existing pickup add path).
- Play the existing coin chime (B-014 sound bus).
- Disable the buy button when coins are insufficient; show a "Need N more coins" hint.

Shop panel is always available from any scene. The Supreme Shop button on the left rail is the only entry point. Per-scene markets (river fisher, cave hermit) keep their existing scene-local choices untouched.

### C. Skills & Build

Build panel opens as a modal with:
- A read-only display of materials in inventory.
- A multi-line prompt input.
- A submit "Build" button.
- A "?" icon next to the input that, on tap, shows a pre-authored example level-5 prompt for inspiration ("Build me a raft. You are a skilled raft-builder. Use thick wood and tight rope. It must hold three people across a wide river without sinking. Make it light enough to push off the shore.").
- A scoring rubric panel ("Each detail you add raises the level: name materials, give the builder a role, add constraints, name a use case, add specifics. 5 details = level 5.").
- A live level indicator that updates as the kid types (so they can see their score climb in real time).

Heuristic level scoring (`lib/build-scorer.ts`, new):
- Score 0-5 based on detection of:
  - **+1 material:** a known material name appears in the prompt (wood, rope, iron, cloth, wax, feather, leather, plus extant items like sword, lantern).
  - **+1 role:** "you are a", "as a", "expert", "skilled", "master" plus a noun.
  - **+1 constraint:** "must", "should", "strong enough", "won't", "without", "at least", "no more than".
  - **+1 use case:** "to cross", "to carry", "to keep", "for the", "so that", "in order to", "across", "against".
  - **+1 specifics:** numeric quantities, named details, colors, sizes, textures (regex-based; reasonable approximation).
- Cap at 5. Floor at 1 (any non-empty prompt is at least level 1).

Build action:
- Validate the prompt is for a buildable item (search prompt for a known build target name: raft, ladder, kite, torch, sword, fishing_net, etc.; if none found, reject with "Tell me what you're building. Try 'build a raft'.").
- Validate required materials are in inventory (e.g., raft needs wood + rope; ladder needs wood; kite needs cloth + rope; etc. — author per-target requirements in `lib/builds-catalog.ts`, new).
- If materials missing, show "Missing materials: wood, rope. Visit the Supreme Shop."
- If valid: consume materials from inventory, score the prompt, grant a built item with level 1-5 to inventory, and add the level to a running `builderXp` counter (sum of levels). Update display: "You built a level N raft."
- Builder skill display: tier from total XP. 0-4 = Apprentice, 5-14 = Builder, 15-29 = Master Builder, 30+ = Legendary. Show on the Skills panel and in the realm card.

Built item rendering: each built item lives in inventory as a pickup with id `built_<target>` and a level field. Pickup catalog gets `built_raft`, `built_ladder`, `built_kite`, `built_torch`, `built_sword`, `built_fishing_net`. Each is consumable (used once at a build-gate).

Build feedback (text only, in Oracle's existing speech bubble pattern via `speakOracle` with `kind: "discovery"` or new `"build"`): rotate among kid-friendly lines tuned to level. e.g. level 1: "It floats. Mostly. Add more details next time and your raft will be sturdier." Level 5: "A masterwork. The river will respect this raft."

### Build-gated choices (2-3 new gates on existing scenes)

Pick from existing scenes that have a "you cannot pass" feeling. Suggested:

- **Riverbank → river crossing:** add a new choice "Cross on the raft you built" that requires `built_raft` in inventory. Existing wood-gathering and river-pony choices stay. Narration variants: level-1 raft barely makes it ("you wobble, the rope strains"), level-5 raft glides across.
- **Cliff climb:** add a new choice "Climb with the ladder you built" that requires `built_ladder` and consumes it. Existing rope choice stays.
- **Dragon chamber:** add a new choice "Sing with the music box you built" that requires `built_music_box` (cloth + wax + feather). Level affects success: level 1-2 calms the dragon barely (similar to lullaby ending Appeased), level 3-4 charms (Charmed ending), level 5 unlocks a new "The Composer" ending.

(CLI: pick 2-3 of these or substitute equivalents that fit narrative. Add narration variants per level on the receiving scene.)

### D. Ending egg economy

In `lib/adventures/hunt-dragon-egg.ts`, find the existing "Take the egg" choice in `DRAGON_CHAMBER`. Update so:
- Gate it on `coin_cost: 200` AND on `requires: [<one of: dragon_lullaby, rare_gem, built_music_box>]`. The kid must have BOTH coins and one of the right items.
- If the kid has neither: a new choice "Snatch the egg" exists, leads to a new ending `ending_snatched` (or repurpose existing Snatcher).

Realm card differentiation (in `components/RealmCard.tsx` and `EconomySummary` in StoryPlayer):
- Earned endings (Friend, Blessed, Charmer, Hatcher, Composer): full card with title, narration, ingredients grid, coins earned/remaining, trophies, ending tier.
- Snatched/Lost endings: stripped card showing only the ending tier label, a short shame line ("You took what wasn't earned. The realm will whisper."), and a Play Again button. Hide the ingredients grid, coins, and trophies on stripped cards.

### E. Tests

1. `unset ANTHROPIC_API_KEY && npx tsc --noEmit` clean
2. `npm run lint` clean
3. `npx tsx -e 'import("./lib/adventures/index").then(() => console.log("registry OK")).catch(e => { console.error(e); process.exit(1); })'` prints `registry OK`
4. `unset ANTHROPIC_API_KEY && npm run build` clean
5. Smoke locally:
   - Left button rail renders 4 buttons; each opens the right panel and closes cleanly.
   - Supreme Shop: buy wood (50 coins), confirm coins drop and wood enters inventory; try to buy iron with insufficient coins, confirm disabled state.
   - Build panel: type "raft" alone → level 1; type a 5-detail prompt → level 5. Confirm materials consumed. Confirm built_raft enters inventory.
   - Build-gate: at riverbank, with built_raft in inventory, confirm "Cross on the raft" appears and works.
   - Egg ending: try Take the egg with no coins / no item → blocked; with both → ending plays + full card. Snatch the egg → stripped card.

### F. Deploy

```
vercel --prod --yes
```

Append `CHANGES.md` entry. Write `MORNING_CHECKLIST_019.md` covering the four scopes plus regression on B-014 (per-scene markets still work), B-017 (narration polish + pickup hints), B-018 (oracle pin + map + per-gate hints).

## Out of scope

- ElevenLabs voice on build feedback (text only this batch).
- Claude-judged level scoring (heuristic only this batch).
- Multi-step build chains (raft today is a single prompt; no multi-step "first carve plank, then assemble" flow).
- Persisting builder XP across runs (resets on Play Again).
- Replacing existing per-scene markets (they coexist with Supreme Shop).
- Adding new scenes or art for the new endings beyond what's needed (reuse existing ending art where reasonable).
- Item 3 (location-aware oracle hints) — covered in B-018.

## Acceptance

- Left button rail visible on every play scene with 4 working buttons.
- Supreme Shop sells the 7 materials, deducts coins, grants inventory.
- Skills & Build panel scores prompts 1-5 via heuristic, consumes materials, grants leveled built items, displays builder tier.
- 2-3 build-gated choices exist on existing scenes and accept built items.
- Egg ending requires coins + correct item; snatch path produces stripped realm card; earned path produces full card.
- Type check, lint, build all clean. Vercel deploy succeeds.
