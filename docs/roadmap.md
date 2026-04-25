# Realm Shapers Roadmap

> Last updated: 2026-04-24

## How This Roadmap Works

Realm Shapers is being built in **layers**. We ship the smallest version that works, then add features only if we have buffer time. This is how real product teams work.

**Hard rule:** No Layer 2 work until Layer 1 ships. No Layer 3 work until Layer 2 ships.

If we run out of time, we still have a complete game. If we run ahead, we add more.

---

## Phase 1: Hackathon MVP (Due May 1, 2026)

The version we submit. Polished, demo-ready, beatable in 60 seconds.

### Layer 1 (Days 1-4) — Must Ship

- 4-ingredient world generator (Setting, Character, Goal, Twist) via Claude API
- Animated SVG map output rendered from structured Claude response
- Soundscape via ElevenLabs (with mute toggle, never autoplay)
- Projects Tab with preview boxes (named, scrollable grid)
- Auto-save + manual save (single save action for MVP)
- "Save the Realms" framing (title screen + one ending screen)
- Async gallery (share worlds publicly)
- Deployed on Vercel with public URL

### Layer 2 (Days 5-6) — Add If On Track

- Animated Oracle character (Lottie or custom SVG)
- Forge mini-game during AI generation ("Catch the Stars" style)
- "Enter when ready" button (player chooses when to leave Forge)
- Both endings (destroy The Fade OR heal The Fade) as final-screen choice
- Scary Graphics vs Peaceful Graphics toggle (gore filter)
- Polish pass: Framer Motion transitions, typewriter text reveal, particles

### Layer 3 (If Day 5 Is Clear) — Priority Bonus

- Sidekicks: one creature per saved world
- Player names the sidekick
- Sanctuary screen showing all collected sidekicks
- Two-tier rarity (Common / Rare based on world creativity)

If we only get one Layer 3 feature, this is it. Sidekicks are the heart of Anaya's vision.

---

## Phase 2: The "Heart" Update (Post-Hackathon)

Anaya's full vision lands here.

- Multi-realm journey map (5-7 realms to save)
- Realm-by-realm progression with mini-Fade bosses
- Sidekick Book / Pokédex with silhouettes for undiscovered creatures
- Five-tier rarity expansion (Common → Uncommon → Rare → Legendary → Mythic)
- Sidekick combat (command-based, fights Fade Moments)
- Sidekick leveling via fighting AND bonding
- Big celebration animations on level-up
- Sidekick personalization: name, dress up, play with
- Player-chosen path through realms

---

## Phase 3: The "Action" Update

Kellen's systems vision lands here.

- Adventurer vs Builder path toggle inside each realm
- Time Limit Mode + Fade Fragment trophy
- Loot system (materials, weapons, coins, food, collectibles)
- Crafting Station, Upgrade Station
- Shopkeeper-less shop with stations
- Tiered seasonal events (monthly legendary pets, every-5-month mythics, monthly rare settings)
- Game modes (Easy, Normal, Hardcore, Peaceful, Time Limit)
- Creative Mode toggle (build inside any world)
- Geometry Dash-style pause menu (Save, Save & Exit, Save & Play, Exit Without Saving)
- Trash folder with 30-day recovery for deleted projects

---

## Phase 4: The "3D" Update (Dream Build)

The most ambitious version. Possibly a full rewrite or a separate companion app.

- First-person 3D exploration of generated worlds
- Walk through your map as if it were a real place
- Discover hidden secrets, meet NPCs, find creatures inside the world
- Voice acting via ElevenLabs voice cloning (kids' voices for Oracle?)
- Full mobile app via Capacitor or React Native rewrite
- Real-time multiplayer collaborative worldbuilding

---

## Cut Permanently

These were considered and explicitly removed from the roadmap.

- **Trading sidekicks between players.** Anaya cut this on principle: it causes drama and conflict. Stays cut forever.
- **NPC shopkeepers.** Kellen cut this because dialogue slows gameplay. Shop stations only.

---

## Decision Log

When the kids or Vanessa want to know "why did we do X this way," check `docs/decisions/` for ADRs (Architecture Decision Records) on non-obvious calls.
