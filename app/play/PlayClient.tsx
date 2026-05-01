"use client";
import Image from "next/image";
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
import { OraclePrologue } from "@/components/OraclePrologue";
import { StarterPicker } from "@/components/StarterPicker";
import type { FlagState } from "@/lib/flags";
import { setFlag } from "@/lib/flags";
import { flagTitleSuffix } from "@/lib/flag-titles";
import { resolveBackgroundUrl } from "@/lib/background-resolver";
import { initialCounters, type CounterState } from "@/lib/counters";

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
  // Adventure slice: bumped each time the kid taps Play Again so StoryPlayer
  // remounts with fresh internal state (inventory, visited, ticked scenes,
  // completedRef). Without this, the second ending suppresses onComplete
  // because completedRef stays true across replays.
  const [replayCount, setReplayCount] = useState<number>(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  // Adventure slice: hand-authored adventures (story.prologue is set) skip
  // the ceremony reveal, the SceneEditor, and start in the prologue / starter
  // pick flow before mounting StoryPlayer. isAdventure is the single switch.
  const isAdventure = !!story.prologue;
  const [mode, setMode] = useState<"edit" | "play">(isAdventure ? "play" : "edit");
  const [showSave, setShowSave] = useState(false);
  const [showCeremony, setShowCeremony] = useState(
    !isAdventure && searchParams.get("ceremony") === "1"
  );
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
  // Initial flag state must match SSR: empty on both server and client first
  // render. We hydrate from sessionStorage in a post-mount effect to avoid
  // the React hydration mismatch when the kid refreshes mid-play with
  // stored flags.
  const [flags, setFlags] = useState<FlagState>({});
  const [hydrated, setHydrated] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(flagsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object") {
          const out: FlagState = {};
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === "boolean") out[k] = v;
          }
          if (Object.keys(out).length > 0) setFlags(out);
        }
      }
    } catch {
      // ignore corrupted state
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist flag state per world so refresh mid-playthrough resumes. Skip
  // until hydrated so the empty initial state does not clobber stored
  // values before the hydration effect has a chance to read them.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;
    try {
      sessionStorage.setItem(flagsKey, JSON.stringify(flags));
    } catch {
      // ignore quota
    }
  }, [flagsKey, flags, hydrated]);

  // Adventure slice: prologue + starter + counter state, all keyed off
  // worldId. Initial values match SSR (defaults). We hydrate from
  // sessionStorage in the same post-mount effect that hydrates flags, then
  // re-render with the stored values. This avoids hydration mismatches
  // when the kid refreshes mid-play.
  const prologueKey = `realm-shapers:prologue-shown:${worldId}`;
  const starterPickedKey = `realm-shapers:starter-picked:${worldId}`;
  const starterInvKey = `realm-shapers:starter-inv:${worldId}`;
  const countersKey = `realm-shapers:counters:${worldId}`;
  const counterDefs = story.counter_defs ?? [];
  const [prologueDone, setPrologueDone] = useState<boolean>(false);
  const [starterInventory, setStarterInventory] = useState<string[]>([]);
  const [starterPicked, setStarterPicked] = useState<boolean>(false);
  const [counters, setCounters] = useState<CounterState>(() =>
    counterDefs.length > 0 ? initialCounters(counterDefs) : {}
  );
  // Hydrate adventure state from sessionStorage after mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(prologueKey) === "1") setPrologueDone(true);
      if (sessionStorage.getItem(starterPickedKey) === "1") setStarterPicked(true);
      const invRaw = sessionStorage.getItem(starterInvKey);
      if (invRaw) {
        const parsed = JSON.parse(invRaw) as unknown;
        if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
          setStarterInventory(parsed as string[]);
        }
      }
      if (counterDefs.length > 0) {
        const cRaw = sessionStorage.getItem(countersKey);
        if (cRaw) {
          const parsed = JSON.parse(cRaw) as unknown;
          if (parsed && typeof parsed === "object") {
            const out: CounterState = {};
            for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
              if (typeof v === "number") out[k] = v;
            }
            for (const def of counterDefs) {
              if (!(def.id in out)) out[def.id] = def.start_at ?? def.max;
            }
            setCounters(out);
          }
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Persist counter state. Skip until hydrated.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;
    if (counterDefs.length === 0) return;
    try {
      sessionStorage.setItem(countersKey, JSON.stringify(counters));
    } catch {
      // ignore
    }
  }, [countersKey, counters, counterDefs.length, hydrated]);
  // Image preload during the prologue: as soon as the kid lands on /play
  // with an adventure, fire <Image>.src for each preload_scene_id so the
  // first scenes are cached before the StarterPicker confirms.
  useEffect(() => {
    if (!isAdventure || !story.prologue) return;
    if (typeof window === "undefined") return;
    const sceneById = new Map(story.scenes.map((s) => [s.id, s]));
    const urls: string[] = [];
    for (const sceneId of story.prologue.preload_scene_ids) {
      const scene = sceneById.get(sceneId);
      if (!scene) continue;
      const url = resolveBackgroundUrl(scene.background_id);
      if (url) urls.push(url);
    }
    for (const url of urls) {
      const img = new window.Image();
      img.src = url;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Adventure slice: handlers for the prologue and starter pick stages.
  const handlePrologueComplete = useCallback(() => {
    setPrologueDone(true);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(prologueKey, "1");
      } catch {
        // ignore
      }
    }
  }, [prologueKey]);

  const handleStarterConfirm = useCallback(
    (picked: string[]) => {
      setStarterInventory(picked);
      setStarterPicked(true);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(starterPickedKey, "1");
          sessionStorage.setItem(starterInvKey, JSON.stringify(picked));
        } catch {
          // ignore
        }
      }
    },
    [starterPickedKey, starterInvKey]
  );

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
    // a fresh run. Inventory and visited-scenes reset via the StoryPlayer
    // remount triggered by bumping replayCount (which is part of the
    // component key). For adventures, also reset counters back to their max.
    // Starter inventory + prologue-shown stay so the kid does not redo
    // those before each retry.
    setFlags({});
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(flagsKey);
      } catch {
        // ignore
      }
    }
    if (isAdventure && counterDefs.length > 0) {
      const fresh = initialCounters(counterDefs);
      setCounters(fresh);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(countersKey, JSON.stringify(fresh));
        } catch {
          // ignore
        }
      }
    }
    setReplayCount((c) => c + 1);
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

  // Fire greeting on first edit-mode mount when not coming straight from
  // ceremony. Adventure flows have their own Oracle prologue, so suppress
  // the editor greeting for them.
  useEffect(() => {
    if (showCeremony) return;
    if (mode !== "edit") return;
    if (isAdventure) return;
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

      {!isAdventure && (
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
      )}

      {/* Adventure prologue + starter pick. Renders the courtyard background
          full-bleed behind the dialogue / picker overlays. While these are
          showing, StoryPlayer is also mounted in the background so its
          ambient pipeline can warm up; pointer-events on the overlays
          dominate so the kid only interacts with the prologue UI. */}
      {isAdventure && story.prologue && (!prologueDone || !starterPicked) && (
        <div className="fixed inset-0 z-40">
          {(() => {
            const url = resolveBackgroundUrl(story.prologue.background_id);
            return url ? (
              <Image
                src={url}
                alt="Courtyard at dawn"
                fill
                unoptimized
                priority
                sizes="100vw"
                className="object-cover"
              />
            ) : null;
          })()}
        </div>
      )}
      {isAdventure && story.prologue && !prologueDone && (
        <OraclePrologue
          lines={story.prologue.oracle_lines}
          onComplete={handlePrologueComplete}
        />
      )}
      {isAdventure && prologueDone && !starterPicked && story.starter_choices && (
        <StarterPicker
          candidates={story.starter_choices.candidates}
          requiredCount={story.starter_choices.required_count}
          onConfirm={handleStarterConfirm}
        />
      )}

      {/* StoryPlayer mounts when the kid is ready to play: either the
          claude flow's editor "Play" button (mode=play), or the adventure
          flow once the starter has been confirmed. */}
      {((mode === "play" && !isAdventure) || (isAdventure && starterPicked)) && (
        <StoryPlayer
          key={`player-l${level}-${generationStatus}-r${replayCount}`}
          worldId={worldId}
          story={story}
          flags={flags}
          heroCharacterId={isAdventure ? story.default_character_id : editorSnapshot.characterId}
          editorScene1PropIds={isAdventure ? undefined : editorSnapshot.propIds}
          onSetFlag={handleSetFlag}
          onExit={isAdventure ? undefined : handleExitPlay}
          onQuitRealm={() => router.push("/")}
          onComplete={handlePlayerComplete}
          onEvent={checkAchievements}
          initialInventory={isAdventure ? starterInventory : undefined}
          counters={counterDefs.length > 0 ? counters : undefined}
          counterDefs={counterDefs.length > 0 ? counterDefs : undefined}
          onCountersChange={counterDefs.length > 0 ? setCounters : undefined}
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
                {!isAdventure && (
                  <button
                    type="button"
                    onClick={handleGoDeeper}
                    disabled={goDeeperState.loading}
                    className="px-4 py-3 rounded-xl bg-purple-700 text-white font-bold shadow hover:bg-purple-800 disabled:opacity-60"
                  >
                    {goDeeperState.loading ? "Going deeper..." : "🌀 Go Deeper"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReplay}
                  className="px-4 py-3 rounded-xl bg-rose-100 text-rose-900 font-semibold hover:bg-rose-200"
                >
                  Play again
                </button>
                {!isAdventure && (
                  <button
                    type="button"
                    onClick={handleExitPlay}
                    className="px-4 py-3 rounded-xl bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200"
                  >
                    Edit my scene
                  </button>
                )}
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
              {!isAdventure && goDeeperState.error && (
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
