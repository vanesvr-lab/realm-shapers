"use client";
import { useEffect, useRef, useState } from "react";

type FallingStar = {
  id: number;
  left: number;
  duration: number;
  delay: number;
  size: number;
  hue: number;
  popped: boolean;
  spawnedAt: number;
};

const SPAWN_MIN_MS = 600;
const SPAWN_MAX_MS = 900;
const MAX_CONCURRENT = 12;
const STAR_LIFETIME_MS = 4500;

export function StarTapGame() {
  const [stars, setStars] = useState<FallingStar[]>([]);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const nextIdRef = useRef(1);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    function onVis() {
      setPaused(document.hidden);
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;

    function spawn() {
      if (cancelled) return;
      setStars((prev) => {
        const live = prev.filter((s) => !s.popped && Date.now() - s.spawnedAt < STAR_LIFETIME_MS);
        if (live.length >= MAX_CONCURRENT) return prev;
        const id = nextIdRef.current++;
        const next: FallingStar = {
          id,
          left: 5 + Math.random() * 90,
          duration: 2.4 + Math.random() * 1.6,
          delay: 0,
          size: 28 + Math.random() * 22,
          hue: Math.floor(Math.random() * 360),
          popped: false,
          spawnedAt: Date.now(),
        };
        return [...prev, next].slice(-30);
      });
      const wait = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
      timer = setTimeout(spawn, wait);
    }

    let timer = setTimeout(spawn, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paused]);

  useEffect(() => {
    const cleanup = setInterval(() => {
      setStars((prev) =>
        prev.filter((s) => !s.popped && Date.now() - s.spawnedAt < STAR_LIFETIME_MS)
      );
    }, 1000);
    return () => clearInterval(cleanup);
  }, []);

  function pop(id: number) {
    setStars((prev) => prev.map((s) => (s.id === id ? { ...s, popped: true } : s)));
    setScore((s) => s + 1);
    setTimeout(() => {
      setStars((prev) => prev.filter((s) => s.id !== id));
    }, 300);
  }

  return (
    <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-rose-900 border border-amber-200 shadow-inner">
      <div className="absolute inset-0">
        {stars.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={(e) => {
              e.preventDefault();
              if (!s.popped) pop(s.id);
            }}
            aria-label="Pop star"
            className="absolute"
            style={{
              left: `${s.left}%`,
              top: 0,
              width: s.size,
              height: s.size,
              animation: `stg-fall ${s.duration}s linear forwards`,
              filter: `drop-shadow(0 0 6px hsl(${s.hue} 100% 70%))`,
              transform: s.popped ? "scale(1.6)" : undefined,
              opacity: s.popped ? 0 : 1,
              transition: s.popped ? "transform 0.25s ease-out, opacity 0.25s ease-out" : undefined,
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
              <polygon
                points="12,2 15,9 22,9.5 16.5,14.5 18.5,21.5 12,17.5 5.5,21.5 7.5,14.5 2,9.5 9,9"
                fill={`hsl(${s.hue} 95% 70%)`}
                stroke="white"
                strokeWidth="0.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>
      <div className="absolute top-2 left-3 right-3 flex justify-between items-center text-white text-sm font-semibold drop-shadow">
        <span className="bg-black/40 rounded-full px-3 py-1">⭐ {score}</span>
        <span className="bg-black/40 rounded-full px-3 py-1">{formatTime(elapsed)}</span>
      </div>
      <div className="absolute bottom-2 left-0 right-0 text-center text-white/80 text-xs">
        Pop some stars while you wait.
      </div>
      <style jsx>{`
        @keyframes stg-fall {
          0% {
            transform: translateY(-20%);
          }
          100% {
            transform: translateY(280%);
          }
        }
      `}</style>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
