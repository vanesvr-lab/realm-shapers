// B-011 scope 8: shared background resolver. Theme-driven worlds (post
// B-011) carry sub-scene ids in scene.background_id; the catalog file_path
// is the canonical URL. Legacy worlds (pre-B-011) carry asset library ids.
// Renderers always go through this so both shapes work without branching.
//
// Adventure slice: hand-authored adventures use ids of the form
// "adventure:<adventure_id>/<scene_id>" which resolve directly to
// /adventures/<adventure_id>/<scene_id>.webp. Keeps the adventure scenes
// out of the asset-library and theme-catalog name spaces.

import { assetUrlById } from "@/lib/asset-library";
import { SUB_SCENES_BY_ID } from "@/lib/themes-catalog";

export function resolveBackgroundUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.startsWith("adventure:")) {
    const path = id.slice("adventure:".length);
    if (!path) return null;
    return `/adventures/${path}.webp`;
  }
  const sub = SUB_SCENES_BY_ID[id];
  if (sub) return sub.file_path;
  return assetUrlById(id) ?? null;
}
