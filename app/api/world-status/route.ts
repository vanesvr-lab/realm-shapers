import { NextRequest, NextResponse } from "next/server";
import { serviceRoleSupabase } from "@/lib/supabase-server";
import type { StoryTree } from "@/lib/claude";

// B-010 scope 10: lightweight poll endpoint. PlayClient hits this every
// 1.5s while the world is in 'phase_1' state to know when /api/finalize
// has swapped the full tree in. Returns the map only when status is
// 'complete' so the client can swap without re-fetching elsewhere.

type WorldStatusRow = {
  generation_status: string | null;
  map: StoryTree | null;
  title: string | null;
  narration: string | null;
  level: number | null;
};

export async function GET(req: NextRequest) {
  const worldId = req.nextUrl.searchParams.get("world_id");
  if (!worldId) {
    return NextResponse.json({ error: "world_id required" }, { status: 400 });
  }

  const supabase = serviceRoleSupabase();
  const { data: world, error } = await supabase
    .from("worlds")
    .select("generation_status, map, title, narration, level")
    .eq("id", worldId)
    .maybeSingle<WorldStatusRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!world) {
    return NextResponse.json({ error: "World not found" }, { status: 404 });
  }

  const status = world.generation_status ?? "complete";
  const sceneIds = Array.isArray(world.map?.scenes)
    ? world.map!.scenes.map((s) => s.id)
    : [];

  return NextResponse.json({
    status,
    scenes_ready: sceneIds,
    title: world.title,
    narration: world.narration,
    level: world.level ?? 1,
    map: status === "complete" ? world.map : null,
  });
}
