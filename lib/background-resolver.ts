// B-011 scope 8: shared background resolver. Theme-driven worlds (post
// B-011) carry sub-scene ids in scene.background_id; the catalog file_path
// is the canonical URL. Legacy worlds (pre-B-011) carry asset library ids.
// Renderers always go through this so both shapes work without branching.

import { assetUrlById } from "@/lib/asset-library";
import { SUB_SCENES_BY_ID } from "@/lib/themes-catalog";

export function resolveBackgroundUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  const sub = SUB_SCENES_BY_ID[id];
  if (sub) return sub.file_path;
  return assetUrlById(id) ?? null;
}
