import type { FlagState } from "@/lib/flags";

// Lookup table from common flag ids (or substrings) to RealmCard title
// suffixes. The kid's flag state is searched in priority order; first match
// wins. Falls back to no suffix when nothing matches.
//
// Claude picks story-specific flag ids each playthrough, so exact-match
// lookups would miss most of them. Substring rules give us decent coverage
// across common storytelling motifs without hardcoding every flavor.

type SuffixRule = {
  match: (flagId: string) => boolean;
  suffix: string;
};

const RULES: SuffixRule[] = [
  // Direct id matches first (highest priority)
  { match: (id) => id === "tamed_dragon", suffix: "the Dragon Tamer" },
  { match: (id) => id === "freed_dragon", suffix: "the Dragon Tamer" },
  { match: (id) => id === "helped_villager", suffix: "the Kind Helper" },
  { match: (id) => id === "saved_friend", suffix: "the Loyal Friend" },
  { match: (id) => id === "chose_treasure", suffix: "the Treasure Seeker" },
  { match: (id) => id === "chose_secret_path", suffix: "the Path Finder" },
  { match: (id) => id === "kept_promise", suffix: "the Keeper of Promises" },
  // Substring rules
  { match: (id) => /dragon/.test(id), suffix: "the Dragon Whisperer" },
  { match: (id) => /(treasure|gold|hoard)/.test(id), suffix: "the Treasure Seeker" },
  { match: (id) => /(help|kind|save|rescue)/.test(id), suffix: "the Kind Helper" },
  { match: (id) => /(secret|hidden|mystery)/.test(id), suffix: "the Mystery Walker" },
  { match: (id) => /(brave|courage|fight)/.test(id), suffix: "the Brave" },
  { match: (id) => /(magic|wizard|spell)/.test(id), suffix: "the Spellweaver" },
  { match: (id) => /(forest|tree|grove)/.test(id), suffix: "the Forest Friend" },
  { match: (id) => /(sea|water|river|ocean)/.test(id), suffix: "the Tide Walker" },
  { match: (id) => /(star|sky|moon|sun)/.test(id), suffix: "the Skybound" },
  { match: (id) => /(song|music|sing)/.test(id), suffix: "the Songkeeper" },
];

export function flagTitleSuffix(flags: FlagState): string | null {
  const trueIds = Object.entries(flags)
    .filter(([, v]) => v)
    .map(([id]) => id);
  if (trueIds.length === 0) return null;
  for (const rule of RULES) {
    for (const id of trueIds) {
      if (rule.match(id)) return rule.suffix;
    }
  }
  return null;
}
