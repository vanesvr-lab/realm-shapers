"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { StoryScene, StoryTree, WorldIngredients } from "@/lib/claude";
import type { AchievementDef } from "@/lib/achievements-types";
import type { RarityInputs } from "@/lib/rarity";
import { SceneEditor, type EditorSnapshot } from "@/components/SceneEditor";
import { StoryPlayer, type GameplayEvent } from "@/components/StoryPlayer";
import { SaveYourWorldsModal } from "@/components/SaveYourWorldsModal";
import { AchievementToast } from "@/components/AchievementToast";
import type { FlagState } from "@/lib/flags";
import { setFlag } from "@/lib/flags";
import { flagTitleSuffix } from "@/lib/flag-titles";

const CeremonyReveal = dynamic(
  () => import("@/components/CeremonyReveal").then((m) => m.CeremonyReveal),
  { ssr: false }
);

const RealmCard = dynamic(
  () => import("@/components/RealmCard").then((m) => m.RealmCard),
  { ssr: false }
);

export function PlayClient({
  worldId,
  title: initialTitle,
  narration: initialNarration,
  story: initialStory,
  ingredients,
  username,
  initialUnlocked,
  initialLevel,
  initialStatus,
}: {
  worldId: string;
  title: string;
  narration: string;
  story: StoryTree;
  ingredients: WorldIngredients;
  username: string | null;
  initialUnlocked: AchievementDef[];
  initialLevel: number;
  initialStatus: string;
}) {
  const [story, setStory] = useState<StoryTree>(initialStory);
  const [title, setTitle] = useState<string>(initialTitle);
  const [narration, setNarration] = useState<string>(initialNarration);
  const [level, setLevel] = useState<number>(initialLevel);
  const [generationStatus, setGenerationStatus] = useState<string>(initialStatus);
  const [goDeeperState, setGoDeeperState] = useState<{ loading: boolean; error: string | null }>(
    { loading: false, error: null }
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"edit" | "play">("edit");
  const [showSave, setShowSave] = useState(false);
  const [showCeremony, setShowCeremony] = useState(searchParams.get("ceremony") === "1");
  const [editorSnapshot, setEditorSnapshot] = useState<EditorSnapshot>({
    propsPlaced: story.scenes[0]?.default_props.length ?? 0,
    characterId: story.default_character_id,
    backgroundId: story.scenes[0]?.background_id ?? "forest",
    propIds: story.scenes[0]?.default_props ?? [],
  });
  const [completion, setCompletion] = useState<{
    endingScene: StoryScene;
    rarityInputs: RarityInputs;
    flagSuffix: string | null;
  } | null>(null);
  const [toastQueue, setToastQueue] = useState<AchievementDef[]>(initialUnlocked);
  const flagsKey = `realm-shapers:flags:${worldId}`;
  const [flags, setFlags] = useState<FlagState>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = sessionStorage.getItem(flagsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object") {
          const out: FlagState = {};
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === "boolean") out[k] = v;
          }
          return out;
        }
      }
    } catch {
      // ignore corrupted state
    }
    return {};
  });

  // Persist flag state per world so refresh mid-playthrough resumes; clear
  // any other world's flags on entry. Switching worlds (different worldId)
  // remounts this component and starts with that world's stored flags only.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(flagsKey, JSON.stringify(flags));
    } catch {
      // ignore quota
    }
  }, [flagsKey, flags]);

  const handleSetFlag = useCallback((id: string, value: boolean) => {
    setFlags((prev) => setFlag(prev, id, value));
  }, []);

  // Pull any unlocks the landing form stashed (from /api/generate response).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("realm-shapers:pending-unlocks");
      if (raw) {
        const parsed = JSON.parse(raw) as AchievementDef[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setToastQueue((q) => [...q, ...parsed]);
        }
        sessionStorage.removeItem("realm-shapers:pending-unlocks");
      }
    } catch {
      // ignore
    }
  }, []);

  const dismissCeremony = useCallback(() => {
    setShowCeremony(false);
    // Clean the URL so refresh doesn't replay the ceremony.
    if (typeof window !== "undefined" && window.location.search.includes("ceremony=1")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("ceremony");
      router.replace(url.pathname + (url.search ? url.search : ""), { scroll: false });
    }
  }, [router]);

  const enqueueAchievements = useCallback((items: AchievementDef[]) => {
    if (!items.length) return;
    setToastQueue((q) => [...q, ...items]);
  }, []);

  const consumeToast = useCallback((id: string) => {
    setToastQueue((q) => q.filter((a) => a.id !== id));
  }, []);

  const checkAchievements = useCallback(
    async (event: GameplayEvent) => {
      try {
        const res = await fetch("/api/check-achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.unlocked)) {
          enqueueAchievements(data.unlocked as AchievementDef[]);
        }
      } catch {
        // non-blocking
      }
    },
    [enqueueAchievements]
  );

  function handleEditorPlay(snapshot: EditorSnapshot) {
    setEditorSnapshot(snapshot);
    setMode("play");
  }

  function handlePlayerComplete(payload: {
    endingScene: StoryScene;
    scenesVisited: string[];
    pickupsCollected: string[];
    totalPickups: number;
    secretDiscovered: boolean;
  }) {
    const rarityInputs: RarityInputs = {
      propsPlaced: editorSnapshot.propsPlaced,
      scenesVisited: payload.scenesVisited.length,
      secretDiscovered: payload.secretDiscovered,
      ingredients,
    };
    setCompletion({
      endingScene: payload.endingScene,
      rarityInputs,
      flagSuffix: flagTitleSuffix(flags),
    });
  }

  function handleExitPlay() {
    setMode("edit");
    setCompletion(null);
  }

  function handleReplay() {
    // Replay clears the flag state for this world so endings can diverge on
    // a fresh run. Inventory and visited-scenes already reset by virtue of
    // StoryPlayer remounting.
    setFlags({});
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(flagsKey);
      } catch {
        // ignore
      }
    }
    setCompletion(null);
    setMode("edit");
  }

  async function handleGoDeeper() {
    if (goDeeperState.loading) return;
    setGoDeeperState({ loading: true, error: null });
    try {
      const res = await fetch("/api/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world_id: worldId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGoDeeperState({ loading: false, error: data.error ?? "Could not go deeper" });
        return;
      }
      const nextStory = data.story as StoryTree;
      setStory(nextStory);
      setTitle(typeof data.title === "string" ? data.title : title);
      setNarration(
        nextStory.scenes.find((s) => s.id === nextStory.starting_scene_id)?.narration ?? narration
      );
      setLevel(typeof data.level === "number" ? data.level : level + 1);
      setFlags({});
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(flagsKey);
          sessionStorage.removeItem(`realm-shapers:editor-props:${worldId}`);
        } catch {
          // ignore
        }
      }
      setEditorSnapshot({
        propsPlaced: nextStory.scenes[0]?.default_props.length ?? 0,
        characterId: nextStory.default_character_id,
        backgroundId: nextStory.scenes[0]?.background_id ?? "forest",
        propIds: nextStory.scenes[0]?.default_props ?? [],
      });
      setCompletion(null);
      setMode("edit");
      setGoDeeperState({ loading: false, error: null });
    } catch (err) {
      setGoDeeperState({ loading: false, error: String(err) });
    }
  }

  // B-010 scope 10: when the world arrived in 'phase_1' status (instant
  // shell), kick off /api/finalize once and poll /api/world-status until
  // the full tree is ready. Then swap the tree in place. Stops polling on
  // unmount or when status flips to 'complete'.
  useEffect(() => {
    if (generationStatus === "complete") return;
    let cancelled = false;
    let pollId: ReturnType<typeof setTimeout> | null = null;

    fetch("/api/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ world_id: worldId }),
    }).catch(() => {
      // ignore; the poll loop will surface the error if it persists
    });

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/world-status?world_id=${encodeURIComponent(worldId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data?.status === "complete" && data?.map) {
          setStory(data.map as StoryTree);
          if (typeof data.title === "string") setTitle(data.title);
          if (typeof data.narration === "string") setNarration(data.narration);
          if (typeof data.level === "number") setLevel(data.level);
          setGenerationStatus("complete");
          return;
        }
      } catch {
        // ignore; retry
      }
      pollId = setTimeout(poll, 1500);
    }
    poll();

    return () => {
      cancelled = true;
      if (pollId) clearTimeout(pollId);
    };
  }, [generationStatus, worldId]);

  // Fire greeting on first edit-mode mount when not coming straight from ceremony.
  useEffect(() => {
    if (showCeremony) return;
    if (mode !== "edit") return;
    let cancelled = false;
    (async () => {
      const { speakOracle } = await import("@/lib/oracle-bus");
      if (cancelled) return;
      speakOracle({
        text: `Welcome to ${title}. Shape your scene, then play.`,
        kind: "greet",
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-rose-50 p-3 sm:p-6">
      <header className="max-w-5xl mx-auto mb-4 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-900 text-balance">{title}</h1>
            {level >= 2 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-700 text-white text-xs font-bold uppercase tracking-wider shadow">
                Lvl {level}
              </span>
            )}
          </div>
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

      {generationStatus !== "complete" && (
        <div className="max-w-5xl mx-auto mb-3">
          <div className="rounded-xl bg-purple-100 border border-purple-200 px-4 py-3 text-sm text-purple-900 shadow-sm">
            <span className="font-bold">Forming...</span>{" "}
            The Oracle is still weaving the rest of this realm. The full tree will swap in shortly.
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <SceneEditor
          key={`editor-l${level}-${generationStatus}`}
          worldId={worldId}
          story={story}
          initialNarration={narration || story.scenes[0].narration}
          onPlay={handleEditorPlay}
          onSnapshotChange={setEditorSnapshot}
        />
      </div>

      {mode === "play" && (
        <StoryPlayer
          key={`player-l${level}-${generationStatus}`}
          worldId={worldId}
          story={story}
          flags={flags}
          heroCharacterId={editorSnapshot.characterId}
          editorScene1PropIds={editorSnapshot.propIds}
          onSetFlag={handleSetFlag}
          onExit={handleExitPlay}
          onQuitRealm={() => router.push("/")}
          onComplete={handlePlayerComplete}
          onEvent={checkAchievements}
        />
      )}

      {showCeremony && (
        <CeremonyReveal title={title} onDismiss={dismissCeremony} />
      )}

      <AnimatePresence>
        {completion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="flex flex-col items-center gap-5 my-8">
              <p className="text-amber-100 text-sm uppercase tracking-widest">
                Your realm card
              </p>
              <RealmCard
                title={title}
                story={story}
                endingScene={completion.endingScene}
                ingredients={ingredients}
                rarityInputs={completion.rarityInputs}
                username={username}
                flagTitleSuffix={completion.flagSuffix}
              />
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={handleGoDeeper}
                  disabled={goDeeperState.loading}
                  className="px-4 py-3 rounded-xl bg-purple-700 text-white font-bold shadow hover:bg-purple-800 disabled:opacity-60"
                >
                  {goDeeperState.loading ? "Going deeper..." : "🌀 Go Deeper"}
                </button>
                <button
                  type="button"
                  onClick={handleReplay}
                  className="px-4 py-3 rounded-xl bg-rose-100 text-rose-900 font-semibold hover:bg-rose-200"
                >
                  Play again
                </button>
                <button
                  type="button"
                  onClick={handleExitPlay}
                  className="px-4 py-3 rounded-xl bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200"
                >
                  Edit my scene
                </button>
                <button
                  type="button"
                  onClick={() => setShowSave(true)}
                  className="px-4 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800"
                >
                  Save your worlds
                </button>
                <Link
                  href="/"
                  className="px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                >
                  Make another
                </Link>
                <Link
                  href="/"
                  className="px-4 py-3 rounded-xl bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300"
                >
                  🚪 Exit
                </Link>
              </div>
              {goDeeperState.error && (
                <p className="text-xs text-rose-200 bg-rose-900/40 rounded px-3 py-1 max-w-md text-center">
                  {goDeeperState.error}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SaveYourWorldsModal open={showSave} onClose={() => setShowSave(false)} />

      <AchievementToast queue={toastQueue} onConsume={consumeToast} />
    </main>
  );
}
