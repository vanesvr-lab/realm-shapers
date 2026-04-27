// B-011 catalog validator. Runs at module load (called from the bottom of
// lib/themes-catalog.ts and lib/characters-catalog.ts) and throws if any
// cross-reference is broken. Catches typos in dev immediately.
//
// Checks performed:
// - theme ids unique
// - sub-scene ids unique within theme + globally
// - every sub_scene.theme references a real theme
// - every connects_to id references a real sub-scene IN THE SAME theme
// - every theme has at least 1 entry-candidate and at least 1 ending-candidate
// - every character.theme_fit id references a real theme
// - at least one girl-coded character (voice Fena) and at least one boy-coded
//   character (voice Ryan) — required for representational balance.

import type { Theme } from "@/lib/themes-catalog";
import type { Character } from "@/lib/characters-catalog";

export function validateThemeCatalog(themes: Theme[]): void {
  const themeIds = new Set<string>();
  for (const theme of themes) {
    if (themeIds.has(theme.id)) {
      throw new Error(`[catalog] duplicate theme id ${theme.id}`);
    }
    themeIds.add(theme.id);
  }

  const allSubSceneIds = new Set<string>();
  for (const theme of themes) {
    const inTheme = new Set<string>();
    for (const sub of theme.sub_scenes) {
      if (sub.theme !== theme.id) {
        throw new Error(
          `[catalog] sub-scene ${sub.id} declares theme=${sub.theme} but lives in theme ${theme.id}`
        );
      }
      if (inTheme.has(sub.id)) {
        throw new Error(`[catalog] duplicate sub-scene id ${sub.id} within theme ${theme.id}`);
      }
      inTheme.add(sub.id);
      if (allSubSceneIds.has(sub.id)) {
        throw new Error(`[catalog] sub-scene id ${sub.id} collides across themes`);
      }
      allSubSceneIds.add(sub.id);
    }

    for (const sub of theme.sub_scenes) {
      for (const target of sub.connects_to) {
        if (!inTheme.has(target)) {
          throw new Error(
            `[catalog] sub-scene ${sub.id} connects_to ${target} but no such sub-scene exists in theme ${theme.id}`
          );
        }
        if (target === sub.id) {
          throw new Error(`[catalog] sub-scene ${sub.id} connects to itself`);
        }
      }
    }

    const entries = theme.sub_scenes.filter((s) => s.can_be_entry);
    if (entries.length === 0) {
      throw new Error(`[catalog] theme ${theme.id} has no entry-candidate sub-scenes`);
    }
    const endings = theme.sub_scenes.filter((s) => s.can_be_ending);
    if (endings.length === 0) {
      throw new Error(`[catalog] theme ${theme.id} has no ending-candidate sub-scenes`);
    }
  }
}

export function validateCharacterCatalog(
  characters: Character[],
  themeIds: Set<string>
): void {
  const charIds = new Set<string>();
  let girlCoded = 0;
  let boyCoded = 0;
  for (const c of characters) {
    if (charIds.has(c.id)) {
      throw new Error(`[catalog] duplicate character id ${c.id}`);
    }
    charIds.add(c.id);
    for (const t of c.theme_fit) {
      if (!themeIds.has(t)) {
        throw new Error(`[catalog] character ${c.id} theme_fit references unknown theme ${t}`);
      }
    }
    if (c.voice === "Fena") girlCoded += 1;
    if (c.voice === "Ryan") boyCoded += 1;
  }
  if (girlCoded < 1) {
    throw new Error("[catalog] at least one girl-coded (Fena) character is required");
  }
  if (boyCoded < 1) {
    throw new Error("[catalog] at least one boy-coded (Ryan) character is required");
  }
}
