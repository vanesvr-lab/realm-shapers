import { NextRequest, NextResponse } from "next/server";
import { serviceRoleSupabase } from "@/lib/supabase-server";
import { generateSoundEffect } from "@/lib/elevenlabs";

const BUCKET = "oracle_voice";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// B-012 scope 5. Drawbridge ambient loop. Generates once via ElevenLabs SFX
// and caches the mp3 to oracle_voice/ambient/{track_id}.mp3 so subsequent
// realms reuse the same audio. The track id is whitelisted server-side so a
// caller cannot trigger arbitrary expensive generations.
const AMBIENT_TRACKS: Record<string, { prompt: string; durationSeconds: number }> = {
  drawbridge: {
    prompt:
      "calm castle drawbridge ambient: gentle moat water lapping wooden pillars, soft distant wind across stone walls, faint cloth banner flapping in a breeze, no music, no voices, seamless background loop",
    durationSeconds: 22,
  },
};

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
  type Body = { track_id?: string };
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const trackId = (body.track_id ?? "").trim();
  if (!trackId) {
    return NextResponse.json({ error: "track_id required" }, { status: 400 });
  }
  const def = AMBIENT_TRACKS[trackId];
  if (!def) {
    return NextResponse.json({ error: `unknown track_id: ${trackId}` }, { status: 400 });
  }

  try {
    await ensureBucket();
    const service = serviceRoleSupabase();
    const objectKey = `ambient/${trackId}.mp3`;

    const existing = await service.storage
      .from(BUCKET)
      .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);
    if (existing.data?.signedUrl) {
      return NextResponse.json({ url: existing.data.signedUrl, cached: true });
    }

    const mp3 = await generateSoundEffect(def.prompt, {
      durationSeconds: def.durationSeconds,
    });
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
    console.error("ambient route error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
