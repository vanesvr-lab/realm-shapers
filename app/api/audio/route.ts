import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase-server";
import { ensureAudioForScene } from "@/lib/world-audio";
import type { StoryScene, StoryTree } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  type Body = { world_id?: string; scene_id?: string; audio_prompt?: string };
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const worldId = body.world_id;
  if (!worldId) {
    return NextResponse.json({ error: "world_id required" }, { status: 400 });
  }

  const { data: world, error: worldError } = await supabase
    .from("worlds")
    .select("id, audio_prompt, map")
    .eq("id", worldId)
    .maybeSingle<{ id: string; audio_prompt: string | null; map: StoryTree | null }>();

  if (worldError) {
    return NextResponse.json(
      { error: `Lookup failed: ${worldError.message}` },
      { status: 500 }
    );
  }
  if (!world) {
    return NextResponse.json({ error: "World not found" }, { status: 404 });
  }

  let prompt = body.audio_prompt?.trim() ?? "";
  let sceneId = body.scene_id ?? null;
  if (!prompt && sceneId && world.map) {
    const scene = world.map.scenes?.find((s: StoryScene) => s.id === sceneId);
    if (scene) prompt = scene.ambient_audio_prompt;
  }
  if (!prompt) {
    prompt = world.audio_prompt ?? "";
    sceneId = null;
  }
  if (!prompt) {
    return NextResponse.json({ error: "No audio prompt available" }, { status: 400 });
  }

  try {
    const url = await ensureAudioForScene(world.id, sceneId, prompt);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
