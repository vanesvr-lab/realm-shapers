"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { hasUserInteracted, markUserInteraction, subscribeOracle, type OracleLine } from "@/lib/oracle-bus";
import {
  getOraclePin,
  subscribeOraclePin,
  type OraclePinState,
} from "@/lib/oracle-pin-bus";

const MUTE_KEY = "realm-shapers:oracle-muted";
const BUBBLE_DURATION_MS = 6500;
const HIDDEN_PATHS = ["/preview-3d"];

export function OracleAvatar() {
  const [muted, setMuted] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [pathname, setPathname] = useState<string>("/");
  // B-018: when StoryPlayer is mounted in the active realm, it pushes its
  // Ask Oracle state here. The avatar then renders a hint-count badge and
  // tapping calls the realm's hint handler instead of the default greet.
  const [pinState, setPinState] = useState<OraclePinState | null>(() => getOraclePin());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTextRef = useRef<string>("");
  const lastFiredAtRef = useRef<number>(0);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(MUTE_KEY);
      if (v === "1") setMuted(true);
    } catch {
      // ignore
    }
    setPathname(window.location.pathname);

    const onInteract = () => markUserInteraction();
    window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
    window.addEventListener("keydown", onInteract, { once: true, passive: true });

    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const showBubble = useCallback((text: string) => {
    setBubble(text);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), BUBBLE_DURATION_MS);
  }, []);

  const speak = useCallback(
    async (line: OracleLine) => {
      const text = line.text?.trim();
      if (!text) return;
      // Debounce identical lines fired within 1.5s (StrictMode double-render guard).
      const now = Date.now();
      if (lastTextRef.current === text && now - lastFiredAtRef.current < 1500) return;
      lastTextRef.current = text;
      lastFiredAtRef.current = now;

      showBubble(text);

      if (muted) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const res = await fetch("/api/oracle-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, line_kind: line.kind }),
        });
        const data = await res.json();
        if (!res.ok || !data?.url) return;
        if (!hasUserInteracted()) return; // browser will block autoplay
        const el = audioRef.current;
        if (!el) return;
        el.src = data.url;
        el.volume = 0.85;
        await el.play().catch(() => {
          // Autoplay denied; bubble remains visible silently.
        });
      } catch {
        // Network failure: keep bubble visible silently.
      } finally {
        inFlightRef.current = false;
      }
    },
    [muted, showBubble]
  );

  useEffect(() => {
    return subscribeOracle((line) => {
      void speak(line);
    });
  }, [speak]);

  useEffect(() => {
    return subscribeOraclePin((state) => setPinState(state));
  }, []);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      const el = audioRef.current;
      if (next && el) {
        el.pause();
        el.currentTime = 0;
      }
      return next;
    });
  }

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="fixed bottom-3 right-3 z-50 pointer-events-none">
      <div className="flex items-end gap-2 pointer-events-auto">
        <AnimatePresence>
          {bubble && (
            <motion.div
              key={bubble}
              initial={{ opacity: 0, x: 10, y: 6 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
              className="max-w-[60vw] sm:max-w-sm mb-1"
            >
              <div className="relative bg-white/95 text-amber-950 text-sm sm:text-base rounded-2xl px-3 py-2 shadow-xl border border-amber-200">
                {bubble}
                <div className="absolute -right-1.5 bottom-3 w-3 h-3 bg-white/95 border-r border-t border-amber-200 rotate-45" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex flex-col items-center gap-1">
          <motion.button
            type="button"
            onClick={() => {
              // B-018: in play mode, the StoryPlayer registers a hint
              // handler here. Tapping the avatar triggers Ask Oracle on
              // the current scene instead of the default greeting.
              if (pinState) {
                pinState.onTap();
                return;
              }
              void speak({
                text: "I am the Oracle. Tap me any time you wish to hear me again.",
                kind: "greet",
              });
            }}
            aria-label={
              pinState && pinState.hintBudget > 0
                ? `Ask Oracle, ${pinState.hintsLeft} hint${pinState.hintsLeft === 1 ? "" : "s"} left`
                : "The Oracle"
            }
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-xl ring-2 ring-amber-200 bg-white"
            animate={{ y: [0, -3, 0, 2, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          >
            <Image
              src="/oracle.png"
              alt="The Oracle"
              fill
              sizes="80px"
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 rounded-full ring-1 ring-amber-100/60" />
          </motion.button>
          {pinState && pinState.hintBudget > 0 && pinState.hintsLeft > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-purple-700 text-white text-[11px] font-bold flex items-center justify-center shadow-md ring-2 ring-white pointer-events-none"
              aria-hidden
            >
              {pinState.hintsLeft}
            </span>
          )}
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? "Unmute Oracle" : "Mute Oracle"}
            className="text-xs px-2 py-0.5 rounded-full bg-white/90 text-amber-900 shadow border border-amber-200 hover:bg-amber-50"
          >
            {muted ? "🔇 Oracle muted" : "🔊 Oracle"}
          </button>
        </div>
      </div>
      <audio ref={audioRef} preload="none" playsInline />
    </div>
  );
}
