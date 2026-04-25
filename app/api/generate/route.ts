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

    const { data: row, error } = await supabase
      .from("worlds")
      .insert({
        user_id: user.id,
        title: world.title,
        narration: world.narration,
        ingredients: body,
      })
      .select("id, share_slug")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save world: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...world,
      id: row.id,
      share_slug: row.share_slug,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
