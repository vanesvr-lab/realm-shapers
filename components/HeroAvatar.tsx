"use client";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ASSETS_BY_ID, assetUrlById } from "@/lib/asset-library";
import { heroVoiceIdFor, type HeroVoiceName } from "@/lib/elevenlabs";
import { hasUserInteracted } from "@/lib/oracle-bus";
import { speakHero, subscribeHero, type HeroLine } from "@/lib/hero-bus";
import type { HeroLine as ClaudeHeroLine } from "@/lib/claude";

const BUBBLE_DURATION_MS = 5500;

const FALLBACK_LINES: ClaudeHeroLine[] = [
  { kind: "thought", text: "I wonder what is just beyond that next path." },
  { kind: "joke", text: "Why did the dragon refuse the picnic? It wanted to fire up its own grill." },
];

// B-010 scope 9. Clickable hero. Mounted inside the StoryPlayer scene area
// at a fixed position. Tap → cycles through Claude's hero_lines (random,
// no immediate repeat) and emits via the hero-bus. Subscribes to the same
// bus to actually play the line via /api/oracle-voice with the per-realm
// voice id (Fena or Ryan), and shows a small speech bubble for ~5s.
export function HeroAvatar({
  characterId,
  heroVoice,
  heroLines,
  positionStyle,
  sceneKey,
}: {
  characterId: string;
  heroVoice?: HeroVoiceName;
  heroLines?: ClaudeHeroLine[];
  positionStyle: React.CSSProperties;
  sceneKey: string;
}) {
  const charUrl = assetUrlById(characterId);
  const charMeta = ASSETS_BY_ID[characterId];
  const [bubble, setBubble] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenLinesRef = useRef<Set<number>>(new Set());
  const inFlightRef = useRef<boolean>(false);

  const linePool: ClaudeHeroLine[] =
    heroLines && heroLines.length > 0 ? heroLines : FALLBACK_LINES;
  const voiceId = heroVoiceIdFor(heroVoice ?? null);

  const showBubble = useCallback((text: string) => {
    setBubble(text);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), BUBBLE_DURATION_MS);
  }, []);

  // Subscribe once to play any hero line dispatched onto the bus.
  useEffect(() => {
    return subscribeHero(async (line: HeroLine) => {
      const text = line.text?.trim();
      if (!text) return;
      showBubble(text);
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const res = await fetch("/api/oracle-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice_id: line.voice_id ?? voiceId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.url) return;
        if (!hasUserInteracted()) return;
        const el = audioRef.current;
        if (!el) return;
        el.src = data.url;
        el.volume = 0.85;
        await el.play().catch(() => {
          // Autoplay denied; bubble remains visible silently.
        });
      } catch {
        // ignore network failure
      } finally {
        inFlightRef.current = false;
      }
    });
  }, [voiceId, showBubble]);

  // Pick the next line: random from unseen indices, reset when all seen,
  // never the same as the immediately previous one.
  const pickLine = useCallback((): ClaudeHeroLine => {
    const seen = seenLinesRef.current;
    if (seen.size >= linePool.length) seen.clear();
    const candidates = linePool
      .map((_, i) => i)
      .filter((i) => !seen.has(i));
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    seen.add(choice);
    return linePool[choice];
  }, [linePool]);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    const next = pickLine();
    speakHero({ text: next.text, kind: next.kind, voice_id: voiceId });
  }

  if (!charUrl || !charMeta) return null;

  return (
    <motion.div
      key={`${sceneKey}-hero`}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="absolute"
      style={positionStyle}
    >
      {/* B-012 scope 4: subtle idle bob, ~2s period, 2px swing. Wrapped in a
          child motion so it composes with the entrance animation above. */}
      <motion.div
        className="relative w-full h-full"
        animate={{ y: [0, -2, 0, 2, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut", delay: 0.6 }}
      >
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Tap ${charMeta.alt} to hear them`}
        className="relative w-full h-full focus:outline-none cursor-pointer group"
      >
        <Image
          src={charUrl}
          alt={charMeta.alt}
          fill
          unoptimized
          sizes="200px"
          className="object-contain drop-shadow-2xl pointer-events-none transition-transform group-hover:scale-105 group-active:scale-95"
        />
        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-300/90 text-amber-950 text-xs font-bold flex items-center justify-center shadow ring-1 ring-amber-200 pointer-events-none animate-bounce">
          💭
        </span>
      </button>
      </motion.div>

      <AnimatePresence>
        {bubble && (
          <motion.div
            key={bubble}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-56 sm:w-64 pointer-events-none"
          >
            <div className="relative bg-white/95 text-amber-950 rounded-2xl px-3 py-2 shadow-xl border border-amber-200 text-sm sm:text-base text-center">
              {bubble}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 border-r border-b border-amber-200 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} preload="none" playsInline />
    </motion.div>
  );
}
