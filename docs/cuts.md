# Cuts Log

> Features cut from current Phase, with rationale and target Phase. Append-only.

## Template

```
## [Feature name]
**Designed by:** Anaya | Kellen | Vanessa
**Cut from:** Phase 1 | Phase 2 | etc.
**Reason:**
**Returns in:** Phase 2 | Phase 3 | Phase 4 | Permanent (never returns)
```

---

## Multi-realm journey map
**Designed by:** Anaya
**Cut from:** Phase 1 (MVP)
**Reason:** Building the journey infrastructure (multiple realms with progression gates) takes ~2 days. MVP uses single-realm framing with title screen + ending screen instead.
**Returns in:** Phase 2

## Adventurer vs Builder path toggle
**Designed by:** Kellen
**Cut from:** Phase 1 (MVP)
**Reason:** Both paths require separate gameplay systems (combat for Adventurer, deeper customization for Builder). MVP supports the player's choice through soft framing only.
**Returns in:** Phase 3

## Time Limit Mode + Fade Fragment
**Designed by:** Vanessa (integration of Kellen's Time Limit + Anaya's Fade)
**Cut from:** Phase 1 (MVP)
**Reason:** Mode selector UI + countdown timer + Fade Fragment trophy system are interdependent. MVP ships with no game modes.
**Returns in:** Phase 2

## Sidekick Book / Pokédex with silhouettes
**Designed by:** Anaya
**Cut from:** Phase 1 (MVP)
**Reason:** Requires a full creature catalog with rarity tiers and unlock states. MVP has Sanctuary (if Layer 3 ships) showing only collected creatures.
**Returns in:** Phase 2

## Five-tier rarity system
**Designed by:** Anaya
**Cut from:** Phase 1 (MVP)
**Reason:** Balancing 5 tiers requires playtesting. MVP uses 2 tiers (Common, Rare) which is enough to feel meaningful without becoming a balance project.
**Returns in:** Phase 2

## Sidekick combat and leveling
**Designed by:** Anaya
**Cut from:** Phase 1 (MVP)
**Reason:** Combat system is its own substantial build. MVP sidekicks (if Layer 3 ships) are show-only, no combat.
**Returns in:** Phase 2

## Tiered seasonal events
**Designed by:** Kellen
**Cut from:** Phase 1 (MVP)
**Reason:** Requires shop + recurring content pipeline + scheduled rotation logic. Massive scope.
**Returns in:** Phase 3

## Crafting Station, Upgrade Station, full loot economy
**Designed by:** Kellen
**Cut from:** Phase 1 (MVP)
**Reason:** Loot economy is interdependent with combat (Phase 2) and shop (Phase 3). Building it in MVP would create dead UI.
**Returns in:** Phase 3

## Trash folder with 30-day recovery
**Designed by:** Kellen
**Cut from:** Phase 1 (MVP)
**Reason:** Soft-delete + restore logic + scheduled purge job is ~4 hours of work. MVP just hides "Delete" button or uses confirm-only delete.
**Returns in:** Phase 3

## Geometry Dash full pause menu
**Designed by:** Kellen
**Cut from:** Phase 1 (MVP)
**Reason:** MVP uses simpler save (auto-save + single Save button). Full pause menu with multiple actions returns later.
**Returns in:** Phase 3

## Scary vs Peaceful Graphics toggle
**Designed by:** Kellen
**Cut from:** Layer 1 (still in Layer 2 for Phase 1 if time permits)
**Reason:** MVP uses single visual style (Peaceful Graphics by default). Toggle is a polish-pass feature.
**Returns in:** Phase 1 Layer 2 (still hopeful) or Phase 2

## First-person 3D exploration
**Designed by:** Kellen
**Cut from:** Phases 1, 2, 3
**Reason:** Genuine multi-month build. Possibly a separate companion app or full rewrite.
**Returns in:** Phase 4 (Dream Build)

## Real-time multiplayer
**Designed by:** Vanessa (during scoping conversation)
**Cut from:** Phase 1 (MVP)
**Reason:** WebSocket infrastructure, room management, shared state, edge cases. 4-5 days of work alone.
**Returns in:** Phase 2 stretch

## Trading sidekicks between players
**Designed by:** Anaya (then cut by Anaya)
**Cut from:** ALL phases
**Reason:** Causes drama and conflict between players. Anaya's call. Real "toxic design" risk.
**Returns in:** Permanent cut

## NPC shopkeepers
**Designed by:** Kellen (then cut by Kellen)
**Cut from:** ALL phases
**Reason:** Dialogue slows gameplay. Stations only.
**Returns in:** Permanent cut
