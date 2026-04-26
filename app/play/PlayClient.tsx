"use client";
import Link from "next/link";
import { useState } from "react";
import type { StoryTree } from "@/lib/claude";
import { SceneEditor } from "@/components/SceneEditor";
import { StoryPlayer } from "@/components/StoryPlayer";
import { SaveYourWorldsModal } from "@/components/SaveYourWorldsModal";

export function PlayClient({
  worldId,
  title,
  narration,
  story,
}: {
  worldId: string;
  title: string;
  narration: string;
  story: StoryTree;
}) {
  const [mode, setMode] = useState<"edit" | "play">("edit");
  const [showSave, setShowSave] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-rose-50 p-3 sm:p-6">
      <header className="max-w-5xl mx-auto mb-4 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-amber-900 text-balance">{title}</h1>
          <p className="text-xs uppercase tracking-widest text-amber-700">Edit mode</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/preview-3d"
            className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-900 text-sm font-semibold hover:bg-emerald-200"
          >
            🎮 Try our 3D preview
          </Link>
          <button
            type="button"
            onClick={() => setShowSave(true)}
            className="px-3 py-2 rounded-lg bg-amber-100 text-amber-900 text-sm font-semibold hover:bg-amber-200"
          >
            Save your worlds
          </button>
          <Link
            href="/"
            className="px-3 py-2 rounded-lg bg-slate-100 text-slate-800 text-sm font-semibold hover:bg-slate-200"
          >
            Make another
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto">
        <SceneEditor
          worldId={worldId}
          story={story}
          initialNarration={narration || story.scenes[0].narration}
          onPlay={() => setMode("play")}
        />
      </div>

      {mode === "play" && (
        <StoryPlayer
          worldId={worldId}
          story={story}
          onExit={() => setMode("edit")}
        />
      )}

      <SaveYourWorldsModal open={showSave} onClose={() => setShowSave(false)} />
    </main>
  );
}
