import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase-server";
import { ensureAudioForWorld } from "@/lib/world-audio";

export async function POST(req: NextRequest) {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { world_id?: string };
    const worldId = body.world_id;
    if (!worldId) {
      return NextResponse.json({ error: "world_id required" }, { status: 400 });
    }

    const { data: world, error: worldError } = await supabase
      .from("worlds")
      .select("id, audio_prompt")
      .eq("id", worldId)
      .maybeSingle();

    if (worldError) {
      return NextResponse.json(
        { error: `Lookup failed: ${worldError.message}` },
        { status: 500 }
      );
    }
    if (!world) {
      return NextResponse.json({ error: "World not found" }, { status: 404 });
    }
    if (!world.audio_prompt) {
      return NextResponse.json(
        { error: "World has no audio_prompt" },
        { status: 400 }
      );
    }

    const url = await ensureAudioForWorld(world.id, world.audio_prompt);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
