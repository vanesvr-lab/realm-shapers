"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ASSETS_BY_ID,
  assetUrlById,
} from "@/lib/asset-library";
import type { ChoiceOption, StoryScene, StoryTree } from "@/lib/claude";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Interactable } from "@/components/Interactable";
import { InventoryBar } from "@/components/InventoryBar";
import { OracleSpeaks } from "@/components/OracleSpeaks";
import { ChoiceMoment } from "@/components/ChoiceMoment";
import { speakOracle } from "@/lib/oracle-bus";
import type { FlagState } from "@/lib/flags";
import { resolveScene, selectEnding } from "@/lib/scene-resolver";

export type GameplayEvent =
  | { kind: "scene_visited"; world_id: string; scene_id: string; background_id: string }
  | { kind: "pickup_collected"; world_id: string; scene_id: string; pickup_id: string }
  | { kind: "world_completed"; world_id: string; character_id: string; secret_discovered: boolean }
  | { kind: "side_quest_completed"; world_id: string; scene_id: string }
  | { kind: "secret_ending_discovered"; world_id: string }
  | { kind: "summon_used"; world_id: string; prop_id: string; matched: boolean }
  | { kind: "choice_made"; world_id: string; scene_id: string; flag_id: string }
  | { kind: "world_completed_with_ending"; world_id: string; ending_scene_id: string };

type CompletionPayload = {
  endingScene: StoryScene;
  scenesVisited: string[];
  pickupsCollected: string[];
  totalPickups: number;
  secretDiscovered: boolean;
};

const TUTORIAL_KEY = "realm-shapers:saw-tutorial";
const SUMMONS_MAX = 5;

const CHOICE_POSITIONS: React.CSSProperties[] = [
  { left: "12%", bottom: "22%" },
  { right: "12%", bottom: "22%" },
  { left: "50%", bottom: "14%", transform: "translateX(-50%)" },
];

const PICKUP_POSITIONS: React.CSSProperties[] = [
  { left: "22%", bottom: "48%" },
  { right: "22%", bottom: "48%" },
];

