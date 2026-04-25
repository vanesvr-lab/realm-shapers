# Realm Shapers Design Document

> Designed by Vanessa Rangasamy, Anaya (age 11), and Kellen (age 11). April 24, 2026.

---

## The Pitch

Realm Shapers is a creative AI game where players use 4 imagination ingredients to generate worlds, then explore those worlds to save them from The Fade, a shadow that eats realms when no one imagines them anymore. Players choose their path: fight as an Adventurer, create as a Builder, or do both. They tame rare sidekicks, collect rare worlds, and decide the ending: destroy the darkness or heal it.

The game's core message: **imagination is what brings worlds to life. Creativity matters more than luck.**

---

## The Core Loop

1. Open the game, see your **Projects Tab** showing past worlds + The Great Map showing realms saved
2. Pick a realm to enter
3. Fill in 4 ingredients: **Setting, Character, Goal, Twist**
4. Click Generate. Screen transitions to **The Forge**.
5. Play the **Forge mini-game** while Claude generates your world (collect stars or ingredients)
6. **"Enter when ready"** button appears once world is ready (player controls when to leave Forge)
7. World loads as an **animated SVG map + soundscape + Oracle narration**
8. Player chooses their path inside the realm:
   - **Adventurer:** fight Fade Moments, defeat the realm boss, get loot
   - **Builder:** refine the world, tame sidekicks, decorate, collect
9. Save the realm. Sidekick is added to Sanctuary.
10. Return to map. Advance toward The Fade.
11. Eventually face The Fade: **destroy it OR heal it**.

---

## The Story

The realms are fading. Long ago, children's imaginations kept them bright and full of magic. But fewer dreamers dream now, and the worlds are becoming gray. The Oracle, a magical guide, calls on you to shape a realm and bring it back to life.

The Fade is the villain. It is a shadow that eats realms. It is not a monster you fight with swords. You fight it with **imagination**. Every detailed, creative world you build pushes The Fade back. Every world you abandon lets it grow.

At the end of the journey, when you finally reach The Heart of The Fade, you face a choice:
- **Destroy it.** An epic battle. The realms are saved but a little something is lost. Shadows are part of balance too.
- **Heal it.** A harder ending. The shadow becomes light. The Fade turns into something new, maybe a sad creature that just wanted to be seen.

Both endings are valid. Both teach the player something different.

---

## Design Credits

This game was designed by three people. Most ideas came from the kids.

### Anaya's Contributions (Story Design Lead)

The game's heart. Anaya designed the emotional and narrative structure.

1. **Goal of the game: Save the Realms** from The Fade
2. **The Villain: The Fade** (a shadow that eats worlds, fought with imagination not weapons)
3. **Fade Moments** (small tap challenges that creep in while building, making world creation feel like an adventure)
4. **Sidekick taming** (her original idea, before any other pet system was discussed)
5. **Sidekick personalization:** name, play, dress up
6. **No trading** (cut on principle: causes drama and conflict between players)
7. **Command-based sidekick combat** (player tells sidekick when to attack)
8. **Sidekicks level up via fighting AND bonding**
9. **Big celebration animations on level up**
10. **Five-tier rarity:** Common, Uncommon, Rare, Legendary, Mythic
11. **Rare sidekicks earned by luck + skill + effort combined**
12. **Sidekick Book** (Pokédex-style collection display)
13. **Game beatable with any sidekicks** (fairness for all kids, even without rares)
14. **Journey through multiple realms with mini-Fade bosses**
15. **Player-chosen path through realms** (branching adventure structure)
16. **Moral choice ending: destroy OR heal The Fade** (compassion as a valid choice)

### Kellen's Contributions (Systems Design Lead)

The game's body. Kellen designed the mechanics, customization, and systems that give the game depth.

1. **Projects Tab** with preview boxes and named worlds (gallery to admire past creations)
2. **Full project options menu:** Explore, Edit, Share, Delete, Rename, Favorite, Duplicate
3. **Trash folder with 30-day recovery** before permanent delete (pro UX, used by Google Photos, iPhone Photos)
4. **Game Modes:** Easy, Normal, Hardcore, Peaceful Mode, Time Limit
5. **Creative Mode as a toggle** (NOT a difficulty, a build-mode tool that can be turned on inside any world)
6. **Scary Graphics vs Peaceful Graphics** (gore filter; same monsters, same world, but no blood/horror in Peaceful Graphics mode)
7. **Loot system:** materials, weapons, coins, rare collectibles, food
8. **Shopkeeper-less shop** (stations only, no NPC dialogue, fast and clean like Hades or Dead Cells)
9. **Bought pets vs found pets** (common buy-from-shop tier vs rare tame-while-exploring tier)
10. **Tiered Seasonal Event System:**
    - Monthly: legendary rare pet on sale
    - Every 5 months: super rare ("mythic") pet, 2-day window only
    - Monthly: rare world setting on sale (e.g., "Bowser's Mansion," "Galactic Space Station")
