// Adventures registry. Single source of truth for hand-authored adventures
// that bypass Claude. /api/generate looks up by id when the payload carries
// adventure_id; PlayClient downstream is unaware these came from a registry.
//
// Module-load validation: cross-check every choice.requires id, every
// choice.consumes id, every choice.grants id, and every starter candidate
// against the pickups catalog so a typo throws at server boot rather than
// at play time. Every choice.next_scene_id and choice_options.goes_to and
// endings.scene_id must resolve to a real scene id (or the secret_ending
// id) within the same tree.

import type { Adventure } from "@/lib/adventures/types";
import type { StoryScene } from "@/lib/claude";
import { isValidPickupId } from "@/lib/pickups-catalog";
import { HUNT_DRAGON_EGG } from "@/lib/adventures/hunt-dragon-egg";

const ADVENTURES: Adventure[] = [HUNT_DRAGON_EGG];

export const ADVENTURES_BY_ID: Record<string, Adventure> = Object.fromEntries(
  ADVENTURES.map((a) => [a.id, a])
);

export function getAdventure(id: string): Adventure | null {
  return ADVENTURES_BY_ID[id] ?? null;
}

export function isValidAdventureId(id: string): boolean {
  return id in ADVENTURES_BY_ID;
}

function validateAdventure(adventure: Adventure): void {
  const { id, story } = adventure;
  const sceneIds = new Set(story.scenes.map((s) => s.id));
  if (story.secret_ending) sceneIds.add(story.secret_ending.id);

  if (!sceneIds.has(story.starting_scene_id)) {
    throw new Error(`adventure ${id}: starting_scene_id ${story.starting_scene_id} not in scenes`);
  }

  // Build the universe of valid pickup ids: catalog + starter candidates +
  // any id explicitly granted by a choice (so an adventure can introduce a
  // synthetic pickup like a quest token without registering it in the
  // catalog, though we don't use that today).
  const grantedIds = new Set<string>();
  for (const scene of story.scenes) {
    for (const choice of scene.choices) {
      if (choice.grants) for (const g of choice.grants) grantedIds.add(g);
    }
  }
  const validPickupIds = (id: string) =>
    isValidPickupId(id) ||
    grantedIds.has(id) ||
    (story.starter_choices?.candidates.includes(id) ?? false);

  // Every starter candidate must resolve in the catalog.
  for (const candidate of story.starter_choices?.candidates ?? []) {
    if (!isValidPickupId(candidate)) {
      throw new Error(`adventure ${id}: starter candidate ${candidate} is not in pickups catalog`);
    }
  }

  // Counter defs sanity: every counter_tick / replenish key must reference a
  // declared counter id.
  const counterIds = new Set((story.counter_defs ?? []).map((d) => d.id));
  const checkCounterKeys = (scene: StoryScene, kind: "counter_tick" | "replenish") => {
    const map = scene[kind];
    if (!map) return;
    for (const k of Object.keys(map)) {
      if (!counterIds.has(k)) {
        throw new Error(
          `adventure ${id}: scene ${scene.id} ${kind} references unknown counter ${k}`
        );
      }
    }
  };

  for (const scene of story.scenes) {
    checkCounterKeys(scene, "counter_tick");
    checkCounterKeys(scene, "replenish");

    for (const choice of scene.choices) {
      if (!sceneIds.has(choice.next_scene_id)) {
        throw new Error(
          `adventure ${id}: scene ${scene.id} choice ${choice.id} next_scene_id ${choice.next_scene_id} not in scenes`
        );
      }
      for (const r of choice.requires ?? []) {
        if (!validPickupIds(r)) {
          throw new Error(
            `adventure ${id}: scene ${scene.id} choice ${choice.id} requires unknown pickup ${r}`
          );
        }
      }
      for (const c of choice.consumes ?? []) {
        if (!validPickupIds(c)) {
          throw new Error(
            `adventure ${id}: scene ${scene.id} choice ${choice.id} consumes unknown pickup ${c}`
          );
        }
      }
      for (const g of choice.grants ?? []) {
        if (!isValidPickupId(g)) {
          throw new Error(
            `adventure ${id}: scene ${scene.id} choice ${choice.id} grants unknown pickup ${g}`
          );
        }
      }
      if (choice.coin_cost !== undefined && !counterIds.has("coins")) {
        throw new Error(
          `adventure ${id}: scene ${scene.id} choice ${choice.id} has coin_cost but no coins counter declared`
        );
      }
      for (const k of Object.keys(choice.grants_counter ?? {})) {
        if (!counterIds.has(k)) {
          throw new Error(
            `adventure ${id}: scene ${scene.id} choice ${choice.id} grants_counter references unknown counter ${k}`
          );
        }
      }
      for (const k of Object.keys(choice.consumes_counter ?? {})) {
        if (!counterIds.has(k)) {
          throw new Error(
            `adventure ${id}: scene ${scene.id} choice ${choice.id} consumes_counter references unknown counter ${k}`
          );
        }
      }
    }

    for (const opt of scene.choice_options ?? []) {
      if (!sceneIds.has(opt.goes_to)) {
        throw new Error(
          `adventure ${id}: scene ${scene.id} choice_option ${opt.label} goes_to ${opt.goes_to} not in scenes`
        );
      }
    }

    for (const p of scene.pickups) {
      if (!isValidPickupId(p)) {
        throw new Error(`adventure ${id}: scene ${scene.id} pickup ${p} not in catalog`);
      }
    }
  }

  for (const ending of story.endings ?? []) {
    if (!sceneIds.has(ending.scene_id)) {
      throw new Error(`adventure ${id}: ending scene_id ${ending.scene_id} not in scenes`);
    }
  }

  // Last endings entry must have empty requires (the fallback) per the
  // selectEnding contract in lib/scene-resolver.ts.
  if (story.endings && story.endings.length > 0) {
    const last = story.endings[story.endings.length - 1];
    if (Object.keys(last.requires).length !== 0) {
      throw new Error(`adventure ${id}: last ending must have empty requires (fallback)`);
    }
  }
}

for (const adventure of ADVENTURES) {
  validateAdventure(adventure);
}
