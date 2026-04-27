import { NextRequest, NextResponse } from "next/server";
import { generateWorld, type WorldIngredients } from "@/lib/claude";
import { serviceRoleSupabase } from "@/lib/supabase-server";

// B-010 scope 10: finalize phase 2 of progressive generation. Called by
// PlayClient right after the kid lands on the play screen with a phase-1
// shell. Idempotent: if status is already 'complete', returns immediately.
// Otherwise generates the full tree and updates the world row in place.
// Behind feature flag NEXT_PUBLIC_PROGRESSIVE_GEN; default off so this is
// a no-op for normal generation.

export async function POST(req: NextRequest) {
  let body: { world_id?: string };
  try {
    body = (await req.json()) as { world_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const worldId = body.world_id?.trim();
  if (!worldId) {
    return NextResponse.json({ error: "world_id required" }, { status: 400 });
  }

  const supabase = serviceRoleSupabase();
  const { data: world, error: readError } = await supabase
    .from("worlds")
    .select("id, ingredients, level, generation_status")
    .eq("id", worldId)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!world) {
    return NextResponse.json({ error: "World not found" }, { status: 404 });
  }

  if ((world.generation_status ?? "complete") === "complete") {
    return NextResponse.json({ status: "complete", noop: true });
  }

  const ingredients = world.ingredients as WorldIngredients | null;
  if (!ingredients) {
    return NextResponse.json({ error: "ingredients missing" }, { status: 400 });
  }
  const level = typeof world.level === "number" ? world.level : 1;

  try {
    const full = await generateWorld(ingredients, level);
    const startingScene = full.story.scenes.find((s) => s.id === full.story.starting_scene_id);
    const narration = startingScene?.narration ?? "";
    const audioPrompt = startingScene?.ambient_audio_prompt ?? "soft wind, gentle outdoor air";

    const { error: updateError } = await supabase
      .from("worlds")
      .update({
        title: full.title,
        narration,
        map: full.story,
        audio_prompt: audioPrompt,
        generation_status: "complete",
      })
      .eq("id", worldId);
    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save full realm: " + updateError.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ status: "complete", noop: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
