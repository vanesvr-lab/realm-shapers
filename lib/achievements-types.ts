// Client-safe types and definitions mirrored from lib/achievements.ts so that
// React components can import them without dragging in server-only code.

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_realm", name: "First Realm", description: "Shape your very first realm.", icon: "🌟" },
  { id: "three_realms", name: "Realm Builder", description: "Shape 3 realms.", icon: "📚" },
  { id: "five_realms", name: "Realm Collector", description: "Shape 5 realms.", icon: "🗺️" },
  { id: "ten_realms", name: "Master Shaper", description: "Shape 10 realms.", icon: "🏆" },
  { id: "five_backgrounds", name: "World Wanderer", description: "Use 5 different backgrounds.", icon: "🏞️" },
  { id: "five_characters", name: "Cast of Friends", description: "Use 5 different characters.", icon: "🎭" },
  { id: "secret_ending", name: "Secret Keeper", description: "Discover a hidden ending.", icon: "🔮" },
  { id: "three_secrets", name: "Mystery Hunter", description: "Discover 3 secret endings.", icon: "🪐" },
  { id: "rare_card", name: "Rare Find", description: "Earn a Rare card.", icon: "💜" },
  { id: "epic_card", name: "Epic Tale", description: "Earn an Epic card.", icon: "💎" },
  { id: "legendary_card", name: "Legendary Realm", description: "Earn a Legendary card.", icon: "⚡" },
  { id: "heavy_editor", name: "Set Designer", description: "Place 5+ props in the scene editor.", icon: "✨" },
  { id: "all_pickups", name: "Treasure Hunter", description: "Collect every pickup in one playthrough.", icon: "🎒" },
  { id: "visit_all_scenes", name: "Cartographer", description: "Visit all 5 main scenes in one playthrough.", icon: "🧭" },
  { id: "share_realm", name: "Storyteller", description: "Share one of your realms.", icon: "📨" },
  { id: "dragon_friend", name: "Dragon Friend", description: "Star the friendly dragon in a realm.", icon: "🐉" },
  { id: "wizard_friend", name: "Wizard Apprentice", description: "Star the young wizard in a realm.", icon: "🪄" },
  { id: "underwater_realm", name: "Deep Diver", description: "Set a realm in the underwater coral garden.", icon: "🐠" },
];

export const ACHIEVEMENT_DEFS_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENT_DEFS.map((a) => [a.id, a])
);
