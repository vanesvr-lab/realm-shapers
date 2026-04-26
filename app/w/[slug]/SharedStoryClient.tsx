"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { StoryTree } from "@/lib/claude";
import { ASSETS_BY_ID, assetUrlById } from "@/lib/asset-library";

export function SharedStoryClient({
  worldId,
  title,
  story,
  ingredients,
}: {
  worldId: string;
  title: string;
  story: StoryTree;
  ingredients: { setting: string; character: string; goal: string; twist: string };
}) {
  void worldId;
  const [sceneId, setSceneId] = useState(story.starting_scene_id);
  const scene = story.scenes.find((s) => s.id === sceneId) ?? story.scenes[0];
  const charUrl = assetUrlById(story.default_character_id);
  const charMeta = ASSETS_BY_ID[story.default_character_id];
  const bgUrl = assetUrlById(scene.background_id);
  const isEnding = scene.choices.length === 0;

  return (
    <main className="min-h-screen bg-black">
      <div className="relative w-full" style={{ aspectRatio: "16 / 9", maxHeight: "70vh" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {bgUrl && (
              <Image src={bgUrl} alt={scene.title} fill unoptimized priority sizes="100vw" className="object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {charUrl && charMeta && (
              <div
                className="absolute"
                style={{
                  left: "50%",
                  bottom: "18%",
                  transform: "translateX(-50%)",
                  width: "min(28vw, 220px)",
                  height: "min(28vw, 220px)",
                }}
              >
                <Image src={charUrl} alt={charMeta.alt} fill unoptimized sizes="220px" className="object-contain drop-shadow-2xl" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <p className="text-xs uppercase tracking-widest text-amber-700 mb-1">Realm Shapers</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-amber-900 mb-1">{title}</h1>
          <h2 className="text-lg sm:text-xl font-semibold text-amber-800 mb-2">{scene.title}</h2>
          <p className="text-base text-slate-800 leading-relaxed">{scene.narration}</p>
          {!isEnding ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scene.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSceneId(c.next_scene_id)}
                  className="px-4 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition shadow"
                >
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSceneId(story.starting_scene_id)}
                className="px-4 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700"
              >
                Read again
              </button>
              <Link
                href="/"
                className="px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
              >
                Make your own
              </Link>
            </div>
          )}
        </div>

        <section className="bg-white/80 rounded-xl p-4 my-6">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2">
            The four ingredients
          </h3>
          <dl className="space-y-1 text-sm">
            <div>
              <dt className="inline font-medium">Setting: </dt>
              <dd className="inline">{ingredients.setting}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Character: </dt>
              <dd className="inline">{ingredients.character}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Goal: </dt>
              <dd className="inline">{ingredients.goal}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Twist: </dt>
              <dd className="inline">{ingredients.twist}</dd>
            </div>
          </dl>
        </section>

        <footer className="text-sm text-slate-400 text-center pb-8">
          Made on Realm Shapers
        </footer>
      </section>
    </main>
  );
}
