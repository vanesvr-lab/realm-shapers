import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase-server";
import { evaluateUnlocks, type CheckEvent } from "@/lib/achievements";

export async function POST(req: NextRequest) {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let event: CheckEvent;
  try {
    event = (await req.json()) as CheckEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!event || typeof event !== "object" || typeof event.kind !== "string") {
    return NextResponse.json({ error: "missing event.kind" }, { status: 400 });
  }

  try {
    const unlocked = await evaluateUnlocks(supabase, user.id, event);
    return NextResponse.json({ unlocked });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("check-achievements error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
