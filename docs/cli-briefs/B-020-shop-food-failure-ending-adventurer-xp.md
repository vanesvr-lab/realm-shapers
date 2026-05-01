# B-020: Shop food + drink, failure endings, low-supply warnings, raft UX, adventurer XP, realm card tier

## Goal

Six tightly-related playtest fixes from Vanessa, all on the post-B-019 build.

1. **Supreme Shop sells food and water** in addition to raw build materials.
2. **Failure endings narrate "you ran out, try again"** clearly with a prominent Play Again, when food or water hits zero.
3. **Low-supply warning** fires once when food or water dips to ≤2: "Food is almost out, buy more at the shop or hunt an animal." Same for water.
4. **Hide redundant build choices** once the built item is in inventory (e.g., "Build a raft and cross" disappears once `built_raft` is owned, leaving only "Cross on the raft you built"). Same for ladder and music box.
5. **Adventurer XP** — +10 per cleared gated choice (any choice with `requires`, `requires_any`, or `coin_cost`). Tracked in the counter bar across the run.
6. **Realm card tier** — at completion, adventurer XP maps to a tier label (Common / Rare / Epic / Legendary) shown prominently on the realm card.

## Project context

- Read `CLAUDE.md` first.
- Pickups catalog: `lib/pickups-catalog.ts`. Existing `food_ration` and `water_bottle` ids exist; they are used in scenes for grants but are NOT in the Supreme Shop catalog. Adding `purchase_price` and `kind: "material"` (or however the shop filters) makes them surface.
- Supreme Shop panel: `components/ShopPanel.tsx`. Filters shop items by some predicate; verify food and water now appear. If the filter is hard-coded, extend it.
- StoryPlayer choice gating: `components/StoryPlayer.tsx`. Locking logic checks `requires` against inventory and `coin_cost` against the coins counter. The "+10 adventurer XP per gated clear" hook lives here, alongside the existing `consumes` / `grants_counter` / `consumes_counter` logic.
- Counter bar: `components/CounterBar.tsx`. Pattern from B-014 — text display when max > 50; pip rows otherwise. Adventurer XP should render as `XP: N`.
- Endings: `lib/adventures/hunt-dragon-egg.ts`. `ending_starvation` and `ending_dehydration` already exist; their narration strings need rewriting.
- Failure UI: ending scenes route through the realm card render in `components/RealmCard.tsx`. The "Play Again" button is already there. The narration just needs sharper kid-facing copy.
- Low-supply warnings: nearest-neighbor pattern is the `speakOracle({ kind: "hint", ... })` call already used in StoryPlayer for similar nudges.

## Scope

### A. Food and water in the Supreme Shop

In `lib/pickups-catalog.ts`, add `purchase_price` to existing `food_ration` and `water_bottle` entries (do not invent new ids; those already grant correctly in scenes).

- `food_ration.purchase_price`: 30
- `water_bottle.purchase_price`: 30

If those entries do not currently have `kind: "material"`, decide whether the Supreme Shop should accept both `material` and a new `kind: "consumable"` filter, OR just include those two ids by name. Either works; pick the smaller change. Update the shop description copy to match (e.g., "A hot meal for the road" / "Fresh water from the spring").

