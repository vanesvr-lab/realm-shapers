// B-019 builds catalog. Each build target lists the raw materials the kid
// must have in inventory before the Build panel will let them build it,
// the keywords the build-scorer looks for to detect intent, and the id
// of the resulting pickup that lands in inventory. Built items live in
// the pickups catalog (lib/pickups-catalog.ts) with kind: "built", so
// downstream rendering and inventory plumbing requires no special case.

export type BuildTarget = {
  // The id stem. Result pickup id is `built_<id>` (e.g., raft -> built_raft).
  id: string;
  label: string;
  // Pickup ids consumed from inventory when the build succeeds. All must
  // be present.
  required_materials: string[];
  // Lower-case keywords. Match if any one appears in the prompt as a
  // whole word. Keep these short and specific so unrelated prompts do
  // not collide.
  prompt_keywords: string[];
  // Optional. When the built item is consumed by a choice (e.g., the
  // dragon_chamber music box), set these flags based on the recorded
  // build level. First matching tier (level falls in [min_level,
  // max_level]) wins. Used today only for music_box (basic / charm /
  // masterwork). Other built items leave this absent and only gate
  // access to the choice; their level merely shows up as Oracle
  // feedback at build time.
  consume_level_flags?: Array<{
    min_level: number;
    max_level: number;
    flags: string[];
  }>;
};

export const BUILD_TARGETS: BuildTarget[] = [
  {
    id: "raft",
    label: "raft",
    required_materials: ["wood", "rope"],
    prompt_keywords: ["raft"],
  },
  {
    id: "ladder",
    label: "ladder",
    required_materials: ["wood"],
    prompt_keywords: ["ladder"],
  },
  {
    id: "kite",
    label: "kite",
    required_materials: ["cloth", "rope"],
    prompt_keywords: ["kite"],
  },
  {
    id: "torch",
    label: "torch",
    required_materials: ["wood", "wax"],
    prompt_keywords: ["torch"],
  },
  {
    id: "sword",
    label: "sword",
    required_materials: ["iron", "leather"],
    prompt_keywords: ["sword", "blade"],
  },
  {
    id: "fishing_net",
    label: "fishing net",
    required_materials: ["rope", "cloth"],
    prompt_keywords: ["fishing net", "net"],
  },
  {
    id: "music_box",
    label: "music box",
    required_materials: ["cloth", "wax", "feather"],
    prompt_keywords: ["music box", "musical box", "lullaby box"],
    consume_level_flags: [
      { min_level: 5, max_level: 5, flags: ["sang_lullaby", "composer_masterwork"] },
      { min_level: 3, max_level: 4, flags: ["sang_lullaby"] },
      { min_level: 1, max_level: 2, flags: ["music_box_basic"] },
    ],
  },
];

export const BUILD_TARGETS_BY_ID: Record<string, BuildTarget> =
  Object.fromEntries(BUILD_TARGETS.map((b) => [b.id, b]));

// The Supreme Shop sells materials under canonical ids (wood, rope, ...),
// but the existing adventure also grants conceptually-equivalent items
// under older ids (wood_logs from the wood_gathering scene, climbing_rope
// from the starter picker). To keep the build panel from telling a kid
// who already has wood that their pockets are empty, declare equivalence
// here. Each canonical material maps to the inventory ids that satisfy
// it. The canonical id MUST appear first so the resolver prefers it
// when both forms are present.
export const MATERIAL_ALIASES: Record<string, string[]> = {
  wood: ["wood", "wood_logs"],
  rope: ["rope", "climbing_rope"],
};

// Returns true if the kid's inventory satisfies the canonical material
// requirement (directly or via an alias).
export function ownsMaterial(material: string, inventory: string[]): boolean {
  const aliases = MATERIAL_ALIASES[material] ?? [material];
  return aliases.some((id) => inventory.includes(id));
}

// Resolve a canonical material to the actual inventory id that should be
// consumed. Picks the first alias present (canonical id first when
// available). Returns null if the kid does not own this material.
export function resolveOwnedMaterialId(
  material: string,
  inventory: string[]
): string | null {
  const aliases = MATERIAL_ALIASES[material] ?? [material];
  for (const id of aliases) {
    if (inventory.includes(id)) return id;
  }
  return null;
}

// Reverse map: built pickup id -> BuildTarget. Used at consume time so
// StoryPlayer can apply level-tier flags from the consumed item.
export const BUILD_TARGETS_BY_PICKUP_ID: Record<string, BuildTarget> =
  Object.fromEntries(BUILD_TARGETS.map((b) => [`built_${b.id}`, b]));

// Detect a build target by scanning the kid's prompt. Returns the first
// target whose prompt_keywords match. Multi-word keywords are matched as
// substrings so "fishing net" hits even when surrounded by other words;
// single-word keywords are matched as whole words so "sword" in
// "swordfish" does not accidentally match. Case-insensitive.
export function detectBuildTarget(prompt: string): BuildTarget | null {
  const lower = prompt.toLowerCase();
  for (const target of BUILD_TARGETS) {
    for (const keyword of target.prompt_keywords) {
      if (keyword.includes(" ")) {
        if (lower.includes(keyword)) return target;
      } else {
        const re = new RegExp(`\\b${keyword}\\b`);
        if (re.test(lower)) return target;
      }
    }
  }
  return null;
}

// Builder skill tier from total XP (sum of levels across every build).
export type BuilderTier =
  | "Apprentice"
  | "Builder"
  | "Master Builder"
  | "Legendary";

export function builderTier(xp: number): BuilderTier {
  if (xp >= 30) return "Legendary";
  if (xp >= 15) return "Master Builder";
  if (xp >= 5) return "Builder";
  return "Apprentice";
}
