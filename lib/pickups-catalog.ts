// B-013 pilot pickups catalog. The 5 gates Anaya + Kellen scoped for the
// Castle theme plus 1 goal item. Used as the metadata source for the icon
// renders the pilot ships. The Castle realm Claude generates may reference
// these ids in scene.pickups; the inventory bar resolves icon_path through
// this catalog.
//
// B-012 was the originally planned pickups owner, but this brief lands first.
// When B-012 ships, that brief should treat this file as the source of truth
// (extend, don't recreate). The asset-library proxy entries (lib/asset-library.ts)
// stay separate; that file is for renderer-resolved hero/background/prop
// assets and uses different ids.

export type Pickup = {
  id: string;
  label: string;
  description: string;
  icon_path: string;
  // B-014 economy: when set, picking up this item adds coin_value coins to
  // the coins counter and plays the ching sound, in addition to landing in
  // inventory as a trophy. Existing non-monetary pickups omit this.
  coin_value?: number;
  // B-017: short kid-friendly hint shown as a caption when the kid hovers
  // (desktop) or taps-and-holds (mobile) the glowing prop, and appended to
  // the Oracle's confirmation line on pickup. Tone: a small clue, not a
  // spoiler. One sentence.
  hint?: string;
  // B-019 supreme shop: when set, the item is for sale in the global shop
  // for this many coins. Shop list is built by filtering the catalog on
  // this field. Distinct from coin_value (treasure pickups granting coins
  // on collection); a pickup never has both at once.
  purchase_price?: number;
  // B-019 build category. "material" = raw shop ingredient. "built" =
  // produced by the kid via the Skills & Build panel; consumed once at a
  // build-gate. Absent on every pre-B-019 pickup so existing flows are
  // unaffected.
  kind?: "material" | "built";
};

