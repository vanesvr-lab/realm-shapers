import { NextRequest, NextResponse } from "next/server";
import { generateIdeas, IngredientSlot, WorldIngredients } from "@/lib/claude";
import { serverSupabase } from "@/lib/supabase-server";

const VALID_SLOTS: IngredientSlot[] = ["setting", "character", "goal", "twist"];

export async function POST(req: NextRequest) {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      slot?: string;
      current_values?: Partial<WorldIngredients>;
    };
    const slot = body.slot;
    if (!slot || !VALID_SLOTS.includes(slot as IngredientSlot)) {
      return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
    }
    const current: WorldIngredients = {
      setting: body.current_values?.setting ?? "",
      character: body.current_values?.character ?? "",
      goal: body.current_values?.goal ?? "",
      twist: body.current_values?.twist ?? "",
    };
    const suggestions = await generateIdeas(slot as IngredientSlot, current);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
