"use client";
import Image from "next/image";
import Link from "next/link";
import { ASSETS_BY_ID, assetUrlById } from "@/lib/asset-library";
import { resolveBackgroundUrl } from "@/lib/background-resolver";
import type { StoryTree, WorldIngredients } from "@/lib/claude";

export function RealmCardThumb({
  worldId,
  title,
  story,
  ingredients,
  shareSlug,
}: {
  worldId: string;
  title: string;
  story: StoryTree;
  ingredients: WorldIngredients | null;
  shareSlug: string | null;
}) {
  const startingScene = story.scenes.find((s) => s.id === story.starting_scene_id) ?? story.scenes[0];
  const charUrl = assetUrlById(story.default_character_id);
  const charMeta = ASSETS_BY_ID[story.default_character_id];
  const bgUrl = startingScene ? resolveBackgroundUrl(startingScene.background_id) : null;
  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-lg ring-1 ring-amber-300 bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col"
      style={{ aspectRatio: "3/4" }}
    >
      <div className="relative flex-1 min-h-[120px]">
        {bgUrl && (
          <Image
            src={bgUrl}
            alt={startingScene?.title ?? title}
            fill
            unoptimized
            sizes="200px"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        {charUrl && charMeta && (
          <div className="absolute left-1/2 bottom-1 -translate-x-1/2 w-20 h-20">
            <Image src={charUrl} alt={charMeta.alt} fill unoptimized sizes="80px" className="object-contain drop-shadow-xl" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-amber-950 leading-tight line-clamp-2" style={{ fontFamily: "Georgia, serif" }}>
          {title}
        </h3>
        {ingredients && (
          <p className="text-[10px] text-amber-800/75 line-clamp-2 mt-1">
            {ingredients.character} • {ingredients.setting}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Link
            href={`/play?world=${worldId}`}
            className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-amber-700 text-white hover:bg-amber-800"
          >
            Play
          </Link>
          {shareSlug && (
            <Link
              href={`/w/${shareSlug}`}
              className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-900 hover:bg-amber-200"
            >
              Share view
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
