// B-010 backgrounds catalog. Tags every background asset with a category and
// a list of keyword aliases the kid might type as a "setting" ingredient.
// Source of truth for `lib/scene-matcher.ts`. New backgrounds (real or
// placeholder) must register here so the matcher can route to them.

import { BACKGROUND_IDS } from "@/lib/asset-library";

export type BackgroundCategory =
  | "forest"
  | "beach"
  | "underwater"
  | "desert"
  | "castle"
  | "space"
  | "mountain"
  | "cave"
  | "volcano"
  | "swamp"
  | "library"
  | "town"
  | "snow"
  | "garden"
  | "sky"
  | "city"
  | "school"
  | "home"
  | "sports"
  | "lab";

export type BackgroundEntry = {
  id: string;
  category: BackgroundCategory;
  keywords: string[];
};

export const BACKGROUND_CATALOG: BackgroundEntry[] = [
  {
    id: "forest",
    category: "forest",
    keywords: ["forest", "woods", "jungle", "trees", "grove", "thicket", "wilderness"],
  },
  {
    id: "beach",
    category: "beach",
    keywords: ["beach", "ocean", "sea", "coast", "shore", "sand", "tropical", "lagoon", "island"],
  },
  {
    id: "underwater",
    category: "underwater",
    keywords: ["underwater", "ocean", "sea", "coral", "reef", "deep", "submarine", "aquarium"],
  },
  {
    id: "desert",
    category: "desert",
    keywords: ["desert", "dunes", "sand", "oasis", "arid", "sahara", "cactus"],
  },
  {
    id: "castle_courtyard",
    category: "castle",
    keywords: ["castle", "kingdom", "palace", "fortress", "royal", "knight", "throne", "courtyard"],
  },
  {
    id: "space",
    category: "space",
    keywords: ["space", "cosmos", "galaxy", "stars", "planet", "nebula", "starship", "spaceship"],
  },
  {
    id: "mountain_peak",
    category: "mountain",
    keywords: ["mountain", "peak", "summit", "alpine", "cliff", "highland"],
  },
  {
    id: "cave",
    category: "cave",
    keywords: ["cave", "cavern", "grotto", "underground", "tunnel", "crystal", "mine"],
  },
  {
    id: "volcano",
    category: "volcano",
    keywords: ["volcano", "lava", "molten", "magma", "fire mountain", "crater", "eruption"],
  },
  {
    id: "swamp",
    category: "swamp",
    keywords: ["swamp", "marsh", "bog", "wetland", "fog", "misty", "lily pads"],
  },
  {
    id: "library",
    category: "library",
    keywords: ["library", "books", "bookshop", "study", "archive", "scriptorium"],
  },
  {
    id: "town_square",
    category: "town",
    keywords: ["town", "village", "square", "cobblestone", "fountain", "marketplace"],
  },
  {
    id: "snowy_tundra",
    category: "snow",
    keywords: ["snow", "tundra", "arctic", "winter", "icy", "frozen", "polar", "blizzard"],
  },
  {
    id: "garden",
    category: "garden",
    keywords: ["garden", "flowers", "meadow", "park", "petals", "butterflies", "spring"],
  },
  {
    id: "sky_kingdom",
    category: "sky",
    keywords: ["sky", "clouds", "floating", "heavens", "rainbow", "airborne", "above the clouds"],
  },
  {
    id: "city",
    category: "city",
    keywords: ["city", "urban", "downtown", "metropolis", "street", "skyscraper", "neighborhood", "block"],
  },
  {
    id: "school",
    category: "school",
    keywords: ["school", "classroom", "playground", "schoolyard", "kindergarten", "academy", "homeroom"],
  },
  {
    id: "modern_home",
    category: "home",
    keywords: ["home", "house", "bedroom", "kitchen", "living room", "indoor", "apartment", "backyard"],
  },
  {
    id: "sports_field",
    category: "sports",
    keywords: ["sports", "field", "soccer", "football", "stadium", "gym", "basketball", "baseball", "track"],
  },
  {
    id: "lab_hospital",
    category: "lab",
    keywords: ["lab", "laboratory", "science", "hospital", "clinic", "experiment", "research", "biology", "chemistry"],
  },
];

// Sanity: every catalog id must be a real background, and every background
// must be in the catalog. Helps catch typos when adding new entries.
export function assertCatalogConsistent(): void {
  const catalogIds = new Set(BACKGROUND_CATALOG.map((b) => b.id));
  for (const id of BACKGROUND_IDS) {
    if (!catalogIds.has(id)) {
      throw new Error(`background ${id} missing from BACKGROUND_CATALOG`);
    }
  }
  for (const entry of BACKGROUND_CATALOG) {
    if (!BACKGROUND_IDS.includes(entry.id)) {
      throw new Error(`BACKGROUND_CATALOG has unknown id ${entry.id}`);
    }
  }
}
