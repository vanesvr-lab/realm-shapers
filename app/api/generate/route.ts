import { NextRequest, NextResponse } from "next/server";
import { generateWorld, WorldIngredients } from "@/lib/claude";
import { serverSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as WorldIngredients;
    if (!body.setting || !body.character || !body.goal || !body.twist) {
      return NextResponse.json(
        { error: "All four ingredients required" },
        { status: 400 }
      );
    }
    const world = await generateWorld(body);
    const startingScene = world.story.scenes.find(
      (s) => s.id === world.story.starting_scene_id
    );
    const narration = startingScene?.narration ?? "";
    const audioPrompt = startingScene?.ambient_audio_prompt ?? "soft wind, gentle outdoor air";

    const { data: row, error } = await supabase
      .from("worlds")
      .insert({
        user_id: user.id,
        title: world.title,
        narration,
        ingredients: body,
        map: world.story,
        audio_prompt: audioPrompt,
      })
      .select("id, share_slug")
      .single();

    if (error || !row) {
      return NextResponse.json(
        { error: "Failed to save world: " + (error?.message ?? "unknown") },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title: world.title,
      story: world.story,
      id: row.id,
      share_slug: row.share_slug,
      unlocked: [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
