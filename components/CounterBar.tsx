"use client";
import Image from "next/image";
import type { CounterDef, CounterState } from "@/lib/counters";

// Adventure slice: per-playthrough resource counters (food, water). Mirrors
// InventoryBar's visual weight but on the opposite side of the play
// viewport. Each counter shows an icon and a pip row indicating current vs
// max. Below `critical_at`, the pip row pulses red so the kid sees the
// pressure. Hidden when the adventure declares no counters.

export function CounterBar({
  counters,
  defs,
}: {
  counters: CounterState;
  defs: CounterDef[];
}) {
  if (defs.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {defs.map((def) => {
        const value = counters[def.id] ?? def.start_at ?? def.max;
        const isCritical = value <= def.critical_at;
        const isEmpty = value <= 0;
        // B-014 economy: pip-row breaks past ~50 max (coins go up to 9999).
        // For wide-range counters we render a compact "Label: value" badge
        // instead. Threshold mirrors the brief; food/water (max 6) keep
        // pips. Critical/empty styling on a coin counter starting at 50
        // never fires unless the kid spends to zero, which is a feature.
        const useTextDisplay = def.max > 50;
        return (
          <div
            key={def.id}
            className={`flex items-center gap-2 backdrop-blur-sm rounded-2xl px-3 py-1.5 shadow-lg ${
              isEmpty ? "bg-red-900/70" : isCritical ? "bg-red-700/55 animate-pulse" : "bg-black/55"
            }`}
          >
            <div className="relative w-7 h-7 rounded-md bg-white/95 ring-2 ring-amber-200">
              <Image
                src={def.icon_path}
                alt={def.label}
                fill
                unoptimized
                sizes="28px"
                className="object-contain p-0.5"
              />
            </div>
            {useTextDisplay ? (
              <span
                className="text-amber-100 text-sm font-bold tracking-wide tabular-nums"
                aria-label={`${def.label}: ${value}`}
              >
                {def.label}: {value}
              </span>
            ) : (
              <ul
                className="flex items-center gap-0.5"
                aria-label={`${def.label}: ${value} of ${def.max}`}
              >
                {Array.from({ length: def.max }).map((_, i) => {
                  const filled = i < value;
                  return (
                    <li
                      key={i}
                      className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
                        filled
                          ? isCritical
                            ? "bg-red-300"
                            : "bg-amber-200"
                          : "bg-white/15"
                      }`}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
