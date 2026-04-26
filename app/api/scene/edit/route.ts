import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase-server";
import { rewriteSceneNarration, type StoryScene, type StoryTree } from "@/lib/claude";
import { isValidCharacterId, isValidPropId } from "@/lib/asset-library";

const MAX_REWRITES_PER_SESSION = 5;

const sessionCounts = new Map<string, number>();

type RequestBody = {
  world_id: string;
  scene_id: string;
  character_id: string;
  prop_ids: string[];
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

  if (!body.world_id || !body.scene_id || !body.character_id) {
    return NextResponse.json({ error: "world_id, scene_id, character_id required" }, { status: 400 });
  }
  if (!isValidCharacterId(body.character_id)) {
    return NextResponse.json({ error: "invalid character_id" }, { status: 400 });
  }
  const propIds = Array.isArray(body.prop_ids)
    ? body.prop_ids.filter((p) => typeof p === "string" && isValidPropId(p)).slice(0, 6)
    : [];

  const sessionKey = user.id;
  const used = sessionCounts.get(sessionKey) ?? 0;
  if (used >= MAX_REWRITES_PER_SESSION) {
    return NextResponse.json(
      { error: "rewrite limit reached for this session" },
      { status: 429 }
    );
  }

  const { data: world, error: worldErr } = await supabase
    .from("worlds")
    .select("id, user_id, map")
    .eq("id", body.world_id)
    .maybeSingle<{ id: string; user_id: string; map: StoryTree | null }>();
  if (worldErr || !world) {
    return NextResponse.json({ error: "world not found" }, { status: 404 });
  }
  if (world.user_id !== user.id) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  const tree = world.map;
  const scene = tree?.scenes?.find((s: StoryScene) => s.id === body.scene_id);
  if (!tree || !scene) {
    return NextResponse.json({ error: "scene not found" }, { status: 404 });
  }

  try {
    const narration = await rewriteSceneNarration(scene, {
      character_id: body.character_id,
      prop_ids: propIds,
    });
    sessionCounts.set(sessionKey, used + 1);
    return NextResponse.json({
      narration,
      remaining: MAX_REWRITES_PER_SESSION - (used + 1),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
