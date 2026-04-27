import { NextRequest, NextResponse } from "next/server";
import { generateWorld, type WorldIngredients } from "@/lib/claude";
import { serverSupabase } from "@/lib/supabase-server";

// B-010 scope 7: "Go Deeper" regenerates the SAME world_id at level + 1.
// Same ingredients, harder generation (more scenes, more choices, ending
// gated behind 2 of 5 minimum pickups). The kid's per-world endings log
// from B-009 still works because world_id is preserved.

export async function POST(req: NextRequest) {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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

  const { data: existing, error: readError } = await supabase
    .from("worlds")
    .select("id, user_id, ingredients, level, share_slug")
    .eq("id", worldId)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "World not found" }, { status: 404 });
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "Not your realm" }, { status: 403 });
  }

  const ingredients = existing.ingredients as WorldIngredients | null;
  if (!ingredients?.setting || !ingredients?.character || !ingredients?.goal || !ingredients?.twist) {
    return NextResponse.json(
      { error: "World ingredients missing; cannot regenerate" },
      { status: 400 }
    );
  }

  const currentLevel = typeof existing.level === "number" ? existing.level : 1;
  const nextLevel = currentLevel + 1;

  try {
    const world = await generateWorld(ingredients, nextLevel);
    const startingScene = world.story.scenes.find(
      (s) => s.id === world.story.starting_scene_id
    );
    const narration = startingScene?.narration ?? "";
    const audioPrompt = startingScene?.ambient_audio_prompt ?? "soft wind, gentle outdoor air";

    const { error: updateError } = await supabase
      .from("worlds")
      .update({
        title: world.title,
        narration,
        map: world.story,
        audio_prompt: audioPrompt,
        level: nextLevel,
      })
      .eq("id", worldId);
    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save deeper realm: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title: world.title,
      story: world.story,
      id: worldId,
      level: nextLevel,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
