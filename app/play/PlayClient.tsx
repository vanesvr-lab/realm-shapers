"use client";
import Link from "next/link";
import { useState } from "react";
import type { WorldMap as WorldMapType } from "@/lib/claude";
import { WorldMap } from "@/components/WorldMap";
import { AudioPlayer } from "@/components/AudioPlayer";
import { SaveYourWorldsModal } from "@/components/SaveYourWorldsModal";

export function PlayClient({
  worldId,
  title,
  narration,
  map,
  audioUrl: initialAudioUrl,
}: {
  worldId: string;
  title: string;
  narration: string;
  map: WorldMapType;
  audioUrl: string | null;
}) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  async function handlePlay() {
    setStarted(true);
    if (audioUrl) return;
    setAudioLoading(true);
    setAudioError(null);
    try {
      const res = await fetch("/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world_id: worldId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setAudioUrl(data.url);
      } else {
        setAudioError(data.error ?? "No audio");
      }
    } catch (err) {
      setAudioError(String(err));
    } finally {
      setAudioLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-amber-900 mb-2 text-balance">
          {title}
        </h1>
        <p className="text-base sm:text-lg leading-relaxed text-slate-700">
          {narration}
        </p>
      </header>

      <WorldMap map={map} started={started} onComplete={() => setDone(true)} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!started && (
          <button
            onClick={handlePlay}
            className="px-5 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800"
          >
            ▶ Play
          </button>
        )}
        {started && audioUrl && (
          <AudioPlayer
            src={audioUrl}
            playing={started && !done}
            onError={(msg) => setAudioError(msg)}
          />
        )}
        {audioLoading && (
          <p className="text-sm text-slate-500">Loading soundscape...</p>
        )}
        {audioError && (
          <p className="text-sm text-amber-700">
            Soundscape unavailable: {audioError}
          </p>
        )}
      </div>

      {done && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="px-5 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800"
          >
            Make another
          </Link>
          <button
            onClick={() => setShowSave(true)}
            className="px-5 py-3 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800"
          >
            Save your worlds
          </button>
        </div>
      )}

      <SaveYourWorldsModal open={showSave} onClose={() => setShowSave(false)} />
    </main>
  );
}
