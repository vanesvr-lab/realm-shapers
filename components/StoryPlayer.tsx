"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ASSETS_BY_ID,
  assetUrlById,
} from "@/lib/asset-library";
import type { StoryTree } from "@/lib/claude";
import { AudioPlayer } from "@/components/AudioPlayer";
import { InteractiveProp } from "@/components/InteractiveProp";

export function StoryPlayer({
  worldId,
  story,
  onExit,
  onEnd,
}: {
  worldId: string;
  story: StoryTree;
  onExit: () => void;
  onEnd?: () => void;
}) {
  const [sceneId, setSceneId] = useState<string>(story.starting_scene_id);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioCache = useStateRef<Record<string, string>>({});

  const scene = story.scenes.find((s) => s.id === sceneId) ?? story.scenes[0];
  const isEnding = scene.choices.length === 0;
  const charUrl = assetUrlById(story.default_character_id);
  const charMeta = ASSETS_BY_ID[story.default_character_id];
  const bgUrl = assetUrlById(scene.background_id);

  useEffect(() => {
    if (isEnding) onEnd?.();
  }, [isEnding, sceneId, onEnd]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cached = audioCache.current[scene.id];
      if (cached) {
        setAudioUrl(cached);
        return;
      }
      setAudioLoading(true);
      setAudioError(null);
      setAudioUrl(null);
      try {
        const res = await fetch("/api/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            world_id: worldId,
            scene_id: scene.id,
            audio_prompt: scene.ambient_audio_prompt,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.url) {
          audioCache.current[scene.id] = data.url;
          setAudioUrl(data.url);
        } else {
          setAudioError(data.error ?? "no audio");
        }
      } catch (err) {
        if (!cancelled) setAudioError(String(err));
      } finally {
        if (!cancelled) setAudioLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [scene.id, scene.ambient_audio_prompt, worldId, audioCache]);

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col">
      <div className="absolute inset-0">
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
              <Image
                src={bgUrl}
                alt={scene.title}
                fill
                unoptimized
                priority
                sizes="100vw"
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            {charUrl && charMeta && (
              <motion.div
                key={`${scene.id}-char`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="absolute"
                style={{
                  left: "50%",
                  bottom: "22%",
                  transform: "translateX(-50%)",
                  width: "min(28vw, 220px)",
                  height: "min(28vw, 220px)",
                }}
              >
                <Image
                  src={charUrl}
                  alt={charMeta.alt}
                  fill
                  unoptimized
                  sizes="220px"
                  className="object-contain drop-shadow-2xl"
                />
              </motion.div>
            )}
            {scene.default_props.map((propId, i) => {
              const url = assetUrlById(propId);
              const meta = ASSETS_BY_ID[propId];
              if (!url || !meta) return null;
              const offsets = [
                { left: "12%", bottom: "18%" },
                { right: "12%", bottom: "16%" },
                { left: "50%", bottom: "12%" },
              ];
              const pos = offsets[i] ?? offsets[0];
              return (
                <motion.div
                  key={`${scene.id}-prop-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="absolute"
                  style={{ ...pos, width: "min(14vw, 110px)", height: "min(14vw, 110px)" }}
                >
                  <InteractiveProp
                    worldId={worldId}
                    sceneId={scene.id}
                    propId={propId}
                    src={url}
                    alt={meta.alt}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={onExit}
        className="absolute top-4 right-4 z-10 px-3 py-2 rounded-lg bg-white/90 text-amber-900 font-semibold text-sm shadow"
      >
        ✕ Exit
      </button>

      <div className="absolute top-4 left-4 z-10">
        {audioUrl && (
          <div className="bg-white/90 rounded-lg px-3 py-2 shadow">
            <AudioPlayer src={audioUrl} playing onError={setAudioError} />
          </div>
        )}
        {audioLoading && (
          <p className="text-sm text-white/90 bg-black/50 rounded px-3 py-1">Loading sound...</p>
        )}
        {audioError && !audioUrl && (
          <p className="text-xs text-amber-100 bg-black/50 rounded px-3 py-1">Sound unavailable</p>
        )}
      </div>

      <div className="relative mt-auto p-4 sm:p-6 flex flex-col gap-4 max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${scene.id}-narration`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white/95 rounded-2xl shadow-xl p-4 sm:p-5"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-amber-900 mb-1">{scene.title}</h2>
            <p className="text-base sm:text-lg text-slate-800 leading-relaxed">{scene.narration}</p>
          </motion.div>
        </AnimatePresence>

        {!isEnding ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scene.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => setSceneId(choice.next_scene_id)}
                className="px-4 py-4 rounded-xl bg-amber-600 text-white font-bold text-base hover:bg-amber-700 transition shadow-lg"
              >
                {choice.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white/90 rounded-2xl p-4 text-center">
            <p className="text-amber-900 font-bold text-lg mb-3">The End</p>
            <button
              type="button"
              onClick={onExit}
              className="px-5 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800"
            >
              Edit my story
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function useStateRef<T>(initial: T) {
  const [ref] = useState({ current: initial });
  return ref;
}
