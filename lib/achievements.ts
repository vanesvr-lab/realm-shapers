import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BACKGROUND_IDS } from "@/lib/asset-library";
import {
  ACHIEVEMENT_DEFS,
  ACHIEVEMENT_DEFS_BY_ID,
  type AchievementDef,
} from "@/lib/achievements-types";

export { ACHIEVEMENT_DEFS, ACHIEVEMENT_DEFS_BY_ID };
export type { AchievementDef };

// Every CheckEvent corresponds to a real gameplay action. World creation is
// intentionally NOT an event: the kid earns achievements by playing, not by
// clicking Generate. See B-008 brief.
export type CheckEvent =
  | { kind: "scene_visited"; world_id: string; scene_id: string; background_id: string }
  | { kind: "pickup_collected"; world_id: string; scene_id: string; pickup_id: string }
  | { kind: "world_completed"; world_id: string; character_id: string; secret_discovered: boolean }
  | { kind: "side_quest_completed"; world_id: string; scene_id: string }
  | { kind: "secret_ending_discovered"; world_id: string }
  | { kind: "summon_used"; world_id: string; prop_id: string; matched: boolean }
  | { kind: "world_shared"; world_id: string };

type EventRow = {
  kind: string;
  payload: Record<string, unknown>;
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

async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  event: CheckEvent
): Promise<void> {
  const { error } = await supabase.from("gameplay_events").insert({
    user_id: userId,
    kind: event.kind,
    payload: stripKind(event),
  });
  if (error) {
    console.error("Failed to log gameplay event:", error.message);
  }
}

function stripKind(event: CheckEvent): Record<string, unknown> {
  const obj: Record<string, unknown> = { ...(event as unknown as Record<string, unknown>) };
  delete obj.kind;
  return obj;
}

async function fetchUserEvents(
  supabase: SupabaseClient,
  userId: string,
  kinds: string[]
): Promise<EventRow[]> {
  const { data } = await supabase
    .from("gameplay_events")
    .select("kind, payload")
    .eq("user_id", userId)
    .in("kind", kinds);
  return (data ?? []) as EventRow[];
}

function distinctPayloadField(rows: EventRow[], field: string): Set<string> {
  const out = new Set<string>();
  for (const r of rows) {
    const v = r.payload?.[field];
    if (typeof v === "string" && v) out.add(v);
  }
  return out;
}

export async function evaluateUnlocks(
  supabase: SupabaseClient,
  userId: string,
  event: CheckEvent
): Promise<AchievementDef[]> {
  // Persist the event first so cumulative queries below see it.
  await logEvent(supabase, userId, event);

  const already = await fetchUnlocked(supabase, userId);
  const newlyUnlocked: string[] = [];

  function tryUnlock(id: string, condition: boolean) {
    if (condition && !already.has(id) && !newlyUnlocked.includes(id)) {
      newlyUnlocked.push(id);
    }
  }

  if (event.kind === "scene_visited") {
    tryUnlock("first_steps", true);
    const rows = await fetchUserEvents(supabase, userId, ["scene_visited"]);
    const distinctScenes = new Set<string>();
    const distinctBackgrounds = new Set<string>();
    for (const r of rows) {
      const sid = r.payload?.scene_id;
      const wid = r.payload?.world_id;
      if (typeof sid === "string" && typeof wid === "string") {
        distinctScenes.add(`${wid}:${sid}`);
      }
      const bg = r.payload?.background_id;
      if (typeof bg === "string") distinctBackgrounds.add(bg);
    }
    tryUnlock("realm_walker", distinctScenes.size >= 10);
    tryUnlock("world_wanderer", coversAllBackgrounds(distinctBackgrounds));
  } else if (event.kind === "pickup_collected") {
    const rows = await fetchUserEvents(supabase, userId, ["pickup_collected"]);
    const distinctPickups = distinctPayloadField(rows, "pickup_id");
    tryUnlock("treasure_hunter", distinctPickups.size >= 10);
  } else if (event.kind === "world_completed") {
    tryUnlock("story_finisher", true);
    const rows = await fetchUserEvents(supabase, userId, ["world_completed"]);
    const distinctWorlds = distinctPayloadField(rows, "world_id");
    const distinctCharacters = distinctPayloadField(rows, "character_id");
    tryUnlock("five_worlds_strong", distinctWorlds.size >= 5);
    tryUnlock("all_heroes_tried", distinctCharacters.size >= 10);
  } else if (event.kind === "side_quest_completed") {
    tryUnlock("side_quester", true);
  } else if (event.kind === "secret_ending_discovered") {
    tryUnlock("secret_keeper", true);
    const rows = await fetchUserEvents(supabase, userId, ["secret_ending_discovered"]);
    const distinctWorlds = distinctPayloadField(rows, "world_id");
    tryUnlock("mystery_master", distinctWorlds.size >= 5);
  } else if (event.kind === "summon_used") {
    if (event.matched) {
      tryUnlock("summoner", true);
      const rows = await fetchUserEvents(supabase, userId, ["summon_used"]);
      const distinctProps = new Set<string>();
      for (const r of rows) {
        const matched = r.payload?.matched;
        const propId = r.payload?.prop_id;
        if (matched === true && typeof propId === "string") {
          distinctProps.add(propId);
        }
      }
      tryUnlock("master_summoner", distinctProps.size >= 10);
    }
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

function coversAllBackgrounds(seen: Set<string>): boolean {
  for (const id of BACKGROUND_IDS) {
    if (!seen.has(id)) return false;
  }
  return true;
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

export async function countSideQuestsCompleted(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("gameplay_events")
    .select("payload")
    .eq("user_id", userId)
    .eq("kind", "side_quest_completed");
  const seen = new Set<string>();
  for (const r of data ?? []) {
    const payload = (r as { payload: Record<string, unknown> | null }).payload ?? {};
    const wid = payload.world_id;
    const sid = payload.scene_id;
    if (typeof wid === "string" && typeof sid === "string") {
      seen.add(`${wid}:${sid}`);
    }
  }
  return seen.size;
}

export async function countSecretsDiscovered(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("gameplay_events")
    .select("payload")
    .eq("user_id", userId)
    .eq("kind", "secret_ending_discovered");
  const seen = new Set<string>();
  for (const r of data ?? []) {
    const payload = (r as { payload: Record<string, unknown> | null }).payload ?? {};
    const wid = payload.world_id;
    if (typeof wid === "string") seen.add(wid);
  }
  return seen.size;
}