When the kid buys a food_ration, increment the food counter by 1 (clamped to its max). Same for water_bottle. Use the existing counter-mutation path (the per-scene river fisher choice already does this; mirror that logic in the shop's buy handler).

### B. Failure endings copy update

In `lib/adventures/hunt-dragon-egg.ts`, locate `ENDING_STARVATION` and `ENDING_DEHYDRATION`. Rewrite the narration strings so the kid clearly understands:

- They ran out of food / water.
- The challenge is over for this run.
- They can try again.

Example for `ending_starvation`:
```
You ran out of food before the path ran out of road. The realm tugs you home; even brave adventurers must eat. Tap Play Again to try once more, and pack heavier next time.
```

Same shape for dehydration. Keep the existing tier label ("The Lost") if it fits; otherwise tweak. Make sure the realm card still renders Play Again clearly for these endings (it already does).

### C. Low-supply warnings

In `components/StoryPlayer.tsx`, add a one-time-per-run nudge for each of food and water. When the counter transitions from > 2 to ≤ 2 during the run, fire `speakOracle` with `kind: "hint"`:

- Food ≤ 2: "Your food is almost gone. Buy more at the Supreme Shop, or hunt an animal along the way."
- Water ≤ 2: "Your water is almost gone. Buy more at the Supreme Shop, or find a stream."

Track which warnings have already fired in a `Set<string>` state so the same warning does not fire twice. Reset on Play Again.

### D. Hide redundant build choices when built item is owned

In the StoryPlayer choice rendering, suppress any choice that grants/expects raw materials when an equivalent `built_*` pickup is in inventory. Concretely, when iterating `scene.choices`:

- If a choice's `requires` is exactly the raw materials of a build target (e.g., `["wood_logs", "climbing_rope"]` for the raft) AND the kid already has the corresponding `built_<target>` pickup, hide it.

The cleanest implementation: add an optional `hide_when_inventory_has?: string[]` field to `StoryChoice` in `lib/claude.ts`. Set it on the `build_raft`, `cliff_climb` raw-material choice, and `dragon_chamber` lullaby/raw-music-box choices to `["built_raft"]`, `["built_ladder"]`, `["built_music_box"]` respectively. StoryPlayer skips rendering any choice whose hide list overlaps inventory.

### E. Adventurer XP counter

Add a new counter to `lib/adventures/hunt-dragon-egg.ts`:

```
adventurer_xp: { id: "adventurer_xp", label: "XP", max: 9999, start_at: 0, critical_at: -1 }
```

(`critical_at: -1` means the counter never goes critical; or use whatever sentinel CounterDef supports for "no critical state.")

In StoryPlayer's choice handler, after a successful choice firing, check if the choice was gated (had `requires`, `requires_any`, or `coin_cost`). If so, increment `adventurer_xp` by 10 via the existing counter-mutation path. The CounterBar will surface it as `XP: 10`, `XP: 20`, etc.

Free choices (no gates) do NOT award XP. Building items in the Skills panel does NOT award adventurer XP (they have their own builder XP tier).

### F. Realm card tier

In `lib/builds-catalog.ts` (or a new `lib/adventurer-tiers.ts`), add:

```
export type AdventurerTier = "Common" | "Rare" | "Epic" | "Legendary";
export function adventurerTier(xp: number): AdventurerTier {
  if (xp >= 100) return "Legendary";
  if (xp >= 60) return "Epic";
  if (xp >= 30) return "Rare";
  return "Common";
}
```

Thread the adventurer XP value into the EconomySummary object that the StoryPlayer hands to RealmCard at completion. RealmCard renders a new line under the existing "Coins / Trophies / Ending" group:

```
Adventurer: 80 XP — Epic
```

Color-code or badge-style the tier (Common = grey, Rare = blue, Epic = purple, Legendary = gold). Both the full and stripped realm cards render this line (a stripped Snatcher card still shows whatever XP they accumulated).

### G. Tests

1. `unset ANTHROPIC_API_KEY && npx tsc --noEmit` clean
2. `npm run lint` clean
3. `npx tsx -e 'import("./lib/adventures/index").then(() => console.log("registry OK")).catch(e => { console.error(e); process.exit(1); })'` prints `registry OK`
4. `unset ANTHROPIC_API_KEY && npm run build` clean
5. Smoke locally:
   - Open Supreme Shop, confirm food ration and water bottle are listed with 30c each. Buy one of each, confirm food/water counters tick up.
   - Walk an adventure path that depletes food to 2; confirm the warning bubble fires once. Continue depleting; warning does not fire again. Confirm same for water.
   - Let food hit 0; confirm starvation ending narration reads cleanly with Play Again visible.
   - Build a raft, walk to river_crossing; confirm only one raft choice shows ("Cross on the raft you built"). The wood+rope option is hidden.
   - Clear a few gated choices; confirm XP counter rises 10 each time. Free choices do NOT award XP.
   - Complete a run; confirm realm card shows the adventurer tier line (Common / Rare / Epic / Legendary).

### H. Deploy

```
vercel --prod --yes
```

Append `CHANGES.md` entry. Write `MORNING_CHECKLIST_020.md` covering the six features plus regression on B-019 (shop, build, ending egg).

## Out of scope

- Real hunt-for-food gameplay (the warning copy mentions hunting, but no new hunt mechanic this batch).
- Replacing the existing per-scene markets (river fisher, cave hermit) — they continue to coexist with the Supreme Shop.
- Voiced (ElevenLabs) low-supply warnings; text only via the existing Oracle bubble.
- Adventurer XP persistence across runs (resets on Play Again).
- New endings beyond fixing the failure narration.

## Acceptance

- Food and water are buyable from the Supreme Shop and tick the corresponding counters.
- Starvation and dehydration endings narrate clearly with Play Again.
- Low-supply warning fires once each for food and water when ≤2.
- river_crossing shows only one raft choice when `built_raft` is owned. Same for ladder and music box.
- Adventurer XP counter increments 10 per cleared gated choice, visible in the counter bar.
- Realm card shows the adventurer tier (Common/Rare/Epic/Legendary).
- Type check, lint, build all clean. Vercel deploy succeeds.
