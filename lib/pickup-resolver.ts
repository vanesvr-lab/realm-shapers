// B-012 pickup resolver. Pickups can come from two sources:
//   1. The asset library (lib/asset-library.ts), which already powered B-007
//      pickups (mirror, eggs, etc.). These resolve via assetUrlById.
//   2. The pickups catalog (lib/pickups-catalog.ts), introduced for the 5
//      Castle gates (rusty_key, torch, climbing_rope, dragons_lullaby,
//      ancient_tome) plus the dragons_egg goal item. These do not have asset
//      library entries and resolve via icon_path.
//
// resolvePickupRender prefers the asset library so pre-existing flows behave
// the same. If the id is not in the asset library it falls back to the
// pickups catalog. Both StoryPlayer (in-scene render) and InventoryBar
// (top-bar render) call through here.

import { ASSETS_BY_ID, assetUrlById } from "@/lib/asset-library";
import { PICKUPS_BY_ID } from "@/lib/pickups-catalog";

export type PickupRender = {
  url: string;
  alt: string;
};

export function resolvePickupRender(id: string): PickupRender | null {
  const libUrl = assetUrlById(id);
  const libMeta = ASSETS_BY_ID[id];
  if (libUrl && libMeta) {
    return { url: libUrl, alt: libMeta.alt };
  }
  const catalog = PICKUPS_BY_ID[id];
  if (catalog) {
    return { url: catalog.icon_path, alt: catalog.label };
  }
  return null;
}
