"use client";
import { useEffect, useRef, useState } from "react";

export function AudioPlayer({
  src,
  playing,
  onError,
}: {
  src: string | null;
  playing: boolean;
  onError?: (msg: string) => void;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(0.6);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    el.volume = volume;
    if (playing) {
      el.play().catch((err) => onError?.(String(err)));
    } else {
      el.pause();
    }
  }, [playing, src, volume, onError]);

  if (!src) return null;

  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <audio ref={ref} src={src} loop preload="auto" />
      <label className="flex items-center gap-2">
        <span aria-hidden>🔊</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-24"
          aria-label="Soundscape volume"
        />
      </label>
    </div>
  );
}
