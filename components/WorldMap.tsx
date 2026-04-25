"use client";
import { useEffect, useState } from "react";
import type { WorldMap as WorldMapType } from "@/lib/claude";

const STEP_MS = 4500;
const WALK_MS = 1800;

export function WorldMap({
  map,
  started,
  onComplete,
}: {
  map: WorldMapType;
  started: boolean;
  onComplete?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!started) {
      setStep(0);
      setDone(false);
      return;
    }
    if (step >= map.locations.length - 1) {
      const t = setTimeout(() => {
        setDone(true);
        onComplete?.();
      }, STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [started, step, map.locations.length, onComplete]);

  const here = map.locations[step];
  const charX = here?.x ?? 50;
  const charY = here?.y ?? 50;

  return (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-xl">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ backgroundColor: map.background_color }}
        aria-hidden="true"
      >
        {map.terrain_paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="rgba(255,255,255,0.12)"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={0.4}
          />
        ))}
        {map.locations.map((loc, i) => (
          <g key={loc.id}>
            <circle
              cx={loc.x}
              cy={loc.y}
              r={i <= step && started ? 3.2 : 2.4}
              fill={i <= step && started ? "rgba(255,220,140,0.95)" : "rgba(255,255,255,0.55)"}
              className="transition-all duration-500"
            />
          </g>
        ))}
        {map.locations.length > 1 && (
          <polyline
            points={map.locations.map((l) => `${l.x},${l.y}`).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={0.5}
            strokeDasharray="1.5,1.5"
          />
        )}
      </svg>

      {map.locations.map((loc) => (
        <div
          key={`${loc.id}-label`}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-xl select-none"
          style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
        >
          <span aria-hidden>{loc.icon}</span>
        </div>
      ))}

      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl select-none drop-shadow"
        style={{
          left: `${charX}%`,
          top: `${charY}%`,
          transition: started
            ? `left ${WALK_MS}ms ease-in-out, top ${WALK_MS}ms ease-in-out`
            : "none",
        }}
      >
        <span aria-hidden>{map.character_emoji}</span>
      </div>

      {started && here && !done && (
        <div
          key={here.id}
          className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-4 rounded-xl backdrop-blur animate-fadeIn"
        >
          <div className="text-amber-200 font-semibold text-sm uppercase tracking-wide mb-1">
            {here.name}
          </div>
          <p className="text-base leading-snug">{here.description}</p>
        </div>
      )}

      {done && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="text-4xl text-amber-100 font-bold drop-shadow">
            The End
          </div>
        </div>
      )}
    </div>
  );
}
