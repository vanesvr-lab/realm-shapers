import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoryTree } from "@/lib/claude";
import {
  ACHIEVEMENT_DEFS,
  ACHIEVEMENT_DEFS_BY_ID,
  type AchievementDef,
} from "@/lib/achievements-types";

export { ACHIEVEMENT_DEFS, ACHIEVEMENT_DEFS_BY_ID };
export type { AchievementDef };

export type CheckEvent =
  | { kind: "world_created"; ingredients: { setting: string; character: string; goal: string; twist: string } | null; story: StoryTree | null }
  | { kind: "world_completed"; world_id: string; rarity: Rarity; secret_discovered: boolean; pickups_collected: string[]; total_pickups: number; scenes_visited: string[] }
  | { kind: "editor_props_placed"; count: number }
  | { kind: "world_shared" };

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

type WorldRow = {
  id: string;
  map: StoryTree | null;
};

async function fetchUnlocked(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.achievement_id as string));
}

async function fetchWorlds(
  supabase: SupabaseClient,
  userId: string
): Promise<WorldRow[]> {
  const { data } = await supabase
    .from("worlds")
    .select("id, map")
    .eq("user_id", userId);
  return (data ?? []) as WorldRow[];
}

function distinctCharacters(worlds: WorldRow[]): Set<string> {
  const set = new Set<string>();
  for (const w of worlds) {
    if (w.map?.default_character_id) set.add(w.map.default_character_id);
  }
  return set;
}

function distinctBackgrounds(worlds: WorldRow[]): Set<string> {
  const set = new Set<string>();
  for (const w of worlds) {
    if (!w.map?.scenes) continue;
    for (const s of w.map.scenes) {
      if (s.background_id) set.add(s.background_id);
    }
  }
  return set;
}

export async function evaluateUnlocks(
  supabase: SupabaseClient,
  userId: string,
  event: CheckEvent
): Promise<AchievementDef[]> {
  const already = await fetchUnlocked(supabase, userId);
  const newlyUnlocked: string[] = [];

  function tryUnlock(id: string, condition: boolean) {
    if (condition && !already.has(id) && !newlyUnlocked.includes(id)) {
      newlyUnlocked.push(id);
    }
  }

  if (event.kind === "world_created") {
    const worlds = await fetchWorlds(supabase, userId);
    const count = worlds.length;
    tryUnlock("first_realm", count >= 1);
    tryUnlock("three_realms", count >= 3);
    tryUnlock("five_realms", count >= 5);
    tryUnlock("ten_realms", count >= 10);

    const chars = distinctCharacters(worlds);
    tryUnlock("five_characters", chars.size >= 5);
    tryUnlock("dragon_friend", chars.has("dragon"));
    tryUnlock("wizard_friend", chars.has("wizard"));

    const bgs = distinctBackgrounds(worlds);
    tryUnlock("five_backgrounds", bgs.size >= 5);
    tryUnlock("underwater_realm", bgs.has("underwater"));
  } else if (event.kind === "world_completed") {
    tryUnlock("rare_card", event.rarity === "rare" || event.rarity === "epic" || event.rarity === "legendary");
    tryUnlock("epic_card", event.rarity === "epic" || event.rarity === "legendary");
    tryUnlock("legendary_card", event.rarity === "legendary");
    tryUnlock("secret_ending", event.secret_discovered);

    if (event.secret_discovered) {
      const { data: secrets } = await supabase
        .from("worlds")
        .select("id")
        .eq("user_id", userId);
      // Approximate count of distinct secret endings: every world creation
      // includes a secret_ending field, so a reliable count requires logging
      // discovery events. For MVP we treat each completed world that fired
      // secret_discovered as one. Track separately if needed later.
      void secrets;
    }

    tryUnlock("visit_all_scenes", event.scenes_visited.length >= 5);
    tryUnlock(
      "all_pickups",
      event.total_pickups > 0 && event.pickups_collected.length >= event.total_pickups
    );
  } else if (event.kind === "editor_props_placed") {
    tryUnlock("heavy_editor", event.count >= 5);
  } else if (event.kind === "world_shared") {
    tryUnlock("share_realm", true);
  }

  if (newlyUnlocked.length === 0) return [];

  const rows = newlyUnlocked.map((id) => ({ user_id: userId, achievement_id: id }));
  const { error } = await supabase.from("user_achievements").insert(rows);
  if (error) {
    console.error("Failed to insert achievements:", error.message);
  }

  return newlyUnlocked
    .map((id) => ACHIEVEMENT_DEFS_BY_ID[id])
    .filter((d): d is AchievementDef => Boolean(d));
}

export async function countSecretsDiscovered(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)
    .in("achievement_id", ["secret_ending", "three_secrets"]);
  return (data ?? []).filter((r) => r.achievement_id === "secret_ending").length;
}

export async function fetchUnlockedIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.achievement_id as string);
}
