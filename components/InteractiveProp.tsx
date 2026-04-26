"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PropAnimation } from "@/lib/claude";

const ANIM_CLASS: Record<PropAnimation, string> = {
  wiggle: "animate-prop-wiggle",
  pulse: "animate-prop-pulse",
  glow: "animate-prop-glow",
  open: "animate-prop-open",
};

const BUBBLE_DURATION_MS = 4000;

type Cached = { narration: string; animation: PropAnimation };

const clientCache = new Map<string, Cached>();

export function InteractiveProp({
  worldId,
  sceneId,
  propId,
  src,
  alt,
}: {
  worldId: string;
  sceneId: string;
  propId: string;
  src: string;
  alt: string;
}) {
  const [animationKey, setAnimationKey] = useState(0);
  const [animation, setAnimation] = useState<PropAnimation | null>(null);
  const [pending, setPending] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  function showBubble(text: string) {
    setBubble(text);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => {
      setBubble(null);
    }, BUBBLE_DURATION_MS);
  }

  async function handleClick() {
    const key = `${worldId}::${sceneId}::${propId}`;
    const cached = clientCache.get(key);
    if (cached) {
      setAnimation(cached.animation);
      setAnimationKey((k) => k + 1);
      showBubble(cached.narration);
      return;
    }
    if (pending) return;
    setPending(true);
    setAnimation("pulse");
    setAnimationKey((k) => k + 1);
    try {
      const res = await fetch("/api/prop-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world_id: worldId, scene_id: sceneId, prop_id: propId }),
      });
      const data = await res.json();
      if (res.ok && data?.narration && data?.animation) {
        const result: Cached = { narration: data.narration, animation: data.animation };
        clientCache.set(key, result);
        setAnimation(result.animation);
        setAnimationKey((k) => k + 1);
        showBubble(result.narration);
      } else {
        showBubble("The Oracle is quiet for a moment.");
      }
    } catch {
      showBubble("The Oracle is quiet for a moment.");
    } finally {
      setPending(false);
    }
  }

  const animClass = animation ? ANIM_CLASS[animation] : "";

  return (
    <div className="absolute inset-0 pointer-events-auto">
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Touch the ${alt}`}
        className="absolute inset-0 cursor-pointer focus:outline-none"
      >
        <span
          key={animationKey}
          className={`block w-full h-full ${animClass}`}
          style={{ transformOrigin: "50% 70%" }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            sizes="110px"
            className="object-contain drop-shadow-lg pointer-events-none"
          />
        </span>
      </button>
      {bubble && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full w-max max-w-[60vw] sm:max-w-xs z-20 pointer-events-none animate-fadeIn"
          role="status"
        >
          <div className="relative bg-white/95 text-amber-900 text-sm font-semibold rounded-2xl px-3 py-2 shadow-xl border border-amber-200">
            {bubble}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white/95 border-r border-b border-amber-200 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
