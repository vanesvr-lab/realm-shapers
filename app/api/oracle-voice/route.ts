import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { serviceRoleSupabase } from "@/lib/supabase-server";
import { DEFAULT_ORACLE_VOICE_ID, generateVoiceLine } from "@/lib/elevenlabs";

const BUCKET = "oracle_voice";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_TEXT_LEN = 280;

let bucketReady = false;

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const service = serviceRoleSupabase();
  const { data: existing } = await service.storage.getBucket(BUCKET);
  if (existing) {
    bucketReady = true;
    return;
  }
  const { error } = await service.storage.createBucket(BUCKET, { public: false });
  if (error && !error.message.toLowerCase().includes("exist")) {
    throw new Error(`oracle_voice bucket create failed: ${error.message}`);
  }
  bucketReady = true;
}

export async function POST(req: NextRequest) {
  type Body = { text?: string; voice_id?: string };
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json({ error: `text too long (>${MAX_TEXT_LEN})` }, { status: 400 });
  }
  const voiceId = (body.voice_id ?? DEFAULT_ORACLE_VOICE_ID).trim() || DEFAULT_ORACLE_VOICE_ID;

  try {
    await ensureBucket();
    const service = serviceRoleSupabase();
    const hash = createHash("sha1").update(`${voiceId}::${text}`).digest("hex");
    const objectKey = `${hash}.mp3`;

    const existing = await service.storage.from(BUCKET).createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);
    if (existing.data?.signedUrl) {
      return NextResponse.json({ url: existing.data.signedUrl, cached: true });
    }

    const mp3 = await generateVoiceLine(text, voiceId);
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(objectKey, mp3, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (uploadError) {
      throw new Error(`upload failed: ${uploadError.message}`);
    }
    const { data: signed, error: signError } = await service.storage
      .from(BUCKET)
      .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) {
      throw new Error(`sign failed: ${signError?.message ?? "no url"}`);
    }
    return NextResponse.json({ url: signed.signedUrl, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("oracle-voice error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