export const PICKUPS: Pickup[] = [
  {
    id: "rusty_key",
    label: "Rusty Key",
    description: "small ornate iron key with a heart-shaped handle",
    icon_path: "/pickups/rusty_key.webp",
    hint: "An old iron key. Some door is missing it.",
  },
  {
    id: "torch",
    label: "Torch",
    description: "wooden torch with a bright orange flame",
    icon_path: "/pickups/torch.webp",
    hint: "A wooden torch, ready to be lit.",
  },
  {
    id: "climbing_rope",
    label: "Climbing Rope",
    description: "coiled brown rope with a small grappling hook",
    icon_path: "/pickups/climbing_rope.webp",
    hint: "A coil of strong rope. Good for cliffs and falls.",
  },
  {
    id: "dragons_lullaby",
    label: "Dragon's Lullaby",
    description: "glowing musical scroll with golden notes",
    icon_path: "/pickups/dragons_lullaby.webp",
    hint: "A scroll humming with an old song.",
  },
  {
    id: "ancient_tome",
    label: "Ancient Tome",
    description: "thick leather-bound book with brass clasps",
    icon_path: "/pickups/ancient_tome.webp",
    hint: "A heavy old book. The clasps still hold.",
  },
  {
    id: "dragons_egg",
    label: "Dragon's Egg",
    description: "speckled iridescent egg in a nest of soft moss",
    icon_path: "/pickups/dragons_egg.webp",
    hint: "The egg is warm. It pulses, very softly.",
  },
  {
    id: "sword",
    label: "Wizard's Sword",
    description: "slender silver blade with a softly glowing crystal pommel",
    icon_path: "/pickups/sword.webp",
    hint: "A slim silver blade. The pommel glows.",
  },
  {
    id: "water_bottle",
    label: "Water Bottle",
    description: "small leather bottle with a wooden cork stopper",
    icon_path: "/pickups/water_bottle.webp",
    hint: "A leather bottle, cool to the touch.",
  },
  {
    id: "food_ration",
    label: "Trail Rations",
    description: "bundle of dried bread and berries wrapped in paper",
    icon_path: "/pickups/food_ration.webp",
    hint: "Dried bread and berries, wrapped tight.",
  },
  {
    id: "lantern",
    label: "Storm Lantern",
    description: "small brass lantern with a warm orange flame",
    icon_path: "/pickups/lantern.webp",
    hint: "A small brass lantern. Useful in dark places.",
  },
  {
    id: "tarnished_medallion",
    label: "Tarnished Medallion",
    description: "old bronze medallion with worn engravings of a tower",
    icon_path: "/pickups/tarnished_medallion.webp",
    hint: "An old bronze coin with a tower carved on it.",
  },
  {
    id: "wood_logs",
    label: "Wood Logs",
    description: "bundle of straight pine logs, good for building",
    icon_path: "/pickups/wood_logs.webp",
    hint: "Straight pine logs. Good for building something that floats.",
  },
  {
    id: "coin_pouch",
    label: "Coin Pouch",
    description: "small leather pouch jingling with coins",
    icon_path: "/pickups/coin_pouch.webp",
    coin_value: 50,
    hint: "A small leather pouch. Looks heavy.",
  },
  {
    id: "treasure_chest",
    label: "Treasure Chest",
    description: "small wooden chest with brass clasps, full of coins",
    icon_path: "/pickups/treasure_chest.webp",
    coin_value: 150,
    hint: "An old chest, dust and a faint glow.",
  },
  {
    id: "rare_gem",
    label: "Rare Gem",
    description: "a flawless cut gem, larger than a thumbnail, glowing softly",
    icon_path: "/pickups/rare_gem.webp",
    coin_value: 200,
    hint: "Something glittering deep in the ash.",
  },
  {
    id: "glowstone",
    label: "Glowstone",
    description: "a smooth crystal that glows with steady warm light",
    icon_path: "/pickups/glowstone.webp",
    hint: "A stone with its own soft light.",
  },
  // B-019 supreme shop materials. Sold globally via the left-rail Shop.
  // Used by Skills & Build to craft built_<target> items. No coin_value
  // (kids do not pick these up off the ground).
  {
    id: "wood",
    label: "Wood",
    description: "sturdy timber, the bones of rafts and ladders",
    icon_path: "/pickups/wood.svg",
    purchase_price: 50,
    kind: "material",
    hint: "Sturdy timber. The bones of rafts and ladders.",
  },
  {
    id: "rope",
    label: "Rope",
    description: "strong braid that holds knots",
    icon_path: "/pickups/rope.svg",
    purchase_price: 30,
    kind: "material",
    hint: "Strong braid. Holds knots.",
  },
  {
    id: "iron",
    label: "Iron",
    description: "cold metal, the makings of blades",
    icon_path: "/pickups/iron.svg",
    purchase_price: 100,
    kind: "material",
    hint: "Cold metal. The makings of blades.",
  },
  {
    id: "cloth",
    label: "Cloth",
    description: "sail-worthy weave",
    icon_path: "/pickups/cloth.svg",
    purchase_price: 30,
    kind: "material",
    hint: "Sail-worthy weave.",
  },
  {
    id: "wax",
    label: "Wax",
    description: "holds a candle's flame steady",
    icon_path: "/pickups/wax.svg",
    purchase_price: 40,
    kind: "material",
    hint: "Holds a candle's flame steady.",
  },
  {
    id: "feather",
    label: "Feather",
    description: "light and lifting",
    icon_path: "/pickups/feather.svg",
    purchase_price: 30,
    kind: "material",
    hint: "Light and lifting.",
  },
  {
    id: "leather",
    label: "Leather",
    description: "tough and pliable",
    icon_path: "/pickups/leather.svg",
    purchase_price: 50,
    kind: "material",
    hint: "Tough and pliable.",
  },
  // B-019 built items. Each is produced by the Skills & Build panel and
  // consumed at a build-gate. Levels (1-5) are tracked separately in
  // StoryPlayer.builtLevels keyed off the pickup id.
  {
    id: "built_raft",
    label: "Built Raft",
    description: "a raft you crafted from wood and rope",
    icon_path: "/pickups/built_raft.svg",
    kind: "built",
    hint: "The raft you built. The wide river is its match.",
  },
  {
    id: "built_ladder",
    label: "Built Ladder",
    description: "a ladder you crafted from wood",
    icon_path: "/pickups/built_ladder.svg",
    kind: "built",
    hint: "Your ladder. Steeper paths welcome it.",
  },
  {
    id: "built_kite",
    label: "Built Kite",
    description: "a kite you crafted from cloth and rope",
    icon_path: "/pickups/built_kite.svg",
    kind: "built",
    hint: "A kite you stitched. The sky watches.",
  },
  {
    id: "built_torch",
    label: "Built Torch",
    description: "a torch you crafted from wood and wax",
    icon_path: "/pickups/built_torch.svg",
    kind: "built",
    hint: "Your torch. The dark recoils.",
  },
  {
    id: "built_sword",
    label: "Built Sword",
    description: "a blade you crafted from iron and leather",
    icon_path: "/pickups/built_sword.svg",
    kind: "built",
    hint: "Your blade. Edges hold.",
  },
  {
    id: "built_fishing_net",
    label: "Built Fishing Net",
    description: "a net you crafted from rope and cloth",
    icon_path: "/pickups/built_fishing_net.svg",
    kind: "built",
    hint: "A net you wove. Rivers feed those who ask.",
  },
  {
    id: "built_music_box",
    label: "Built Music Box",
    description: "a music box you crafted from cloth, wax, and feather",
    icon_path: "/pickups/built_music_box.svg",
    kind: "built",
    hint: "A music box you made. The dragon may know its tune.",
  },
];

export const PICKUPS_BY_ID: Record<string, Pickup> = Object.fromEntries(
  PICKUPS.map((p) => [p.id, p])
);

export function getPickup(id: string): Pickup | null {
  return PICKUPS_BY_ID[id] ?? null;
}

export function isValidPickupId(id: string): boolean {
  return id in PICKUPS_BY_ID;
}

// B-019 supreme shop catalog: every pickup with a purchase_price, in
// declaration order. The shop UI iterates this list directly.
export const SHOP_MATERIALS: Pickup[] = PICKUPS.filter(
  (p) => typeof p.purchase_price === "number" && p.purchase_price > 0
);

// B-019: ids of every material pickup. Used by the build-scorer to
// detect mentions in the kid's prompt.
export const MATERIAL_IDS: string[] = PICKUPS.filter(
  (p) => p.kind === "material"
).map((p) => p.id);
