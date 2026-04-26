import { notFound, redirect } from "next/navigation";
import { serviceRoleSupabase } from "@/lib/supabase-server";
import type { StoryTree } from "@/lib/claude";
import { PlayClient } from "./PlayClient";

type WorldRow = {
  id: string;
  title: string;
  narration: string;
  map: StoryTree | null;
  audio_prompt: string | null;
};

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

  if (!world.map || !Array.isArray(world.map.scenes)) {
    return (
      <main className="p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{world.title}</h1>
        <p className="text-lg mb-6">{world.narration}</p>
        <p className="text-sm text-amber-700">
          This realm was made before the new story system. Make a new one to
          play the full choose-your-own-adventure.
        </p>
      </main>
    );
  }

  return (
    <PlayClient
      worldId={world.id}
      title={world.title}
      narration={world.narration}
      story={world.map}
    />
  );
}
