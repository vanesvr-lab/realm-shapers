// Client-safe types and definitions mirrored from lib/achievements.ts so that
// React components can import them without dragging in server-only code.

export type AchievementTrigger =
  | "scene_visited"
  | "pickup_collected"
  | "world_completed"
  | "side_quest_completed"
  | "secret_ending_discovered"
  | "summon_used"
  | "world_shared"
  | "choice_made"
  | "world_completed_with_ending";

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  trigger: AchievementTrigger;
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_steps", name: "First Steps", description: "Visit your very first scene.", icon: "👣", trigger: "scene_visited" },
  { id: "realm_walker", name: "Realm Walker", description: "Visit 10 unique scenes across all your realms.", icon: "🧭", trigger: "scene_visited" },
  { id: "world_wanderer", name: "World Wanderer", description: "Visit every kind of background at least once.", icon: "🏞️", trigger: "scene_visited" },
  { id: "story_finisher", name: "Story Finisher", description: "Finish your first realm.", icon: "📖", trigger: "world_completed" },
  { id: "five_worlds_strong", name: "Five Worlds Strong", description: "Finish 5 realms.", icon: "🏆", trigger: "world_completed" },
  { id: "all_heroes_tried", name: "All Heroes Tried", description: "Play with at least 10 different characters.", icon: "🎭", trigger: "world_completed" },
  { id: "treasure_hunter", name: "Treasure Hunter", description: "Collect 10 different pickups across all realms.", icon: "🎒", trigger: "pickup_collected" },
  { id: "side_quester", name: "Side Quester", description: "Complete your first side quest.", icon: "✨", trigger: "side_quest_completed" },
  { id: "secret_keeper", name: "Secret Keeper", description: "Discover a hidden ending.", icon: "🔮", trigger: "secret_ending_discovered" },
  { id: "mystery_master", name: "Mystery Master", description: "Discover 5 hidden endings.", icon: "🪐", trigger: "secret_ending_discovered" },
  { id: "summoner", name: "Summoner", description: "Use the summon feature for the first time.", icon: "✨", trigger: "summon_used" },
  { id: "master_summoner", name: "Master Summoner", description: "Successfully summon 10 different props.", icon: "💫", trigger: "summon_used" },
  { id: "share_realm", name: "Storyteller", description: "Share one of your realms.", icon: "📨", trigger: "world_shared" },
  { id: "forked_path", name: "Forked Path", description: "Make your first explicit choice.", icon: "🔀", trigger: "choice_made" },
  { id: "two_endings", name: "Two Realms, Two Endings", description: "Finish the same realm with two different endings.", icon: "🪞", trigger: "world_completed_with_ending" },
  { id: "all_three_endings", name: "All Three Endings", description: "Discover all three endings in any single realm.", icon: "🌈", trigger: "world_completed_with_ending" },
];

export const ACHIEVEMENT_DEFS_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENT_DEFS.map((a) => [a.id, a])
);
