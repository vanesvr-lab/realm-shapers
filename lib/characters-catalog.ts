// B-011 characters catalog. 8 picker characters with theme-fit hints. The
// landing form's character step shows all 8 regardless of theme; characters
// whose theme_fit includes the picked theme get a "great match" badge and a
// gentle glow. The kid can still pick any character.
//
// voice (Fena | Ryan) feeds lib/elevenlabs.ts heroVoiceIdFor at generation
// time, so the per-realm hero voice is data-driven from this file rather
// than inferred by Claude (replaces the B-010 prompt-based inference).

import { ALL_THEME_IDS } from "@/lib/themes-catalog";
import { validateCharacterCatalog } from "@/lib/catalog-validator";
import type { HeroVoiceName } from "@/lib/claude";

export type Character = {
  id: string;
  label: string;
  description: string;
  thumbnail_path: string;
  theme_fit: string[];
  voice: HeroVoiceName;
};

export const CHARACTERS: Character[] = [
  {
    id: "knight",
    label: "Knight",
    description: "armored, brave, swordfighter with a kind streak",
    thumbnail_path: "/characters/knight.svg",
    theme_fit: ["castle", "forest"],
    voice: "Ryan",
  },
  {
    id: "wizard",
    label: "Wizard",
    description: "starry robes, owl friend, big book of spells",
    thumbnail_path: "/characters/wizard.webp",
    theme_fit: ["castle", "forest", "space"],
    voice: "Fena",
  },
  {
    id: "princess",
    label: "Princess",
    description: "tiara, sturdy boots, sharp wit and sharper plans",
    thumbnail_path: "/characters/princess.svg",
    theme_fit: ["castle", "candy_land"],
    voice: "Fena",
  },
  {
    id: "astronaut",
    label: "Astronaut",
    description: "white suit, mirrored visor, jetpack at the ready",
    thumbnail_path: "/characters/astronaut.svg",
    theme_fit: ["space", "city"],
    voice: "Ryan",
  },
  {
    id: "merkid",
    label: "Mer-Kid",
    description: "shiny tail, conch shell, friend to every fish",
    thumbnail_path: "/characters/merkid.svg",
    theme_fit: ["underwater"],
    voice: "Fena",
  },
  {
    id: "gingerbread_kid",
    label: "Gingerbread Kid",
    description: "icing buttons, candy belt, smells like cinnamon",
    thumbnail_path: "/characters/gingerbread_kid.svg",
    theme_fit: ["candy_land"],
    voice: "Ryan",
  },
  {
    id: "robot",
    label: "Robot",
    description: "shiny silver, blinking eyes, friendly beeps",
    thumbnail_path: "/characters/robot.svg",
    theme_fit: ["space", "city"],
    voice: "Ryan",
  },
  {
    id: "dragon",
    label: "Dragon",
    description: "small, purple, talkative, only a little bit fiery",
    thumbnail_path: "/characters/dragon.svg",
    theme_fit: ["castle", "forest"],
    voice: "Ryan",
  },
];

validateCharacterCatalog(CHARACTERS, ALL_THEME_IDS);

export const CHARACTERS_BY_ID: Record<string, Character> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c])
);

export function getCharacter(id: string): Character | null {
  return CHARACTERS_BY_ID[id] ?? null;
}

export function isValidCatalogCharacterId(id: string): boolean {
  return id in CHARACTERS_BY_ID;
}

export function charactersForTheme(themeId: string): Character[] {
  return CHARACTERS.filter((c) => c.theme_fit.includes(themeId));
}
