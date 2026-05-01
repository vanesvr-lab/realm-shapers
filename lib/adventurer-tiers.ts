// B-020 adventurer tiers. Maps the per-run adventurer_xp counter (+10
// per cleared gated choice in StoryPlayer) into a four-step rarity-
// shaped label rendered on the realm card. Distinct from the builder
// tier (lib/builds-catalog.ts), which scores Skills & Build crafts.

export type AdventurerTier = "Common" | "Rare" | "Epic" | "Legendary";

export function adventurerTier(xp: number): AdventurerTier {
  if (xp >= 100) return "Legendary";
  if (xp >= 60) return "Epic";
  if (xp >= 30) return "Rare";
  return "Common";
}

// Tailwind class fragments for the tier badge. Background + text colour
// pair; rendered inline by RealmCard so the badge reads at a glance.
export const ADVENTURER_TIER_BADGE: Record<AdventurerTier, string> = {
  Common: "bg-slate-200 text-slate-700",
  Rare: "bg-blue-200 text-blue-900",
  Epic: "bg-purple-200 text-purple-900",
  Legendary: "bg-amber-200 text-amber-900",
};
