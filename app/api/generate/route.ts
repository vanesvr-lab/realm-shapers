import { NextRequest, NextResponse } from "next/server";
import { generateWorld, WorldIngredients } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WorldIngredients;
    if (!body.setting || !body.character || !body.goal || !body.twist) {
      return NextResponse.json(
        { error: "All four ingredients required" },
        { status: 400 }
      );
    }
    const world = await generateWorld(body);
    return NextResponse.json(world);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
