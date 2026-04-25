import { notFound, redirect } from "next/navigation";
import { serviceRoleSupabase } from "@/lib/supabase-server";
import type { WorldMap as WorldMapType } from "@/lib/claude";
import { PlayClient } from "./PlayClient";

type WorldRow = {
  id: string;
  title: string;
  narration: string;
  map: WorldMapType | null;
  audio_prompt: string | null;
};

const BUCKET = "world_audio";
const SIGNED_URL_TTL = 60 * 60;

export default async function PlayPage({
  searchParams,
}: {
  searchParams: { world?: string };
}) {
  const worldId = searchParams.world;
  if (!worldId) redirect("/");

  const supabase = serviceRoleSupabase();
  const { data: world } = await supabase
    .from("worlds")
    .select("id, title, narration, map, audio_prompt")
    .eq("id", worldId)
    .maybeSingle<WorldRow>();

  if (!world) notFound();
  if (!world.map) {
    return (
      <main className="p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{world.title}</h1>
        <p className="text-lg mb-6">{world.narration}</p>
        <p className="text-sm text-amber-700">
          This realm was made before the map system existed. Make a new one to
          see the animated map and soundscape.
        </p>
      </main>
    );
  }

  let audioUrl: string | null = null;
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(`${world.id}.mp3`, SIGNED_URL_TTL);
  if (signed?.signedUrl) audioUrl = signed.signedUrl;

  return (
    <PlayClient
      worldId={world.id}
      title={world.title}
      narration={world.narration}
      map={world.map}
      audioUrl={audioUrl}
    />
  );
}
