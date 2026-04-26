import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase-server";
import { matchProp } from "@/lib/prop-matcher";
import { ASSETS_BY_ID } from "@/lib/asset-library";

type RequestBody = {
  text?: string;
  world_id?: string;
  scene_id?: string;
};

export async function POST(req: NextRequest) {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  if (text.length > 80) {
    return NextResponse.json({ error: "text too long" }, { status: 400 });
  }

  const result = matchProp(text);
  if (result.matched) {
    const meta = ASSETS_BY_ID[result.prop_id];
    return NextResponse.json({
      matched: true,
      prop_id: result.prop_id,
      alt: meta?.alt ?? result.prop_id,
    });
  }

  if (result.best) {
    const meta = ASSETS_BY_ID[result.best.prop_id];
    return NextResponse.json({
      matched: false,
      suggestion: meta?.alt ?? result.best.prop_id,
    });
  }

  return NextResponse.json({ matched: false });
}
