"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

const Forest3DScene = dynamic(() => import("@/components/Forest3DScene"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gradient-to-b from-sky-200 to-amber-100 text-amber-900 font-semibold">
      Loading the forest...
    </div>
  ),
});

export function Preview3DClient() {
  const [hotspotMessage, setHotspotMessage] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMissing, setAudioMissing] = useState(false);

  useEffect(() => {
    fetch("/3d/kit/ambient.mp3", { method: "HEAD" })
      .then((r) => {
        if (r.ok) setAudioReady(true);
        else setAudioMissing(true);
      })
      .catch(() => setAudioMissing(true));
  }, []);

  return (
    <main className="fixed inset-0 bg-black flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent text-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-300">Coming soon</p>
          <h1 className="text-xl font-bold">Full 3D worlds in v2</h1>
        </div>
        <div className="flex items-center gap-2">
          {audioReady && (
            <button
              type="button"
              onClick={() => setAudioPlaying((p) => !p)}
              className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-semibold"
            >
              {audioPlaying ? "🔇 Mute" : "🔊 Play music"}
            </button>
          )}
          <Link
            href="/play"
            className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-amber-950 text-sm font-bold"
          >
            ← Back to story
          </Link>
        </div>
      </header>

      <div className="flex-1 relative">
        <Forest3DScene onHotspot={(msg) => setHotspotMessage(msg)} />
      </div>

      <footer className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent text-white p-4 text-center text-sm">
        <p className="font-semibold mb-1">Walk around with the arrow keys (or W/A/S/D). Space to jump.</p>
        <p className="opacity-80">Find 3 sparkling gems hidden across the platforms. Drag the scene with your mouse to look around.</p>
        {audioMissing && (
          <p className="opacity-60 text-xs mt-1">Ambient music will be added soon.</p>
        )}
      </footer>

      {audioReady && (
        <audio
          src="/3d/kit/ambient.mp3"
          loop
          autoPlay={false}
          ref={(el) => {
            if (!el) return;
            if (audioPlaying) el.play().catch(() => {});
            else el.pause();
          }}
        />
      )}

      {hotspotMessage && (
        <div
          className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setHotspotMessage(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-3xl mb-3">✨</p>
            <p className="text-lg text-amber-900 font-semibold mb-4">{hotspotMessage}</p>
            <button
              type="button"
              onClick={() => setHotspotMessage(null)}
              className="px-5 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800"
            >
              Keep exploring
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