export function StoryPlayer({
  worldId,
  story,
  flags,
  heroCharacterId,
  onSetFlag,
  onExit,
  onComplete,
  onEvent,
}: {
  worldId: string;
  story: StoryTree;
  flags: FlagState;
  // B-010 scope 3: optional override (typically from the SceneEditor's swap)
  // takes precedence over story.default_character_id. The default is set by
  // the LandingForm picker (B-010 scope 2), which fixes Kellen's "purple
  // dragon → default girl" bug at the source.
  heroCharacterId?: string;
  onSetFlag: (id: string, value: boolean) => void;
  onExit: () => void;
  onComplete?: (payload: CompletionPayload) => void;
  onEvent?: (event: GameplayEvent) => void;
}) {
  const [sceneId, setSceneId] = useState<string>(story.starting_scene_id);
  const [inventory, setInventory] = useState<string[]>([]);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([story.starting_scene_id]));
  const [pickedPerScene, setPickedPerScene] = useState<Record<string, string[]>>({});
  const [secretDiscovered, setSecretDiscovered] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [summonsUsed, setSummonsUsed] = useState(0);
  const [recentlySummonedId, setRecentlySummonedId] = useState<string | null>(null);
  const sideQuestsFired = useRef<Set<string>>(new Set());
  const flagsExitedFor = useRef<Set<string>>(new Set());

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioCache = useRef<Record<string, string>>({});
  const completedRef = useRef(false);
  const endingRedirectedRef = useRef(false);

  const sceneById = useMemo(() => {
    const m = new Map<string, StoryScene>();
    for (const s of story.scenes) m.set(s.id, s);
    if (story.secret_ending) m.set(story.secret_ending.id, story.secret_ending);
    return m;
  }, [story]);

  const scene = sceneById.get(sceneId) ?? story.scenes[0];
  const isChoiceScene = scene.is_choice_scene === true;
  const isEnding = !isChoiceScene && scene.choices.length === 0;
  const isSideQuestScene = scene.is_side_quest === true;
  const renderedHeroId = heroCharacterId && ASSETS_BY_ID[heroCharacterId]
    ? heroCharacterId
    : story.default_character_id;
  const charUrl = assetUrlById(renderedHeroId);
  const charMeta = ASSETS_BY_ID[renderedHeroId];
  if (typeof window !== "undefined" && !charMeta) {
    console.warn(
      `StoryPlayer: hero asset id "${renderedHeroId}" not found in library; nothing will render`
    );
  }
  const bgUrl = assetUrlById(scene.background_id);
  const resolved = useMemo(() => resolveScene(scene, flags), [scene, flags]);

  const totalPickups = useMemo(() => {
    const all = new Set<string>();
    for (const s of story.scenes) for (const p of s.pickups ?? []) all.add(p);
    return all.size;
  }, [story]);

  const allPickupsCollected = totalPickups > 0 && inventory.length >= totalPickups;
  const visitedAllScenes = visited.size >= story.scenes.length;
  const secretEligible = !secretDiscovered && (visitedAllScenes || allPickupsCollected);

  useEffect(() => {
    try {
      const saw = sessionStorage.getItem(TUTORIAL_KEY);
      if (!saw) setShowTutorial(true);
    } catch {
      // ignore
    }
  }, []);

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    try {
      sessionStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  // Ambient scene audio (existing /api/audio with ElevenLabs Sound Effects).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cached = audioCache.current[scene.id];
      if (cached) {
        setAudioUrl(cached);
        return;
      }
      setAudioUrl(null);
      setAudioError(null);
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
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [scene.id, scene.ambient_audio_prompt, worldId]);

  // Fire scene_visited (and side_quest_completed for side quest scenes) on
  // every scene change, including the initial mount.
  useEffect(() => {
    if (!onEvent) return;
    onEvent({
      kind: "scene_visited",
      world_id: worldId,
      scene_id: scene.id,
      background_id: scene.background_id,
    });
    if (scene.is_side_quest && !sideQuestsFired.current.has(scene.id)) {
      sideQuestsFired.current.add(scene.id);
      onEvent({
        kind: "side_quest_completed",
        world_id: worldId,
        scene_id: scene.id,
      });
      // Reward narration when arriving in a side quest scene with a pickup.
      const reward = (scene.pickups ?? [])[0];
      if (reward) {
        const meta = ASSETS_BY_ID[reward];
        const altLower = (meta?.alt ?? reward.replace(/_/g, " ")).toLowerCase();
        speakOracle({
          text: `You have earned the ${altLower}. The realm remembers.`,
          kind: "discovery",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id]);

  // Ending detection.
  useEffect(() => {
    if (!isEnding) return;
    if (completedRef.current) return;

    // Secret reroute: if we hit a normal ending while eligible and a secret
    // exists, swap to secret_ending instead.
    if (secretEligible && story.secret_ending && sceneId !== story.secret_ending.id) {
      setSecretDiscovered(true);
      setSceneId(story.secret_ending.id);
      setVisited((v) => {
        const next = new Set(v);
        next.add(story.secret_ending!.id);
        return next;
      });
      return;
    }

    // B-009 ending divergence: if this is not a secret ending and the tree
    // declares an endings list, swap to the flag-resolved ending. Skip when
    // already on the resolved ending or after one redirect to avoid loops.
    const isOnSecret = !!story.secret_ending && sceneId === story.secret_ending.id;
    if (!isOnSecret && story.endings && story.endings.length > 0 && !endingRedirectedRef.current) {
      endingRedirectedRef.current = true;
      const target = selectEnding(story.endings, flags);
      if (target && target !== sceneId && sceneById.has(target)) {
        setSceneId(target);
        setVisited((v) => {
          if (v.has(target)) return v;
          const next = new Set(v);
          next.add(target);
          return next;
        });
        return;
      }
    }

    completedRef.current = true;
    const finalScene = sceneById.get(sceneId) ?? scene;
    const visitedArr = Array.from(visited);
    const pickupsArr = inventory;
    const finalSecret = secretDiscovered || isOnSecret;
    speakOracle({
      text: isOnSecret
        ? "A hidden ending. The Oracle smiles. Few find this path."
        : "And so this realm settles. Well shaped.",
      kind: "completion",
    });
    if (onEvent) {
      if (finalSecret) {
        onEvent({
          kind: "secret_ending_discovered",
          world_id: worldId,
        });
      }
      onEvent({
        kind: "world_completed",
        world_id: worldId,
        character_id: renderedHeroId,
        secret_discovered: finalSecret,
      });
      // Only count regular endings toward the per-world ending log. The
      // secret ending has its own dedicated achievement track.
      if (!finalSecret) {
        onEvent({
          kind: "world_completed_with_ending",
          world_id: worldId,
          ending_scene_id: sceneId,
        });
      }
    }
    onComplete?.({
      endingScene: finalScene,
      scenesVisited: visitedArr,
      pickupsCollected: pickupsArr,
      totalPickups,
      secretDiscovered: finalSecret,
    });
  }, [
    isEnding,
    secretEligible,
    sceneId,
    scene,
    sceneById,
    story.secret_ending,
    story.endings,
    renderedHeroId,
    flags,
    visited,
    inventory,
    totalPickups,
    secretDiscovered,
    onComplete,
    onEvent,
    worldId,
  ]);

  function visitScene(nextId: string) {
    // Fire the leaving scene's flag_set implicitly. Per-scene fired-once.
    if (scene.flag_set && !flagsExitedFor.current.has(scene.id)) {
      flagsExitedFor.current.add(scene.id);
      onSetFlag(scene.flag_set, true);
    }
    setSceneId(nextId);
    setVisited((v) => {
      if (v.has(nextId)) return v;
      const next = new Set(v);
      next.add(nextId);
      return next;
    });
  }

  function tryActivate(choiceId: string) {
    const choice = scene.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    const required = choice.requires ?? [];
    const missing = required.filter((r) => !inventory.includes(r));
    if (missing.length > 0) {
      const names = missing
        .map((id) => ASSETS_BY_ID[id]?.alt ?? id.replace(/_/g, " "))
        .join(" and ");
      speakOracle({
        text: `Hmm, perhaps you need to find ${names} first.`,
        kind: "hint",
      });
      return;
    }
    visitScene(choice.next_scene_id);
  }

  function handleChoice(opt: ChoiceOption) {
    onSetFlag(opt.sets_flag, true);
    speakOracle({
      text: `You chose: ${opt.label.toLowerCase()}.`,
      kind: "discovery",
    });
    onEvent?.({
      kind: "choice_made",
      world_id: worldId,
      scene_id: scene.id,
      flag_id: opt.sets_flag,
    });
    visitScene(opt.goes_to);
  }

  function pickup(propId: string) {
    setInventory((inv) => (inv.includes(propId) ? inv : [...inv, propId]));
    setPickedPerScene((map) => ({
      ...map,
      [scene.id]: Array.from(new Set([...(map[scene.id] ?? []), propId])),
    }));
    const meta = ASSETS_BY_ID[propId];
    speakOracle({
      text: meta ? `You collect the ${meta.alt.toLowerCase()}.` : "You collect it.",
      kind: "discovery",
    });
    onEvent?.({
      kind: "pickup_collected",
      world_id: worldId,
      scene_id: scene.id,
      pickup_id: propId,
    });
  }

  function handleSummonGranted(propId: string) {
    setInventory((inv) => (inv.includes(propId) ? inv : [...inv, propId]));
    setSummonsUsed((n) => Math.min(SUMMONS_MAX, n + 1));
    setRecentlySummonedId(propId);
    setTimeout(() => setRecentlySummonedId((prev) => (prev === propId ? null : prev)), 1500);
    onEvent?.({
      kind: "summon_used",
      world_id: worldId,
      prop_id: propId,
      matched: true,
    });
  }

  function handleSummonDenied() {
    onEvent?.({
      kind: "summon_used",
      world_id: worldId,
      prop_id: "",
      matched: false,
    });
  }

  const remainingPickups = (scene.pickups ?? []).filter(
    (p) => !(pickedPerScene[scene.id] ?? []).includes(p)
  );

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
            {scene.inline_svg ? (
              <div
                className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                aria-label={scene.title}
                role="img"
                dangerouslySetInnerHTML={{ __html: sanitizeInlineSvg(scene.inline_svg) }}
              />
            ) : (
              bgUrl && (
                <Image
                  src={bgUrl}
                  alt={scene.title}
                  fill
                  unoptimized
                  priority
                  sizes="100vw"
                  className="object-cover"
                />
              )
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

            {charUrl && charMeta && (
              <motion.div
                key={`${scene.id}-char`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="absolute"
                style={{
                  left: "50%",
                  bottom: "32%",
                  transform: "translateX(-50%)",
                  width: "min(22vw, 180px)",
                  height: "min(22vw, 180px)",
                }}
              >
                <Image
                  src={charUrl}
                  alt={charMeta.alt}
                  fill
                  unoptimized
                  sizes="200px"
                  className="object-contain drop-shadow-2xl"
                />
              </motion.div>
            )}

            {resolved.props.map((propId, i) => {
              const url = assetUrlById(propId);
              const meta = ASSETS_BY_ID[propId];
              if (!url || !meta) return null;
              const offsets: React.CSSProperties[] = [
                { left: "8%", bottom: "10%" },
                { right: "8%", bottom: "8%" },
                { left: "50%", bottom: "5%", transform: "translateX(-50%)" },
              ];
              const pos = offsets[i] ?? offsets[0];
              return (
                <motion.div
                  key={`${scene.id}-prop-${i}-${propId}`}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  className="absolute pointer-events-none"
                  style={{ ...pos, width: "min(11vw, 90px)", height: "min(11vw, 90px)" }}
                >
                  <Image
                    src={url}
                    alt={meta.alt}
                    fill
                    unoptimized
                    sizes="90px"
                    className="object-contain drop-shadow-lg opacity-95"
                  />
                </motion.div>
              );
            })}

            {/* Pickups: glowing collectables */}
            {remainingPickups.map((propId, i) => {
              const url = assetUrlById(propId);
              const meta = ASSETS_BY_ID[propId];
              if (!url || !meta) return null;
              const pos = PICKUP_POSITIONS[i] ?? PICKUP_POSITIONS[0];
              return (
                <motion.button
                  key={`${scene.id}-pickup-${propId}`}
                  type="button"
                  onClick={() => pickup(propId)}
                  aria-label={`Pick up ${meta.alt}`}
                  className="absolute pointer-events-auto focus:outline-none"
                  style={{ ...pos, width: "min(13vw, 100px)", height: "min(13vw, 100px)" }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: [1, 1.07, 1],
                    filter: [
                      "drop-shadow(0 0 6px rgba(255,235,150,0.65))",
                      "drop-shadow(0 0 22px rgba(255,235,150,1))",
                      "drop-shadow(0 0 6px rgba(255,235,150,0.65))",
                    ],
                  }}
                  transition={{
                    opacity: { duration: 0.4 },
                    scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    filter: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                  }}
                >
                  <Image
                    src={url}
                    alt={meta.alt}
                    fill
                    unoptimized
                    sizes="100px"
                    className="object-contain pointer-events-none"
                  />
                </motion.button>
              );
            })}

            {/* Choice scene fork: two-button moment in place of normal interactables */}
            {isChoiceScene && resolved.choice_options && (
              <ChoiceMoment options={resolved.choice_options} onChoose={handleChoice} />
            )}

            {/* Choices: clickable scene-advance interactables */}
            {!isEnding && !isChoiceScene &&
              scene.choices.map((choice, i) => {
                const required = choice.requires ?? [];
                const missing = required.filter((r) => !inventory.includes(r));
                const locked = missing.length > 0;
                const hint = locked
                  ? `Find ${missing
                      .map((id) => ASSETS_BY_ID[id]?.alt ?? id)
                      .join(" + ")} first`
                  : undefined;
                const pos = CHOICE_POSITIONS[i] ?? CHOICE_POSITIONS[0];
                const dest = sceneById.get(choice.next_scene_id);
                const leadsToSideQuest = dest?.is_side_quest === true;
                return (
                  <Interactable
                    key={`${scene.id}-choice-${choice.id}`}
                    kind={choice.interactable_kind ?? "path"}
                    label={choice.label}
                    locked={locked}
                    hint={hint}
                    sideQuest={leadsToSideQuest}
                    onActivate={() => tryActivate(choice.id)}
                    positionStyle={pos}
                  />
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

      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 items-start">
        {audioUrl && (
          <div className="bg-white/90 rounded-lg px-3 py-2 shadow">
            <AudioPlayer src={audioUrl} playing onError={setAudioError} />
          </div>
        )}
        {audioError && !audioUrl && (
          <p className="text-xs text-amber-100 bg-black/50 rounded px-3 py-1">Sound unavailable</p>
        )}
        <InventoryBar
          items={inventory}
          worldId={worldId}
          sceneId={scene.id}
          summonsUsed={summonsUsed}
          summonsMax={SUMMONS_MAX}
          recentlySummonedId={recentlySummonedId}
          onSummonGranted={handleSummonGranted}
          onSummonDenied={handleSummonDenied}
        />
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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-amber-900">{scene.title}</h2>
              {isSideQuestScene && (
                <span
                  className="text-[10px] sm:text-xs uppercase tracking-widest font-bold rounded-full px-2 py-0.5 bg-gradient-to-r from-fuchsia-200 to-purple-200 text-purple-900 border border-fuchsia-300"
                  aria-label="Side quest"
                >
                  ✨ side quest
                </span>
              )}
            </div>
            <p className="text-base sm:text-lg text-slate-800 leading-relaxed">{resolved.narration}</p>
          </motion.div>
        </AnimatePresence>

        {isChoiceScene ? (
          <p className="text-center text-amber-50/85 text-xs sm:text-sm">
            A moment of choice. Pick a path.
          </p>
        ) : !isEnding ? (
          <p className="text-center text-amber-50/85 text-xs sm:text-sm">
            Tap a glowing thing to explore. {scene.choices.length} ways forward.
          </p>
        ) : (
          <p className="text-center text-amber-50/85 text-xs sm:text-sm">
            The realm rests. The Oracle has prepared a card for you.
          </p>
        )}
      </div>

      {/* Oracle narrates each scene's first sentence on entry. */}
      <OracleSpeaks
        text={firstSentence(resolved.narration)}
        kind="scene_intro"
        triggerKey={scene.id}
        delayMs={400}
      />

      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-x-0 top-[40%] z-20 flex justify-center pointer-events-none"
          >
            <button
              type="button"
              onClick={dismissTutorial}
              className="pointer-events-auto rounded-2xl bg-black/75 text-amber-50 px-5 py-3 shadow-2xl border border-amber-200/40 text-base sm:text-lg font-semibold"
            >
              ✨ Click the glowing things to explore
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]*[.!?]/);
  return (m?.[0] ?? text).trim();
}

// Strip script tags, on* event handlers, and external javascript: refs from a
// Claude-generated inline SVG before injecting via dangerouslySetInnerHTML.
// Defense in depth: we asked Claude not to include any of these, but the
// kid's setting input is part of the prompt so untrusted content technically
// flows in. Keep this conservative; the SVGs are decorative backgrounds.
function sanitizeInlineSvg(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    .replace(/javascript:/gi, "");
}
