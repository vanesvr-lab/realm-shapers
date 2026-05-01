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
};

export const PICKUPS: Pickup[] = [
  {
    id: "rusty_key",
    label: "Rusty Key",
    description: "small ornate iron key with a heart-shaped handle",
    icon_path: "/pickups/rusty_key.webp",
  },
  {
    id: "torch",
    label: "Torch",
    description: "wooden torch with a bright orange flame",
    icon_path: "/pickups/torch.webp",
  },
  {
    id: "climbing_rope",
    label: "Climbing Rope",
    description: "coiled brown rope with a small grappling hook",
    icon_path: "/pickups/climbing_rope.webp",
  },
  {
    id: "dragons_lullaby",
    label: "Dragon's Lullaby",
    description: "glowing musical scroll with golden notes",
    icon_path: "/pickups/dragons_lullaby.webp",
  },
  {
    id: "ancient_tome",
    label: "Ancient Tome",
    description: "thick leather-bound book with brass clasps",
    icon_path: "/pickups/ancient_tome.webp",
  },
  {
    id: "dragons_egg",
    label: "Dragon's Egg",
    description: "speckled iridescent egg in a nest of soft moss",
    icon_path: "/pickups/dragons_egg.webp",
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