11. **Bought rare settings owned forever** once purchased, become permanent options for future worlds
12. **Multi-Path Goals (Adventurer Path vs Builder Path)** (player motivation theory: same game, different play styles, no "right way to play")
13. **Geometry Dash-style save menu:** Save, Save & Exit, Save & Play, Exit Without Saving
14. **Auto-save background safety net** alongside the manual save options

### Vanessa's Contributions (Builder + Integration)

Vanessa unified the kids' separate visions and made key integration decisions.

1. **Time Limit Mode + The Fade integration:** "Every time you choose Time Limit Mode, there is a Fade that gives you a time limit." This fused Kellen's mechanical mode with Anaya's villain into one story-justified mechanic. The Time Limit isn't arbitrary, it's because The Fade is actively closing in.
2. **Fade Fragment reward:** beating Time Limit Mode earns a unique trophy that displays in Sanctuary and Projects Tab. Future-proofs for Phase 3 use (unlocking special sidekicks/settings).
3. **Layered Phase 1 / 2 / 3 / 4 roadmap:** acknowledges every kid idea, sequences them across phases, no idea is killed.

---

## Player Types Considered

Kellen's Adventurer-vs-Builder split is a real player motivation framework (originally Bartle's player types). The game serves at least three player types:

- **Achievers** (Kellen's "Adventurer Path"): want to defeat The Fade, beat the bosses, level up
- **Creators** (Kellen's "Builder Path"): want to make beautiful worlds, collect rare pets, customize
- **Explorers** (everyone, default): want to discover all realms, find rare creatures, see all the secrets

The MVP supports all three motivations through the core loop. Phase 2/3 deepens specialization.

---

## What We Cut and Why

A list of features explicitly cut from the design, with rationale. Real product design includes knowing what NOT to build.

- **Trading sidekicks.** Cut by Anaya: causes drama. Permanent.
- **NPC shopkeepers.** Cut by Kellen: dialogue slows gameplay. Permanent.
- **First-person 3D exploration.** Deferred to Phase 4: too ambitious for hackathon.
- **Real-time multiplayer.** Deferred to Phase 2 stretch: out of scope for 7-day build.
- **Image generation for worlds.** Skipped in favor of SVG maps: more unique, more interactive, lower cost.

---

## What This Game Is Not

To prevent scope creep, here's what this game is explicitly NOT:

- **Not Minecraft.** We respect Minecraft mechanics but the heart is AI worldbuilding, not survival mining.
- **Not a chatbot.** The Oracle is a character, not a prompt interface.
- **Not infinite.** The journey has an ending. Players can finish the story.
- **Not pay-to-win.** Phase 3's seasonal shop sells cosmetics and convenience, never required power.
- **Not anonymous.** Every player gets a Sanctuary they own and care about.

---

## Inspirations Referenced

The kids cited or instinctively designed in line with these games:

- **Pokémon** (sidekick collection, rarity system, Pokédex)
- **Animal Crossing** (bonding with creatures, peaceful customization)
- **Zelda** (dungeon-style realm progression, boss encounters)
- **Hollow Knight** (player-chosen paths through a world)
- **Undertale** (moral choice ending: kill or spare)
- **Mario** (boss-as-villain framing)
- **Geometry Dash** (pause menu UX, level editor mindset)
- **Minecraft** (game modes, creative toggle, hardcore mode)
- **Hades / Dead Cells** (shopkeeper-less shop UX)
- **Genshin Impact / Fortnite** (limited-time seasonal events)
- **Roblox** (player-chosen experiences within a single platform)

---

## Demo Video Strategy

Two-minute video for hackathon submission must show:

1. (0:00-0:20) Hook: kids on screen explaining the game in their own words
2. (0:20-1:00) Live build of one world (4 ingredients → Forge → animated map + sound)
3. (1:00-1:30) Show second world demonstrating different inputs = different output
4. (1:30-1:50) Sanctuary screen + sidekick reveal (if Layer 3 ships)
5. (1:50-2:00) Closing: "Designed by an 11-year-old brother and sister"

The kid-design story is a strong differentiator. Lean into it.

---

## Auth and Identity

Realm Shapers uses **parent-fronted Supabase Auth**, designed to be COPPA,
GDPR-K, and UK Children's Code compliant from day one. The kid plays
anonymously by default; to save worlds across devices, a parent or guardian
provides email-based consent via magic link. The full design rationale,
regulatory analysis, data model, user flows, and edge cases are in:

- [B-002a Auth Design Spec](superpowers/specs/2026-04-25-b-002a-auth-design.md)
- [B-002a Auth Implementation Plan](superpowers/plans/2026-04-25-b-002a-auth.md)
