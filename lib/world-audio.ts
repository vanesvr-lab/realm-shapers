import "server-only";
import { generateSoundEffect } from "@/lib/elevenlabs";
import { serviceRoleSupabase } from "@/lib/supabase-server";

const BUCKET = "world_audio";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function ensureAudioForWorld(
  worldId: string,
  audioPrompt: string
): Promise<string> {
  const service = serviceRoleSupabase();
  const objectKey = `${worldId}.mp3`;

  const { data: existing } = await service.storage
    .from(BUCKET)
    .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);

  if (existing?.signedUrl) {
    return existing.signedUrl;
  }

  const mp3 = await generateSoundEffect(audioPrompt);
  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(objectKey, mp3, {
      contentType: "audio/mpeg",
      upsert: true,
    });
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: signed, error: signError } = await service.storage
    .from(BUCKET)
    .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    throw new Error(`Sign failed: ${signError?.message ?? "no url"}`);
  }
  return signed.signedUrl;
}
