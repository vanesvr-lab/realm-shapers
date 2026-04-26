export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type RarityInputs = {
  propsPlaced: number;
  scenesVisited: number;
  secretDiscovered: boolean;
  ingredients: { setting: string; character: string; goal: string; twist: string };
};

const LEGENDARY_KEYWORDS: Array<{ in: keyof RarityInputs["ingredients"]; words: string[] }[]> = [
  // Each pattern is an AND across words across listed slots.
  [
    { in: "twist", words: ["shadow"] },
    { in: "setting", words: ["library"] },
  ],
  [
    { in: "character", words: ["dragon"] },
    { in: "setting", words: ["volcano", "lava", "fire"] },
  ],
  [
    { in: "setting", words: ["space", "stars", "cosmic"] },
    { in: "twist", words: ["forgotten", "lost", "ancient"] },
  ],
  [
    { in: "character", words: ["wizard"] },
    { in: "goal", words: ["save", "rescue"] },
  ],
];

function matchesLegendary(ingredients: RarityInputs["ingredients"]): boolean {
  const lower = {
    setting: ingredients.setting.toLowerCase(),
    character: ingredients.character.toLowerCase(),
    goal: ingredients.goal.toLowerCase(),
    twist: ingredients.twist.toLowerCase(),
  };
  return LEGENDARY_KEYWORDS.some((pattern) =>
    pattern.every(({ in: slot, words }) =>
      words.some((w) => lower[slot].includes(w))
    )
  );
}

export function calculateRarity(inputs: RarityInputs): Rarity {
  if (matchesLegendary(inputs.ingredients)) return "legendary";
  if (inputs.secretDiscovered) return "epic";
  if (inputs.scenesVisited >= 4) return "rare";
  if (inputs.propsPlaced >= 5) return "uncommon";
  return "common";
}

export function rarityReason(rarity: Rarity, inputs: RarityInputs): string {
  switch (rarity) {
    case "legendary":
      return "An ingredient combo the Oracle has been waiting for.";
    case "epic":
      return "You discovered the secret ending.";
    case "rare":
      return `You explored ${inputs.scenesVisited} different scenes.`;
    case "uncommon":
      return `You placed ${inputs.propsPlaced} props in your scene.`;
    default:
      return "A first-light realm. Keep exploring for rarer cards.";
  }
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const RARITY_BORDER: Record<Rarity, string> = {
  common: "linear-gradient(135deg, #d4d4d8 0%, #a1a1aa 100%)",
  uncommon: "linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)",
  rare: "linear-gradient(135deg, #c4b5fd 0%, #7c3aed 100%)",
  epic: "linear-gradient(135deg, #fb7185 0%, #fbbf24 33%, #34d399 66%, #60a5fa 100%)",
  legendary:
    "linear-gradient(135deg, #f472b6 0%, #fbbf24 25%, #34d399 50%, #38bdf8 75%, #a78bfa 100%)",
};
