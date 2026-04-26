import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase-server";
import {
  generatePropInteraction,
  type PropInteractionResult,
  type StoryScene,
  type StoryTree,
} from "@/lib/claude";
import { ASSETS_BY_ID, isValidPropId } from "@/lib/asset-library";

const MAX_CACHE_ENTRIES = 30;

type CacheKey = `${string}::${string}::${string}`;

const cache = new Map<CacheKey, PropInteractionResult>();

type RequestBody = {
  world_id?: string;
  scene_id?: string;
  prop_id?: string;
};

export async function POST(req: NextRequest) {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const worldId = body.world_id;
  const sceneId = body.scene_id;
  const propId = body.prop_id;
  if (!worldId || !sceneId || !propId) {
    return NextResponse.json(
      { error: "world_id, scene_id, prop_id required" },
      { status: 400 }
    );
  }
  if (!isValidPropId(propId)) {
    return NextResponse.json({ error: "invalid prop_id" }, { status: 400 });
  }

  const key: CacheKey = `${worldId}::${sceneId}::${propId}`;
  const cached = cache.get(key);
  if (cached) {
    return NextResponse.json(cached);
  }

  const { data: world, error: worldErr } = await supabase
    .from("worlds")
    .select("id, user_id, map")
    .eq("id", worldId)
    .maybeSingle<{ id: string; user_id: string; map: StoryTree | null }>();
  if (worldErr || !world) {
    return NextResponse.json({ error: "world not found" }, { status: 404 });
  }
  if (world.user_id !== user.id) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  const tree = world.map;
  const scene = tree?.scenes?.find((s: StoryScene) => s.id === sceneId);
  if (!tree || !scene) {
    return NextResponse.json({ error: "scene not found" }, { status: 404 });
  }

  const propMeta = ASSETS_BY_ID[propId];
  const propAlt = propMeta?.alt ?? propId.replace(/_/g, " ");

  try {
    const result = await generatePropInteraction(scene, propId, propAlt);
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(key, result);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
